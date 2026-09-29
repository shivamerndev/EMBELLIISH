import mongoose from 'mongoose';
import PmsItem from './pms.model.js';
import LeadModel from '../crm/lead/lead.model.js';
import SalesCommercialModel from '../sales/sales.model.js';

const toObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);

/**
 * Normalizes stage representation into both camelCase key and kebab-case slug.
 */
export const normalizeStageNames = (stageStr = '') => {
  if (!stageStr) return { key: '', slug: '' };
  const trimmed = stageStr.trim();
  const key = trimmed.includes('-')
    ? trimmed.toLowerCase().replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
    : trimmed;
  const slug = trimmed
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/^-/, '');
  return { key, slug };
};

/**
 * Finds all PMS items for a specific workflow stage.
 */
export const findItemsByStage = async (stageKey, stageSlug, options = {}) => {
  const { search } = options;
  const stageConditions = [
    { stageKey },
    { stageSlug },
    { stage: stageKey },
    { stage: stageSlug },
  ];

  const filter = { $or: stageConditions };

  if (search && typeof search === 'string') {
    const rx = new RegExp(search.trim(), 'i');
    filter.$and = [
      {
        $or: [
          { code: rx },
          { clientName: rx },
          { currentOwner: rx },
          { siteDetails: rx },
          { assignedPcExecutionOwner: rx },
        ],
      },
    ];
  }

  return PmsItem.find(filter)
    .populate('lead', 'code clientName phone location address assignedDCM status')
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Finds a single PMS item by ID or stage + ID.
 */
export const findItemById = async (id, stageConditions = null) => {
  const oid = toObjectId(id);
  const idQuery = oid ? { $or: [{ _id: oid }, { id }] } : { $or: [{ id }, { code: id }] };

  let filter = idQuery;
  if (stageConditions) {
    filter = { $and: [idQuery, stageConditions] };
  }

  return PmsItem.findOne(filter)
    .populate('lead', 'code clientName phone location address assignedDCM status')
    .lean();
};

/**
 * Creates a new PMS item.
 */
export const createItem = async (payload) => {
  const doc = new PmsItem(payload);
  const saved = await doc.save();
  return saved.toJSON ? saved.toJSON() : saved;
};

/**
 * Updates an existing PMS item by ID.
 */
export const updateItem = async (id, updates) => {
  const oid = toObjectId(id);
  const query = oid ? { $or: [{ _id: oid }, { id }] } : { $or: [{ id }, { code: id }] };

  const updated = await PmsItem.findOneAndUpdate(
    query,
    { $set: updates },
    { new: true, runValidators: false }
  )
    .populate('lead', 'code clientName phone location address assignedDCM status')
    .lean();

  return updated;
};

/**
 * Deletes a PMS item by ID.
 */
export const deleteItem = async (id) => {
  const oid = toObjectId(id);
  const query = oid ? { $or: [{ _id: oid }, { id }] } : { $or: [{ id }, { code: id }] };

  const deleted = await PmsItem.findOneAndDelete(query).lean();
  return deleted;
};

/**
 * Finds all PMS items for a specific project across all 20 lifecycle stages.
 */
export const findItemsByProject = async (projectIdentifier) => {
  if (!projectIdentifier) return [];
  const oid = toObjectId(projectIdentifier);
  const rx = new RegExp(projectIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const conditions = [
    { code: rx },
    { clientName: rx },
  ];
  if (oid) {
    conditions.push({ _id: oid }, { lead: oid });
  }

  return PmsItem.find({ $or: conditions })
    .sort({ createdAt: 1 })
    .lean();
};

/**
 * Synchronizes leads from CRM / Sales pipeline into PMS Stage 1 (Project Activation)
 * captures leads that have reached KYC verification, Advance payment receipt, or Conversion/Approval.
 */
export const syncApprovedLeads = async () => {
  try {
    const candidateLeads = await LeadModel.find({
      $or: [
        { 'kyc.status': { $regex: /^verified$/i } },
        { status: { $in: ['CONVERTED', 'QUALIFIED'] } },
        { qualificationDecision: { $regex: /^approved$/i } },
      ],
    })
      .populate('assignedDCM', 'name email')
      .populate('salesCommercial')
      .lean();

    if (!candidateLeads || candidateLeads.length === 0) {
      return 0;
    }

    let syncedCount = 0;
    for (const lead of candidateLeads) {
      const edge = lead.salesCommercial || {};

      // Check if lead already has a record in PMS (either in projectActivation or downstream)
      const existing = await PmsItem.findOne({
        $or: [
          { lead: lead._id },
          { code: lead.code },
        ],
      });

      const quote =
        edge.quotation?.finalQuotedValue ||
        edge.quotation?.grandTotal ||
        edge.proposal?.total ||
        edge.costing?.price ||
        edge.advance?.amount ||
        lead.budget ||
        '';

      const location =
        edge.kyc?.siteDeliveryAddress ||
        edge.siteAddress ||
        lead.siteAddress ||
        lead.address?.line1 ||
        lead.location ||
        'Gurgaon, Haryana';

      const owner = lead.assignedDCM?.name || lead.assignedDcmName || 'Vikram Mehta';
      const clientName = edge.kyc?.billingLegalName || lead.clientName || 'Private Residence';
      const isKycVerified =
        String(edge.kyc?.status || lead.kyc?.status || '').toLowerCase() === 'verified';
      const isAdvanceReceived =
        ['received', 'committed', 'discussed'].includes(String(edge.advance?.status || '').toLowerCase()) ||
        Boolean(edge.advance?.amount && edge.advance.amount > 0);

      if (!existing) {
        await PmsItem.create({
          lead: lead._id,
          code: lead.code || `PRJ-${lead._id.toString().slice(-4).toUpperCase()}`,
          clientName,
          stage: 'projectActivation',
          stageKey: 'projectActivation',
          stageSlug: 'project-activation',
          status: 'In Progress',
          delay: 'No',
          currentOwner: owner,
          assignedPcExecutionOwner: owner,
          siteDetails: `${location}, Site access verified`,
          approvedQuote: quote ? (String(quote).startsWith('₹') ? String(quote) : `₹${quote}`) : '₹4,50,000',
          paymentReceipt: edge.advance?.receiptNumber || `RCP-2026-${lead._id.toString().slice(-3).toUpperCase()}`,
          projectActivationDate: edge.kyc?.verificationDate || edge.advance?.receivedDate || new Date(),
          clientApproval: edge.approval?.status === 'Approved' ? 'Approved' : 'Approved',
          kycBillingStatus: isKycVerified ? 'Verified' : 'Pending',
        });
        syncedCount += 1;
      } else if (existing.stageKey === 'projectActivation' && isKycVerified && existing.kycBillingStatus !== 'Verified') {
        // Keep KYC / billing status in sync if completed in CRM afterwards
        await PmsItem.updateOne(
          { _id: existing._id },
          { $set: { kycBillingStatus: 'Verified', clientName, siteDetails: `${location}, Site access verified` } }
        );
      }
    }

    return syncedCount;
  } catch (err) {
    // Non-blocking sync error
    console.error('[pms.repo] syncApprovedLeads error:', err.message);
    return 0;
  }
};

/**
 * Pipeline statistics summary across all stages.
 */
export const getPipelineStatistics = async () => {
  const stats = await PmsItem.aggregate([
    {
      $group: {
        _id: { stageKey: '$stageKey', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);
  return stats;
};

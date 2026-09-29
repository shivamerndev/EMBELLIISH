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
    const verifiedKycLeadIds = await SalesCommercialModel.find({
      'kyc.status': { $regex: /^verified$/i },
    }).distinct('lead');

    const candidateLeads = await LeadModel.find({
      $or: [
        ...(verifiedKycLeadIds.length > 0 ? [{ _id: { $in: verifiedKycLeadIds } }] : []),
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
      let edge = lead.salesCommercial;
      if (!edge || typeof edge !== 'object' || !edge._id) {
        edge = (await SalesCommercialModel.findOne({ lead: lead._id }).lean()) || {};
      }

      // Check if lead already has a record in PMS (either in projectActivation or downstream)
      const orConditions = [{ lead: lead._id }];
      if (lead.code) {
        orConditions.push({ code: lead.code });
      }
      const existing = await PmsItem.findOne({ $or: orConditions });

      // Specific enterprise fields mapped directly from Lead and SalesCommercial models:
      // 1. Approved Quote: Final quoted value from Quotation (Stage 9) or Costing price (Stage 8)
      const quoteVal = edge.quotation?.finalQuotedValue ?? edge.costing?.price ?? null;
      const approvedQuote =
        quoteVal !== null && quoteVal !== undefined
          ? `₹${Number(quoteVal).toLocaleString('en-IN')}`
          : '';

      // 2. Site Details: KYC site delivery address, Site Visit address, or Lead address/location
      const siteDetails =
        edge.kyc?.siteDeliveryAddress ||
        edge.siteAddress ||
        (lead.address?.line1
          ? [lead.address.line1, lead.address.city, lead.address.state, lead.address.pincode].filter(Boolean).join(', ')
          : lead.location || '');

      // 3. Execution Owner: Lead's assigned DCM
      const owner = lead.assignedDCM?.name || lead.assignedDcmName || '';

      // 4. Client Name: Billing Legal Name from KYC (Stage 12) or primary Lead client name
      const clientName = edge.kyc?.billingLegalName || lead.clientName || '';

      // 5. Payment Receipt: Advance receipt number from Advance (Stage 7)
      const paymentReceipt = edge.advance?.receiptNumber || '';

      // 6. Project Activation Date: Verification date from KYC, Advance received date, or conversion date
      const projectActivationDate =
        edge.kyc?.verificationDate || edge.advance?.receivedDate || lead.convertedAt || null;

      // 7. Client Approval: Approval status from Stage 10
      let clientApproval = 'Pending';
      const rawApproval = edge.approval?.clientApprovalStatus || edge.approval?.status;
      if (rawApproval) {
        const normApproval = String(rawApproval).toUpperCase();
        if (normApproval === 'APPROVED') clientApproval = 'Approved';
        else if (normApproval === 'REJECTED' || normApproval === 'DECLINED') clientApproval = 'Rejected';
        else if (normApproval === 'ON_HOLD' || normApproval === 'REVISION_REQUESTED') clientApproval = 'On Hold';
      }

      // 8. KYC / Billing Status: Stage 12 verification status
      let kycBillingStatus = 'Pending';
      const rawKyc = edge.kyc?.status || lead.kyc?.status;
      if (rawKyc) {
        const normKyc = String(rawKyc).toLowerCase();
        if (normKyc === 'verified') kycBillingStatus = 'Verified';
        else if (normKyc === 'in_progress' || normKyc === 'in progress') kycBillingStatus = 'In Progress';
        else if (normKyc === 'correction required' || normKyc === 'correction_required') kycBillingStatus = 'On Hold';
        else if (normKyc === 'rejected') kycBillingStatus = 'Rejected';
      }
      const isKycVerified = kycBillingStatus === 'Verified';

      if (!existing) {
        await PmsItem.create({
          lead: lead._id,
          code: lead.code || '',
          clientName,
          stage: 'projectActivation',
          stageKey: 'projectActivation',
          stageSlug: 'project-activation',
          status: 'In Progress',
          delay: 'No',
          currentOwner: owner,
          assignedPcExecutionOwner: owner,
          siteDetails,
          approvedQuote,
          paymentReceipt,
          projectActivationDate,
          clientApproval,
          kycBillingStatus,
        });
        syncedCount += 1;
      } else if (existing.stageKey === 'projectActivation') {
        // Keep KYC / billing status and details in sync if completed in CRM afterwards
        const updateFields = {};
        if (isKycVerified && existing.kycBillingStatus !== 'Verified') {
          updateFields.kycBillingStatus = 'Verified';
        }
        if (clientName && clientName !== existing.clientName) {
          updateFields.clientName = clientName;
        }
        if (siteDetails && siteDetails !== existing.siteDetails) {
          updateFields.siteDetails = siteDetails;
        }
        if (owner && !existing.assignedPcExecutionOwner) {
          updateFields.assignedPcExecutionOwner = owner;
          updateFields.currentOwner = owner;
        }
        if (approvedQuote && !existing.approvedQuote) {
          updateFields.approvedQuote = approvedQuote;
        }
        if (paymentReceipt && !existing.paymentReceipt) {
          updateFields.paymentReceipt = paymentReceipt;
        }
        if (projectActivationDate && !existing.projectActivationDate) {
          updateFields.projectActivationDate = projectActivationDate;
        }
        if (clientApproval && clientApproval !== 'Pending' && existing.clientApproval !== clientApproval) {
          updateFields.clientApproval = clientApproval;
        }
        if (Object.keys(updateFields).length > 0) {
          await PmsItem.updateOne({ _id: existing._id }, { $set: updateFields });
        }
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

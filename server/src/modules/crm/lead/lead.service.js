import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import LeadModel from './lead.model.js';
import SalesCommercialModel from '../../sales/sales.model.js';
import { LEAD_STATUS } from '../../../constants/workflow.constants.js';

const leadRepository = new BaseRepository(LeadModel, {
  filterable: ['status', 'source', 'projectType', 'assignedDCM', 'architect', 'qualifiedBy', 'budgetClassification', 'architectInvolved'],
  searchable: ['clientName', 'contactPerson', 'companyName', 'architectName', 'phone', 'location', 'code'],
  populate: [
    { path: 'architect', select: 'name firm phone' },
    { path: 'assignedDCM', select: 'name email role' },
    { path: 'salesCommercial' },
  ],
});

const SALES_COMMERCIAL_KEYS = new Set([
  'siteVisitRequired',
  'siteVisitDueDate',
  'actualSiteVisitDateTime',
  'siteAddress',
  'assignedInstaller',
  'installerName',
  'installerPhone',
  'clientArchitectAvailability',
  'scope',
  'rooms',
  'drawingsRenders',
  'installerAvailability',
  'measurement',
  'studioMeeting',
  'readySize',
  'consumption',
  'proposal',
  'advance',
  'costing',
  'quotation',
  'approval',
  'presentation',
  'kyc',
]);

/**
 * Steps 1–3 : the call, the qualification conversation, and handing the project
 * to a DCM.
 */
class LeadService extends BaseService {
  constructor() {
    super(leadRepository, 'Lead');
  }

  async getById(id) {
    const lead = await super.getById(id);
    if (!lead) return lead;

    let edge = lead.salesCommercial;
    if (!edge || typeof edge !== 'object' || !edge._id) {
      edge = await SalesCommercialModel.findOne({ lead: lead._id || lead.id }).lean();
    }
    if (edge) {
      if (edge.costing) {
        edge.costing = {
          dueDate: edge.costing.dueDate,
          version: edge.costing.version || 'v1.0',
          category: edge.costing.category,
          price: edge.costing.price !== undefined && edge.costing.price !== null ? Number(edge.costing.price) : 0,
          costingHistory: Array.isArray(edge.costing.costingHistory) ? edge.costing.costingHistory.map((h) => ({
            version: h.version || 'v1.0',
            dueDate: h.dueDate,
            category: h.category,
            price: h.price !== undefined && h.price !== null ? Number(h.price) : 0,
            savedAt: h.savedAt,
          })) : [],
        };
      }
      return {
        ...edge,
        ...lead,
        _id: lead._id || lead.id,
        id: lead._id || lead.id,
        salesCommercial: edge,
      };
    }
    return lead;
  }

  async create(data, user) {
    const lead = await this.repository.create({
      ...data,
      code: await nextCode('LEAD'),
      createdBy: user?.id,
      history: [{ action: 'CREATED', to: LEAD_STATUS.NEW, by: user?.id }],
    });

    // Initialize the SalesCommercial edge collection document
    try {
      const edge = await SalesCommercialModel.create({
        from: lead._id,
        lead: lead._id,
        createdBy: user?.id,
      });
      await LeadModel.findByIdAndUpdate(lead._id, { salesCommercial: edge._id });
      lead.salesCommercial = edge;
    } catch {
      // Continue even if initial edge creation fails; it will be upserted on first update
    }

    return lead;
  }

  /**
   * Step 2 : the Senior DCM has called: how many rooms, what budget, where.
   * Answers are folded back onto the lead so the pipeline reflects real numbers,
   * not the guess taken down on the first call.
   */
  async qualify(id, { qualified, budget, roomCount, location, notes, lostReason }, user) {
    const lead = await this.#load(id);

    if ([LEAD_STATUS.CONVERTED, LEAD_STATUS.LOST].includes(lead.status)) {
      throw ApiError.workflow(`Lead is already ${lead.status.toLowerCase()}`);
    }

    const previous = lead.status;
    lead.status = qualified ? LEAD_STATUS.QUALIFIED : LEAD_STATUS.UNQUALIFIED;
    lead.qualifiedBy = user?.id;
    lead.qualifiedAt = new Date();
    lead.qualificationNotes = notes;

    if (budget !== undefined) lead.budget = budget;
    if (roomCount !== undefined) lead.roomCount = roomCount;
    if (location) lead.location = location;
    if (!qualified) lead.lostReason = lostReason;

    lead.history.push({
      action: qualified ? 'QUALIFIED' : 'DISQUALIFIED',
      from: previous,
      to: lead.status,
      note: notes,
      by: user?.id,
    });

    await lead.save();
    return lead.toJSON();
  }

  /** Step 3 : "Rahul tum ye project handle karo." */
  async assign(id, { assignedDCM, note }, user) {
    const lead = await this.#load(id);

    if (lead.status === LEAD_STATUS.NEW) lead.status = LEAD_STATUS.CONTACTED;
    lead.assignedDCM = assignedDCM;
    lead.assignedAt = new Date();
    if (user?.name) lead.updatedUser = user.name;
    lead.history.push({ action: 'ASSIGNED', note, by: user?.id });

    await lead.save();
    return this.repository.findById(id);
  }

  async update(id, data, user) {
    const existing = await this.getById(id);
    const updateData = { ...data };
    if (user?.name && (!updateData.updatedUser || updateData.updatedUser === '')) {
      updateData.updatedUser = user.name;
    }

    const getDateOnlyString = (val) => {
      if (!val) return '';
      if (typeof val === 'string') {
        const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
      }
      if (val instanceof Date && !isNaN(val.getTime())) {
        const year = val.getFullYear();
        const month = String(val.getMonth() + 1).padStart(2, '0');
        const day = String(val.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return '';
      }
    };

    if (updateData.studioMeeting) {
      const mergedDueDate = updateData.studioMeeting.dueDate !== undefined ? updateData.studioMeeting.dueDate : existing.studioMeeting?.dueDate;
      const mergedActualDate = updateData.studioMeeting.date !== undefined ? updateData.studioMeeting.date : existing.studioMeeting?.date;

      if (mergedDueDate && mergedActualDate) {
        const dueDateStr = getDateOnlyString(mergedDueDate);
        const actualDateStr = getDateOnlyString(mergedActualDate);
        if (dueDateStr && actualDateStr && actualDateStr < dueDateStr) {
          throw ApiError.badRequest('Actual Meeting Date & Time cannot be earlier than the Studio Meeting Due Date.');
        }
      }
    }

    const mergedSiteVisitDueDate = updateData.siteVisitDueDate !== undefined ? updateData.siteVisitDueDate : existing.siteVisitDueDate;
    const mergedActualSiteVisitDateTime = updateData.actualSiteVisitDateTime !== undefined ? updateData.actualSiteVisitDateTime : existing.actualSiteVisitDateTime;

    if (mergedSiteVisitDueDate && mergedActualSiteVisitDateTime) {
      const dueDateStr = getDateOnlyString(mergedSiteVisitDueDate);
      const actualDateStr = getDateOnlyString(mergedActualSiteVisitDateTime);
      if (dueDateStr && actualDateStr && actualDateStr < dueDateStr) {
        throw ApiError.badRequest('Actual Site Visit Date & Time cannot be earlier than the Pre Site Visit Due Date.');
      }
    }

    if (updateData.kyc) {
      const existingKyc = existing.kyc || {};
      const statusInput = updateData.kyc.status;
      const isVerified = statusInput === 'Verified' || statusInput === 'VERIFIED';

      if (isVerified) {
        const userName = user?.name || user?.email || user?.username || 'System Admin';
        updateData.kyc.verifiedBy = userName;
        updateData.kyc.verificationDate = new Date();
        updateData.kyc.actualDate = new Date();
        updateData.kyc.status = 'Verified';
      } else {
        const wasCorrectionRequired = existingKyc.status === 'Correction Required' || existingKyc.status === 'CORRECTION_REQUIRED';
        if (wasCorrectionRequired && (!statusInput || statusInput === 'Correction Required' || statusInput === 'CORRECTION_REQUIRED')) {
          // Resubmission after correction resets status to Pending for review
          updateData.kyc.status = 'Pending';
        }
      }
    }

    // Separate SalesCommercial Edge properties from core Lead properties
    const salesData = {};
    const leadData = {};

    Object.entries(updateData).forEach(([k, v]) => {
      if (SALES_COMMERCIAL_KEYS.has(k)) {
        salesData[k] = v;
      } else {
        leadData[k] = v;
      }
    });

    let edgeDoc = null;
    if (Object.keys(salesData).length > 0) {
      edgeDoc = await SalesCommercialModel.findOneAndUpdate(
        { lead: id },
        {
          $set: salesData,
          $setOnInsert: { from: id, lead: id, createdBy: user?.id },
        },
        { new: true, upsert: true }
      ).lean();
      leadData.salesCommercial = edgeDoc._id;
    }

    let updatedLead = existing;
    if (Object.keys(leadData).length > 0) {
      updatedLead = await this.repository.update(id, leadData);
    }

    if (!edgeDoc) {
      edgeDoc = await SalesCommercialModel.findOne({ lead: id }).lean();
    }

    if (edgeDoc) {
      if (edgeDoc.costing) {
        edgeDoc.costing = {
          dueDate: edgeDoc.costing.dueDate,
          version: edgeDoc.costing.version || 'v1.0',
          category: edgeDoc.costing.category,
          price: edgeDoc.costing.price !== undefined && edgeDoc.costing.price !== null ? Number(edgeDoc.costing.price) : 0,
          costingHistory: Array.isArray(edgeDoc.costing.costingHistory) ? edgeDoc.costing.costingHistory.map((h) => ({
            version: h.version || 'v1.0',
            dueDate: h.dueDate,
            category: h.category,
            price: h.price !== undefined && h.price !== null ? Number(h.price) : 0,
            savedAt: h.savedAt,
          })) : [],
        };
      }
      return {
        ...edgeDoc,
        ...updatedLead,
        _id: updatedLead._id || updatedLead.id,
        id: updatedLead._id || updatedLead.id,
        salesCommercial: edgeDoc,
      };
    }

    return updatedLead;
  }

  /** Marks a qualified lead as converted (KYC route handles the full customer conversion flow). */
  async convert(id, _payload, user) {
    const lead = await this.#load(id);

    if (lead.status === LEAD_STATUS.CONVERTED) {
      throw ApiError.conflict(`Lead ${lead.code} has already been converted`);
    }
    if (lead.status !== LEAD_STATUS.QUALIFIED) {
      throw ApiError.workflow('Only a qualified lead can be converted. Qualify it first.');
    }

    lead.status = LEAD_STATUS.CONVERTED;
    lead.convertedAt = new Date();
    lead.history.push({ action: 'CONVERTED', to: LEAD_STATUS.CONVERTED, by: user?.id });
    await lead.save();

    if (lead.convertedProject) {
      await SalesCommercialModel.updateOne({ lead: id }, { to: lead.convertedProject });
    }

    return lead.toJSON();
  }

  async markLost(id, { reason }, user) {
    const lead = await this.#load(id);
    lead.status = LEAD_STATUS.LOST;
    lead.lostReason = reason;
    lead.history.push({ action: 'LOST', to: LEAD_STATUS.LOST, note: reason, by: user?.id });
    await lead.save();
    return lead.toJSON();
  }

  /** Logs a follow-up note directly on the lead history. */
  async addFollowUp(id, data, user) {
    const lead = await this.#load(id);

    if (data.nextFollowUpAt) {
      lead.nextFollowUpAt = data.nextFollowUpAt;
      if (lead.status === LEAD_STATUS.NEW) lead.status = LEAD_STATUS.CONTACTED;
    }

    lead.history.push({
      action: 'FOLLOW_UP',
      note: data.notes || data.subject,
      by: user?.id,
    });

    await lead.save();
    return lead.toJSON();
  }

  /** Pipeline counts by status, for the CRM funnel. */
  async pipeline() {
    const rows = await LeadModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$budget' } } },
      { $project: { _id: 0, status: '$_id', count: 1, value: 1 } },
    ]);

    const byStatus = Object.fromEntries(rows.map((row) => [row.status, row]));
    return Object.values(LEAD_STATUS).map((status) => ({
      status,
      count: byStatus[status]?.count || 0,
      value: byStatus[status]?.value || 0,
    }));
  }

  async #load(id) {
    const lead = await LeadModel.findById(id);
    if (!lead) throw ApiError.notFound('Lead not found');
    return lead;
  }
}

export default new LeadService();
export { leadRepository };

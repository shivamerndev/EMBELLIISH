import mongoose from 'mongoose';
import LeadModel from '../crm/lead/lead.model.js';
import SalesCommercialModel from './sales.model.js';

/**
 * Fetches all raw lead documents from the DB where Qualification Decision is "APPROVED"
 * along with their connected SalesCommercial edge document.
 */
const findApprovedLeads = async () => {
  const leads = await LeadModel.find({
    qualificationDecision: { $regex: /^approved$/i },
  })
    .populate('architect', 'name firm phone')
    .populate('assignedDCM', 'name email role')
    .populate('qualifiedBy', 'name email')
    .populate({
      path: 'salesCommercial',
      populate: [
        { path: 'assignedInstaller', select: 'name email role phone' },
        { path: 'measurement.measuredBy', select: 'name email' },
        { path: 'readySize.confirmedBy', select: 'name email' },
      ],
    })
    .sort({ updatedAt: -1 })
    .lean();

  const missingEdgeLeadIds = leads.filter((l) => !l.salesCommercial).map((l) => l._id);
  if (missingEdgeLeadIds.length > 0) {
    const edges = await SalesCommercialModel.find({ lead: { $in: missingEdgeLeadIds } })
      .populate('assignedInstaller', 'name email role phone')
      .populate('measurement.measuredBy', 'name email')
      .populate('readySize.confirmedBy', 'name email')
      .lean();
    const map = new Map(edges.map((e) => [String(e.lead), e]));
    leads.forEach((l) => {
      if (!l.salesCommercial && map.has(String(l._id))) {
        l.salesCommercial = map.get(String(l._id));
      }
    });
  }

  return leads;
};

const findLeadDetailById = async (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { code: id }] } : { code: id };

  const lead = await LeadModel.findOne(query)
    .populate('architect', 'name firm phone')
    .populate('assignedDCM', 'name email role')
    .populate('qualifiedBy', 'name email')
    .populate({
      path: 'salesCommercial',
      populate: [
        { path: 'assignedInstaller', select: 'name email role phone' },
        { path: 'measurement.measuredBy', select: 'name email' },
        { path: 'readySize.confirmedBy', select: 'name email' },
      ],
    })
    .lean();

  if (lead && !lead.salesCommercial) {
    const edge = await SalesCommercialModel.findOne({ lead: lead._id })
      .populate('assignedInstaller', 'name email role phone')
      .populate('measurement.measuredBy', 'name email')
      .populate('readySize.confirmedBy', 'name email')
      .lean();
    if (edge) {
      lead.salesCommercial = edge;
    }
  }

  return lead;
};

export { findApprovedLeads, findLeadDetailById };

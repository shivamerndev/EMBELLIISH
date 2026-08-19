import mongoose from 'mongoose';
import LeadModel from '../crm/lead/lead.model.js';

/**
 * Fetches all raw lead documents from the DB where Qualification Decision is "APPROVED".
 */
const findApprovedLeads = async () => {
  return LeadModel.find({
    qualificationDecision: { $regex: /^approved$/i },
  })
    .populate('architect', 'name firm phone')
    .populate('assignedDCM', 'name email role')
    .populate('assignedInstaller', 'name email role')
    .populate('qualifiedBy', 'name email')
    .populate('measurement.measuredBy', 'name email')
    .populate('readySize.confirmedBy', 'name email')
    .sort({ updatedAt: -1 })
    .lean();
};

const findLeadDetailById = async (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { code: id }] } : { code: id };

  return LeadModel.findOne(query)
    .populate('architect', 'name firm phone')
    .populate('assignedDCM', 'name email role')
    .populate('qualifiedBy', 'name email')
    .populate('measurement.measuredBy', 'name email')
    .populate('readySize.confirmedBy', 'name email')
    .lean();
};

export { findApprovedLeads, findLeadDetailById };


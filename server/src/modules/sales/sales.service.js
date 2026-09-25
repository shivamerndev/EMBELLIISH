import ApiError from '../../core/ApiError.js';
import { findApprovedLeads, findLeadDetailById } from './sales.repo.js';

/**
 * Auto-fetches all leads from the CRM Layer where Qualification Decision is "APPROVED",
 * merging the SalesCommercial edge collection data into each lead record.
 */
const fetchApprovedLeadsService = async () => {
  const leads = await findApprovedLeads();

  return leads.map((lead, index) => {
    const edge = lead.salesCommercial || {};
    const isSiteVisitRequired = (edge.siteVisitRequired ?? lead.siteVisitRequired) !== false;

    return {
      ...edge,
      ...lead,
      _id: lead._id,
      id: lead._id,
      edgeId: edge._id || edge.id,
      sno: index + 1,
      code: lead.code || '',
      clientName: lead.clientName || '',
      architectName: lead.architectName || lead.architect?.name || '',
      location: lead.location || '',
      siteVisitRequired: isSiteVisitRequired,
      siteVisitDueDate: edge.siteVisitDueDate || lead.siteVisitDueDate,
      actualSiteVisitDateTime: edge.actualSiteVisitDateTime || lead.actualSiteVisitDateTime,
      siteAddress: edge.siteAddress || lead.siteAddress || lead.location || '',
      assignedInstaller: edge.assignedInstaller || lead.assignedInstaller,
      measurement: edge.measurement || lead.measurement,
      studioMeeting: edge.studioMeeting || lead.studioMeeting,
      readySize: edge.readySize || lead.readySize,
      consumption: edge.consumption || lead.consumption,
      proposal: edge.proposal || lead.proposal,
      advance: edge.advance || lead.advance,
      costing: edge.costing || lead.costing,
      quotation: edge.quotation || lead.quotation,
      approval: edge.approval || lead.approval,
      presentation: edge.presentation || lead.presentation,
      kyc: edge.kyc || lead.kyc,
      salesCommercial: edge,
    };
  });
};

const getLeadDetailService = async (id) => {
  const lead = await findLeadDetailById(id);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }
  const edge = lead.salesCommercial || {};
  return {
    ...edge,
    ...lead,
    _id: lead._id,
    id: lead._id,
    salesCommercial: edge,
  };
};

export { fetchApprovedLeadsService, getLeadDetailService };
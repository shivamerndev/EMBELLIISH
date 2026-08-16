import ApiError from '../../core/ApiError.js';
import { findApprovedLeads, findLeadDetailById } from './sales.repo.js';

/**
 * Auto-fetches all leads from the CRM Layer where Qualification Decision is "APPROVED".
 * Site Visit status is handled conditionally based on whether siteVisitRequired is true or false.
 */
const fetchApprovedLeadsService = async () => {
  const leads = await findApprovedLeads();

  return leads.map((lead, index) => {
    const isSiteVisitRequired = lead.siteVisitRequired !== false;

    return {
      ...lead,
      _id: lead._id,
      id: lead._id,
      sno: index + 1,
      code: lead.code || '',
      clientName: lead.clientName || '',
      architectName: lead.architectName || lead.architect?.name || '',
      location: lead.location || '',
      siteVisitRequired: isSiteVisitRequired,
      siteVisitDueDate: lead.siteVisitDueDate,
      actualSiteVisitDateTime: lead.actualSiteVisitDateTime,
      siteAddress: lead.siteAddress || lead.location || '',
      assignedInstaller: lead.assignedInstaller,
    };
  });
};

const getLeadDetailService = async (id) => {
  const lead = await findLeadDetailById(id);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }
  return lead;
};

export { fetchApprovedLeadsService, getLeadDetailService };
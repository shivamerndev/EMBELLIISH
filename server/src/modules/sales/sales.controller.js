import { sendSuccess } from '../../utils/responseHandler.js';
import { fetchApprovedLeadsService, getLeadDetailService } from './sales.service.js';

const fetchApprovedLeads = async (req, res, next) => {
  try {
    let leads = await fetchApprovedLeadsService();
    return sendSuccess(res, 'Leads fetched successfully', leads, 200);
  } catch (error) {
    next(error);
  }
};


const getLeadDetail = async (req, res, next) => {
  try {
    let { id } = req.params;
    let lead = await getLeadDetailService(id);
    return sendSuccess(res, 'Lead fetched successfully', lead, 200);
  } catch (error) {
    next(error);
  }
};

export { fetchApprovedLeads, getLeadDetail };


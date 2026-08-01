import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import leadService from './lead.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class LeadController extends BaseController {
  constructor() {
    super(leadService, 'Lead');

    this.qualify = asyncHandler(async (req, res) => {
      const data = await leadService.qualify(req.params.id, req.validated, req.user);
      return sendSuccess(res, `Lead marked ${data.status.toLowerCase()}`, data);
    });

    this.assign = asyncHandler(async (req, res) => {
      const data = await leadService.assign(req.params.id, req.validated, req.user);
      return sendSuccess(res, 'Lead assigned', data);
    });

    this.convert = asyncHandler(async (req, res) => {
      const data = await leadService.convert(req.params.id, req.validated, req.user);
      return sendSuccess(res, `Lead converted — project ${data.project.code} created`, data, 201);
    });

    this.markLost = asyncHandler(async (req, res) => {
      const data = await leadService.markLost(req.params.id, req.validated, req.user);
      return sendSuccess(res, 'Lead marked lost', data);
    });

    this.addFollowUp = asyncHandler(async (req, res) => {
      const data = await leadService.addFollowUp(req.params.id, req.validated, req.user);
      return sendSuccess(res, 'Follow-up recorded', data, 201);
    });

    this.pipeline = asyncHandler(async (req, res) => {
      const data = await leadService.pipeline();
      return sendSuccess(res, 'Lead pipeline retrieved', data);
    });
  }
}

export default new LeadController();

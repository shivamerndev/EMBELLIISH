import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import qcService from './qc.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class QCController extends BaseController {
  constructor() {
    super(qcService, 'QC check');

    this.inspect = asyncHandler(async (req, res) => {
      const data = await qcService.inspect(req.params.productionOrderId, req.body || {}, req.user);
      const message =
        data.check.result === 'PASS'
          ? 'QC passed — piece cleared for packing'
          : 'QC failed — rework order raised';
      return sendSuccess(res, message, data, 201);
    });

    this.summary = asyncHandler(async (req, res) => {
      const data = await qcService.projectSummary(req.params.projectId);
      return sendSuccess(res, 'QC summary retrieved', data);
    });
  }
}

export default new QCController();

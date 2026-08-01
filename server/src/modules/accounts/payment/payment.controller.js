import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import paymentService from './payment.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class PaymentController extends BaseController {
  constructor() {
    super(paymentService, 'Payment');

    this.clear = asyncHandler(async (req, res) => {
      const data = await paymentService.clear(req.params.id, req.validated, req.user);
      return sendSuccess(res, 'Payment marked cleared', data);
    });

    this.bounce = asyncHandler(async (req, res) => {
      const data = await paymentService.bounce(req.params.id, req.validated, req.user);
      return sendSuccess(res, 'Payment marked bounced and reversed', data);
    });

    this.summary = asyncHandler(async (req, res) => {
      const data = await paymentService.projectSummary(req.params.projectId);
      return sendSuccess(res, 'Payment summary retrieved', data);
    });
  }
}

export default new PaymentController();

import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import quotationService from './quotation.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class QuotationController extends BaseController {
  constructor() {
    super(quotationService, 'Quotation');

    this.generate = asyncHandler(async (req, res) => {
      const data = await quotationService.generateFromBOQ(req.params.projectId, req.body || {}, req.user);
      return sendSuccess(res, `Quotation ${data.code} generated`, data, 201);
    });

    this.send = asyncHandler(async (req, res) => {
      const data = await quotationService.send(req.params.id, req.user);
      return sendSuccess(res, 'Quotation sent to client', data);
    });

    this.approve = asyncHandler(async (req, res) => {
      const data = await quotationService.approve(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Quotation approved — token invoice raised', data);
    });

    /** Step 7 — the founder clears (or refuses) a discount past the house limit. */
    this.approveDiscount = asyncHandler(async (req, res) => {
      const data = await quotationService.decideDiscount(
        req.params.id,
        { approved: true, note: req.body?.note },
        req.user
      );
      return sendSuccess(res, 'Discount approved', data);
    });

    this.rejectDiscount = asyncHandler(async (req, res) => {
      const data = await quotationService.decideDiscount(
        req.params.id,
        { approved: false, note: req.body?.note },
        req.user
      );
      return sendSuccess(res, 'Discount rejected', data);
    });

    this.reject = asyncHandler(async (req, res) => {
      const data = await quotationService.reject(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Quotation rejected', data);
    });
  }
}

export default new QuotationController();

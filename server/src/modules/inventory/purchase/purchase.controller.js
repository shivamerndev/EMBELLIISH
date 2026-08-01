import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import purchaseService from './purchase.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class PurchaseController extends BaseController {
  constructor() {
    super(purchaseService, 'Purchase order');

    this.generate = asyncHandler(async (req, res) => {
      const data = await purchaseService.generateFromShortfall(req.params.projectId, req.body || {}, req.user);
      return sendSuccess(res, data.message, data, data.created ? 201 : 200);
    });

    this.issue = asyncHandler(async (req, res) => {
      const data = await purchaseService.issue(req.params.id, req.user);
      return sendSuccess(res, 'Purchase order issued to vendor', data);
    });

    this.receive = asyncHandler(async (req, res) => {
      const data = await purchaseService.receiveMaterial(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Material received and stock updated', data);
    });

    this.pay = asyncHandler(async (req, res) => {
      const data = await purchaseService.recordVendorPayment(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Vendor payment recorded', data);
    });

    this.cancel = asyncHandler(async (req, res) => {
      const data = await purchaseService.cancel(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Purchase order cancelled', data);
    });
  }
}

export default new PurchaseController();

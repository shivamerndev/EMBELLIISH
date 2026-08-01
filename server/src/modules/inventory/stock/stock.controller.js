import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import stockService from './stock.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class StockController extends BaseController {
  constructor() {
    super(stockService, 'Stock');

    this.receive = asyncHandler(async (req, res) => {
      const data = await stockService.receive(req.validated, req.user);
      return sendSuccess(res, 'Stock received', data, 201);
    });

    this.issue = asyncHandler(async (req, res) => {
      const data = await stockService.issue(req.validated, req.user);
      return sendSuccess(res, 'Stock issued', data);
    });

    this.reserve = asyncHandler(async (req, res) => {
      const data = await stockService.reserve(req.validated, req.user);
      return sendSuccess(res, 'Stock reserved', data);
    });

    this.release = asyncHandler(async (req, res) => {
      const data = await stockService.release(req.validated, req.user);
      return sendSuccess(res, 'Reservation released', data);
    });

    this.adjust = asyncHandler(async (req, res) => {
      const data = await stockService.adjust(req.validated, req.user);
      return sendSuccess(res, 'Stock adjusted', data);
    });

    this.availability = asyncHandler(async (req, res) => {
      const data = await stockService.checkProjectAvailability(req.params.projectId);
      return sendSuccess(
        res,
        data.shortages.length ? `${data.shortages.length} item(s) short` : 'All material available',
        data
      );
    });

    this.reserveForProject = asyncHandler(async (req, res) => {
      const data = await stockService.reserveForProject(req.params.projectId, req.user);
      return sendSuccess(res, 'Material reserved for project', data);
    });

    this.lowStock = asyncHandler(async (req, res) => {
      const data = await stockService.lowStock();
      return sendSuccess(res, 'Low stock items retrieved', data);
    });

    this.movements = asyncHandler(async (req, res) => {
      const data = await stockService.movements(req.query);
      return sendSuccess(res, 'Stock ledger retrieved', data);
    });
  }
}

export default new StockController();

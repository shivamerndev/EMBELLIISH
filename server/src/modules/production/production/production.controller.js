import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import productionService from './production.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class ProductionController extends BaseController {
  constructor() {
    super(productionService, 'Production order');

    this.generate = asyncHandler(async (req, res) => {
      const data = await productionService.generateFromBOQ(req.params.projectId, req.body || {}, req.user);
      return sendSuccess(res, `${data.count} work order(s) released to the factory`, data, 201);
    });

    this.advance = asyncHandler(async (req, res) => {
      const data = await productionService.advanceStage(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, `Work order moved to ${data.stage}`, data);
    });

    this.bulkAdvance = asyncHandler(async (req, res) => {
      const data = await productionService.bulkAdvance(req.body || {}, req.user);
      return sendSuccess(res, `${data.advanced} work order(s) advanced`, data);
    });

    this.rework = asyncHandler(async (req, res) => {
      const data = await productionService.createRework(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Rework order created', data, 201);
    });

    this.board = asyncHandler(async (req, res) => {
      const data = await productionService.board(req.params.projectId);
      return sendSuccess(res, 'Production board retrieved', data);
    });
  }
}

export default new ProductionController();

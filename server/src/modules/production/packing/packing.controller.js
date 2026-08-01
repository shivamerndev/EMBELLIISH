import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import packingService from './packing.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class PackingController extends BaseController {
  constructor() {
    super(packingService, 'Packing box');

    this.packByRoom = asyncHandler(async (req, res) => {
      const data = await packingService.packByRoom(req.params.projectId, req.user);
      return sendSuccess(res, `${data.count} box(es) packed room-wise`, data, 201);
    });

    this.packingList = asyncHandler(async (req, res) => {
      const data = await packingService.packingList(req.params.projectId);
      return sendSuccess(res, 'Packing list retrieved', data);
    });

    this.addContent = asyncHandler(async (req, res) => {
      const data = await packingService.addContent(req.params.id, req.body, req.user);
      return sendSuccess(res, 'Item added to box', data);
    });

    this.verify = asyncHandler(async (req, res) => {
      const data = await packingService.verifyOnSite(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Box contents verified on site', data);
    });
  }
}

export default new PackingController();

import crudRouter from '../../../core/crudRouter.js';
import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import snagService from './snag.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

class SnagController extends BaseController {
  constructor() {
    super(snagService, 'Snag');

    this.ready = asyncHandler(async (req, res) => {
      const data = await snagService.markReady(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Snag marked ready for refitting', data);
    });

    this.close = asyncHandler(async (req, res) => {
      const data = await snagService.close(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Snag closed', data);
    });

    this.summary = asyncHandler(async (req, res) => {
      const data = await snagService.projectSummary(req.params.projectId);
      return sendSuccess(res, 'Snag summary retrieved', data);
    });
  }
}

const snagController = new SnagController();

export default crudRouter({
  controller: snagController,
  viewPermission: PERMISSIONS.PROJECT_VIEW,
  managePermission: PERMISSIONS.INSTALL_MANAGE,
  extend: (router, { canView, canManage }) => {
    router.get('/project/:projectId/summary', ...canView, snagController.summary);
    router.post('/:id/ready', ...canManage, snagController.ready);
    router.post('/:id/close', ...canManage, snagController.close);
  },
});

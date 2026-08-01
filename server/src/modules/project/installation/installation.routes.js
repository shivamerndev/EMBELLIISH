import crudRouter from '../../../core/crudRouter.js';
import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import installationService from './installation.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

class InstallationController extends BaseController {
  constructor() {
    super(installationService, 'Installation');

    this.start = asyncHandler(async (req, res) => {
      const data = await installationService.start(req.params.id, req.user);
      return sendSuccess(res, 'Installation started', data);
    });

    this.complete = asyncHandler(async (req, res) => {
      const data = await installationService.complete(req.params.id, req.body || {}, req.user);
      return sendSuccess(
        res,
        data.status === 'COMPLETED' ? 'Installation complete' : 'Installation partially complete',
        data
      );
    });

    this.summary = asyncHandler(async (req, res) => {
      const data = await installationService.projectSummary(req.params.projectId);
      return sendSuccess(res, 'Installation summary retrieved', data);
    });
  }
}

const installationController = new InstallationController();

export default crudRouter({
  controller: installationController,
  viewPermission: PERMISSIONS.INSTALL_VIEW,
  managePermission: PERMISSIONS.INSTALL_MANAGE,
  extend: (router, { canView, canManage }) => {
    router.get('/project/:projectId/summary', ...canView, installationController.summary);
    router.post('/:id/start', ...canManage, installationController.start);
    router.post('/:id/complete', ...canManage, installationController.complete);
  },
});

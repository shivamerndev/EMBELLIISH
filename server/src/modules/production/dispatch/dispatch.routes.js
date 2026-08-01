import crudRouter from '../../../core/crudRouter.js';
import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import dispatchService from './dispatch.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

class DispatchController extends BaseController {
  constructor() {
    super(dispatchService, 'Dispatch');

    this.deliver = asyncHandler(async (req, res) => {
      const data = await dispatchService.markDelivered(req.params.id, req.body || {}, req.user);
      return sendSuccess(res, 'Dispatch marked delivered', data);
    });
  }
}

const dispatchController = new DispatchController();

export default crudRouter({
  controller: dispatchController,
  viewPermission: PERMISSIONS.PRODUCTION_VIEW,
  managePermission: PERMISSIONS.PRODUCTION_MANAGE,
  extend: (router, { canManage }) => {
    router.post('/:id/deliver', ...canManage, dispatchController.deliver);
  },
});

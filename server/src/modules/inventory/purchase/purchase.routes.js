import crudRouter from '../../../core/crudRouter.js';
import purchaseController from './purchase.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

export default crudRouter({
  controller: purchaseController,
  viewPermission: PERMISSIONS.INVENTORY_VIEW,
  managePermission: PERMISSIONS.PURCHASE_MANAGE,
  extend: (router, { canManage }) => {
    router.post('/project/:projectId/generate', ...canManage, purchaseController.generate);
    router.post('/:id/issue', ...canManage, purchaseController.issue);
    router.post('/:id/receive', ...canManage, purchaseController.receive);
    router.post('/:id/pay', ...canManage, purchaseController.pay);
    router.post('/:id/cancel', ...canManage, purchaseController.cancel);
  },
});

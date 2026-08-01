import crudRouter from '../../../core/crudRouter.js';
import { requirePermission } from '../../../middlewares/role.middleware.js';
import quotationController from './quotation.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

export default crudRouter({
  controller: quotationController,
  viewPermission: PERMISSIONS.CRM_VIEW,
  managePermission: PERMISSIONS.CRM_MANAGE,
  extend: (router, { canManage }) => {
    router.post('/project/:projectId/generate', ...canManage, quotationController.generate);
    router.post('/:id/send', ...canManage, quotationController.send);
    router.post('/:id/approve', ...canManage, quotationController.approve);
    router.post('/:id/reject', ...canManage, quotationController.reject);

    /**
     * Step 7 — the founder's call on an over-limit discount. Guarded by
     * `discount:approve` rather than `crm:manage`, so the DCM who asked for the
     * concession cannot grant it to themselves.
     */
    const canApproveDiscount = requirePermission(PERMISSIONS.DISCOUNT_APPROVE);
    router.post('/:id/discount/approve', canApproveDiscount, quotationController.approveDiscount);
    router.post('/:id/discount/reject', canApproveDiscount, quotationController.rejectDiscount);
  },
});

import crudRouter from '../../../core/crudRouter.js';
import validate from '../../../middlewares/validate.middleware.js';
import paymentController from './payment.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import {
  createPaymentSchema,
  updatePaymentSchema,
  clearPaymentSchema,
  bouncePaymentSchema,
} from './payment.validation.js';

export default crudRouter({
  controller: paymentController,
  viewPermission: PERMISSIONS.ACCOUNTS_VIEW,
  managePermission: PERMISSIONS.ACCOUNTS_MANAGE,
  createSchema: createPaymentSchema,
  updateSchema: updatePaymentSchema,
  extend: (router, { canView, canManage }) => {
    router.get('/project/:projectId/summary', ...canView, paymentController.summary);
    router.post('/:id/clear', ...canManage, validate(clearPaymentSchema), paymentController.clear);
    router.post('/:id/bounce', ...canManage, validate(bouncePaymentSchema), paymentController.bounce);
  },
});

import crudRouter from '../../../core/crudRouter.js';
import qcController from './qc.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

export default crudRouter({
  controller: qcController,
  viewPermission: PERMISSIONS.PRODUCTION_VIEW,
  managePermission: PERMISSIONS.QC_MANAGE,
  extend: (router, { canView, canManage }) => {
    router.get('/project/:projectId/summary', ...canView, qcController.summary);
    router.post('/production-order/:productionOrderId/inspect', ...canManage, qcController.inspect);
  },
});

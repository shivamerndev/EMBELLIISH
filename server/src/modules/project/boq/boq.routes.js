import crudRouter from '../../../core/crudRouter.js';
import boqController from './boq.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

export default crudRouter({
  controller: boqController,
  viewPermission: PERMISSIONS.BOQ_VIEW,
  managePermission: PERMISSIONS.BOQ_MANAGE,
  extend: (router, { canView, canManage }) => {
    // Live recalculation while the coordinator is still typing measurements.
    router.post('/project/:projectId/preview', ...canView, boqController.preview);
    router.get('/project/:projectId/current', ...canView, boqController.current);
    router.get('/project/:projectId/export.csv', ...canView, boqController.exportCsv);
    router.post('/project/:projectId/generate', ...canManage, boqController.generate);
    router.post('/:id/approve', ...canManage, boqController.approve);
  },
});

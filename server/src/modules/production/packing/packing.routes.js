import crudRouter from '../../../core/crudRouter.js';
import packingController from './packing.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

export default crudRouter({
  controller: packingController,
  viewPermission: PERMISSIONS.PRODUCTION_VIEW,
  managePermission: PERMISSIONS.PRODUCTION_MANAGE,
  extend: (router, { canView, canManage }) => {
    router.get('/project/:projectId/list', ...canView, packingController.packingList);
    router.post('/project/:projectId/pack', ...canManage, packingController.packByRoom);
    router.post('/:id/contents', ...canManage, packingController.addContent);
    router.post('/:id/verify', ...canView, packingController.verify);
  },
});

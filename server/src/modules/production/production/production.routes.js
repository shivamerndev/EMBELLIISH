import crudRouter from '../../../core/crudRouter.js';
import productionController from './production.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

export default crudRouter({
  controller: productionController,
  viewPermission: PERMISSIONS.PRODUCTION_VIEW,
  managePermission: PERMISSIONS.PRODUCTION_MANAGE,
  extend: (router, { canView, canManage }) => {
    router.get('/project/:projectId/board', ...canView, productionController.board);
    router.post('/project/:projectId/generate', ...canManage, productionController.generate);
    router.post('/bulk-advance', ...canManage, productionController.bulkAdvance);
    router.post('/:id/advance', ...canManage, productionController.advance);
    router.post('/:id/rework', ...canManage, productionController.rework);
  },
});

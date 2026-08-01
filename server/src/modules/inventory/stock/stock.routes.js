import crudRouter from '../../../core/crudRouter.js';
import validate from '../../../middlewares/validate.middleware.js';
import stockController from './stock.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { movementSchema, adjustSchema, updateStockSchema } from './stock.validation.js';

export default crudRouter({
  controller: stockController,
  viewPermission: PERMISSIONS.INVENTORY_VIEW,
  managePermission: PERMISSIONS.INVENTORY_MANAGE,
  updateSchema: updateStockSchema,
  extend: (router, { canView, canManage }) => {
    router.get('/low-stock', ...canView, stockController.lowStock);
    router.get('/movements', ...canView, stockController.movements);
    router.get('/project/:projectId/availability', ...canView, stockController.availability);

    router.post('/receive', ...canManage, validate(movementSchema), stockController.receive);
    router.post('/issue', ...canManage, validate(movementSchema), stockController.issue);
    router.post('/reserve', ...canManage, validate(movementSchema), stockController.reserve);
    router.post('/release', ...canManage, validate(movementSchema), stockController.release);
    router.post('/adjust', ...canManage, validate(adjustSchema), stockController.adjust);
    router.post('/project/:projectId/reserve', ...canManage, stockController.reserveForProject);
  },
});

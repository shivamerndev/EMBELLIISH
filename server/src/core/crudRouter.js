import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';

/**
 * Builds the standard five-verb router for a module.
 *
 * @param {BaseController} controller
 * @param {object}   options
 * @param {string}   options.viewPermission   permission required to read
 * @param {string}   options.managePermission permission required to write
 * @param {ZodType}  [options.createSchema]
 * @param {ZodType}  [options.updateSchema]
 * @param {function} [options.extend] hook to register module-specific routes
 *                   *before* the generic `/:id` routes, so they are not shadowed.
 */
const crudRouter = ({
  controller,
  viewPermission,
  managePermission,
  createSchema,
  updateSchema,
  extend,
}) => {
  const router = express.Router();
  router.use(authMiddleware);

  const canView = viewPermission ? [requirePermission(viewPermission)] : [];
  const canManage = managePermission ? [requirePermission(managePermission)] : [];

  router.get('/', ...canView, controller.list);
  if (extend) extend(router, { canView, canManage });

  router.get('/:id', ...canView, controller.getById);
  router.post('/', ...canManage, ...(createSchema ? [validate(createSchema)] : []), controller.create);
  router.put('/:id', ...canManage, ...(updateSchema ? [validate(updateSchema)] : []), controller.update);
  router.patch('/:id', ...canManage, ...(updateSchema ? [validate(updateSchema)] : []), controller.update);
  router.delete('/:id', ...canManage, controller.remove);

  return router;
};

export default crudRouter;

import BaseRepository from './BaseRepository.js';
import BaseService from './BaseService.js';
import BaseController from './BaseController.js';
import crudRouter from './crudRouter.js';

/**
 * Wires the standard repository → service → controller → router chain for modules
 * whose behaviour really is plain CRUD (catalogues, master data, reference lists).
 *
 * Modules with business rules — projects, BOQs, payments, production — define
 * those layers explicitly instead; this exists so the boring ones do not need
 * four near-identical files each.
 *
 * @returns {{repository, service, controller, router}}
 */
const defineModule = ({
  model,
  label,
  filterable = [],
  searchable = [],
  populate = [],
  defaultSort = '-createdAt',
  viewPermission,
  managePermission,
  createSchema,
  updateSchema,
  /** Optional subclass hooks. */
  serviceClass = BaseService,
  controllerClass = BaseController,
  extend,
}) => {
  const repository = new BaseRepository(model, { filterable, searchable, populate, defaultSort });
  const service = new serviceClass(repository, label);
  const controller = new controllerClass(service, label);

  const router = crudRouter({
    controller,
    viewPermission,
    managePermission,
    createSchema,
    updateSchema,
    extend: extend ? (r, ctx) => extend(r, { ...ctx, controller, service }) : undefined,
  });

  return { repository, service, controller, router };
};

export default defineModule;

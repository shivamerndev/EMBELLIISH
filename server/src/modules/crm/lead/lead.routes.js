import crudRouter from '../../../core/crudRouter.js';
import validate from '../../../middlewares/validate.middleware.js';
import leadController from './lead.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import {
  createLeadSchema,
  updateLeadSchema,
  qualifyLeadSchema,
  assignLeadSchema,
  convertLeadSchema,
  followUpSchema,
  lostLeadSchema,
} from './lead.validation.js';

export default crudRouter({
  controller: leadController,
  viewPermission: PERMISSIONS.CRM_VIEW,
  managePermission: PERMISSIONS.CRM_MANAGE,
  createSchema: createLeadSchema,
  updateSchema: updateLeadSchema,
  extend: (router, { canView, canManage }) => {
    router.get('/pipeline', ...canView, leadController.pipeline);
    router.post('/:id/qualify', ...canManage, validate(qualifyLeadSchema), leadController.qualify);
    router.post('/:id/assign', ...canManage, validate(assignLeadSchema), leadController.assign);
    router.post('/:id/convert', ...canManage, validate(convertLeadSchema), leadController.convert);
    router.post('/:id/lost', ...canManage, validate(lostLeadSchema), leadController.markLost);
    router.post('/:id/followups', ...canManage, validate(followUpSchema), leadController.addFollowUp);
  },
});

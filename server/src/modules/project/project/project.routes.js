import crudRouter from '../../../core/crudRouter.js';
import validate from '../../../middlewares/validate.middleware.js';
import projectController from './project.controller.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import {
  createProjectSchema,
  updateProjectSchema,
  advanceStageSchema,
  holdSchema,
  assignTeamSchema,
  closeProjectSchema,
} from './project.validation.js';

export default crudRouter({
  controller: projectController,
  viewPermission: PERMISSIONS.PROJECT_VIEW,
  managePermission: PERMISSIONS.PROJECT_MANAGE,
  createSchema: createProjectSchema,
  updateSchema: updateProjectSchema,
  extend: (router, { canView, canManage }) => {
    router.get('/:id/workspace', ...canView, projectController.workspace);
    router.get('/:id/stage-status', ...canView, projectController.stageStatus);
    router.post('/:id/advance', ...canManage, validate(advanceStageSchema), projectController.advance);
    router.post('/:id/hold', ...canManage, validate(holdSchema), projectController.hold);
    router.post('/:id/assign', ...canManage, validate(assignTeamSchema), projectController.assign);
    router.post('/:id/close', ...canManage, validate(closeProjectSchema), projectController.close);
  },
});

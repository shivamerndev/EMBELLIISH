import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import projectService from './project.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class ProjectController extends BaseController {
  constructor() {
    super(projectService, 'Project');

    this.workspace = asyncHandler(async (req, res) => {
      const data = await projectService.getWorkspace(req.params.id);
      return sendSuccess(res, 'Project workspace loaded', data);
    });

    this.stageStatus = asyncHandler(async (req, res) => {
      const data = await projectService.getStageStatus(req.params.id);
      return sendSuccess(res, 'Stage status retrieved', data);
    });

    this.advance = asyncHandler(async (req, res) => {
      const data = await projectService.advanceStage(req.params.id, req.body, req.user);
      return sendSuccess(res, `Project moved to ${data.stageLabel}`, data);
    });

    this.hold = asyncHandler(async (req, res) => {
      const data = await projectService.setHold(req.params.id, req.body, req.user);
      return sendSuccess(res, data.isOnHold ? 'Project put on hold' : 'Project resumed', data);
    });

    this.assign = asyncHandler(async (req, res) => {
      const data = await projectService.assignTeam(req.params.id, req.body, req.user);
      return sendSuccess(res, 'Project team updated', data);
    });

    this.close = asyncHandler(async (req, res) => {
      const data = await projectService.close(req.params.id, req.body, req.user);
      return sendSuccess(res, 'Project closed and archived', data);
    });
  }
}

export default new ProjectController();

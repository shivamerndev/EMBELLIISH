import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import asyncHandler from '../../../core/asyncHandler.js';
import ApiError from '../../../core/ApiError.js';
import DrawingModel from './drawing.model.js';
import ProjectModel from '../project/project.model.js';
import projectService from '../project/project.service.js';
import { nextCode } from '../../../core/sequence.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { APPROVAL_STATUS } from '../../../constants/workflow.constants.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../project/project.validation.js';

const drawingSchema = z.object({
  project: objectId,
  room: objectId.optional(),
  window: objectId.optional(),
  title: z.string().min(2, 'Drawing title is required'),
  trackType: z.string().optional(),
  trackLengthInch: z.coerce.number().nonnegative().optional(),
  bracketType: z.string().optional(),
  bracketCount: z.coerce.number().int().nonnegative().optional(),
  pelmetDepthInch: z.coerce.number().nonnegative().optional(),
  pelmetDropInch: z.coerce.number().nonnegative().optional(),
  finishedHeightInch: z.coerce.number().nonnegative().optional(),
  floorClearanceInch: z.coerce.number().nonnegative().optional(),
  motorPosition: z.enum(['LEFT', 'RIGHT', 'CENTRE', 'NONE']).optional(),
  powerPointPosition: z.string().optional(),
  openingType: z.enum(['CENTRE_OPEN', 'LEFT_DRAW', 'RIGHT_DRAW', 'FIXED']).optional(),
  files: z.array(z.record(z.any())).optional(),
  notes: z.string().optional(),
});

class DrawingService extends BaseService {
  async create(data, user) {
    const project = await ProjectModel.findById(data.project).lean();
    if (!project) throw ApiError.notFound('Project not found');
    if (!project.isActivated) {
      throw ApiError.workflow('Execution drawings are only prepared once the project is active');
    }

    return this.repository.create({
      ...data,
      code: await nextCode('DWG'),
      preparedBy: user?.id,
      history: [{ action: 'CREATED', by: user?.id }],
    });
  }

  /** An approved drawing is what lets purchase begin. */
  async approve(id, user) {
    const drawing = await DrawingModel.findById(id);
    if (!drawing) throw ApiError.notFound('Drawing not found');

    drawing.status = APPROVAL_STATUS.APPROVED;
    drawing.approvedBy = user?.id;
    drawing.approvedAt = new Date();
    drawing.history.push({ action: 'APPROVED', by: user?.id });
    await drawing.save();

    await projectService.tryAutoAdvance(drawing.project, user, `Drawing ${drawing.code} approved`);

    return drawing.toJSON();
  }
}

const { router, service } = defineModule({
  model: DrawingModel,
  label: 'Execution drawing',
  filterable: ['project', 'room', 'status', 'isCurrent'],
  searchable: ['title', 'code'],
  viewPermission: PERMISSIONS.PROJECT_VIEW,
  managePermission: PERMISSIONS.DRAWING_MANAGE,
  createSchema: drawingSchema,
  updateSchema: drawingSchema.partial().omit({ project: true }),
  serviceClass: DrawingService,
  extend: (r, { canManage }) => {
    r.post('/:id/approve', ...canManage, asyncHandler(async (req, res) =>
      sendSuccess(res, 'Execution drawing approved', await service.approve(req.params.id, req.user))
    ));
  },
});

export default router;

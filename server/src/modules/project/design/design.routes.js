import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import asyncHandler from '../../../core/asyncHandler.js';
import ApiError from '../../../core/ApiError.js';
import DesignModel from './design.model.js';
import RoomModel from '../room/room.model.js';
import projectService from '../project/project.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { APPROVAL_STATUS } from '../../../constants/workflow.constants.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../project/project.validation.js';

const designSchema = z.object({
  project: objectId,
  room: objectId.optional(),
  title: z.string().optional(),
  fabric: objectId.optional(),
  fabricName: z.string().optional(),
  sheerFabric: objectId.optional(),
  trackType: z.string().optional(),
  motorised: z.boolean().optional(),
  motor: objectId.optional(),
  accessories: z.array(objectId).optional(),
  tieback: z.string().optional(),
  colourScheme: z.string().optional(),
  description: z.string().optional(),
  renders: z.array(z.record(z.any())).optional(),
  samples: z.array(z.record(z.any())).optional(),
});

class DesignService extends BaseService {
  async create(data, user) {
    const room = data.room ? await RoomModel.findById(data.room).lean() : null;

    // A new design for the same room supersedes the previous version rather than
    // sitting alongside it, so "current" always means one thing.
    const previous = data.room
      ? await DesignModel.findOne({ project: data.project, room: data.room, isCurrent: true }).lean()
      : null;
    if (previous) await DesignModel.updateOne({ _id: previous._id }, { $set: { isCurrent: false } });

    return this.repository.create({
      ...data,
      roomName: room?.name,
      version: (previous?.version || 0) + 1,
      isCurrent: true,
      designedBy: user?.id,
      history: [{ action: 'CREATED', by: user?.id }],
    });
  }

  async present(id, user) {
    const design = await this.getById(id);
    return this.repository.update(design._id, {
      status: APPROVAL_STATUS.SENT,
      presentedAt: new Date(),
      $push: { history: { action: 'PRESENTED', by: user?.id } },
    });
  }

  /** Step 11 — client approves, and the ERP stores the version. */
  async approve(id, { approvedByClient } = {}, user) {
    const design = await DesignModel.findById(id);
    if (!design) throw ApiError.notFound('Design not found');
    if (!design.isCurrent) throw ApiError.workflow('Only the current version can be approved');

    design.status = APPROVAL_STATUS.APPROVED;
    design.approvedAt = new Date();
    design.approvedByClient = approvedByClient;
    design.history.push({ action: 'APPROVED', note: approvedByClient, by: user?.id });
    await design.save();

    await projectService.tryAutoAdvance(design.project, user, `Design approved for ${design.roomName || 'project'}`);

    return design.toJSON();
  }

  async requestRevision(id, { revisionNotes }, user) {
    const design = await DesignModel.findById(id);
    if (!design) throw ApiError.notFound('Design not found');

    design.status = APPROVAL_STATUS.REVISED;
    design.revisionNotes = revisionNotes;
    design.history.push({ action: 'REVISION_REQUESTED', note: revisionNotes, by: user?.id });
    await design.save();

    return design.toJSON();
  }
}

const { router, service } = defineModule({
  model: DesignModel,
  label: 'Design',
  filterable: ['project', 'room', 'status', 'isCurrent'],
  searchable: ['title', 'roomName', 'fabricName'],
  populate: [{ path: 'fabric', select: 'name colour' }],
  viewPermission: PERMISSIONS.PROJECT_VIEW,
  managePermission: PERMISSIONS.DESIGN_MANAGE,
  createSchema: designSchema,
  updateSchema: designSchema.partial().omit({ project: true }),
  serviceClass: DesignService,
  extend: (r, { canManage }) => {
    r.post('/:id/present', ...canManage, asyncHandler(async (req, res) =>
      sendSuccess(res, 'Design presented to client', await service.present(req.params.id, req.user))
    ));
    r.post('/:id/approve', ...canManage, asyncHandler(async (req, res) =>
      sendSuccess(res, 'Design approved by client', await service.approve(req.params.id, req.body || {}, req.user))
    ));
    r.post('/:id/revise', ...canManage, asyncHandler(async (req, res) =>
      sendSuccess(res, 'Revision requested', await service.requestRevision(req.params.id, req.body || {}, req.user))
    ));
  },
});

export default router;

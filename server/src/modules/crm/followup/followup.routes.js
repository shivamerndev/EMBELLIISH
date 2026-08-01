import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import asyncHandler from '../../../core/asyncHandler.js';
import FollowUpModel from './followup.model.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../../project/project/project.validation.js';

const followupSchema = z.object({
  lead: objectId.optional(),
  client: objectId.optional(),
  project: objectId.optional(),
  type: z.enum(['CALL', 'MEETING', 'SITE_VISIT', 'WHATSAPP', 'EMAIL', 'REMINDER']).optional(),
  subject: z.string().min(2, 'Subject is required'),
  notes: z.string().optional(),
  outcome: z
    .enum(['INTERESTED', 'NOT_INTERESTED', 'CALL_LATER', 'NO_RESPONSE', 'MEETING_FIXED', 'CLOSED'])
    .optional(),
  scheduledAt: z.coerce.date().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  owner: objectId.optional(),
});

class FollowUpService extends BaseService {
  async create(data, user) {
    return this.repository.create({ ...data, owner: data.owner || user?.id, createdBy: user?.id });
  }

  async complete(id, { notes, outcome }, user) {
    const followUp = await this.getById(id);
    return this.repository.update(followUp._id, {
      status: 'COMPLETED',
      completedAt: new Date(),
      notes: notes ?? followUp.notes,
      outcome: outcome ?? followUp.outcome,
    });
  }

  /** Everything still pending and already past its date — the daily call list. */
  async due(userId) {
    return FollowUpModel.find({
      status: 'PENDING',
      scheduledAt: { $lte: new Date() },
      ...(userId ? { owner: userId } : {}),
    })
      .populate('lead', 'code clientName phone')
      .populate('project', 'code name')
      .sort('scheduledAt')
      .lean();
  }
}

const { router, service } = defineModule({
  model: FollowUpModel,
  label: 'Follow-up',
  filterable: ['lead', 'client', 'project', 'type', 'status', 'owner'],
  searchable: ['subject', 'notes'],
  populate: [
    { path: 'lead', select: 'code clientName phone' },
    { path: 'owner', select: 'name role' },
  ],
  defaultSort: 'scheduledAt',
  viewPermission: PERMISSIONS.CRM_VIEW,
  managePermission: PERMISSIONS.CRM_MANAGE,
  createSchema: followupSchema,
  updateSchema: followupSchema.partial(),
  serviceClass: FollowUpService,
  extend: (r, { canView, canManage }) => {
    r.get(
      '/due',
      ...canView,
      asyncHandler(async (req, res) => {
        const data = await service.due(req.query.mine === 'true' ? req.user.id : undefined);
        return sendSuccess(res, 'Due follow-ups retrieved', data);
      })
    );

    r.post(
      '/:id/complete',
      ...canManage,
      asyncHandler(async (req, res) => {
        const data = await service.complete(req.params.id, req.body || {}, req.user);
        return sendSuccess(res, 'Follow-up completed', data);
      })
    );
  },
});

export default router;

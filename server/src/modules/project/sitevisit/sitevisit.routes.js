import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import asyncHandler from '../../../core/asyncHandler.js';
import SiteVisitModel from './sitevisit.model.js';
import projectService from '../project/project.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../project/project.validation.js';

const siteVisitSchema = z.object({
  project: objectId,
  visitDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
  attendees: z.array(objectId).optional(),
  externalAttendees: z.array(z.string()).optional(),
  ceilingHeightInch: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().nonnegative().optional()),
  pelmetAvailable: z.boolean().optional(),
  wiringAvailable: z.boolean().optional(),
  falseCeiling: z.boolean().optional(),
  curtainStylePreference: z.string().optional(),
  accessNotes: z.string().optional(),
  roomsSurveyed: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().int().nonnegative().optional()),
  windowsSurveyed: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.number().int().nonnegative().optional()),
  observations: z.string().optional(),
  photos: z.array(z.record(z.any())).optional(),
  videos: z.array(z.record(z.any())).optional(),
  status: z.enum(['PLANNED', 'COMPLETED', 'CANCELLED']).optional(),
});

class SiteVisitService extends BaseService {
  async create(data, user) {
    const visit = await this.repository.create({ ...data, conductedBy: user?.id });
    if (visit.status === 'COMPLETED') {
      await projectService.tryAutoAdvance(visit.project, user, 'Site visit completed');
    }
    return visit;
  }

  /** Completing the visit is what opens the Measurement stage. */
  async complete(id, data, user) {
    const visit = await this.getById(id);
    const updated = await this.repository.update(visit._id, {
      ...data,
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    await projectService.tryAutoAdvance(visit.project, user, 'Site visit completed');
    return updated;
  }
}

const { router, service } = defineModule({
  model: SiteVisitModel,
  label: 'Site visit',
  filterable: ['project', 'status'],
  searchable: ['observations'],
  defaultSort: '-visitDate',
  populate: [{ path: 'conductedBy', select: 'name role' }],
  viewPermission: PERMISSIONS.PROJECT_VIEW,
  managePermission: PERMISSIONS.PROJECT_MANAGE,
  createSchema: siteVisitSchema,
  updateSchema: siteVisitSchema.partial().omit({ project: true }),
  serviceClass: SiteVisitService,
  extend: (r, { canManage }) => {
    r.post(
      '/:id/complete',
      ...canManage,
      asyncHandler(async (req, res) => {
        const data = await service.complete(req.params.id, req.body || {}, req.user);
        return sendSuccess(res, 'Site visit completed', data);
      })
    );
  },
});

export default router;

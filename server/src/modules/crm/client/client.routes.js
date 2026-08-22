import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import ClientModel from './client.model.js';
import ProjectModel from '../../project/project/project.model.js';
import { nextCode } from '../../../core/sequence.js';
import asyncHandler from '../../../core/asyncHandler.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../../project/project/project.validation.js';

const clientSchema = z.object({
  name: z.string().min(2, 'Client name is required'),
  phone: z
    .string()
    .min(7, 'A contactable phone number is required')
    .refine((val) => /^(\+\d{1,4}[- ]?)?\d{7,15}$/.test(val.trim()), {
      message: 'Invalid phone number format',
    }),
  altPhone: z
    .string()
    .optional()
    .refine((val) => !val || /^(\+\d{1,4}[- ]?)?\d{7,15}$/.test(val.trim()), {
      message: 'Invalid phone number format',
    }),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  gstin: z.string().optional(),
  billingAddress: z.record(z.any()).optional(),
  siteAddress: z.record(z.any()).optional(),
  architect: objectId.optional(),
  accountOwner: objectId.optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

class ClientService extends BaseService {
  async create(data) {
    return this.repository.create({ ...data, code: await nextCode('CL') });
  }
}

const { router, service } = defineModule({
  model: ClientModel,
  label: 'Client',
  filterable: ['isActive', 'architect', 'accountOwner'],
  searchable: ['name', 'phone', 'company', 'code'],
  populate: [{ path: 'architect', select: 'name firm' }],
  viewPermission: PERMISSIONS.CRM_VIEW,
  managePermission: PERMISSIONS.CRM_MANAGE,
  createSchema: clientSchema,
  updateSchema: clientSchema.partial(),
  serviceClass: ClientService,
  extend: (r, { canView }) => {
    // A client's whole history in one call — what the client detail page shows.
    r.get(
      '/:id/projects',
      ...canView,
      asyncHandler(async (req, res) => {
        const client = await service.getById(req.params.id);
        const projects = await ProjectModel.find({ client: client._id })
          .select('code name stage contractValue estimatedValue isActivated createdAt')
          .sort('-createdAt')
          .lean();
        return sendSuccess(res, 'Client projects retrieved', { client, projects });
      })
    );
  },
});

export default router;

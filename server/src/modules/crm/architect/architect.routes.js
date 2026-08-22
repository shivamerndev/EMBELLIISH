import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import ArchitectModel from './architect.model.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

const architectSchema = z.object({
  name: z.string().min(2, 'Architect name is required'),
  firm: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^(\+\d{1,4}[- ]?)?\d{7,15}$/.test(val.trim()), {
      message: 'Invalid phone number format',
    }),
  email: z.string().email().optional().or(z.literal('')),
  address: z.record(z.any()).optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  relationshipOwner: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const { router } = defineModule({
  model: ArchitectModel,
  label: 'Architect',
  filterable: ['isActive', 'relationshipOwner'],
  searchable: ['name', 'firm', 'phone'],
  viewPermission: PERMISSIONS.CRM_VIEW,
  managePermission: PERMISSIONS.CRM_MANAGE,
  createSchema: architectSchema,
  updateSchema: architectSchema.partial(),
});

export default router;

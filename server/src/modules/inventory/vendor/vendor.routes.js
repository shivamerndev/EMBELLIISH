import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import VendorModel from './vendor.model.js';
import { nextCode } from '../../../core/sequence.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

const vendorSchema = z.object({
  name: z.string().min(2, 'Vendor name is required'),
  contactPerson: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^(\+\d{1,4}[- ]?)?\d{7,15}$/.test(val.trim()), {
      message: 'Invalid phone number format',
    }),
  email: z.string().email().optional().or(z.literal('')),
  address: z.record(z.any()).optional(),
  gstin: z.string().optional(),
  supplies: z.array(z.enum(['FABRIC', 'BLACKOUT', 'MOTOR', 'TRACK', 'ACCESSORY', 'LEAD_BAND'])).optional(),
  leadTimeDays: z.coerce.number().int().nonnegative().optional(),
  paymentTerms: z.string().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

class VendorService extends BaseService {
  async create(data) {
    return this.repository.create({ ...data, code: await nextCode('VEN', { yearly: false, pad: 4 }) });
  }
}

const { router } = defineModule({
  model: VendorModel,
  label: 'Vendor',
  filterable: ['isActive', 'supplies'],
  searchable: ['name', 'contactPerson', 'phone', 'code'],
  defaultSort: 'name',
  viewPermission: PERMISSIONS.INVENTORY_VIEW,
  managePermission: PERMISSIONS.INVENTORY_MANAGE,
  createSchema: vendorSchema,
  updateSchema: vendorSchema.partial(),
  serviceClass: VendorService,
});

export default router;

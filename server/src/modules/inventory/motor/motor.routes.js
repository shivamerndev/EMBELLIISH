import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import MotorModel from './motor.model.js';
import { nextCode } from '../../../core/sequence.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../../project/project/project.validation.js';

const motorSchema = z.object({
  name: z.string().min(2, 'Motor name is required'),
  brand: z.string().optional(),
  model: z.string().optional(),
  type: z.enum(['CURTAIN_TRACK', 'ROMAN_BLIND', 'ROLLER_BLIND', 'HUB', 'REMOTE']).optional(),
  powerType: z.enum(['AC', 'DC', 'BATTERY', 'SOLAR']).optional(),
  control: z.array(z.enum(['REMOTE', 'APP', 'WALL_SWITCH', 'VOICE'])).optional(),
  maxWidthInch: z.coerce.number().nonnegative().optional(),
  maxLoadKg: z.coerce.number().nonnegative().optional(),
  warrantyMonths: z.coerce.number().int().nonnegative().optional(),
  purchaseRate: z.coerce.number().nonnegative().optional(),
  sellingRate: z.coerce.number().nonnegative().optional(),
  vendor: objectId.optional(),
  reorderLevel: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

class MotorService extends BaseService {
  async create(data) {
    return this.repository.create({ ...data, code: await nextCode('MOT', { yearly: false, pad: 4 }) });
  }
}

const { router } = defineModule({
  model: MotorModel,
  label: 'Motor',
  filterable: ['type', 'vendor', 'isActive', 'brand', 'powerType'],
  searchable: ['name', 'brand', 'model', 'code'],
  populate: [{ path: 'vendor', select: 'name phone' }],
  defaultSort: 'name',
  viewPermission: PERMISSIONS.INVENTORY_VIEW,
  managePermission: PERMISSIONS.INVENTORY_MANAGE,
  createSchema: motorSchema,
  updateSchema: motorSchema.partial(),
  serviceClass: MotorService,
});

export default router;

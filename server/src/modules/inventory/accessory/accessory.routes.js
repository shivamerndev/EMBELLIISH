import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import AccessoryModel from './accessory.model.js';
import { nextCode } from '../../../core/sequence.js';
import { UOM } from '../../../constants/product.constants.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../../project/project/project.validation.js';

const accessorySchema = z.object({
  name: z.string().min(2, 'Accessory name is required'),
  category: z
    .enum(['TRACK', 'BRACKET', 'TIEBACK', 'LEAD_BAND', 'HOOK', 'RING', 'ROD', 'TAPE', 'CHAIN', 'OTHER'])
    .optional(),
  brand: z.string().optional(),
  finish: z.string().optional(),
  unit: z.enum(Object.values(UOM)).optional(),
  purchaseRate: z.coerce.number().nonnegative().optional(),
  sellingRate: z.coerce.number().nonnegative().optional(),
  vendor: objectId.optional(),
  reorderLevel: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

class AccessoryService extends BaseService {
  async create(data) {
    return this.repository.create({ ...data, code: await nextCode('ACC', { yearly: false, pad: 4 }) });
  }
}

const { router } = defineModule({
  model: AccessoryModel,
  label: 'Accessory',
  filterable: ['category', 'vendor', 'isActive'],
  searchable: ['name', 'brand', 'code'],
  populate: [{ path: 'vendor', select: 'name phone' }],
  defaultSort: 'name',
  viewPermission: PERMISSIONS.INVENTORY_VIEW,
  managePermission: PERMISSIONS.INVENTORY_MANAGE,
  createSchema: accessorySchema,
  updateSchema: accessorySchema.partial(),
  serviceClass: AccessoryService,
});

export default router;

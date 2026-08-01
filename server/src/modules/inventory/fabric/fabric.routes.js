import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import FabricModel from './fabric.model.js';
import { nextCode } from '../../../core/sequence.js';
import { UOM } from '../../../constants/product.constants.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../../project/project/project.validation.js';

const fabricSchema = z.object({
  name: z.string().min(2, 'Fabric name is required'),
  brand: z.string().optional(),
  collectionName: z.string().optional(),
  colour: z.string().optional(),
  composition: z.string().optional(),
  type: z.enum(['MAIN', 'SHEER', 'BLACKOUT', 'ROMAN', 'UPHOLSTERY']).optional(),
  widthInch: z.coerce.number().positive().optional(),
  // Drives the panel count in the consumption engine, so it must be positive.
  usableWidthInch: z.coerce.number().positive().optional(),
  patternRepeatInch: z.coerce.number().nonnegative().optional(),
  recommendedFullness: z.coerce.number().positive().optional(),
  unit: z.enum(Object.values(UOM)).optional(),
  purchaseRate: z.coerce.number().nonnegative().optional(),
  sellingRate: z.coerce.number().nonnegative().optional(),
  vendor: objectId.optional(),
  reorderLevel: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

class FabricService extends BaseService {
  async create(data) {
    return this.repository.create({ ...data, code: await nextCode('FAB', { yearly: false, pad: 5 }) });
  }
}

const { router } = defineModule({
  model: FabricModel,
  label: 'Fabric',
  filterable: ['type', 'vendor', 'isActive', 'colour', 'brand'],
  searchable: ['name', 'colour', 'brand', 'code', 'collectionName'],
  populate: [{ path: 'vendor', select: 'name phone' }],
  defaultSort: 'name',
  viewPermission: PERMISSIONS.INVENTORY_VIEW,
  managePermission: PERMISSIONS.INVENTORY_MANAGE,
  createSchema: fabricSchema,
  updateSchema: fabricSchema.partial(),
  serviceClass: FabricService,
});

export default router;

import { z } from 'zod';
import { objectId } from '../../project/project/project.validation.js';
import { MATERIAL_TYPE, UOM } from '../../../constants/product.constants.js';

const movementSchema = z.object({
  itemType: z.enum(['Fabric', 'Motor', 'Accessory']),
  item: objectId,
  itemName: z.string().optional(),
  materialType: z.enum(Object.values(MATERIAL_TYPE)).optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit: z.enum(Object.values(UOM)).optional(),
  warehouse: z.string().optional(),
  batchNo: z.string().nullable().optional(),
  project: objectId.optional(),
  productionOrder: objectId.optional(),
  purchaseOrder: objectId.optional(),
  reason: z.string().optional(),
});

/** An adjustment sets an absolute figure, so zero is a legitimate value. */
const adjustSchema = movementSchema.extend({
  quantity: z.coerce.number().nonnegative(),
  reason: z.string().min(2, 'An adjustment needs a reason'),
});

const updateStockSchema = z.object({
  warehouse: z.string().optional(),
  rack: z.string().optional(),
  reorderLevel: z.coerce.number().nonnegative().optional(),
  itemName: z.string().optional(),
});

export { movementSchema, adjustSchema, updateStockSchema };

import mongoose from 'mongoose';
import { MATERIAL_TYPE, UOM } from '../../../constants/product.constants.js';
import { applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 13 — "Do we already have Blue Velvet, 400 meters?"
 *
 * One row per item per location. `quantity` is what is physically on the shelf and
 * `reserved` is what is already committed to live projects, so the answer to the
 * purchase question is `available`, never the raw shelf figure. Two projects must
 * not both be told the same 400 metres are theirs.
 */
const stockSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ['Fabric', 'Motor', 'Accessory'],
      required: true,
      index: true,
    },
    /** Dynamic reference — resolved against whichever catalogue `itemType` names. */
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'itemType',
      index: true,
    },
    itemName: String,
    materialType: { type: String, enum: Object.values(MATERIAL_TYPE) },

    quantity: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    unit: { type: String, enum: Object.values(UOM), default: UOM.METER },

    warehouse: { type: String, default: 'MAIN', index: true },
    rack: String,
    batchNo: String,

    reorderLevel: { type: Number, default: 0, min: 0 },
    lastMovementAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

stockSchema.index({ itemType: 1, item: 1, warehouse: 1, batchNo: 1 }, { unique: true });

/** What purchase may actually count on. */
stockSchema.virtual('available').get(function available() {
  return Math.max(0, (this.quantity || 0) - (this.reserved || 0));
});

stockSchema.virtual('isBelowReorder').get(function isBelowReorder() {
  return this.reorderLevel > 0 && this.quantity - this.reserved <= this.reorderLevel;
});

applyJsonTransform(stockSchema);

export default mongoose.models.Stock || mongoose.model('Stock', stockSchema);

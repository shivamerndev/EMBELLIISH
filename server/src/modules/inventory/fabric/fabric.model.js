import mongoose from 'mongoose';
import { UOM } from '../../../constants/product.constants.js';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * A fabric in the catalogue — "Blue Velvet", an Italian sheer, a blackout lining.
 *
 * `usableWidthInch` matters far beyond the catalogue: it is what the consumption
 * engine divides the gathered width by, and the reference sheet shows it genuinely
 * differing between bolts. Storing it here means picking a fabric re-prices the BOQ.
 */
const fabricSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    brand: String,
    // Not `collection` — that is a reserved path name on a mongoose schema.
    collectionName: String,
    colour: { type: String, trim: true, index: true },
    composition: String,

    type: {
      type: String,
      enum: ['MAIN', 'SHEER', 'BLACKOUT', 'ROMAN', 'UPHOLSTERY'],
      default: 'MAIN',
      index: true,
    },

    /** Full bolt width and the width actually usable after selvedge + side hems. */
    widthInch: { type: Number, default: 54, min: 1 },
    usableWidthInch: { type: Number, default: 50, min: 1 },
    /** Vertical pattern repeat; drives extra allowance when matching panels. */
    patternRepeatInch: { type: Number, default: 0, min: 0 },
    recommendedFullness: { type: Number, default: 2.5, min: 1 },

    unit: { type: String, default: UOM.METER },
    purchaseRate: { type: Number, default: 0, min: 0 },
    sellingRate: { type: Number, default: 0, min: 0 },

    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
    reorderLevel: { type: Number, default: 0, min: 0 },

    images: [attachmentSchema],
    notes: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

fabricSchema.index({ name: 'text', colour: 'text', brand: 'text' });

applyJsonTransform(fabricSchema);

export default mongoose.models.Fabric || mongoose.model('Fabric', fabricSchema);

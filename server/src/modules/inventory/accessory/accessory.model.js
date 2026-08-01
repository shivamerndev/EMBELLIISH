import mongoose from 'mongoose';
import { UOM } from '../../../constants/product.constants.js';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/** Tracks, brackets, tiebacks, lead band, hooks — everything that is not fabric or motor. */
const accessorySchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      enum: ['TRACK', 'BRACKET', 'TIEBACK', 'LEAD_BAND', 'HOOK', 'RING', 'ROD', 'TAPE', 'CHAIN', 'OTHER'],
      default: 'OTHER',
      index: true,
    },
    brand: String,
    finish: String,
    /** Running-foot items (track, lead band) vs. piece items (brackets, tiebacks). */
    unit: { type: String, enum: Object.values(UOM), default: UOM.PIECE },

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

accessorySchema.index({ name: 'text', category: 'text' });

applyJsonTransform(accessorySchema);

export default mongoose.models.Accessory || mongoose.model('Accessory', accessorySchema);

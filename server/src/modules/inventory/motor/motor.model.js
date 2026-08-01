import mongoose from 'mongoose';
import { UOM } from '../../../constants/product.constants.js';
import { attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/** Motorised track drives, and the remotes and hubs that ship with them. */
const motorSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    brand: String,
    model: String,

    type: {
      type: String,
      enum: ['CURTAIN_TRACK', 'ROMAN_BLIND', 'ROLLER_BLIND', 'HUB', 'REMOTE'],
      default: 'CURTAIN_TRACK',
      index: true,
    },
    powerType: { type: String, enum: ['AC', 'DC', 'BATTERY', 'SOLAR'], default: 'AC' },
    control: [{ type: String, enum: ['REMOTE', 'APP', 'WALL_SWITCH', 'VOICE'] }],
    /** Manufacturer's maximum drivable track width, in inches. */
    maxWidthInch: { type: Number, min: 0 },
    maxLoadKg: { type: Number, min: 0 },
    warrantyMonths: { type: Number, default: 12, min: 0 },

    unit: { type: String, default: UOM.PIECE },
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

motorSchema.index({ name: 'text', brand: 'text' });

applyJsonTransform(motorSchema);

export default mongoose.models.Motor || mongoose.model('Motor', motorSchema);

import mongoose from 'mongoose';
import { UOM } from '../../constants/product.constants.js';
import { auditEntrySchema, applyJsonTransform } from '../../core/schemaPlugins.js';

/**
 * Module 7 — the Pricing Master.
 *
 * One published rate per chargeable line, so a quotation is priced from a list
 * the founder controls rather than from whatever the DCM remembers. The rate-card
 * keys match the BOQ cost lines (`FABRIC`, `CURTAIN_STITCHING`, `MOTOR`, …), which
 * is how a price list turns into a rate card the consumption engine can cost with.
 *
 * Rates are versioned by date rather than edited in place: a project quoted in
 * March must still reprice to its March rate when someone reopens it in June.
 */
const priceItemSchema = new mongoose.Schema(
  {
    /** Rate-card key. `MOTOR`, `CURTAIN_STITCHING`, `INSTALLATION`, … */
    key: { type: String, required: true, uppercase: true, trim: true, index: true },
    particular: { type: String, required: true, trim: true },
    description: String,
    category: {
      type: String,
      enum: ['MATERIAL', 'LABOUR', 'HARDWARE', 'SERVICE', 'OTHER'],
      default: 'MATERIAL',
      index: true,
    },
    unit: { type: String, enum: Object.values(UOM), default: UOM.METER },

    rate: { type: Number, required: true, min: 0 },
    /** What it costs us — the margin report needs both sides. */
    costRate: { type: Number, min: 0 },
    gstPercent: { type: Number, default: 18, min: 0, max: 100 },

    /** The window this rate is in force for. `effectiveTo` empty means "current". */
    effectiveFrom: { type: Date, default: Date.now, index: true },
    effectiveTo: { type: Date, index: true },

    /** Discretion a DCM has on this line before the founder is involved. */
    maxDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    minimumRate: { type: Number, min: 0 },

    isActive: { type: Boolean, default: true, index: true },
    notes: String,
    history: [auditEntrySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

priceItemSchema.index({ key: 1, effectiveFrom: -1 });

applyJsonTransform(priceItemSchema);

export default mongoose.models.PriceItem || mongoose.model('PriceItem', priceItemSchema);

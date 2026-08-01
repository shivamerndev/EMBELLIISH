import mongoose from 'mongoose';
import { addressSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * "Sir, curtains ke liye Embellish best company hai." — the architect is the
 * referral channel, so the firm tracks them as a first-class relationship and
 * measures how much business each one introduces.
 */
const architectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    firm: { type: String, trim: true },
    phone: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    address: addressSchema,
    /** Referral commission on the closed project value. */
    commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
    relationshipOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

architectSchema.index({ name: 'text', firm: 'text' });

applyJsonTransform(architectSchema);

export default mongoose.models.Architect || mongoose.model('Architect', architectSchema);

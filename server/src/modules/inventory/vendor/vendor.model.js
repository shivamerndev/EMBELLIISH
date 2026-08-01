import mongoose from 'mongoose';
import { addressSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/** Step 13 — whoever receives the purchase order when stock runs short. */
const vendorSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    contactPerson: String,
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: addressSchema,
    gstin: { type: String, trim: true, uppercase: true },

    supplies: [
      { type: String, enum: ['FABRIC', 'BLACKOUT', 'MOTOR', 'TRACK', 'ACCESSORY', 'LEAD_BAND'] },
    ],
    /** Typical turnaround, used to warn when a PO threatens the delivery date. */
    leadTimeDays: { type: Number, default: 7, min: 0 },
    paymentTerms: String,
    rating: { type: Number, min: 0, max: 5, default: 3 },

    notes: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

vendorSchema.index({ name: 'text' });

applyJsonTransform(vendorSchema);

export default mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);

import mongoose from 'mongoose';
import { addressSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/** Mr. Hiral, once his lead is qualified and converted. */
const clientSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    altPhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    company: { type: String, trim: true },
    gstin: { type: String, trim: true, uppercase: true },
    billingAddress: addressSchema,
    siteAddress: addressSchema,
    architect: { type: mongoose.Schema.Types.ObjectId, ref: 'Architect', index: true },
    /** Lead this client was converted from, kept for pipeline attribution. */
    sourceLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    accountOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    notes: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

clientSchema.index({ name: 'text', company: 'text', phone: 'text' });

applyJsonTransform(clientSchema);

export default mongoose.models.Client || mongoose.model('Client', clientSchema);

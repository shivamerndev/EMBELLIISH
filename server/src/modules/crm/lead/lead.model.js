import mongoose from 'mongoose';
import { LEAD_STATUS } from '../../../constants/workflow.constants.js';
import { addressSchema, auditEntrySchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Step 1 & 2 — the call Hitesh takes, and what the Senior DCM learns when they
 * ring the client back. Everything here used to live in WhatsApp or someone's head.
 */
const leadSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },

    // --- What Hitesh writes down on the first call.
    clientName: { type: String, required: true, trim: true, index: true },
    companyName: { type: String, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    architect: { type: mongoose.Schema.Types.ObjectId, ref: 'Architect', index: true },
    source: {
      type: String,
      enum: ['ARCHITECT', 'REFERRAL', 'WALK_IN', 'WEBSITE', 'EXHIBITION', 'SOCIAL', 'OTHER', 'DCM', 'DIRECT_VISIT', 'DIRECT_CLIENT', 'EXISTING_CLIENT'],
      default: 'DCM',
    },
    previousClientRelationship: { type: Boolean, default: false },
    location: { type: String, trim: true },
    priority: {
      type: String,
      enum: ['HOT', 'MEDIUM', 'LOW'],
      default: 'MEDIUM',
    },
    address: addressSchema,
    projectType: {
      type: String,
      enum: ['VILLA', 'APARTMENT', 'BUNGALOW', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'],
      default: 'VILLA',
    },
    budget: { type: Number, min: 0 },
    roomCount: { type: Number, min: 0 },
    requirement: String,

    // --- Qualification (Step 2).
    status: { type: String, enum: Object.values(LEAD_STATUS), default: LEAD_STATUS.NEW, index: true },
    qualifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qualifiedAt: Date,
    qualificationNotes: String,
    lostReason: String,

    // --- Assignment (Step 3): "Rahul tum ye project handle karo."
    assignedDCM: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedAt: Date,

    nextFollowUpAt: { type: Date, index: true },

    // --- Conversion (Step 3 onwards).
    convertedClient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    convertedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    convertedAt: Date,

    history: [auditEntrySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

leadSchema.index({ clientName: 'text', companyName: 'text', phone: 'text', location: 'text' });

/** Open leads are the ones still worth a follow-up call. */
leadSchema.virtual('isOpen').get(function isOpen() {
  return ![LEAD_STATUS.CONVERTED, LEAD_STATUS.LOST, LEAD_STATUS.UNQUALIFIED].includes(this.status);
});

applyJsonTransform(leadSchema);

export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);

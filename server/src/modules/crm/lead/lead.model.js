import mongoose from 'mongoose';
import { LEAD_STATUS } from '../../../constants/workflow.constants.js';
import { addressSchema, auditEntrySchema, attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

/**
 * Lead Schema:
 * Handles Steps 1–4 of CRM:
 * - Step 1: Lead Capture & Contact Details
 * - Step 2: Qualification & Checklist
 * - Step 3: DCM Assignment & Capacity
 * - Step 4: Follow-up & Conversion
 *
 * Sales & Commercials (Pre-site Visit, Measurement, Studio Meeting, Ready Size,
 * Consumption/BOQ, Proposal, Advance, Costing, Quotation, Approval, Presentation, KYC)
 * are maintained as a dedicated Edge Collection (SalesCommercial model).
 * The Lead document connects to the Sales & Commercials pipeline via the `salesCommercial` edge reference.
 */
const leadSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },

    // --- What Hitesh writes down on the first call & Lead Capture Sheet attributes.
    clientName: { type: String, required: true, trim: true, index: true },
    contactPerson: { type: String, trim: true },
    companyName: { type: String, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    architect: { type: mongoose.Schema.Types.ObjectId, ref: 'Architect', index: true },
    architectName: { type: String, trim: true },
    source: {
      type: String,
      default: 'Architect Referral',
    },
    previousClientRelationship: { type: Boolean, default: false },
    existingRelationshipOwner: { type: String, trim: true, default: 'NA' },
    location: { type: String, trim: true },
    pincode: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM',
    },
    address: addressSchema,
    projectType: {
      type: String,
      enum: ['VILLA', 'APARTMENT', 'BUNGALOW', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'],
      default: 'VILLA',
    },
    budget: { type: Number, min: 0 },
    indicativeBudget: { type: String, trim: true },
    budgetClassification: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      default: 'A',
    },
    roomCount: { type: Number, min: 0 },
    requirement: String,
    requirementSummary: String,
    architectInvolved: {
      type: String,
      enum: ['Yes', 'No', 'Not Known'],
      default: 'Not Known',
    },
    attachmentUrl: String,
    attachments: [attachmentSchema],

    // --- Qualification (Step 2).
    status: { type: String, enum: Object.values(LEAD_STATUS), default: LEAD_STATUS.NEW, index: true },
    qualifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qualifiedAt: Date,
    qualificationNotes: String,
    lostReason: String,

    // --- Qualification Sheet (Step 2 checklist form).
    qualificationDueDate: Date,
    requirementVerified: {
      type: String,
      enum: ['YES', 'NO', 'PENDING'],
      default: 'PENDING',
    },
    budgetPricingVerified: {
      type: String,
      enum: ['YES', 'NO', 'PENDING'],
      default: 'PENDING',
    },
    timelineConfirmed: {
      type: String,
      enum: ['YES', 'NO', 'PENDING'],
      default: 'PENDING',
    },
    decisionMakerIdentified: {
      type: String,
      enum: ['YES', 'NO', 'PENDING', 'NOT_KNOWN'],
      default: 'PENDING',
    },
    competitionDetailsCaptured: {
      type: String,
      enum: ['YES', 'NO', 'NOT_KNOWN'],
      default: 'NOT_KNOWN',
    },
    qualificationDecision: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NOT DECIDED'],
      default: 'PENDING',
    },
    decisionDateTime: Date,
    rejectionHoldReason: String,

    // --- Assignment (Step 3): DCM Capacity & Reassignment.
    assignedDCM: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedDcmName: { type: String, trim: true },
    assignmentDueDate: Date,
    assignmentDateTime: Date,
    dcmCapacityStatus: {
      type: String,
      enum: ['AVAILABLE', 'OVERLOADED'],
      default: 'AVAILABLE',
    },
    dcmActiveProjectCount: { type: Number, default: 0 },
    reassignmentRequired: { type: Boolean, default: false },
    reassignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reassignedToName: { type: String, trim: true },
    reassignmentReason: String,
    updatedUser: String,
    assignedAt: Date,

    // --- Follow-up Sheet (Step 4).
    nextAction: String,
    nextActionDueDate: Date,
    overallLeadStatus: {
      type: String,
      enum: ['NEW', 'ASSIGNED', 'UNDER_QUALIFICATION', 'REJECTED', 'HOLD', 'ON_HOLD', 'FOLLOW_UP', 'FOLLOWUP', 'IN_PROGRESS', 'APPROVED'],
      default: 'NEW',
    },

    nextFollowUpAt: { type: Date, index: true },

    // --- Edge Collection Reference: Sales & Commercials edge linking Lead -> Project ---
    salesCommercial: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesCommercial', index: true },

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

/** Virtual to populate the SalesCommercial edge document via foreignField 'lead' */
leadSchema.virtual('salesCommercialEdge', {
  ref: 'SalesCommercial',
  localField: '_id',
  foreignField: 'lead',
  justOne: true,
});

/** Open leads are the ones still worth a follow-up call. */
leadSchema.virtual('isOpen').get(function isOpen() {
  return ![LEAD_STATUS.CONVERTED, LEAD_STATUS.LOST, LEAD_STATUS.UNQUALIFIED].includes(this.status);
});

leadSchema.pre('save', function (next) {
  const code = this.pincode || this.pinCode || this.address?.pincode;
  if (code) {
    this.pincode = code;
    this.pinCode = code;
    if (this.address) this.address.pincode = code;
  }
  next();
});

leadSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany', 'update'], function (next) {
  const update = this.getUpdate();
  if (update) {
    const code = update.pincode || update.pinCode || update.$set?.pincode || update.$set?.pinCode || update.address?.pincode || update.$set?.['address.pincode'];
    if (code) {
      if (!update.$set) update.$set = {};
      update.$set.pincode = code;
      update.$set.pinCode = code;
    }
  }
  next();
});

applyJsonTransform(leadSchema);

export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);

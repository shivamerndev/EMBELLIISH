import mongoose from 'mongoose';
import { LEAD_STATUS } from '../../../constants/workflow.constants.js';
import { addressSchema, auditEntrySchema, attachmentSchema, applyJsonTransform } from '../../../core/schemaPlugins.js';

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

    // --- Sales & Commercials: Site Visit requirement flag.
    siteVisitRequired: { type: Boolean, default: true },

    // --- Sales & Commercials: Measurement.
    measurement: {
      dueDate: Date,
      date: Date,
      measuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: {
        type: String,
        enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REVISIT_REQUIRED'],
        default: 'PENDING',
      },
      siteAccess: String,
      attachments: [attachmentSchema],
      roomList: String,
      drawings: [attachmentSchema],
      pelmetDetails: String,
      channelDetails: String,
      motorDetails: String,
      wiringDetails: String,
      notes: String,
    },

    // --- Sales & Commercials: Studio Meeting.
    studioMeeting: {
      dueDate: Date,
      date: Date,
      attendees: String,
      clientDrawings: [attachmentSchema],
      feedback: String,
      nextAction: String,
      architectBrief: String,
      samples: [attachmentSchema],
      projectPictures: [attachmentSchema],
      pricingRange: String,
    },

    // --- Sales & Commercials: Room readiness / ready size.
    readySize: {
      roomReadiness: String,
      dueDate: Date,
      confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      confirmationDate: Date,
      windowSize: String,
      siteCondition: String,
      pelmetDetails: String,
      channelDetails: String,
      readyHeight: String,
      finalMeasurements: String,
    },

    // --- Sales & Commercials: Consumption / BOQ.
    consumption: {
      sheetDueDate: Date,
      measurements: String,
      quantity: Number,
      unit: String,
      wastageAllowance: String,
      boqVersion: String,
      roomList: String,
      fabricDesignSelection: String,
      panelCount: Number,
      liningAccessoryAssumptions: String,
    },

    // --- Sales & Commercials: Proposal.
    proposal: {
      dueDate: Date,
      noVersion: String,
      date: Date,
      clientBrief: String,
      consumptionSheet: [attachmentSchema],
      designDirection: String,
      pricingRange: String,
      terms: String,
      refundRevisionClause: String,
    },

    // --- Sales & Commercials: Token / advance discussion.
    token: {
      discussionDueDate: Date,
      amount: Number,
      status: {
        type: String,
        enum: ['NOT_DISCUSSED', 'DISCUSSED', 'PENDING', 'RECEIVED', 'WAIVED'],
        default: 'NOT_DISCUSSED',
      },
      receivedDate: Date,
      clientBudgetResponse: String,
      proposalAttachment: [attachmentSchema],
      budgetEstimate: Number,
      clientResponse: String,
      projectTimeline: String,
      commercialTerms: String,
    },

    // --- Sales & Commercials: Costing.
    costing: {
      dueDate: Date,
      catalogueCost: Number,
      version: String,
      landedCost: Number,
      localFabricCost: Number,
      labourCost: Number,
      sampleCost: Number,
      marginModel: String,
    },

    // --- Sales & Commercials: Quotation.
    quotation: {
      dueDate: Date,
      no: String,
      version: String,
      date: Date,
      finalQuotedValue: Number,
      taxes: Number,
      addSubtotal: Number,
      validity: String,
      discountApprovalStatus: {
        type: String,
        enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'],
        default: 'NOT_REQUIRED',
      },
      boq: [attachmentSchema],
      fabricSelection: String,
      cataloguePrice: Number,
      labourPrice: Number,
      samplePrice: Number,
      discount: Number,
      marginRules: String,
    },

    // --- Sales & Commercials: Client approval.
    approval: {
      planned: String,
      clientApprovalStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'],
        default: 'PENDING',
      },
      proofAttachment: [attachmentSchema],
      finalApprovedVersion: String,
    },

    // --- Sales & Commercials: Presentation.
    presentation: {
      attachment: [attachmentSchema],
      clientSelection: String,
      fabricSelection: String,
      designDirection: String,
      revisionNotes: String,
    },

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

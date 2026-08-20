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
      default: 'DCM',
    },
    previousClientRelationship: { type: Boolean, default: false },
    existingRelationshipOwner: { type: String, trim: true, default: 'NA' },
    location: { type: String, trim: true },
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

    // --- Sales & Commercials: Site Visit requirement flag and dates.
    siteVisitRequired: { type: Boolean, default: true },
    siteVisitDueDate: Date,
    actualSiteVisitDateTime: Date,
    siteAddress: String,
    assignedInstaller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clientArchitectAvailability: String,
    scope: String,
    rooms: String,
    drawingsRenders: String,
    installerAvailability: {
      type: String,
      enum: ['AVAILABLE', 'BUSY', 'ON_SITE', 'UNAVAILABLE'],
      default: 'AVAILABLE',
    },

    // --- Sales & Commercials: Measurement.
    measurement: {
      dueDate: Date,
      date: Date,
      measuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: {
        type: String,
        enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REVISIT_REQUIRED', 'PROVISIONAL', 'FINAL', 'RE_MEASUREMENT_REQUIRED', 'Provisional', 'Final', 'Re-measurement Required'],
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
      boqPreparedBy: String,
      boqPreparedDate: Date,
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
      approvalStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'],
        default: 'PENDING',
      },
      approvedBy: String,
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
      totalCost: Number,
      calculatedMargin: Number,
      sampleCost: Number,
      marginModel: String,
      minMarginThreshold: { type: Number, default: 25 },
      maxDiscountThreshold: { type: Number, default: 15 },
      hiteshApprovalRequired: { type: Boolean, default: false },
      hiteshApprovalStatus: {
        type: String,
        enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'],
        default: 'NOT_REQUIRED',
      },
      hiteshApprovalNotes: String,
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
      clientApprovalDate: String,
      clientApprovalStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'],
        default: 'PENDING',
      },
      proofAttachment: [attachmentSchema],
      finalApprovedVersion: String,
      revisions: [
        {
          revisionNumber: Number,
          clientApprovalStatus: String,
          finalApprovedVersion: String,
          clientSelection: String,
          fabricSelection: String,
          designDirection: String,
          revisionNotes: String,
          changeReason: String,
          revisedAt: { type: Date, default: Date.now },
          proofAttachment: [attachmentSchema],
        },
      ],
    },

    // --- Sales & Commercials: Presentation.
    presentation: {
      attachment: [attachmentSchema],
      clientSelection: String,
      fabricSelection: String,
      designDirection: String,
      revisionNotes: String,
    },

    // --- Sales & Commercials: KYC Verification.
    kyc: {
      dueDate: Date,
      actualDate: Date,
      status: {
        type: String,
        enum: ['PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'NOT_REQUIRED'],
        default: 'PENDING',
      },
      verifiedDocuments: [attachmentSchema],
      documentTypes: [String],
      remarks: String,
      verifiedBy: String,
    },

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

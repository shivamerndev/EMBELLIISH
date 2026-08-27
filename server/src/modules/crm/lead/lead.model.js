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
      default: 'Architect Referral',
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
    siteVisitRequired: { type: mongoose.Schema.Types.Mixed, default: 'PENDING' },
    siteVisitDueDate: Date,
    actualSiteVisitDateTime: Date,
    siteAddress: String,
    assignedInstaller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clientArchitectAvailability: String,
    scope: mongoose.Schema.Types.Mixed,
    rooms: mongoose.Schema.Types.Mixed,
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
      roomList: mongoose.Schema.Types.Mixed,
      drawings: [attachmentSchema],
      pelmetDetails: mongoose.Schema.Types.Mixed,
      channelDetails: mongoose.Schema.Types.Mixed,
      motorDetails: mongoose.Schema.Types.Mixed,
      wiringDetails: mongoose.Schema.Types.Mixed,
      notes: mongoose.Schema.Types.Mixed,
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
      confirmedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      confirmationDate: Date,
      windowSize: mongoose.Schema.Types.Mixed,
      windowSizes: mongoose.Schema.Types.Mixed,
      siteCondition: String,
      pelmetDetails: mongoose.Schema.Types.Mixed,
      channelDetails: mongoose.Schema.Types.Mixed,
      readyHeight: mongoose.Schema.Types.Mixed,
      finalMeasurements: mongoose.Schema.Types.Mixed,
    },

    // --- Sales & Commercials: Consumption / BOQ.
    consumption: {
      sheetDueDate: Date,
      measurements: mongoose.Schema.Types.Mixed,
      quantity: Number,
      unit: String,
      wastageAllowance: String,
      boqVersion: String,
      roomList: mongoose.Schema.Types.Mixed,
      boqPreparedBy: String,
      boqPreparedDate: Date,
      fabricDesignSelection: mongoose.Schema.Types.Mixed,
      panelCount: Number,
      liningAccessoryAssumptions: mongoose.Schema.Types.Mixed,
    },

    // --- Sales & Commercials: Proposal.
    proposal: {
      dueDate: Date,
      noVersion: String,
      date: Date,
      clientBrief: String,
      consumptionSheet: [attachmentSchema],
      selectedBoqVersion: String,
      designDirection: String,
      designDirectionAttachments: [attachmentSchema],
      pricingRange: String,
      minPricing: Number,
      maxPricing: Number,
      terms: String,
      refundRevisionClause: String,
      isRefundClauseLocked: { type: Boolean, default: true },
      approvalStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'],
        default: 'PENDING',
      },
      approvedBy: String,
      revisionHistory: [
        {
          version: String,
          date: Date,
          createdBy: String,
          changes: String,
        },
      ],
    },

    // --- Sales & Commercials: Token / advance discussion.
    token: {
      discussionDueDate: Date,
      amount: Number,
      status: {
        type: String,
        enum: ['NOT_DISCUSSED', 'DISCUSSED', 'PENDING', 'COMMITTED', 'RECEIVED', 'WAIVED', 'REFUNDED', 'Not Discussed', 'Pending', 'Committed', 'Received', 'Waived', 'Refunded'],
        default: 'NOT_DISCUSSED',
      },
      receivedDate: Date,
      clientBudgetResponse: String,
      proposalAttachment: [attachmentSchema],
      proposal: String,
      budgetEstimate: Number,
      clientResponse: String,
      projectTimeline: String,
      projectTimelineStart: Date,
      projectTimelineEnd: Date,
      commercialTerms: String,
      commercialTermsNotes: String,
      masterTemplate: String,
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
      lineItems: [
        {
          description: String,
          quantity: Number,
          catalogueCost: Number,
          landedCost: Number,
          localFabricCost: Number,
          labourCost: Number,
          totalCost: Number,
        },
      ],
      costingHistory: [
        {
          version: String,
          dueDate: Date,
          catalogueCost: Number,
          landedCost: Number,
          localFabricCost: Number,
          labourCost: Number,
          sampleCost: Number,
          totalCost: Number,
          sellingPrice: Number,
          calculatedMargin: Number,
          marginModel: String,
          savedAt: { type: Date, default: Date.now },
          notes: String,
        },
      ],
    },

    // --- Sales & Commercials: Quotation.
    quotation: {
      dueDate: Date,
      no: String,
      version: String,
      date: Date,
      finalQuotedValue: Number,
      taxes: Number,
      addSubtotal: mongoose.Schema.Types.Mixed,
      validity: String,
      discountApprovalStatus: {
        type: String,
        enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'],
        default: 'NOT_REQUIRED',
      },
      boq: [mongoose.Schema.Types.Mixed],
      fabricSelection: mongoose.Schema.Types.Mixed,
      cataloguePrice: Number,
      labourPrice: Number,
      samplePrice: Number,
      discount: Number,
      marginRules: String,
      boqVersion: String,
    },

    // --- Sales & Commercials: Client approval.
    approval: {
      planned: String,
      clientApprovalDate: String,
      clientApprovalStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'ON_HOLD', 'DECLINED'],
        default: 'PENDING',
      },
      proofAttachment: [attachmentSchema],
      finalApprovedVersion: String,
      revisions: [
        {
          revisionNumber: Number,
          clientApprovalStatus: String,
          finalApprovedVersion: String,
          clientSelection: mongoose.Schema.Types.Mixed,
          fabricSelection: mongoose.Schema.Types.Mixed,
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
      link: String,
      url: String,
      clientSelection: mongoose.Schema.Types.Mixed,
      fabricSelection: mongoose.Schema.Types.Mixed,
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
      verifiedDocuments: [
        new mongoose.Schema(
          {
            documentName: String,
            docType: String,
            status: {
              type: String,
              enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NOT_REQUIRED'],
              default: 'PENDING',
            },
            verifiedBy: String,
            verifiedAt: Date,
            url: String,
            filename: String,
            mimetype: String,
            size: Number,
            caption: String,
          },
          { _id: false }
        ),
      ],
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

const ARRAY_OR_JSON_FIELDS = [
  'roomList',
  'pelmetDetails',
  'channelDetails',
  'motorDetails',
  'wiringDetails',
  'notes',
  'finalMeasurements',
  'windowSizes',
  'windowSize',
  'measurements',
  'fabricDesignSelection',
  'liningAccessoryAssumptions',
  'clientSelection',
  'fabricSelection',
  'drawingsRenders',
];

const safeJsonParse = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    let current = val.trim();
    let depth = 0;
    while (typeof current === 'string' && depth < 5) {
      const trimmed = current.trim();
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          current = JSON.parse(trimmed);
          depth++;
        } catch {
          break;
        }
      } else {
        break;
      }
    }
    return current;
  }
  return val;
};

const normalizeLeadArrays = (target) => {
  if (!target || typeof target !== 'object') return;
  const sections = ['measurement', 'readySize', 'consumption', 'proposal', 'presentation', 'quotation', 'approval'];
  sections.forEach((sec) => {
    if (target[sec] && typeof target[sec] === 'object') {
      ARRAY_OR_JSON_FIELDS.forEach((key) => {
        if (key in target[sec]) {
          target[sec][key] = safeJsonParse(target[sec][key]);
        }
      });
    }
  });
  ARRAY_OR_JSON_FIELDS.forEach((key) => {
    if (key in target) {
      target[key] = safeJsonParse(target[key]);
    }
  });
};

leadSchema.pre('save', function (next) {
  normalizeLeadArrays(this);
  next();
});

leadSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany', 'update'], function (next) {
  const update = this.getUpdate();
  if (update) {
    normalizeLeadArrays(update);
    if (update.$set) normalizeLeadArrays(update.$set);
  }
  next();
});

leadSchema.post(['find', 'findOne', 'findOneAndUpdate'], function (docs) {
  if (!docs) return;
  if (Array.isArray(docs)) {
    docs.forEach(normalizeLeadArrays);
  } else {
    normalizeLeadArrays(docs);
  }
});

applyJsonTransform(leadSchema);

export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);

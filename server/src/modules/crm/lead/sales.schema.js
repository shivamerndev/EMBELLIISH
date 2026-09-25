import mongoose from 'mongoose';
import { attachmentSchema } from '../../../core/schemaPlugins.js';

/**
 * --- Stage 1: Site Visit requirement flag and details ---
 */
export const siteVisitFields = {
  siteVisitRequired: { type: mongoose.Schema.Types.Mixed, default: 'PENDING' },
  siteVisitDueDate: Date,
  actualSiteVisitDateTime: Date,
  siteAddress: String,
  assignedInstaller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  installerName: { type: String, trim: true },
  installerPhone: { type: String, trim: true },
  clientArchitectAvailability: String,
  scope: mongoose.Schema.Types.Mixed,
  rooms: mongoose.Schema.Types.Mixed,
  drawingsRenders: mongoose.Schema.Types.Mixed,
  installerAvailability: {
    type: String,
    enum: ['AVAILABLE', 'BUSY', 'ON_SITE', 'UNAVAILABLE'],
    default: 'AVAILABLE',
  },
};

/**
 * --- Stage 2: Measurement (Physical Measurement Sheet) ---
 */
export const measurementSchema = new mongoose.Schema(
  {
    header: mongoose.Schema.Types.Mixed,
    rows: [mongoose.Schema.Types.Mixed],
    checklist: mongoose.Schema.Types.Mixed,
    remarks: String,
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
  { _id: false }
);

/**
 * --- Stage 3: Studio Meeting ---
 */
export const studioMeetingSchema = new mongoose.Schema(
  {
    dueDate: Date,
    date: Date,
    attendees: String,
    clientDrawings: [attachmentSchema],
    feedback: String,
    nextAction: String,
    architectBrief: String,
    samples: mongoose.Schema.Types.Mixed,
    projectPictures: [attachmentSchema],
    pricingRange: String,
  },
  { _id: false }
);

/**
 * --- Stage 4: Room readiness / ready size / site detail sheet ---
 */
export const readySizeSchema = new mongoose.Schema(
  {
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
    siteDetailSheetGoogleLink: String,
    siteDetailSheetAttachments: [attachmentSchema],
    designPpt: mongoose.Schema.Types.Mixed,
    selectionPpt: mongoose.Schema.Types.Mixed,
    siteDetailRooms: mongoose.Schema.Types.Mixed,
    siteDetailSheet: mongoose.Schema.Types.Mixed,
    productionNotes: String,
    productionHandoffStatus: {
      type: String,
      enum: ['PENDING', 'READY_FOR_PRODUCTION', 'HANDED_OVER'],
      default: 'PENDING',
    },
  },
  { _id: false }
);

/**
 * --- Stage 5: Consumption / BOQ ---
 */
export const consumptionSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

/**
 * --- Stage 6: Proposal ---
 */
export const proposalSchema = new mongoose.Schema(
  {
    dueDate: Date,
    actualDate: Date,
    letterData: { type: mongoose.Schema.Types.Mixed },
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
  { _id: false }
);

/**
 * --- Stage 7: Advance discussion ---
 */
export const advanceSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

/**
 * --- Stage 8: Costing ---
 */
export const costingSchema = new mongoose.Schema(
  {
    dueDate: Date,
    version: { type: String, trim: true, default: 'v1.0' },
    category: {
      type: String,
      enum: {
        values: ['a', 'b', 'c'],
        message: '{VALUE} is not a valid category. Allowed categories are: a, b, c',
      },
      lowercase: true,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price must be greater than or equal to 0'],
    },
    costingHistory: [
      {
        version: String,
        dueDate: Date,
        category: {
          type: String,
          enum: ['a', 'b', 'c'],
          lowercase: true,
          trim: true,
        },
        price: {
          type: Number,
          default: 0,
          min: 0,
        },
        savedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false }
);

/**
 * --- Stage 9: Quotation ---
 */
export const quotationSchema = new mongoose.Schema(
  {
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
    quotationSheet: mongoose.Schema.Types.Mixed,
    coverLetter: mongoose.Schema.Types.Mixed,
    itemsTable: mongoose.Schema.Types.Mixed,
    termsAndBanking: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

/**
 * --- Stage 10: Client Approval ---
 */
export const approvalSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

/**
 * --- Stage 11: Presentation ---
 */
export const presentationSchema = new mongoose.Schema(
  {
    attachment: [attachmentSchema],
    link: String,
    url: String,
    clientSelection: mongoose.Schema.Types.Mixed,
    fabricSelection: mongoose.Schema.Types.Mixed,
    designDirection: String,
    revisionNotes: String,
  },
  { _id: false }
);

/**
 * --- Stage 12: KYC Verification / Customer Conversion ---
 */
export const kycSchema = new mongoose.Schema(
  {
    dueDate: Date,
    actualDate: Date,
    verificationDate: Date,
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Correction Required', 'PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'NOT_REQUIRED', 'CORRECTION_REQUIRED'],
      default: 'Pending',
    },
    customerType: {
      type: String,
      enum: ['Individual', 'Company', 'LLP', 'Partnership', 'Other'],
      default: 'Individual',
    },
    billingLegalName: { type: String, trim: true },
    primaryContactPerson: { type: String, trim: true },
    mobileNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    billingAddress: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    gstRegistered: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No',
    },
    gstin: { type: String, trim: true },
    pan: { type: String, trim: true },
    sameAsBillingAddress: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'Yes',
    },
    siteDeliveryAddress: { type: String, trim: true },
    siteContactPerson: { type: String, trim: true },
    siteContactNumber: { type: String, trim: true },
    poRequired: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No',
    },
    clientPoNumber: { type: String, trim: true },
    billingInstructions: { type: String, trim: true },
    documents: [attachmentSchema],
    verifiedDocuments: [
      new mongoose.Schema(
        {
          documentName: String,
          docType: String,
          status: {
            type: String,
            enum: ['Pending', 'Verified', 'Correction Required', 'PENDING', 'VERIFIED', 'REJECTED', 'NOT_REQUIRED'],
            default: 'Pending',
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
  { _id: false }
);

/**
 * Composite fields for all 12 Sales & Commercials stages to be merged into Lead schema
 */
export const salesCommercialFields = {
  ...siteVisitFields,
  measurement: measurementSchema,
  studioMeeting: studioMeetingSchema,
  readySize: readySizeSchema,
  consumption: consumptionSchema,
  proposal: proposalSchema,
  advance: advanceSchema,
  costing: costingSchema,
  quotation: quotationSchema,
  approval: approvalSchema,
  presentation: presentationSchema,
  kyc: kycSchema,
};

/**
 * Subdocument / standalone schema for Sales & Commercials if needed independently
 */
export const salesCommercialSchema = new mongoose.Schema(salesCommercialFields, { _id: false });

export const ARRAY_OR_JSON_FIELDS = [
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

export const safeJsonParse = (val) => {
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

export const normalizeLeadArrays = (target) => {
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

export default salesCommercialSchema;

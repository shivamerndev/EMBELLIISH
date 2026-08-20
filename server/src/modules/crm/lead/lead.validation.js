import { z } from 'zod';
import { objectId } from '../../project/project/project.validation.js';

const addressSchema = z
  .object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  })
  .optional();

const attachmentItemSchema = z.object({
  url: z.string().optional(),
  filename: z.string().optional(),
  mimetype: z.string().optional(),
  size: z.coerce.number().optional(),
  caption: z.string().optional(),
});

const measurementSchema = z
  .object({
    dueDate: z.coerce.date().optional(),
    date: z.coerce.date().optional(),
    measuredBy: objectId.optional(),
    status: z.enum(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REVISIT_REQUIRED', 'PROVISIONAL', 'FINAL', 'RE_MEASUREMENT_REQUIRED', 'Provisional', 'Final', 'Re-measurement Required']).optional(),
    siteAccess: z.string().optional(),
    attachments: z.array(attachmentItemSchema).optional(),
    roomList: z.string().optional(),
    drawings: z.array(attachmentItemSchema).optional(),
    pelmetDetails: z.string().optional(),
    channelDetails: z.string().optional(),
    motorDetails: z.string().optional(),
    wiringDetails: z.string().optional(),
    notes: z.string().optional(),
  })
  .optional();

const studioMeetingSchema = z
  .object({
    dueDate: z.coerce.date().optional(),
    date: z.coerce.date().optional(),
    attendees: z.string().optional(),
    clientDrawings: z.array(attachmentItemSchema).optional(),
    feedback: z.string().optional(),
    nextAction: z.string().optional(),
    architectBrief: z.string().optional(),
    samples: z.array(attachmentItemSchema).optional(),
    projectPictures: z.array(attachmentItemSchema).optional(),
    pricingRange: z.string().optional(),
  })
  .optional();

const readySizeSchema = z
  .object({
    roomReadiness: z.string().optional(),
    dueDate: z.coerce.date().optional(),
    confirmedBy: objectId.optional(),
    confirmationDate: z.coerce.date().optional(),
    windowSize: z.string().optional(),
    siteCondition: z.string().optional(),
    pelmetDetails: z.string().optional(),
    channelDetails: z.string().optional(),
    readyHeight: z.string().optional(),
    finalMeasurements: z.string().optional(),
  })
  .optional();

const consumptionSchema = z
  .object({
    sheetDueDate: z.coerce.date().optional(),
    measurements: z.string().optional(),
    quantity: z.coerce.number().optional(),
    unit: z.string().optional(),
    wastageAllowance: z.string().optional(),
    boqVersion: z.string().optional(),
    roomList: z.string().optional(),
    boqPreparedBy: z.string().optional(),
    boqPreparedDate: z.coerce.date().optional(),
    fabricDesignSelection: z.string().optional(),
    panelCount: z.coerce.number().int().optional(),
    liningAccessoryAssumptions: z.string().optional(),
  })
  .optional();

const proposalSchema = z
  .object({
    dueDate: z.coerce.date().optional(),
    noVersion: z.string().optional(),
    date: z.coerce.date().optional(),
    clientBrief: z.string().optional(),
    consumptionSheet: z.array(attachmentItemSchema).optional(),
    designDirection: z.string().optional(),
    pricingRange: z.string().optional(),
    terms: z.string().optional(),
    refundRevisionClause: z.string().optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED']).optional(),
    approvedBy: z.string().optional(),
  })
  .optional();

const tokenSchema = z
  .object({
    discussionDueDate: z.coerce.date().optional(),
    amount: z.coerce.number().optional(),
    status: z.enum(['NOT_DISCUSSED', 'DISCUSSED', 'PENDING', 'RECEIVED', 'WAIVED']).optional(),
    receivedDate: z.coerce.date().optional(),
    clientBudgetResponse: z.string().optional(),
    proposalAttachment: z.array(attachmentItemSchema).optional(),
    budgetEstimate: z.coerce.number().optional(),
    clientResponse: z.string().optional(),
    projectTimeline: z.string().optional(),
    commercialTerms: z.string().optional(),
  })
  .optional();

const costingSchema = z
  .object({
    dueDate: z.coerce.date().optional(),
    catalogueCost: z.coerce.number().optional(),
    version: z.string().optional(),
    landedCost: z.coerce.number().optional(),
    localFabricCost: z.coerce.number().optional(),
    labourCost: z.coerce.number().optional(),
    totalCost: z.coerce.number().optional(),
    calculatedMargin: z.coerce.number().optional(),
    sampleCost: z.coerce.number().optional(),
    marginModel: z.string().optional(),
    minMarginThreshold: z.coerce.number().optional(),
    maxDiscountThreshold: z.coerce.number().optional(),
    hiteshApprovalRequired: z.boolean().optional(),
    hiteshApprovalStatus: z.enum(['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
    hiteshApprovalNotes: z.string().optional(),
  })
  .optional();

const quotationDetailsSchema = z
  .object({
    dueDate: z.coerce.date().optional(),
    no: z.string().optional(),
    version: z.string().optional(),
    date: z.coerce.date().optional(),
    finalQuotedValue: z.coerce.number().optional(),
    taxes: z.coerce.number().optional(),
    addSubtotal: z.coerce.number().optional(),
    validity: z.string().optional(),
    discountApprovalStatus: z.enum(['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
    boq: z.array(attachmentItemSchema).optional(),
    fabricSelection: z.string().optional(),
    cataloguePrice: z.coerce.number().optional(),
    labourPrice: z.coerce.number().optional(),
    samplePrice: z.coerce.number().optional(),
    discount: z.coerce.number().optional(),
    marginRules: z.string().optional(),
  })
  .optional();

const approvalRevisionItemSchema = z.object({
  revisionNumber: z.coerce.number().optional(),
  clientApprovalStatus: z.string().optional(),
  finalApprovedVersion: z.string().optional(),
  clientSelection: z.string().optional(),
  fabricSelection: z.string().optional(),
  designDirection: z.string().optional(),
  revisionNotes: z.string().optional(),
  changeReason: z.string().optional(),
  revisedAt: z.union([z.string(), z.date()]).optional(),
  proofAttachment: z.array(attachmentItemSchema).optional(),
});

const approvalSchema = z
  .object({
    planned: z.string().optional(),
    clientApprovalDate: z.string().optional(),
    clientApprovalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED']).optional(),
    proofAttachment: z.array(attachmentItemSchema).optional(),
    finalApprovedVersion: z.string().optional(),
    revisions: z.array(approvalRevisionItemSchema).optional(),
  })
  .optional();

const presentationSchema = z
  .object({
    attachment: z.array(attachmentItemSchema).optional(),
    clientSelection: z.string().optional(),
    fabricSelection: z.string().optional(),
    designDirection: z.string().optional(),
    revisionNotes: z.string().optional(),
  })
  .optional();

const kycSchema = z
  .object({
    dueDate: z.union([z.string(), z.date()]).optional(),
    actualDate: z.union([z.string(), z.date()]).optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'NOT_REQUIRED']).optional(),
    verifiedDocuments: z.array(attachmentItemSchema).optional(),
    documentTypes: z.array(z.string()).optional(),
    remarks: z.string().optional(),
    verifiedBy: z.string().optional(),
  })
  .optional();

const createLeadSchema = z.object({
  clientName: z.string().min(2, 'Client name is required'),
  contactPerson: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().min(3, 'Phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  architect: objectId.optional(),
  architectName: z.string().optional(),
  source: z.string().optional(),
  previousClientRelationship: z.boolean().optional(),
  existingRelationshipOwner: z.string().optional(),
  location: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  address: addressSchema,
  projectType: z
    .enum(['VILLA', 'APARTMENT', 'BUNGALOW', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'])
    .optional(),
  budget: z.coerce.number().nonnegative().optional(),
  indicativeBudget: z.string().optional(),
  budgetClassification: z.enum(['A', 'B', 'C', 'D', 'ECONOMY', 'MID_RANGE', 'PREMIUM', 'LUXURY', 'ULTRA_LUXURY']).optional(),
  roomCount: z.coerce.number().int().nonnegative().optional(),
  requirement: z.string().optional(),
  requirementSummary: z.string().optional(),
  architectInvolved: z.enum(['Yes', 'No', 'Not Known']).optional(),
  attachmentUrl: z.string().optional(),
  attachments: z.array(attachmentItemSchema).optional(),
  assignedDCM: objectId.optional(),
  nextFollowUpAt: z.coerce.date().optional(),

  // --- Assignment (Step 3): DCM Capacity & Reassignment.
  assignedDcmName: z.string().optional(),
  assignmentDueDate: z.coerce.date().optional(),
  assignmentDateTime: z.coerce.date().optional(),
  dcmCapacityStatus: z.enum(['AVAILABLE', 'OVERLOADED']).optional(),
  dcmActiveProjectCount: z.coerce.number().int().nonnegative().optional(),
  reassignmentRequired: z.boolean().optional(),
  reassignedTo: objectId.optional(),
  reassignedToName: z.string().optional(),
  reassignmentReason: z.string().optional(),
  updatedUser: z.string().optional(),

  // --- Qualification Sheet (Step 2 checklist form).
  qualificationDueDate: z.coerce.date().optional(),
  requirementVerified: z.enum(['YES', 'NO', 'PENDING']).optional(),
  budgetPricingVerified: z.enum(['YES', 'NO', 'PENDING']).optional(),
  timelineConfirmed: z.enum(['YES', 'NO', 'PENDING']).optional(),
  decisionMakerIdentified: z.enum(['YES', 'NO', 'PENDING', 'NOT_KNOWN']).optional(),
  competitionDetailsCaptured: z.enum(['YES', 'NO', 'NOT_KNOWN']).optional(),
  qualificationDecision: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'NOT DECIDED']).optional(),
  decisionDateTime: z.coerce.date().optional(),
  rejectionHoldReason: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST']).optional(),
  lostReason: z.string().optional(),

  // --- Follow-up Sheet (Step 4).
  nextAction: z.string().optional(),
  nextActionDueDate: z.coerce.date().optional(),
  overallLeadStatus: z.enum(['NEW', 'ASSIGNED', 'UNDER_QUALIFICATION', 'REJECTED', 'HOLD', 'ON_HOLD', 'FOLLOW_UP', 'FOLLOWUP', 'IN_PROGRESS', 'APPROVED']).optional(),

  siteVisitRequired: z.boolean().optional(),
  siteVisitDueDate: z.coerce.date().optional(),
  actualSiteVisitDateTime: z.coerce.date().optional(),
  siteAddress: z.string().optional(),
  assignedInstaller: objectId.optional().nullable(),
  clientArchitectAvailability: z.string().optional(),
  scope: z.string().optional(),
  rooms: z.string().optional(),
  drawingsRenders: z.string().optional(),
  installerAvailability: z.enum(['AVAILABLE', 'BUSY', 'ON_SITE', 'UNAVAILABLE']).optional(),
  measurement: measurementSchema,
  studioMeeting: studioMeetingSchema,
  readySize: readySizeSchema,
  consumption: consumptionSchema,
  proposal: proposalSchema,
  token: tokenSchema,
  costing: costingSchema,
  quotation: quotationDetailsSchema,
  approval: approvalSchema,
  presentation: presentationSchema,
  kyc: kycSchema,
});

const updateLeadSchema = createLeadSchema.partial();

const qualifyLeadSchema = z.object({
  qualified: z.boolean(),
  budget: z.coerce.number().nonnegative().optional(),
  roomCount: z.coerce.number().int().nonnegative().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
});

const assignLeadSchema = z.object({
  assignedDCM: objectId,
  note: z.string().optional(),
});

const convertLeadSchema = z.object({
  projectName: z.string().optional(),
  siteAddress: addressSchema,
  estimatedValue: z.coerce.number().nonnegative().optional(),
});

const followUpSchema = z.object({
  type: z.enum(['CALL', 'MEETING', 'SITE_VISIT', 'WHATSAPP', 'EMAIL', 'REMINDER']).optional(),
  subject: z.string().min(2, 'Subject is required'),
  notes: z.string().optional(),
  outcome: z
    .enum(['INTERESTED', 'NOT_INTERESTED', 'CALL_LATER', 'NO_RESPONSE', 'MEETING_FIXED', 'CLOSED'])
    .optional(),
  scheduledAt: z.coerce.date().optional(),
  nextFollowUpAt: z.coerce.date().optional(),
  owner: objectId.optional(),
});

const lostLeadSchema = z.object({ reason: z.string().min(2, 'A reason is required') });

export {
  createLeadSchema,
  updateLeadSchema,
  qualifyLeadSchema,
  assignLeadSchema,
  convertLeadSchema,
  followUpSchema,
  lostLeadSchema,
};

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
    roomList: z.any().optional(),
    drawings: z.array(attachmentItemSchema).optional(),
    pelmetDetails: z.any().optional(),
    channelDetails: z.any().optional(),
    motorDetails: z.any().optional(),
    wiringDetails: z.any().optional(),
    notes: z.any().optional(),
  })
  .optional();

const getDateOnlyString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

const studioMeetingSchema = z
  .object({
    dueDate: z.coerce.date().optional().nullable(),
    date: z.coerce.date().optional().nullable(),
    attendees: z.string().optional().nullable(),
    clientDrawings: z.array(attachmentItemSchema).optional(),
    feedback: z.string().optional().nullable(),
    nextAction: z.string().optional().nullable(),
    architectBrief: z.string().optional().nullable(),
    samples: z.array(attachmentItemSchema).optional(),
    projectPictures: z.array(attachmentItemSchema).optional(),
    pricingRange: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data?.dueDate && data?.date) {
        const dueDateStr = getDateOnlyString(data.dueDate);
        const actualDateStr = getDateOnlyString(data.date);
        if (dueDateStr && actualDateStr && actualDateStr < dueDateStr) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Actual Meeting Date & Time cannot be earlier than the Studio Meeting Due Date.',
      path: ['date'],
    }
  )
  .optional();

const readySizeSchema = z
  .object({
    roomReadiness: z.string().optional(),
    dueDate: z.coerce.date().optional(),
    confirmedBy: z.union([z.array(objectId), z.array(z.string()), z.array(z.any()), objectId, z.string()]).optional(),
    confirmationDate: z.coerce.date().optional(),
    windowSize: z.any().optional(),
    windowSizes: z.any().optional(),
    siteCondition: z.string().optional(),
    pelmetDetails: z.any().optional(),
    channelDetails: z.any().optional(),
    readyHeight: z.any().optional(),
    finalMeasurements: z.any().optional(),
  })
  .optional();

const consumptionSchema = z
  .object({
    sheetDueDate: z.coerce.date().optional(),
    measurements: z.any().optional(),
    quantity: z.coerce.number().optional(),
    unit: z.string().optional(),
    wastageAllowance: z.string().optional(),
    boqVersion: z.string().optional(),
    roomList: z.any().optional(),
    boqPreparedBy: z.string().optional(),
    boqPreparedDate: z.coerce.date().optional(),
    fabricDesignSelection: z.any().optional(),
    panelCount: z.coerce.number().int().optional(),
    liningAccessoryAssumptions: z.any().optional(),
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
    discussionDueDate: z.coerce.date().optional().nullable(),
    amount: z.coerce.number().optional().nullable(),
    status: z.string().optional().nullable(),
    receivedDate: z.coerce.date().optional().nullable(),
    clientBudgetResponse: z.string().optional().nullable(),
    proposalAttachment: z.array(attachmentItemSchema).optional().nullable(),
    proposal: z.string().optional().nullable(),
    budgetEstimate: z.coerce.number().optional().nullable(),
    clientResponse: z.string().optional().nullable(),
    projectTimeline: z.string().optional().nullable(),
    projectTimelineStart: z.coerce.date().optional().nullable(),
    projectTimelineEnd: z.coerce.date().optional().nullable(),
    commercialTerms: z.string().optional().nullable(),
    commercialTermsNotes: z.string().optional().nullable(),
    masterTemplate: z.string().optional().nullable(),
  })
  .optional();

const costingLineItemSchema = z.object({
  description: z.string().optional(),
  quantity: z.coerce.number().optional(),
  catalogueCost: z.coerce.number().optional(),
  landedCost: z.coerce.number().optional(),
  localFabricCost: z.coerce.number().optional(),
  labourCost: z.coerce.number().optional(),
  totalCost: z.coerce.number().optional(),
});

const costingHistorySchema = z.object({
  version: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  catalogueCost: z.coerce.number().optional(),
  landedCost: z.coerce.number().optional(),
  localFabricCost: z.coerce.number().optional(),
  labourCost: z.coerce.number().optional(),
  sampleCost: z.coerce.number().optional(),
  totalCost: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  calculatedMargin: z.coerce.number().optional(),
  marginModel: z.string().optional(),
  savedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

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
    lineItems: z.array(costingLineItemSchema).optional(),
    costingHistory: z.array(costingHistorySchema).optional(),
  })
  .optional();

const fabricItemSchema = z.object({
  room: z.string().optional(),
  fabric: z.string().optional(),
  quantity: z.coerce.number().optional(),
  unit: z.string().optional(),
  rate: z.coerce.number().optional(),
  price: z.coerce.number().optional(),
}).passthrough();

const boqItemSchema = z.object({
  url: z.string().optional(),
  filename: z.string().optional(),
  mimetype: z.string().optional(),
  size: z.coerce.number().optional(),
  caption: z.string().optional(),
  room: z.string().optional(),
  item: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().optional(),
  unit: z.string().optional(),
  rate: z.coerce.number().optional(),
  amount: z.coerce.number().optional(),
}).passthrough();

const quotationDetailsSchema = z
  .object({
    dueDate: z.coerce.date().optional(),
    no: z.string().optional(),
    version: z.string().optional(),
    date: z.coerce.date().optional(),
    finalQuotedValue: z.coerce.number().optional(),
    taxes: z.coerce.number().optional(),
    addSubtotal: z.union([z.boolean(), z.coerce.number()]).optional(),
    validity: z.string().optional(),
    discountApprovalStatus: z.enum(['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
    boq: z.array(boqItemSchema).optional(),
    fabricSelection: z.union([z.string(), z.array(fabricItemSchema)]).optional(),
    cataloguePrice: z.coerce.number().optional(),
    labourPrice: z.coerce.number().optional(),
    samplePrice: z.coerce.number().optional(),
    discount: z.coerce.number().optional(),
    marginRules: z.string().optional(),
    boqVersion: z.string().optional(),
  })
  .optional();

const clientSelectionItemSchema = z.object({
  item: z.string().optional(),
  quantity: z.coerce.number().optional(),
  room: z.string().optional(),
  remarks: z.string().optional(),
}).passthrough();

const fabricSelectionItemSchema = z.object({
  room: z.string().optional(),
  fabric: z.string().optional(),
  code: z.string().optional(),
}).passthrough();

const approvalRevisionItemSchema = z.object({
  revisionNumber: z.coerce.number().optional(),
  clientApprovalStatus: z.string().optional(),
  finalApprovedVersion: z.string().optional(),
  clientSelection: z.union([z.string(), z.array(clientSelectionItemSchema)]).optional(),
  fabricSelection: z.union([z.string(), z.array(fabricSelectionItemSchema)]).optional(),
  designDirection: z.string().optional(),
  revisionNotes: z.string().optional(),
  changeReason: z.string().optional(),
  revisedAt: z.union([z.string(), z.date()]).optional(),
  proofAttachment: z.array(attachmentItemSchema).optional(),
});

const clientApprovalStatusSchema = z.string().transform((val) => {
  if (!val) return val;
  return val.trim().toUpperCase().replace(/\s+/g, '_');
}).pipe(z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'ON_HOLD', 'DECLINED'])).optional();

const approvalSchema = z
  .object({
    planned: z.union([z.string(), z.date()]).nullable().optional(),
    clientApprovalDate: z.union([z.string(), z.date()]).nullable().optional(),
    clientApprovalStatus: clientApprovalStatusSchema,
    proofAttachment: z.array(attachmentItemSchema).optional(),
    finalApprovedVersion: z.string().optional(),
    revisions: z.array(approvalRevisionItemSchema).optional(),
  })
  .optional();

const presentationSchema = z
  .object({
    attachment: z.array(attachmentItemSchema).optional(),
    link: z.string().optional(),
    url: z.string().optional(),
    clientSelection: z.union([z.string(), z.array(clientSelectionItemSchema)]).optional(),
    fabricSelection: z.union([z.string(), z.array(fabricSelectionItemSchema)]).optional(),
    designDirection: z.string().optional(),
    revisionNotes: z.string().optional(),
  })
  .optional();

const kycDocumentItemSchema = z.object({
  documentName: z.string().optional(),
  docType: z.string().optional(),
  status: z.string().optional(),
  verifiedBy: z.string().optional(),
  verifiedAt: z.union([z.string(), z.date()]).optional(),
  url: z.string().optional(),
  filename: z.string().optional(),
  mimetype: z.string().optional(),
  size: z.coerce.number().optional(),
  caption: z.string().optional(),
});

const kycSchema = z
  .object({
    dueDate: z.union([z.string(), z.date()]).optional().nullable(),
    actualDate: z.union([z.string(), z.date()]).optional().nullable(),
    verificationDate: z.union([z.string(), z.date()]).optional().nullable(),
    status: z.string().optional(),
    customerType: z.enum(['Individual', 'Company', 'LLP', 'Partnership', 'Other']).optional(),
    billingLegalName: z.string().optional().nullable(),
    primaryContactPerson: z.string().optional().nullable(),
    mobileNumber: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    billingAddress: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    pinCode: z.string().optional().nullable(),
    gstRegistered: z.enum(['Yes', 'No']).optional(),
    gstin: z.string().optional().nullable(),
    pan: z.string().optional().nullable(),
    sameAsBillingAddress: z.enum(['Yes', 'No']).optional(),
    siteDeliveryAddress: z.string().optional().nullable(),
    siteContactPerson: z.string().optional().nullable(),
    siteContactNumber: z.string().optional().nullable(),
    poRequired: z.enum(['Yes', 'No']).optional(),
    clientPoNumber: z.string().optional().nullable(),
    billingInstructions: z.string().optional().nullable(),
    documents: z.array(attachmentItemSchema).optional(),
    verifiedDocuments: z.array(kycDocumentItemSchema).optional(),
    documentTypes: z.array(z.string()).optional(),
    remarks: z.string().optional().nullable(),
    verifiedBy: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.gstRegistered === 'Yes' && (!data.gstin || !data.gstin.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GSTIN is required when GST Registered is Yes',
        path: ['gstin'],
      });
    }
    if (data.sameAsBillingAddress === 'No') {
      if (!data.siteDeliveryAddress || !data.siteDeliveryAddress.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Site / Delivery Address is required when address is different from Billing Address',
          path: ['siteDeliveryAddress'],
        });
      }
      if (!data.siteContactPerson || !data.siteContactPerson.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Site Contact Person is required when address is different from Billing Address',
          path: ['siteContactPerson'],
        });
      }
      if (!data.siteContactNumber || !data.siteContactNumber.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Site Contact Number is required when address is different from Billing Address',
          path: ['siteContactNumber'],
        });
      }
    }
    if (data.poRequired === 'Yes' && (!data.clientPoNumber || !data.clientPoNumber.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Client PO Number is required when PO is required from client',
        path: ['clientPoNumber'],
      });
    }
  })
  .optional();

const rawCreateLeadSchema = z.object({
  clientName: z.string().min(2, 'Client name is required'),
  contactPerson: z.string().optional(),
  companyName: z.string().optional(),
  phone: z
    .string()
    .min(3, 'Phone number is required')
    .refine((val) => /^(\+\d{1,4}[- ]?)?\d{7,15}$/.test(val.trim()), {
      message: 'Invalid phone number format',
    }),
  email: z.string().email().optional().or(z.literal('')),
  architect: objectId.optional(),
  architectName: z.string().optional(),
  source: z.string().optional(),
  previousClientRelationship: z.boolean().optional(),
  existingRelationshipOwner: z.string().optional(),
  location: z.string().optional(),
  pincode: z.string().optional(),
  pinCode: z.string().optional(),
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

  siteVisitRequired: z.union([z.boolean(), z.enum(['YES', 'NO', 'PENDING'])]).optional(),
  siteVisitDueDate: z.coerce.date().optional().nullable(),
  actualSiteVisitDateTime: z.coerce.date().optional().nullable(),
  siteAddress: z.string().optional(),
  assignedInstaller: objectId.optional().nullable(),
  clientArchitectAvailability: z.string().optional(),
  scope: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  rooms: z.union([z.array(z.string()), z.string()]).optional().nullable(),
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

const validateSiteVisitDates = (data) => {
  if (data?.siteVisitDueDate && data?.actualSiteVisitDateTime) {
    const dueDateStr = getDateOnlyString(data.siteVisitDueDate);
    const actualDateStr = getDateOnlyString(data.actualSiteVisitDateTime);
    if (dueDateStr && actualDateStr && actualDateStr < dueDateStr) {
      return false;
    }
  }
  return true;
};

const siteVisitRefinement = [
  validateSiteVisitDates,
  {
    message: 'Actual Site Visit Date & Time cannot be earlier than the Pre Site Visit Due Date.',
    path: ['actualSiteVisitDateTime'],
  },
];

const createLeadSchema = rawCreateLeadSchema.refine(...siteVisitRefinement);
const updateLeadSchema = rawCreateLeadSchema.partial().refine(...siteVisitRefinement);

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

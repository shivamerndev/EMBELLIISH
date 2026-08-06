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

const createLeadSchema = z.object({
  clientName: z.string().min(2, 'Client name is required'),
  companyName: z.string().optional(),
  phone: z.string().min(7, 'A contactable phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  architect: objectId.optional(),
  source: z.enum(['ARCHITECT', 'REFERRAL', 'WALK_IN', 'WEBSITE', 'EXHIBITION', 'SOCIAL', 'OTHER', 'DCM', 'DIRECT_VISIT', 'DIRECT_CLIENT', 'EXISTING_CLIENT']).optional(),
  previousClientRelationship: z.boolean().optional(),
  location: z.string().optional(),
  priority: z.enum(['HOT', 'MEDIUM', 'LOW']).optional(),
  address: addressSchema,
  projectType: z
    .enum(['VILLA', 'APARTMENT', 'BUNGALOW', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'])
    .optional(),
  budget: z.coerce.number().nonnegative().optional(),
  roomCount: z.coerce.number().int().nonnegative().optional(),
  requirement: z.string().optional(),
  assignedDCM: objectId.optional(),
  nextFollowUpAt: z.coerce.date().optional(),
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

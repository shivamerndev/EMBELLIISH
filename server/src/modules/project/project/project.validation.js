import { z } from 'zod';
import { STAGE_ORDER } from '../../../constants/workflow.constants.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

const addressSchema = z
  .object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  })
  .optional();

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name is required'),
  client: objectId,
  architect: objectId.optional(),
  lead: objectId.optional(),
  siteAddress: addressSchema,
  projectType: z
    .enum(['VILLA', 'APARTMENT', 'BUNGALOW', 'FARMHOUSE', 'HOTEL', 'OFFICE', 'RETAIL', 'OTHER'])
    .optional(),
  assignedDCM: objectId.optional(),
  projectCoordinator: objectId.optional(),
  estimatedValue: z.number().nonnegative().optional(),
  expectedStartDate: z.coerce.date().optional(),
  expectedDeliveryDate: z.coerce.date().optional(),
  consumptionConfig: z.record(z.any()).optional(),
  rateCard: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  // Stage is intentionally absent: it may only change through /advance, so a
  // plain PUT cannot walk a project past its gates.
  designer: objectId.optional().nullable(),
  executionEngineer: objectId.optional().nullable(),
  installer: objectId.optional().nullable(),
});

const advanceStageSchema = z.object({
  toStage: z.enum(STAGE_ORDER).optional(),
  note: z.string().optional(),
});

const holdSchema = z.object({
  isOnHold: z.boolean(),
  reason: z.string().optional(),
});

const assignTeamSchema = z.object({
  assignedDCM: objectId.nullable().optional(),
  projectCoordinator: objectId.nullable().optional(),
  designer: objectId.nullable().optional(),
  executionEngineer: objectId.nullable().optional(),
  installer: objectId.nullable().optional(),
});

const closeProjectSchema = z.object({
  signedBy: z.string().min(1, 'Client sign-off name is required'),
  remarks: z.string().optional(),
  attachments: z.array(z.record(z.any())).optional(),
});

export {
  objectId,
  createProjectSchema,
  updateProjectSchema,
  advanceStageSchema,
  holdSchema,
  assignTeamSchema,
  closeProjectSchema,
};

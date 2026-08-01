import { z } from 'zod';
import { objectId } from '../../project/project/project.validation.js';
import { PAYMENT_MILESTONE } from '../../../constants/workflow.constants.js';

const createPaymentSchema = z.object({
  project: objectId,
  client: objectId.optional(),
  invoice: objectId.optional(),
  milestone: z.enum([...Object.values(PAYMENT_MILESTONE), 'OTHER']),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  mode: z.enum(['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'CARD', 'OTHER']).optional(),
  referenceNo: z.string().optional(),
  bank: z.string().optional(),
  receivedAt: z.coerce.date().optional(),
  status: z.enum(['PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED']).optional(),
  clearedAt: z.coerce.date().optional(),
  remarks: z.string().optional(),
});

const updatePaymentSchema = createPaymentSchema.partial().omit({ project: true });

const clearPaymentSchema = z.object({ clearedAt: z.coerce.date().optional() });
const bouncePaymentSchema = z.object({ remarks: z.string().optional() });

export { createPaymentSchema, updatePaymentSchema, clearPaymentSchema, bouncePaymentSchema };

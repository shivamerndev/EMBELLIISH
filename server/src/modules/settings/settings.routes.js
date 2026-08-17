import express from 'express';
import { z } from 'zod';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import asyncHandler from '../../core/asyncHandler.js';
import settingsService from './settings.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import { PERMISSIONS } from '../../constants/roles.constants.js';

/**
 * Module 20 — Settings / Masters.
 *
 * Anyone signed in may read the settings: the quotation screen needs the GST
 * default, the measurement screen needs the ready-size allowances, and the PDF
 * footer needs the company address. Only an admin may change them.
 */
const router = express.Router();
router.use(authMiddleware);

const percent = z.coerce.number().min(0).max(100);

const settingsSchema = z.object({
  company: z
    .object({
      name: z.string().min(1).optional(),
      legalName: z.string().optional(),
      gstin: z.string().optional(),
      pan: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      website: z.string().optional(),
      address: z
        .object({
          line1: z.string().optional(),
          line2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          pincode: z.string().optional(),
        })
        .optional(),
      bankName: z.string().optional(),
      bankAccount: z.string().optional(),
      bankIfsc: z.string().optional(),
      termsAndConditions: z.string().optional(),
      refundRevisionClause: z.string().optional(),
      quotationValidityDays: z.coerce.number().int().positive().optional(),
    })
    .optional(),
  discount: z
    .object({
      approvalThresholdPercent: percent.optional(),
      maximumPercent: percent.optional(),
    })
    .optional(),
  payment: z
    .object({
      tokenPercent: percent.optional(),
      advancePercent: percent.optional(),
      balancePercent: percent.optional(),
      invoiceDueDays: z.coerce.number().int().nonnegative().optional(),
    })
    .optional(),
  tax: z.object({ gstPercent: percent.optional() }).optional(),
  consumptionDefaults: z.record(z.any()).optional(),
  rateCardDefaults: z.record(z.any()).optional(),
  notifications: z
    .object({
      emailEnabled: z.boolean().optional(),
      notifyOnStageAdvance: z.boolean().optional(),
      notifyOnPayment: z.boolean().optional(),
      notifyOnQcFailure: z.boolean().optional(),
      notifyOnSnag: z.boolean().optional(),
      notifyOnLowStock: z.boolean().optional(),
    })
    .optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await settingsService.get();
    return sendSuccess(res, 'Settings retrieved', data);
  })
);

router.put(
  '/',
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const data = await settingsService.update(req.validated, req.user);
    return sendSuccess(res, 'Settings updated', data);
  })
);

export default router;

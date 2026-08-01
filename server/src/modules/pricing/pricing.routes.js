import { z } from 'zod';
import express from 'express';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import validate from '../../middlewares/validate.middleware.js';
import asyncHandler from '../../core/asyncHandler.js';
import BaseController from '../../core/BaseController.js';
import pricingService from './pricing.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import { UOM } from '../../constants/product.constants.js';
import { PERMISSIONS } from '../../constants/roles.constants.js';

/**
 * Module 7 — Pricing Master.
 *
 * Reading the price list is a BOQ concern (the DCM has to see what a line costs);
 * publishing a rate is the founder's.
 */
const priceItemSchema = z.object({
  key: z.string().min(2, 'Rate-card key is required'),
  particular: z.string().min(2, 'Particular is required'),
  description: z.string().optional(),
  category: z.enum(['MATERIAL', 'LABOUR', 'HARDWARE', 'SERVICE', 'OTHER']).optional(),
  unit: z.enum(Object.values(UOM)).optional(),
  rate: z.coerce.number().nonnegative(),
  costRate: z.coerce.number().nonnegative().optional(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
  effectiveFrom: z.coerce.date().optional(),
  maxDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  minimumRate: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const controller = new BaseController(pricingService, 'Price list item');

const router = express.Router();
router.use(authMiddleware);

const canView = requirePermission(PERMISSIONS.BOQ_VIEW);
const canManage = requirePermission(PERMISSIONS.PRICING_MANAGE);

router.get('/', canView, controller.list);

/** The rates in force today (or on `?on=YYYY-MM-DD`) — one row per key. */
router.get(
  '/current',
  canView,
  asyncHandler(async (req, res) => {
    const data = await pricingService.currentPriceList(req.query.on ? new Date(req.query.on) : new Date());
    return sendSuccess(res, 'Current price list retrieved', data);
  })
);

/** Which chargeable lines still have no published rate. */
router.get(
  '/coverage',
  canView,
  asyncHandler(async (req, res) => {
    const data = await pricingService.coverage();
    return sendSuccess(res, 'Price list coverage retrieved', data);
  })
);

/** The rate card a project would cost with right now. */
router.get(
  '/rate-card',
  canView,
  asyncHandler(async (req, res) => {
    const data = await pricingService.resolveRateCard({}, req.query.on ? new Date(req.query.on) : new Date());
    return sendSuccess(res, 'Rate card resolved', data);
  })
);

router.post('/:id/retire', canManage, asyncHandler(async (req, res) => {
  const data = await pricingService.retire(req.params.id, req.user);
  return sendSuccess(res, 'Rate retired', data);
}));

router.get('/:id', canView, controller.getById);
router.post('/', canManage, validate(priceItemSchema), controller.create);
router.put('/:id', canManage, validate(priceItemSchema.partial()), controller.update);
router.delete('/:id', canManage, controller.remove);

export default router;

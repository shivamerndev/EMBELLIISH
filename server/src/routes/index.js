import express from 'express';

// Identity
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import membersRoutes from '../modules/members/members.routes.js';

// CRM — Leads, DCM Assignment, Qualification, Delayed Leads
import leadRoutes from '../modules/crm/lead/lead.routes.js';
import architectRoutes from '../modules/crm/architect/architect.routes.js';

// Sales — approved leads pipeline serving all 12 Sales & Commercials stages
import salesRoutes from '../modules/sales/sales.routes.js';

// Inventory — fabrics only (consumed by Studio Meeting & Consumption BOQ)
import fabricRoutes from '../modules/inventory/fabric/fabric.routes.js';

// Notifications, Settings, Pricing
import notificationRoutes from '../modules/notification/notification.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import pricingRoutes from '../modules/pricing/pricing.routes.js';

// Reports — dashboard roll-up
import reportsRoutes from '../modules/reports/reports.routes.js';

// Upload — photo/file attachments for sales stages
import uploadRoutes from './upload.routes.js';

import settingsService from '../modules/settings/settings.service.js';
import { STAGE_ORDER, STAGE_LABELS } from '../constants/workflow.constants.js';
import { ROLES, ROLE_PERMISSIONS } from '../constants/roles.constants.js';
import { PARTICULAR_LABELS } from '../constants/product.constants.js';
import { DEFAULT_CONSUMPTION_CONFIG, DEFAULT_RATE_CARD } from '../services/consumption.service.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/members', membersRoutes);

router.use('/upload', uploadRoutes);

router.use('/crm/leads', leadRoutes);
router.use('/crm/architects', architectRoutes);
router.use('/sales', salesRoutes);

router.use('/inventory/fabrics', fabricRoutes);

router.use('/reports', reportsRoutes);

router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/pricing', pricingRoutes);

/**
 * Shared vocabulary for the client: stage names, role permissions, product types
 * and calculation defaults. Fetched once at startup so the UI never hard-codes an
 * enum that the server owns.
 */
router.get('/meta', async (req, res, next) => {
  try {
    // The live settings win over the compiled-in defaults, so a threshold the
    // founder moved this morning is what the client-side forms enforce.
    const settings = await settingsService.get();

    res.json({
      success: true,
      message: 'Workflow metadata',
      data: {
        stages: STAGE_ORDER.map((stage) => ({ stage, label: STAGE_LABELS[stage] })),
        roles: Object.values(ROLES),
        rolePermissions: ROLE_PERMISSIONS,
        particulars: PARTICULAR_LABELS,
        consumptionDefaults: { ...DEFAULT_CONSUMPTION_CONFIG, ...(settings.consumptionDefaults || {}) },
        rateCardDefaults: { ...DEFAULT_RATE_CARD, ...(settings.rateCardDefaults || {}) },
        company: settings.company,
        discount: settings.discount,
        paymentSchedule: settings.payment,
        gstPercent: settings.tax?.gstPercent ?? 18,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import express from 'express';

// Identity
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';

// CRM — Steps 1, 2, 3, 7, 8
import leadRoutes from '../modules/crm/lead/lead.routes.js';
import clientRoutes from '../modules/crm/client/client.routes.js';
import architectRoutes from '../modules/crm/architect/architect.routes.js';
import followupRoutes from '../modules/crm/followup/followup.routes.js';
import quotationRoutes from '../modules/crm/quotation/quotation.routes.js';

// Sales
import salesRoutes from '../modules/sales/sales.routes.js';

// Project — Steps 4, 5, 6, 11, 12, 19, 20, 21
import projectRoutes from '../modules/project/project/project.routes.js';
import roomRoutes from '../modules/project/room/room.routes.js';
import measurementRoutes from '../modules/project/measurement/measurement.routes.js';
import siteVisitRoutes from '../modules/project/sitevisit/sitevisit.routes.js';
import boqRoutes from '../modules/project/boq/boq.routes.js';
import designRoutes from '../modules/project/design/design.routes.js';
import drawingRoutes from '../modules/project/drawing/drawing.routes.js';
import installationRoutes from '../modules/project/installation/installation.routes.js';
import snagRoutes from '../modules/project/snag/snag.routes.js';

// Inventory — Steps 13, 14
import fabricRoutes from '../modules/inventory/fabric/fabric.routes.js';
import motorRoutes from '../modules/inventory/motor/motor.routes.js';
import accessoryRoutes from '../modules/inventory/accessory/accessory.routes.js';
import stockRoutes from '../modules/inventory/stock/stock.routes.js';
import vendorRoutes from '../modules/inventory/vendor/vendor.routes.js';
import purchaseRoutes from '../modules/inventory/purchase/purchase.routes.js';

// Production — Steps 15, 16, 17
import productionRoutes from '../modules/production/production/production.routes.js';
import stitchingRoutes from '../modules/production/stitching/stitching.routes.js';
import qcRoutes from '../modules/production/qc/qc.routes.js';
import packingRoutes from '../modules/production/packing/packing.routes.js';
import dispatchRoutes from '../modules/production/dispatch/dispatch.routes.js';

// Accounts — Steps 9, 10, 18
import invoiceRoutes from '../modules/accounts/invoice/invoice.routes.js';
import paymentRoutes from '../modules/accounts/payment/payment.routes.js';
import transactionRoutes from '../modules/accounts/transaction/transaction.routes.js';

import reportsRoutes from '../modules/reports/reports.routes.js';

// Cross-cutting — Steps 6, 7 and the house rules everything else reads.
import notificationRoutes from '../modules/notification/notification.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import pricingRoutes from '../modules/pricing/pricing.routes.js';
import documentRoutes from '../modules/documents/document.routes.js';
import uploadRoutes from './upload.routes.js';

import settingsService from '../modules/settings/settings.service.js';
import { STAGE_ORDER, STAGE_LABELS } from '../constants/workflow.constants.js';
import { ROLES, ROLE_PERMISSIONS } from '../constants/roles.constants.js';
import { PARTICULAR_LABELS } from '../constants/product.constants.js';
import { DEFAULT_CONSUMPTION_CONFIG, DEFAULT_RATE_CARD } from '../services/consumption.service.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

router.use('/upload', uploadRoutes);

router.use('/crm/leads', leadRoutes);
router.use('/crm/clients', clientRoutes);
router.use('/crm/architects', architectRoutes);
router.use('/crm/followups', followupRoutes);
router.use('/crm/quotations', quotationRoutes);
router.use('/sales', salesRoutes);

router.use('/project/projects', projectRoutes);
router.use('/project/rooms', roomRoutes);
router.use('/project/measurements', measurementRoutes);
router.use('/project/site-visits', siteVisitRoutes);
router.use('/project/boqs', boqRoutes);
router.use('/project/designs', designRoutes);
router.use('/project/drawings', drawingRoutes);
router.use('/project/installations', installationRoutes);
router.use('/project/snags', snagRoutes);

router.use('/inventory/fabrics', fabricRoutes);
router.use('/inventory/motors', motorRoutes);
router.use('/inventory/accessories', accessoryRoutes);
router.use('/inventory/stocks', stockRoutes);
router.use('/inventory/vendors', vendorRoutes);
router.use('/inventory/purchase-orders', purchaseRoutes);

router.use('/production/orders', productionRoutes);
router.use('/production/stitching', stitchingRoutes);
router.use('/production/qc', qcRoutes);
router.use('/production/packing', packingRoutes);
router.use('/production/dispatches', dispatchRoutes);

router.use('/accounts/invoices', invoiceRoutes);
router.use('/accounts/payments', paymentRoutes);
router.use('/accounts/transactions', transactionRoutes);

router.use('/reports', reportsRoutes);

router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/pricing', pricingRoutes);
router.use('/documents', documentRoutes);

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

import express from 'express';
import asyncHandler from '../../core/asyncHandler.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import reportsService from './reports.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import { PERMISSIONS } from '../../constants/roles.constants.js';

const router = express.Router();
router.use(authMiddleware);

const canView = requirePermission(PERMISSIONS.REPORTS_VIEW);

router.get(
  '/dashboard',
  asyncHandler(async (req, res) =>
    sendSuccess(res, 'Dashboard retrieved', await reportsService.dashboard())
  )
);

router.get(
  '/sales-performance',
  canView,
  asyncHandler(async (req, res) =>
    sendSuccess(res, 'Sales performance retrieved', await reportsService.salesPerformance())
  )
);

router.get(
  '/analytics',
  canView,
  asyncHandler(async (req, res) =>
    sendSuccess(res, 'Analytics retrieved', await reportsService.analytics())
  )
);

router.get(
  '/project/:projectId',
  canView,
  asyncHandler(async (req, res) =>
    sendSuccess(res, 'Project report retrieved', await reportsService.projectReport(req.params.projectId))
  )
);

router.get(
  '/project/:projectId/material',
  canView,
  asyncHandler(async (req, res) =>
    sendSuccess(res, 'Material consumption retrieved', await reportsService.materialConsumption(req.params.projectId))
  )
);

export default router;

import express from 'express';
import asyncHandler from '../../core/asyncHandler.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import reportsService from './reports.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';

const router = express.Router();
router.use(authMiddleware);

/** No permission gate : every logged-in role can see the dashboard roll-up. */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) =>
    sendSuccess(res, 'Dashboard retrieved', await reportsService.dashboard())
  )
);

export default router;

import express from 'express';
import asyncHandler from '../../../core/asyncHandler.js';
import authMiddleware from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/role.middleware.js';
import ProductionOrderModel from '../production/production.model.js';
import productionService from '../production/production.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PRODUCTION_STAGE } from '../../../constants/workflow.constants.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

/**
 * The stitching floor's own view of production.
 *
 * Stitching is a *stage* of a work order, not a separate document, so this module
 * deliberately owns no model: it is a filtered window onto ProductionOrder plus
 * the two actions that floor actually performs.
 */
const router = express.Router();
router.use(authMiddleware);

const canView = requirePermission(PERMISSIONS.PRODUCTION_VIEW);
const canManage = requirePermission(PERMISSIONS.PRODUCTION_MANAGE);

/** The queue: everything cut and ready to stitch, plus what is on the machines. */
router.get(
  '/queue',
  canView,
  asyncHandler(async (req, res) => {
    const filter = {
      stage: { $in: [PRODUCTION_STAGE.HAND_WORK, PRODUCTION_STAGE.STITCHING] },
      ...(req.query.project ? { project: req.query.project } : {}),
    };

    const orders = await ProductionOrderModel.find(filter)
      .populate('project', 'code name')
      .populate('assignedTo', 'name')
      .sort('-priority plannedEndDate')
      .lean();

    return sendSuccess(res, 'Stitching queue retrieved', {
      inHandWork: orders.filter((o) => o.stage === PRODUCTION_STAGE.HAND_WORK),
      onMachine: orders.filter((o) => o.stage === PRODUCTION_STAGE.STITCHING),
      totalRnft: orders.reduce((sum, o) => sum + (o.stitchingRnft || 0), 0),
    });
  })
);

router.post(
  '/:id/start',
  canManage,
  asyncHandler(async (req, res) => {
    const data = await productionService.advanceStage(
      req.params.id,
      { toStage: PRODUCTION_STAGE.STITCHING, remarks: req.body?.remarks },
      req.user
    );
    return sendSuccess(res, 'Stitching started', data);
  })
);

router.post(
  '/:id/complete',
  canManage,
  asyncHandler(async (req, res) => {
    const data = await productionService.advanceStage(
      req.params.id,
      { toStage: PRODUCTION_STAGE.CHECKING, remarks: req.body?.remarks },
      req.user
    );
    return sendSuccess(res, 'Stitching complete — sent for checking', data);
  })
);

export default router;

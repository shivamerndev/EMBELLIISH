import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.middleware.js';
import {
  fetchStageItems,
  getStageItem,
  createStageItem,
  updateStageItem,
  advanceStageItem,
  deleteStageItem,
  getProjectLifecycle,
  getPipelineSummary,
} from './pms.controller.js';

const router = Router();

router.use(authMiddleware);

// Specific routes
router.get('/summary', getPipelineSummary);
router.get('/project/:projectIdentifier/stages', getProjectLifecycle);

// Stage CRUD routes
router.get('/:stage', fetchStageItems);
router.get('/:stage/:id', getStageItem);
router.post('/:stage', createStageItem);
router.post('/:stage/:id/advance', advanceStageItem);
router.put('/:stage/:id', updateStageItem);
router.delete('/:stage/:id', deleteStageItem);

export default router;

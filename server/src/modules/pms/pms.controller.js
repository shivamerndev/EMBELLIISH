import { sendSuccess } from '../../utils/responseHandler.js';
import {
  fetchStageItemsService,
  getStageItemDetailService,
  createStageItemService,
  updateStageItemService,
  advanceStageItemService,
  deleteStageItemService,
  getProjectLifecycleService,
  getPipelineSummaryService,
} from './pms.service.js';

/**
 * Controller: List items in a PMS stage
 * GET /api/v1/pms/:stage
 */
export const fetchStageItems = async (req, res, next) => {
  try {
    const { stage } = req.params;
    const items = await fetchStageItemsService(stage, req.query);
    return sendSuccess(res, `${stage} items fetched successfully`, items, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get single stage item
 * GET /api/v1/pms/:stage/:id
 */
export const getStageItem = async (req, res, next) => {
  try {
    const { stage, id } = req.params;
    const item = await getStageItemDetailService(stage, id);
    return sendSuccess(res, `${stage} item fetched successfully`, item, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Create stage item
 * POST /api/v1/pms/:stage
 */
export const createStageItem = async (req, res, next) => {
  try {
    const { stage } = req.params;
    const item = await createStageItemService(stage, req.body, req.user?._id);
    return sendSuccess(res, `${stage} item created successfully`, item, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update stage item
 * PUT /api/v1/pms/:stage/:id
 */
export const updateStageItem = async (req, res, next) => {
  try {
    const { stage, id } = req.params;
    const item = await updateStageItemService(stage, id, req.body, req.user?._id);
    return sendSuccess(res, `${stage} item updated successfully`, item, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Advance stage item to next PMS stage
 * POST /api/v1/pms/:stage/:id/advance
 */
export const advanceStageItem = async (req, res, next) => {
  try {
    const { stage, id } = req.params;
    const result = await advanceStageItemService(stage, id, req.body, req.user?._id);
    return sendSuccess(res, result.message, result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Delete stage item
 * DELETE /api/v1/pms/:stage/:id
 */
export const deleteStageItem = async (req, res, next) => {
  try {
    const { stage, id } = req.params;
    const deleted = await deleteStageItemService(stage, id);
    return sendSuccess(res, `${stage} item deleted successfully`, deleted, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get all stages & lifecycle info for a project
 * GET /api/v1/pms/project/:projectIdentifier/stages
 */
export const getProjectLifecycle = async (req, res, next) => {
  try {
    const { projectIdentifier } = req.params;
    const data = await getProjectLifecycleService(projectIdentifier);
    return sendSuccess(res, 'Project lifecycle fetched successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Pipeline overview summary
 * GET /api/v1/pms/summary
 */
export const getPipelineSummary = async (req, res, next) => {
  try {
    const summary = await getPipelineSummaryService();
    return sendSuccess(res, 'PMS pipeline summary fetched successfully', summary, 200);
  } catch (error) {
    next(error);
  }
};

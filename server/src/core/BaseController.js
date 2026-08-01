import asyncHandler from './asyncHandler.js';
import { sendSuccess } from '../utils/responseHandler.js';

/**
 * Generic REST surface over a service. Handlers are pre-bound with asyncHandler
 * so they can be dropped straight into an Express router.
 */
class BaseController {
  constructor(service, label = 'Record') {
    this.service = service;
    this.label = label;

    this.list = asyncHandler(async (req, res) => {
      const data = await this.service.list(req.query, this.scopeFilter(req));
      return sendSuccess(res, `${this.label} list retrieved`, data);
    });

    this.getById = asyncHandler(async (req, res) => {
      const data = await this.service.getById(req.params.id);
      return sendSuccess(res, `${this.label} retrieved`, data);
    });

    this.create = asyncHandler(async (req, res) => {
      const data = await this.service.create(req.validated ?? req.body, req.user);
      return sendSuccess(res, `${this.label} created`, data, 201);
    });

    this.update = asyncHandler(async (req, res) => {
      const data = await this.service.update(req.params.id, req.validated ?? req.body, req.user);
      return sendSuccess(res, `${this.label} updated`, data);
    });

    this.remove = asyncHandler(async (req, res) => {
      const data = await this.service.remove(req.params.id, req.user);
      return sendSuccess(res, `${this.label} deleted`, data);
    });
  }

  /** Override in a subclass to restrict list results to the caller's own records. */
  // eslint-disable-next-line no-unused-vars
  scopeFilter(req) {
    return {};
  }
}

export default BaseController;

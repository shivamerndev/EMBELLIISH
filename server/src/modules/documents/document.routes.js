import express from 'express';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import asyncHandler from '../../core/asyncHandler.js';
import documentService from './document.service.js';
import { PERMISSIONS } from '../../constants/roles.constants.js';

/**
 * Steps 6 and 7 — the client-facing documents, as PDF.
 *
 * Served inline by default so the DCM can read it in the browser before sending
 * it on; `?download=1` forces the save dialog.
 */
const router = express.Router();
router.use(authMiddleware);

const send = (res, { buffer, filename }, download) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="${filename}"`
  );
  res.setHeader('Content-Length', buffer.length);
  return res.end(buffer);
};

router.get(
  '/quotation/:id',
  requirePermission(PERMISSIONS.CRM_VIEW),
  asyncHandler(async (req, res) => {
    const doc = await documentService.quotation(req.params.id);
    return send(res, doc, req.query.download);
  })
);

router.get(
  '/project/:projectId/quotation',
  requirePermission(PERMISSIONS.CRM_VIEW),
  asyncHandler(async (req, res) => {
    const doc = await documentService.projectQuotation(req.params.projectId);
    return send(res, doc, req.query.download);
  })
);

router.get(
  '/project/:projectId/proposal',
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  asyncHandler(async (req, res) => {
    const doc = await documentService.proposal(req.params.projectId);
    return send(res, doc, req.query.download);
  })
);

router.get(
  '/invoice/:id',
  requirePermission(PERMISSIONS.ACCOUNTS_VIEW),
  asyncHandler(async (req, res) => {
    const doc = await documentService.invoice(req.params.id);
    return send(res, doc, req.query.download);
  })
);

export default router;

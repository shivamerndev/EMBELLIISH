import express from 'express';
import authMiddleware from '../../middlewares/auth.middleware.js';
import asyncHandler from '../../core/asyncHandler.js';
import notify from './notification.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';

/**
 * Module 19 — Notifications.
 *
 * No permission guards here beyond being signed in: every route is scoped to the
 * caller's own inbox by their token, so there is nothing to authorise beyond that.
 */
const router = express.Router();
router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await notify.listForUser(req.user.id, req.query);
    return sendSuccess(res, 'Notifications retrieved', data);
  })
);

/** Cheap poll for the bell badge. */
router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const unread = await notify.unreadCount(req.user.id);
    return sendSuccess(res, 'Unread count retrieved', { unread });
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const data = await notify.markAllRead(req.user.id);
    return sendSuccess(res, 'All notifications marked read', data);
  })
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const data = await notify.markRead(req.params.id, req.user.id);
    return sendSuccess(res, 'Notification marked read', data);
  })
);

export default router;

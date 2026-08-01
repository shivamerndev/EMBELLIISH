import express from 'express';
import { z } from 'zod';
import asyncHandler from '../../core/asyncHandler.js';
import validate from '../../middlewares/validate.middleware.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import authService from './auth.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import { ROLES, PERMISSIONS } from '../../constants/roles.constants.js';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(Object.values(ROLES)).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  employeeCode: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const router = express.Router();

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.login(req.validated.email, req.validated.password);
    return sendSuccess(res, 'Signed in', data);
  })
);

// Accounts are created by an administrator, not by self sign-up.
router.post(
  '/register',
  authMiddleware,
  requirePermission(PERMISSIONS.USER_MANAGE),
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.register(req.validated);
    return sendSuccess(res, 'User account created', data, 201);
  })
);

router.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await authService.profile(req.user.id);
    return sendSuccess(res, 'Profile retrieved', data);
  })
);

router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.changePassword(req.user.id, req.validated);
    return sendSuccess(res, 'Password changed', data);
  })
);

export default router;

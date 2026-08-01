import { z } from 'zod';
import defineModule from '../../core/defineModule.js';
import BaseService from '../../core/BaseService.js';
import asyncHandler from '../../core/asyncHandler.js';
import ApiError from '../../core/ApiError.js';
import UserModel from './user.model.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import { ROLES, PERMISSIONS, permissionsForRole } from '../../constants/roles.constants.js';

const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  permissions: z.array(z.string()).optional(),
  department: z.string().optional(),
  employeeCode: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Passwords are changed through /auth/change-password or the reset endpoint,
// never by a plain PUT that would silently rehash on every save.
const updateUserSchema = userSchema.partial().omit({ password: true });

class UserService extends BaseService {
  async create(data) {
    const existing = await UserModel.findOne({ email: data.email });
    if (existing) throw ApiError.conflict('An account with this email already exists');
    // `create` on the model (not the repository) so the pre-save hook hashes.
    const user = await UserModel.create(data);
    return user.toJSON();
  }

  async resetPassword(id, { newPassword }) {
    const user = await UserModel.findById(id).select('+password');
    if (!user) throw ApiError.notFound('User not found');

    user.password = newPassword;
    await user.save();
    return { reset: true };
  }
}

const { router, service } = defineModule({
  model: UserModel,
  label: 'User',
  filterable: ['role', 'isActive', 'department'],
  searchable: ['name', 'email', 'employeeCode'],
  defaultSort: 'name',
  viewPermission: PERMISSIONS.PROJECT_VIEW,
  managePermission: PERMISSIONS.USER_MANAGE,
  createSchema: userSchema,
  updateSchema: updateUserSchema,
  serviceClass: UserService,
  extend: (r, { canView, canManage }) => {
    // Assignment dropdowns need to know who can be a DCM, an installer, etc.
    r.get(
      '/by-role/:role',
      ...canView,
      asyncHandler(async (req, res) => {
        const users = await UserModel.find({ role: req.params.role, isActive: true })
          .select('name email role department')
          .sort('name')
          .lean();
        return sendSuccess(res, 'Users retrieved', users);
      })
    );

    r.get(
      '/roles',
      ...canView,
      asyncHandler(async (req, res) =>
        sendSuccess(
          res,
          'Roles retrieved',
          Object.values(ROLES).map((role) => ({ role, permissions: permissionsForRole(role) }))
        )
      )
    );

    r.post(
      '/:id/reset-password',
      ...canManage,
      asyncHandler(async (req, res) =>
        sendSuccess(res, 'Password reset', await service.resetPassword(req.params.id, req.body || {}))
      )
    );
  },
});

export default router;

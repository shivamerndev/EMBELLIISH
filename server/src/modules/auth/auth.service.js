import jwt from 'jsonwebtoken';
import ApiError from '../../core/ApiError.js';
import env from '../../config/env.js';
import UserModel from '../user/user.model.js';
import { permissionsForRole } from '../../constants/roles.constants.js';

/**
 * Session tokens carry the role but not the permission list — permissions are
 * resolved from the role on every request, so revoking a capability takes effect
 * immediately rather than whenever the last token happens to expire.
 */
class AuthService {
  #issue(user) {
    const token = jwt.sign(
      { id: String(user._id), email: user.email, role: user.role, name: user.name },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: [...new Set([...permissionsForRole(user.role), ...(user.permissions || [])])],
      },
    };
  }

  async register(data) {
    const existing = await UserModel.findOne({ email: data.email });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const user = await UserModel.create(data);
    return this.#issue(user);
  }

  async login(email, password) {
    // `password` is select:false on the schema, so it has to be asked for.
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');

    // Same message either way — a different one would confirm which emails exist.
    if (!user || !(await user.comparePassword(password))) {
      throw ApiError.unauthorized('Incorrect email or password');
    }
    if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

    user.lastLoginAt = new Date();
    await user.save();

    return this.#issue(user);
  }

  async profile(userId) {
    const user = await UserModel.findById(userId).lean();
    if (!user) throw ApiError.notFound('User not found');

    return {
      ...user,
      permissions: [...new Set([...permissionsForRole(user.role), ...(user.permissions || [])])],
    };
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await UserModel.findById(userId).select('+password');
    if (!user) throw ApiError.notFound('User not found');

    if (!(await user.comparePassword(currentPassword))) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    return { changed: true };
  }
}

export default new AuthService();

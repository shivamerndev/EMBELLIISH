import ApiError from '../core/ApiError.js';
import { permissionsForRole } from '../constants/roles.constants.js';

/** Restrict a route to an explicit set of roles. */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden(`This action requires one of: ${allowedRoles.join(', ')}`));
  }
  return next();
};

/**
 * Preferred guard: checks a capability rather than a job title, so adding a role
 * only means editing the permission map.
 */
const requirePermission = (...required) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());

  const granted = new Set([...permissionsForRole(req.user.role), ...(req.user.permissions || [])]);
  const missing = required.filter((permission) => !granted.has(permission));

  if (missing.length) {
    return next(ApiError.forbidden(`Missing permission: ${missing.join(', ')}`));
  }
  return next();
};

export default requireRole;
export { requireRole, requirePermission };

import type { RequestHandler } from 'express';

import type { AuthenticatedRequest } from './auth';
import { HttpError } from './error';

const normalizeRole = (role: string): string => role.trim().toUpperCase();

const hasRequiredRole = (userRoles: string[], requiredRoles: string[]) => {
  if (userRoles.length === 0) {
    return false;
  }

  const normalizedUserRoles = new Set(userRoles.map(normalizeRole));

  if (normalizedUserRoles.has('ADMIN')) {
    return true;
  }

  if (requiredRoles.length === 0) {
    return normalizedUserRoles.size > 0;
  }

  return requiredRoles.some((role) => normalizedUserRoles.has(normalizeRole(role)));
};

export const requireRole = (...roles: string[]): RequestHandler => {
  const requiredRoles = roles.map(normalizeRole).filter((role) => role.length > 0);

  return (req, _res, next) => {
    const user = (req as typeof req & AuthenticatedRequest).user;

    if (!user) {
      next(new HttpError(403, 'ACCESS_DENIED', 'Access denied'));
      return;
    }

    const userRoles = Array.isArray(user.roles) ? user.roles.map(normalizeRole) : [];

    if (!hasRequiredRole(userRoles, requiredRoles)) {
      next(new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role'));
      return;
    }

    next();
  };
};

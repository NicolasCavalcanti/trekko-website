import type { RequestHandler } from 'express';

import type { AuthenticatedRequest } from './auth';
import { HttpError } from './error';

const hasRequiredRole = (userRoles: string[] | undefined, requiredRoles: string[]) => {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  const normalizedUserRoles = new Set(userRoles);
  return requiredRoles.some((role) => normalizedUserRoles.has(role));
};

export const requireRole = (...roles: string[]): RequestHandler => {
  const requiredRoles = roles.filter((role) => role.trim().length > 0);

  return (req, _res, next) => {
    const user = (req as typeof req & AuthenticatedRequest).user;

    if (!user) {
      next(new HttpError(403, 'ACCESS_DENIED', 'Access denied'));
      return;
    }

    if (requiredRoles.length > 0 && !hasRequiredRole(user.roles, requiredRoles)) {
      next(new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role'));
      return;
    }

    next();
  };
};

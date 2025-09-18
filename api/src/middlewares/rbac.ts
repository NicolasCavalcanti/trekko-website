import type { RequestHandler } from 'express';

import type { AuthenticatedRequest } from './auth';
import { HttpError } from './error';

export type RbacOptions = {
  roles?: string[];
  permissions?: string[];
};

const hasIntersection = (source: string[] | undefined, target: string[] | undefined) => {
  if (!source || !target || source.length === 0 || target.length === 0) {
    return false;
  }

  const set = new Set(source);
  return target.some((value) => set.has(value));
};

export const authorize = (options: RbacOptions): RequestHandler => {
  return (req, _res, next) => {
    const { roles, permissions } = options;
    const user = (req as typeof req & AuthenticatedRequest).user;

    if (!user) {
      next(new HttpError(403, 'Access denied'));
      return;
    }

    if (roles && roles.length > 0 && !hasIntersection(user.roles, roles)) {
      next(new HttpError(403, 'Insufficient role privileges'));
      return;
    }

    if (permissions && permissions.length > 0 && !hasIntersection(user.permissions, permissions)) {
      next(new HttpError(403, 'Insufficient permissions'));
      return;
    }

    next();
  };
};

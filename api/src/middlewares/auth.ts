import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { HttpError } from './error';

export interface AuthenticatedUser extends jwt.JwtPayload {
  sub: string;
  roles?: string[];
  permissions?: string[];
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}

export type AuthMiddlewareOptions = {
  optional?: boolean;
};

export const authenticate = (options: AuthMiddlewareOptions = {}): RequestHandler => {
  const { optional = false } = options;

  return (req, _res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
      if (optional) {
        next();
        return;
      }

      next(new HttpError(401, 'Authentication required'));
      return;
    }

    const token = authorization.replace(/^Bearer\s+/i, '');
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      next(new HttpError(500, 'JWT secret is not configured'));
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as AuthenticatedUser;
      (req as typeof req & AuthenticatedRequest).user = decoded;
      next();
    } catch (error) {
      if (optional) {
        next();
        return;
      }

      next(new HttpError(401, 'Invalid or expired token', error instanceof Error ? error.message : undefined));
    }
  };
};

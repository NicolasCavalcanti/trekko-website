import type { Request, RequestHandler } from 'express';
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

const ACCESS_TOKEN_COOKIE_NAMES = ['accessToken', 'access_token'] as const;

const extractTokenFromRequest = (req: Request): string | undefined => {
  for (const cookieName of ACCESS_TOKEN_COOKIE_NAMES) {
    const tokenFromCookie = req.cookies?.[cookieName];
    if (typeof tokenFromCookie === 'string' && tokenFromCookie.trim().length > 0) {
      return tokenFromCookie.trim();
    }
  }

  const authorizationHeader = req.headers.authorization;
  if (authorizationHeader && authorizationHeader.trim().length > 0) {
    return authorizationHeader.replace(/^Bearer\s+/i, '').trim();
  }

  return undefined;
};

export const authenticate = (options: AuthMiddlewareOptions = {}): RequestHandler => {
  const { optional = false } = options;

  return (req, _res, next) => {
    const token = extractTokenFromRequest(req);

    if (!token) {
      if (optional) {
        next();
        return;
      }

      next(new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required'));
      return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      next(new HttpError(500, 'JWT_SECRET_NOT_CONFIGURED', 'JWT secret is not configured'));
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

      next(
        new HttpError(
          401,
          'INVALID_TOKEN',
          'Invalid or expired token',
          error instanceof Error ? error.message : undefined,
        ),
      );
    }
  };
};

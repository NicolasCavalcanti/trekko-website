import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';

import { buildCookieOptions } from '../services/cookies';
import { HttpError } from './error';

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_BYTES = 32;
const CSRF_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

type CsrfAwareRequest = Request & { csrfToken?: string };

type CookieOptionsBuilder = () => CookieOptions;

const buildCsrfCookieOptions: CookieOptionsBuilder = () =>
  buildCookieOptions({
    httpOnly: false,
    maxAge: CSRF_COOKIE_MAX_AGE,
  });

const generateToken = (): string => randomBytes(TOKEN_BYTES).toString('hex');

const readTokenFromCookie = (req: Request): string | undefined => {
  const token = req.cookies?.[CSRF_COOKIE_NAME];
  if (typeof token === 'string' && token.trim().length > 0) {
    return token.trim();
  }
  return undefined;
};

const assignToken = (req: Request, res: Response, force = false): string => {
  const existing = force ? undefined : readTokenFromCookie(req);
  const token = existing ?? generateToken();

  if (!existing || force) {
    res.cookie(CSRF_COOKIE_NAME, token, buildCsrfCookieOptions());
  }

  (req as CsrfAwareRequest).csrfToken = token;
  res.locals.csrfToken = token;

  return token;
};

export const ensureCsrfToken = (req: Request, res: Response): string => assignToken(req, res);

export const rotateCsrfToken = (req: Request, res: Response): string => assignToken(req, res, true);

export const clearCsrfToken = (res: Response): void => {
  res.clearCookie(CSRF_COOKIE_NAME, buildCsrfCookieOptions());
  if (res.locals.csrfToken) {
    delete res.locals.csrfToken;
  }
};

export const csrfProtection: RequestHandler = (req, res, next) => {
  const token = assignToken(req, res);

  if (SAFE_METHODS.has((req.method || 'GET').toUpperCase())) {
    next();
    return;
  }

  const headerToken = req.get(CSRF_HEADER_NAME) ?? req.get(CSRF_HEADER_NAME.toUpperCase());

  if (!headerToken) {
    next(new HttpError(403, 'CSRF_TOKEN_MISSING', 'CSRF token header is required'));
    return;
  }

  const provided = headerToken.trim();

  if (provided.length === 0 || provided.length !== token.length) {
    next(new HttpError(403, 'CSRF_TOKEN_INVALID', 'Invalid CSRF token'));
    return;
  }

  try {
    const expectedBuffer = Buffer.from(token, 'utf8');
    const providedBuffer = Buffer.from(provided, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
      throw new Error('CSRF token mismatch');
    }
  } catch (error) {
    next(new HttpError(403, 'CSRF_TOKEN_INVALID', 'Invalid CSRF token', error instanceof Error ? error.message : undefined));
    return;
  }

  next();
};

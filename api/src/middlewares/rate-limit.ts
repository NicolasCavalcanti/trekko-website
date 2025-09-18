import type { Request, RequestHandler } from 'express';

import { HttpError } from './error';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
};

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const defaultKeyGenerator = (req: Request): string => {
  return req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || 'unknown';
};

export const rateLimit = ({ windowMs, max, keyGenerator }: RateLimitOptions): RequestHandler => {
  if (windowMs <= 0) {
    throw new Error('windowMs must be greater than 0');
  }
  if (max <= 0) {
    throw new Error('max must be greater than 0');
  }

  const hits = new Map<string, RateLimitEntry>();

  return (req, _res, next) => {
    const now = Date.now();
    const key = keyGenerator ? keyGenerator(req) : defaultKeyGenerator(req);

    const entry = hits.get(key);
    if (!entry || entry.expiresAt <= now) {
      hits.set(key, { count: 1, expiresAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      next(new HttpError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests'));
      return;
    }

    entry.count += 1;
    hits.set(key, entry);

    next();
  };
};

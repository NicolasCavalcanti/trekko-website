import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  public readonly statusCode: number;

  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'Validation error',
      issues: error.issues,
    });
    return;
  }

  const statusCode = 500;
  const payload = {
    message: 'Internal server error',
  } as const;

  const logger = (req as typeof req & { log?: { error: (obj: unknown, msg?: string) => void } }).log;

  if (logger) {
    logger.error({ err: error }, 'Unhandled error');
  } else {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  res.status(statusCode).json(payload);
};

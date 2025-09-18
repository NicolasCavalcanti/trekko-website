import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  public readonly statusCode: number;

  public readonly code: string;

  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const toErrorResponse = (error: Pick<HttpError, 'code' | 'message' | 'details'>) => {
  const base = {
    code: error.code,
    message: error.message,
  } as const;

  if (error.details === undefined) {
    return { error: base } as const;
  }

  return {
    error: {
      ...base,
      details: error.details,
    },
  } as const;
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const logger = (req as typeof req & { log?: { error: (obj: unknown, msg?: string) => void } }).log;

  if (error instanceof ZodError) {
    const validationError = new HttpError(
      400,
      'VALIDATION_ERROR',
      'Validation failed',
      error.issues,
    );
    res.status(validationError.statusCode).json(toErrorResponse(validationError));
    return;
  }

  if (error instanceof HttpError) {
    if (error.statusCode >= 500) {
      logger?.error({ err: error, details: error.details }, 'Handled HttpError');
    }

    res.status(error.statusCode).json(toErrorResponse(error));
    return;
  }

  logger?.error({ err: error }, 'Unhandled error');

  const internalError = new HttpError(500, 'INTERNAL_SERVER_ERROR', 'Internal server error');
  res.status(internalError.statusCode).json(toErrorResponse(internalError));
};

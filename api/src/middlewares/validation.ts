import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';

import { HttpError } from './error';

export type ValidationSchema = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  headers?: ZodTypeAny;
};

export const validate = (schema: ValidationSchema): RequestHandler => {
  return (req, _res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.headers) {
        req.headers = schema.headers.parse(req.headers);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        next(new HttpError(400, 'VALIDATION_ERROR', 'Validation failed', error.issues));
        return;
      }

      next(error);
      return;
    }

    next();
  };
};

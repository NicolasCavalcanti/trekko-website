import type { RequestHandler } from 'express';
import type { AnyZodObject, ZodError } from 'zod';

import { HttpError } from './error';

export type ValidationSchema = {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
  headers?: AnyZodObject;
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
      if (error instanceof Error && 'issues' in error) {
        next(new HttpError(400, 'Validation failed', (error as ZodError).issues));
        return;
      }

      next(error);
      return;
    }

    next();
  };
};

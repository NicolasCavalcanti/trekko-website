import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

const REQUEST_ID_HEADER = 'x-request-id';

export interface RequestWithId {
  requestId?: string;
}

export const requestId: RequestHandler = (req, res, next) => {
  const headerId =
    (req.headers[REQUEST_ID_HEADER] as string | undefined) ??
    (req.headers['x-correlation-id'] as string | undefined);

  const id = headerId && headerId.trim().length > 0 ? headerId : randomUUID();

  (req as typeof req & RequestWithId).requestId = id;
  res.locals.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);

  next();
};

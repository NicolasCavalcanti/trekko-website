import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { HttpError, errorHandler } from './middlewares/error';
import { requestId } from './middlewares/request-id';
import { prisma } from './services/prisma';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

const app = express();

const corsOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.set('trust proxy', true);
app.disable('x-powered-by');

app.use(requestId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req: Request, res: Response) => {
      const requestScopedId = (req as Request & { requestId?: string }).requestId;
      const responseScopedId =
        typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;

      return requestScopedId ?? responseScopedId;
    },
    customSuccessMessage() {
      return 'request completed';
    },
    customErrorMessage() {
      return 'request errored';
    },
    customLogLevel(res: Response, error: Error | undefined) {
      if (error) return 'error';
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customProps(_req: Request, res: Response) {
      return {
        requestId: res.locals.requestId,
      };
    },
  }),
);
app.use(
  cors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/api/healthz', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ok',
      db: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(
      new HttpError(
        503,
        'DB_UNAVAILABLE',
        'Database connection failed',
        error instanceof Error ? error.message : undefined,
      ),
    );
  }
});

app.use(errorHandler);

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'API server listening');
  });
}

export { app, logger };

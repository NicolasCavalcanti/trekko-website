import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { errorHandler } from './middlewares/error';
import { requestId } from './middlewares/request-id';

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
    customSuccessMessage: function () {
      return 'request completed';
    },
    customErrorMessage: function () {
      return 'request errored';
    },
    customLogLevel: function (res, error) {
      if (error) return 'error';
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }),
);
app.use(
  cors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'API server listening');
  });
}

export { app, logger };

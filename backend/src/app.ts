import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';
import { healthRouter } from './health/health.router';
import { v1Router } from './api/v1';
import { AppError } from './utils/AppError';

export function createApp(): express.Application {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
  );

  // ── Request parsing ───────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── Request tracking ──────────────────────────────────────────────────────
  app.use(requestId);
  app.use(requestLogger);

  // ── Rate limiting (global) ────────────────────────────────────────────────
  app.use(globalRateLimiter);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/health', healthRouter);
  app.use('/api/v1', v1Router);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req, _res, next) => {
    next(AppError.notFound('Route'));
  });

  // ── Centralised error handler (must be last) ──────────────────────────────
  app.use(errorHandler);

  return app;
}

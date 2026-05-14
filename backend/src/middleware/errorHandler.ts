import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { config } from '../config';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    stack?: string;
  };
}

function requestMeta(req: Request) {
  return {
    requestId: req.id,
    method:    req.method,
    path:      req.path,
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Zod validation errors ────────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      (fields[key] ??= []).push(issue.message);
    }
    logger.warn('Validation failed', { ...requestMeta(req), fieldCount: err.issues.length });
    res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields },
    } satisfies ErrorResponse);
    return;
  }

  // ── Operational AppErrors ────────────────────────────────────────────────────
  if (err instanceof AppError) {
    const meta = { ...requestMeta(req), code: err.code, statusCode: err.statusCode };

    if (!err.isOperational) {
      // Non-operational = programmer error → treat as 5xx
      logger.error('Non-operational error', { ...meta, stack: err.stack });
    } else if (err.statusCode >= 500) {
      logger.error(err.message, { ...meta, stack: err.stack });
    } else if (err.statusCode >= 400) {
      logger.warn(err.message, meta);
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code:    err.code,
        message: err.message,
        ...(config.isDev && { stack: err.stack }),
      },
    } satisfies ErrorResponse);
    return;
  }

  // ── Unknown / unhandled errors ───────────────────────────────────────────────
  logger.error('Unhandled error', {
    ...requestMeta(req),
    errorName:    err.name,
    errorMessage: err.message,
    stack:        err.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      ...(config.isDev && { stack: err.stack }),
    },
  } satisfies ErrorResponse);
}

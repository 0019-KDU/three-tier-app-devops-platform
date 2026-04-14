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

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      if (!fields[key]) fields[key] = [];
      fields[key].push(issue.message);
    }

    const body: ErrorResponse = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields },
    };
    res.status(422).json(body);
    return;
  }

  // Operational (expected) errors
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational AppError', {
        requestId: req.id,
        error: err.message,
        stack: err.stack,
      });
    }

    const body: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(config.isDev && { stack: err.stack }),
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Unknown errors
  logger.error('Unhandled error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
  });

  const body: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      ...(config.isDev && { stack: err.stack }),
    },
  };
  res.status(500).json(body);
}

import { Router } from 'express';
import { logger } from '../../../utils/logger';

export const logsRouter = Router();

const ALLOWED_LEVELS = new Set(['error', 'warn', 'info']);

// POST /api/v1/logs/client
// Accepts structured error/event reports from the browser.
// No auth required — browsers need to report before a session exists.
logsRouter.post('/client', (req, res) => {
  const { level, message, context } = req.body as {
    level?: string;
    message?: string;
    context?: Record<string, unknown>;
  };

  if (!message || typeof message !== 'string') {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'message is required' } });
    return;
  }

  const logLevel = ALLOWED_LEVELS.has(level ?? '') ? (level as 'error' | 'warn' | 'info') : 'warn';

  logger[logLevel](`[client] ${message}`, {
    source: 'browser',
    userAgent: req.headers['user-agent'],
    ...context,
  });

  res.json({ success: true });
});

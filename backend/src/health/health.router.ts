import { Router, Request, Response } from 'express';
import { getFullHealth, isReady } from './health.service';
import { asyncHandler } from '../utils/asyncHandler';

export const healthRouter = Router();

// Liveness — is the process running?
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness — are dependencies ready?
healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const ready = await isReady();
    if (ready) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready' });
    }
  }),
);

// Full health report
healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const report = await getFullHealth();
    const statusCode = report.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(report);
  }),
);

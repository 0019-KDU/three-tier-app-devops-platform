import { Request, Response, NextFunction } from 'express';
import { logContextStorage } from '../utils/logContext';

// Must run AFTER requestId middleware so req.id is already set.
// Wraps the rest of the request lifecycle in an AsyncLocalStorage context,
// making requestId (and later userId) available to every log call without
// manual prop-drilling.
export function logContext(req: Request, _res: Response, next: NextFunction): void {
  logContextStorage.run({ requestId: req.id }, next);
}

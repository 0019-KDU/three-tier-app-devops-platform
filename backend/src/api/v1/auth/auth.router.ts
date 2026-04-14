import { Router } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import { validate } from '../../../middleware/validate';
import { authenticate } from '../../../middleware/auth';
import { authRateLimiter } from '../../../middleware/rateLimiter';
import { RegisterSchema, LoginSchema } from './auth.schema';
import * as ctrl from './auth.controller';

export const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimiter,
  validate('body', RegisterSchema),
  asyncHandler(ctrl.register),
);

authRouter.post(
  '/login',
  authRateLimiter,
  validate('body', LoginSchema),
  asyncHandler(ctrl.login),
);

authRouter.post('/refresh', asyncHandler(ctrl.refresh));

authRouter.post('/logout', asyncHandler(ctrl.logout));

authRouter.get('/me', authenticate, ctrl.me);

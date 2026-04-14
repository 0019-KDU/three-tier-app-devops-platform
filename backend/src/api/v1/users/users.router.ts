import { Router } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import { validate } from '../../../middleware/validate';
import { authenticate } from '../../../middleware/auth';
import { UpdateProfileSchema } from './users.schema';
import * as ctrl from './users.controller';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/me', asyncHandler(ctrl.getMyProfile));
usersRouter.patch('/me', validate('body', UpdateProfileSchema), asyncHandler(ctrl.updateMyProfile));

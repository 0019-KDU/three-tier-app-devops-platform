import { Router } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import { validate } from '../../../middleware/validate';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  AddMemberSchema,
  PaginationSchema,
} from './projects.schema';
import * as ctrl from './projects.controller';

export const projectsRouter = Router();

projectsRouter.get('/', validate('query', PaginationSchema), asyncHandler(ctrl.listProjects));
projectsRouter.post('/', validate('body', CreateProjectSchema), asyncHandler(ctrl.createProject));

projectsRouter.get('/:id', asyncHandler(ctrl.getProject));
projectsRouter.patch('/:id', validate('body', UpdateProjectSchema), asyncHandler(ctrl.updateProject));
projectsRouter.delete('/:id', asyncHandler(ctrl.deleteProject));

projectsRouter.get('/:id/members', asyncHandler(ctrl.getMembers));
projectsRouter.post('/:id/members', validate('body', AddMemberSchema), asyncHandler(ctrl.addMember));
projectsRouter.delete('/:id/members/:userId', asyncHandler(ctrl.removeMember));

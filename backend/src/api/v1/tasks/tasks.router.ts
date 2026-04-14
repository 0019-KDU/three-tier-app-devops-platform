import { Router } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import { validate } from '../../../middleware/validate';
import { CreateTaskSchema, UpdateTaskSchema, TaskFilterSchema } from './tasks.schema';
import * as ctrl from './tasks.controller';

export const tasksRouter = Router({ mergeParams: true });

// Routes under /projects/:projectId/tasks
tasksRouter.get('/', validate('query', TaskFilterSchema), asyncHandler(ctrl.listTasks));
tasksRouter.post('/', validate('body', CreateTaskSchema), asyncHandler(ctrl.createTask));

// Routes under /tasks/:id (standalone)
export const taskByIdRouter = Router();
taskByIdRouter.get('/:id', asyncHandler(ctrl.getTask));
taskByIdRouter.patch('/:id', validate('body', UpdateTaskSchema), asyncHandler(ctrl.updateTask));
taskByIdRouter.delete('/:id', asyncHandler(ctrl.deleteTask));

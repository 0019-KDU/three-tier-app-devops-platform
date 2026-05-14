import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { authenticate } from '../../middleware/auth';
import { authRouter } from './auth/auth.router';
import { usersRouter } from './users/users.router';
import { projectsRouter } from './projects/projects.router';
import { tasksRouter } from './tasks/tasks.router';
import { taskByIdRouter } from './tasks/tasks.router';
import { logsRouter } from './logs/logs.router';

export const v1Router = Router();

// Parse cookies for refresh token
v1Router.use(cookieParser());

// Public
v1Router.use('/auth', authRouter);
v1Router.use('/logs', logsRouter);

// Protected
v1Router.use('/users',                       authenticate, usersRouter);
v1Router.use('/projects',                    authenticate, projectsRouter);
v1Router.use('/projects/:projectId/tasks',   authenticate, tasksRouter);
v1Router.use('/tasks',                       authenticate, taskByIdRouter);

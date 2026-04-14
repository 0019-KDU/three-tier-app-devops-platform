import { tasksRepository } from './tasks.repository';
import { projectsRepository } from '../projects/projects.repository';
import { cacheGetOrSet, cacheDel } from '../../../cache/helpers';
import { CACHE_KEYS, CACHE_TTL } from '../../../constants/cache-keys';
import { AppError } from '../../../utils/AppError';
import { Task, PaginatedResult } from '../../../types/domain';
import { CreateTaskInput, UpdateTaskInput, TaskFilterInput } from './tasks.schema';

export class TasksService {
  async listByProject(
    projectId: string,
    filter: TaskFilterInput,
    requestingUserId: string,
  ): Promise<PaginatedResult<Task>> {
    await this.assertProjectAccess(projectId, requestingUserId);

    if (filter.page === 1 && !filter.status && !filter.priority && !filter.assigneeId) {
      return cacheGetOrSet(
        CACHE_KEYS.PROJECT_TASKS(projectId),
        CACHE_TTL.PROJECT_TASKS,
        () => tasksRepository.findByProject(projectId, filter),
      );
    }

    return tasksRepository.findByProject(projectId, filter);
  }

  async getById(taskId: string, requestingUserId: string): Promise<Task> {
    const task = await tasksRepository.findById(taskId);
    if (!task) throw AppError.notFound('Task');
    await this.assertProjectAccess(task.projectId, requestingUserId);
    return task;
  }

  async create(input: CreateTaskInput, createdBy: string): Promise<Task> {
    await this.assertProjectAccess(input.projectId, createdBy);

    const task = await tasksRepository.create({
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      assigneeId: input.assigneeId,
      createdBy,
      priority: input.priority,
      dueDate: input.dueDate,
    });

    await cacheDel(CACHE_KEYS.PROJECT_TASKS(input.projectId));
    return task;
  }

  async update(
    taskId: string,
    input: UpdateTaskInput,
    requestingUserId: string,
  ): Promise<Task> {
    const existing = await tasksRepository.findById(taskId);
    if (!existing) throw AppError.notFound('Task');
    await this.assertProjectAccess(existing.projectId, requestingUserId);

    const task = await tasksRepository.update(taskId, input);
    if (!task) throw AppError.notFound('Task');

    await cacheDel(CACHE_KEYS.PROJECT_TASKS(existing.projectId));
    return task;
  }

  async delete(taskId: string, requestingUserId: string): Promise<void> {
    const existing = await tasksRepository.findById(taskId);
    if (!existing) throw AppError.notFound('Task');
    await this.assertProjectAccess(existing.projectId, requestingUserId);

    const deleted = await tasksRepository.delete(taskId);
    if (!deleted) throw AppError.notFound('Task');

    await cacheDel(CACHE_KEYS.PROJECT_TASKS(existing.projectId));
  }

  private async assertProjectAccess(projectId: string, userId: string): Promise<void> {
    const isMember = await projectsRepository.isMember(projectId, userId);
    if (!isMember) throw AppError.forbidden('You do not have access to this project');
  }
}

export const tasksService = new TasksService();

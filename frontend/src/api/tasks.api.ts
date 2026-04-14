import { apiClient } from './client';
import { Task, ApiResponse, PaginatedResponse } from '../types/domain';

export interface CreateTaskData {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  priority?: string;
  dueDate?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  position?: number;
}

export const tasksApi = {
  listByProject: (
    projectId: string,
    params?: { status?: string; priority?: string; page?: number; limit?: number },
  ) =>
    apiClient.get<PaginatedResponse<Task>>(`/projects/${projectId}/tasks`, { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Task>>(`/tasks/${id}`),

  create: (data: CreateTaskData) =>
    apiClient.post<ApiResponse<Task>>(`/projects/${data.projectId}/tasks`, data),

  update: (id: string, data: UpdateTaskData) =>
    apiClient.patch<ApiResponse<Task>>(`/tasks/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/tasks/${id}`),
};

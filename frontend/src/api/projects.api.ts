import { apiClient } from './client';
import { Project, ProjectMember, ApiResponse, PaginatedResponse } from '../types/domain';

export const projectsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Project>>('/projects', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Project>>(`/projects/${id}`),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<ApiResponse<Project>>('/projects', data),

  update: (id: string, data: { name?: string; description?: string; status?: string }) =>
    apiClient.patch<ApiResponse<Project>>(`/projects/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/projects/${id}`),

  getMembers: (id: string) =>
    apiClient.get<ApiResponse<ProjectMember[]>>(`/projects/${id}/members`),

  addMember: (id: string, data: { userId: string; role?: string }) =>
    apiClient.post<ApiResponse<ProjectMember>>(`/projects/${id}/members`, data),

  removeMember: (id: string, userId: string) =>
    apiClient.delete(`/projects/${id}/members/${userId}`),
};

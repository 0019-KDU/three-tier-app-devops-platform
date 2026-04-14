import { apiClient } from './client';
import { User, ApiResponse } from '../types/domain';

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { email: string; password: string; fullName: string }
export interface AuthData { user: User; accessToken: string }

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<ApiResponse<AuthData>>('/auth/register', data),

  login: (data: LoginPayload) =>
    apiClient.post<ApiResponse<AuthData>>('/auth/login', data),

  logout: () => apiClient.post('/auth/logout'),

  refresh: () =>
    apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh'),

  me: () => apiClient.get<ApiResponse<{ user: User }>>('/auth/me'),
};

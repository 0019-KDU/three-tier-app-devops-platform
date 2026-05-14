import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { logger } from '../utils/logger';

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '';

export const apiClient = axios.create({
  baseURL:     `${BASE_URL}/api/v1`,
  withCredentials: true,
  headers:     { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(token: string): void {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status          = error.response?.status;
    const url             = originalRequest?.url ?? 'unknown';

    // ── Silent token refresh on 401 ───────────────────────────────────────────
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        logger.warn('Token refresh failed — redirecting to login');
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Log API errors ────────────────────────────────────────────────────────
    const responseData = error.response?.data as Record<string, unknown> | undefined;
    const errorCode    = (responseData?.error as Record<string, unknown>)?.code;

    if (status && status >= 500) {
      logger.error('API server error', {
        url,
        status,
        code:    errorCode,
        message: error.message,
      });
    } else if (status && status >= 400 && status !== 401 && status !== 404) {
      // 401/404 are routine — don't noise the logs
      logger.warn('API client error', {
        url,
        status,
        code: errorCode,
      });
    }

    return Promise.reject(error);
  },
);

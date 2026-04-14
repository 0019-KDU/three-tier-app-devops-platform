export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  PROJECT: (projectId: string) => `project:${projectId}`,
  PROJECT_LIST: (userId: string) => `user:${userId}:projects`,
  PROJECT_TASKS: (projectId: string) => `project:${projectId}:tasks`,
  PROJECT_MEMBERS: (projectId: string) => `project:${projectId}:members`,
} as const;

export const CACHE_TTL = {
  USER_PROFILE: 600,       // 10 minutes
  PROJECT: 300,             // 5 minutes
  PROJECT_LIST: 120,        // 2 minutes
  PROJECT_TASKS: 120,       // 2 minutes
  PROJECT_MEMBERS: 300,     // 5 minutes
} as const;

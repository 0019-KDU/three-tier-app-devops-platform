import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  requestId: string;
  userId?: string;
}

// One instance shared across the whole process
export const logContextStorage = new AsyncLocalStorage<LogContext>();

export function getLogContext(): LogContext | undefined {
  return logContextStorage.getStore();
}

// Called from auth middleware once the JWT is verified
export function setLogContextUser(userId: string): void {
  const ctx = logContextStorage.getStore();
  if (ctx) ctx.userId = userId;
}

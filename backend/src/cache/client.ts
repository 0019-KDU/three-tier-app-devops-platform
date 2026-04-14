// Redis client removed. This file is kept as a stub so existing imports compile.
// Replace with a real Redis client when caching is re-introduced.

export const redis = null;

export async function checkRedisConnection(): Promise<boolean> {
  return false;
}

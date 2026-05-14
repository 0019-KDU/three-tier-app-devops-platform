import { redis } from './client';
import { logger } from '../utils/logger';

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // non-fatal — app continues without caching
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    await redis.del(...keys);
  } catch {
    // non-fatal
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    logger.debug(`Cache HIT: ${key}`);
    return cached;
  }

  logger.debug(`Cache MISS: ${key}`);
  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

export async function getCacheStats(): Promise<{ entries: number }> {
  try {
    const dbSize = await redis.dbsize();
    return { entries: dbSize };
  } catch {
    return { entries: 0 };
  }
}

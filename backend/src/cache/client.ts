import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,   // fail fast when disconnected — caught by helpers try/catch
  lazyConnect: true,
  enableReadyCheck: true,
  connectTimeout: 5_000,       // TCP handshake timeout in ms
  retryStrategy(times) {
    // Stop retrying after 10 attempts so a missing Redis doesn't spin forever
    if (times > 10) return null;
    return Math.min(times * 200, 3_000);
  },
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('ready',   () => logger.info('Redis ready'));
redis.on('error',   (err) => logger.error('Redis error', { error: err.message }));
redis.on('close',   () => logger.warn('Redis connection closed'));

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

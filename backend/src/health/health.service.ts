import { pool } from '../db/pool';
import { getCacheStats } from '../cache/helpers';
import { checkRedisConnection } from '../cache/client';
import { logger } from '../utils/logger';

export interface ComponentHealth {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptimeSeconds: number;
  memoryMb: number;
  cache: { entries: number };
  components: {
    database: ComponentHealth;
    redis: ComponentHealth;
  };
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    logger.error('Health check: database failed', { error: (err as Error).message });
    return { status: 'down', error: (err as Error).message };
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  const ok = await checkRedisConnection();
  if (ok) return { status: 'up', latencyMs: Date.now() - start };
  return { status: 'down', error: 'Redis ping failed' };
}

export async function getFullHealth(): Promise<HealthReport> {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const cacheStats = await getCacheStats();
  const memMb = process.memoryUsage().rss / 1024 / 1024;

  const allUp = database.status === 'up' && redis.status === 'up';
  const dbUp = database.status === 'up';

  return {
    status: allUp ? 'healthy' : dbUp ? 'degraded' : 'unhealthy',
    version: process.env['npm_package_version'] ?? '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: Math.round(memMb),
    cache: cacheStats,
    components: { database, redis },
  };
}

export async function isReady(): Promise<boolean> {
  const db = await checkDatabase();
  return db.status === 'up';
}

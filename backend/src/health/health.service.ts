import { pool } from '../db/pool';
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
  components: {
    database: ComponentHealth;
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

export async function getFullHealth(): Promise<HealthReport> {
  const database = await checkDatabase();
  const memMb = process.memoryUsage().rss / 1024 / 1024;

  return {
    status: database.status === 'up' ? 'healthy' : 'unhealthy',
    version: process.env['npm_package_version'] ?? '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: Math.round(memMb),
    components: { database },
  };
}

export async function isReady(): Promise<boolean> {
  const db = await checkDatabase();
  return db.status === 'up';
}

import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

export const pool = new Pool({
  connectionString:        config.db.url,
  min:                     config.db.poolMin,
  max:                     config.db.poolMax,
  idleTimeoutMillis:       config.db.idleTimeoutMs,
  connectionTimeoutMillis: config.db.connectionTimeoutMs,
});

pool.on('connect', () => logger.debug('New DB connection established'));
pool.on('acquire', () => logger.debug('DB client acquired from pool'));
pool.on('remove',  () => logger.debug('DB client removed from pool'));
pool.on('error',   (err) => logger.error('Unexpected database pool error', { error: err.message }));

export async function checkDbConnection(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

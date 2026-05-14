import { Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

const SLOW_QUERY_MS = 200;

export const pool = new Pool({
  connectionString:        config.db.url,
  min:                     config.db.poolMin,
  max:                     config.db.poolMax,
  idleTimeoutMillis:       config.db.idleTimeoutMs,
  connectionTimeoutMillis: config.db.connectionTimeoutMs,
});

// Instrument every client the pool creates — covers both pool.query() and explicit
// pool.connect() / client.query() calls, so slow-query detection is universal.
pool.on('connect', (client: PoolClient) => {
  const original = client.query.bind(client);

  // @ts-expect-error — query has too many overloads; wrapping the runtime shape is fine
  client.query = async <R extends QueryResultRow = QueryResultRow>(
    queryTextOrConfig: string | QueryConfig<unknown[]>,
    values?: unknown[],
  ): Promise<QueryResult<R>> => {
    const start = Date.now();
    const queryText =
      typeof queryTextOrConfig === 'string'
        ? queryTextOrConfig
        : queryTextOrConfig.text;

    try {
      const result: QueryResult<R> = await original(queryTextOrConfig, values);
      const durationMs = Date.now() - start;

      if (durationMs > SLOW_QUERY_MS) {
        logger.warn('Slow query detected', {
          durationMs,
          query: queryText.substring(0, 300),
        });
      }

      return result;
    } catch (err) {
      logger.error('Database query error', {
        error:     (err as Error).message,
        query:     queryText.substring(0, 300),
        durationMs: Date.now() - start,
      });
      throw err;
    }
  };
});

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

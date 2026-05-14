import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { pool } from './db/pool';
import { redis } from './cache/client';
import { logger } from './utils/logger';
import { config } from './config';

async function start(): Promise<void> {
  // Connect to Redis before serving traffic
  try {
    await redis.connect();
  } catch (err) {
    logger.warn('Redis unavailable on startup — continuing without cache', {
      error: (err as Error).message,
    });
  }

  const app    = createApp();
  const server = http.createServer(app);

  server.listen(config.port, () => {
    logger.info('Server started', {
      port:          config.port,
      env:           config.env,
      pid:           process.pid,
      nodeVersion:   process.version,
      dbPoolMin:     config.db.poolMin,
      dbPoolMax:     config.db.poolMax,
      rateLimitMax:  config.rateLimit.max,
      corsOrigin:    config.cors.origin,
    });
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal} — starting graceful shutdown`);

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await pool.end();
        logger.info('Database pool drained');
      } catch (err) {
        logger.error('Error draining DB pool', { error: (err as Error).message });
      }

      try {
        await redis.quit();
        logger.info('Redis connection closed');
      } catch (err) {
        logger.error('Error closing Redis', { error: (err as Error).message });
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, config.gracefulShutdownMs);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
    shutdown('unhandledRejection');
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { error: (err as Error).message });
  process.exit(1);
});

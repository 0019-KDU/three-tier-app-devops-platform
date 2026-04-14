import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { pool } from './db/pool';
import { logger } from './utils/logger';
import { config } from './config';

async function start(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);

  server.listen(config.port, () => {
    logger.info('Server running', {
      port: config.port,
      env: config.env,
      pid: process.pid,
    });
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await pool.end();
        logger.info('Database pool drained');
      } catch (err) {
        logger.error('Error closing db pool', { error: (err as Error).message });
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, config.gracefulShutdownMs);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

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

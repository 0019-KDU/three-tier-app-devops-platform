import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config';
import { logContextStorage } from './logContext';

const { combine, timestamp, errors, json, printf } = winston.format;

// Injects requestId / userId from AsyncLocalStorage into every log record
const contextFormat = winston.format((info) => {
  const ctx = logContextStorage.getStore();
  if (ctx?.requestId) info['requestId'] = ctx.requestId;
  if (ctx?.userId)    info['userId']    = ctx.userId;
  return info;
})();

// Adds service name + environment to every record
const serviceFormat = winston.format((info) => {
  info['service'] = 'taskapp-api';
  info['env']     = config.env;
  return info;
})();

// ANSI color codes
const LEVEL_COLOR: Record<string, string> = {
  error:   '\x1b[31m',  // red
  warn:    '\x1b[33m',  // yellow
  info:    '\x1b[36m',  // cyan
  http:    '\x1b[35m',  // magenta
  debug:   '\x1b[90m',  // grey
};
const RESET = '\x1b[0m';

const devFormat = combine(
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  contextFormat,
  printf(({ level, message, timestamp: ts, stack, service: _s, env: _e, ...meta }) => {
    const color = LEVEL_COLOR[level] ?? '';
    const label = `[${level.toUpperCase().padEnd(5)}]`;

    // Build key=value pairs for metadata
    const skip = new Set(['requestId', 'userId']);
    const pairs: string[] = [];

    if (meta['requestId']) pairs.push(`reqId=${meta['requestId']}`);
    if (meta['userId'])    pairs.push(`userId=${meta['userId']}`);

    for (const [k, v] of Object.entries(meta)) {
      if (skip.has(k) || v === undefined) continue;
      pairs.push(`${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
    }

    const metaStr  = pairs.length ? `  ${pairs.join(' ')}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${ts} ${color}${label}${RESET} ${message}${metaStr}${stackStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  contextFormat,
  serviceFormat,
  json(),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: config.isDev ? devFormat : prodFormat,
    silent: config.env === 'test',
  }),
];

if (config.isProd) {
  transports.push(
    new DailyRotateFile({
      filename:    'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level:       'error',
      maxFiles:    '30d',
      maxSize:     '50m',
      format:      prodFormat,
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename:    'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles:    '14d',
      maxSize:     '100m',
      format:      prodFormat,
      zippedArchive: true,
    }),
  );
}

export const logger = winston.createLogger({
  level:       config.isDev ? 'debug' : 'info',
  transports,
  exitOnError: false,
});

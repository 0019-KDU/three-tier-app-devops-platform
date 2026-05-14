import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { config } from '../config';
import { redis } from '../cache/client';

const skipInDev = () => config.isDev;

function makeRedisStore(prefix: string): RedisStore {
  return new RedisStore({
    sendCommand: (...args: [string, ...string[]]) => redis.call(...args) as Promise<number>,
    prefix,
  });
}

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health') || skipInDev(),
  store: skipInDev() ? undefined : makeRedisStore('rl:global:'),
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
  store: skipInDev() ? undefined : makeRedisStore('rl:auth:'),
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth attempts, please try again later.' },
  },
});

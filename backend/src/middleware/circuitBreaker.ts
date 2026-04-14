import CircuitBreaker from 'opossum';
import { logger } from '../utils/logger';

interface BreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  name?: string;
}

const defaultOptions: BreakerOptions = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
};

export function createCircuitBreaker<T>(
  fn: (...args: unknown[]) => Promise<T>,
  options: BreakerOptions = {},
): CircuitBreaker {
  const opts = { ...defaultOptions, ...options };
  const breaker = new CircuitBreaker(fn, opts);

  const name = opts.name ?? fn.name ?? 'unknown';

  breaker.on('open', () =>
    logger.warn(`Circuit breaker OPEN: ${name}`, { breaker: name }),
  );
  breaker.on('halfOpen', () =>
    logger.info(`Circuit breaker HALF-OPEN: ${name}`, { breaker: name }),
  );
  breaker.on('close', () =>
    logger.info(`Circuit breaker CLOSED: ${name}`, { breaker: name }),
  );
  breaker.on('fallback', () =>
    logger.warn(`Circuit breaker fallback triggered: ${name}`, { breaker: name }),
  );

  return breaker;
}

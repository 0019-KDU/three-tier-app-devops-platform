import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '3000')),
  isDev: optional('NODE_ENV', 'development') === 'development',
  isProd: optional('NODE_ENV', 'development') === 'production',

  db: {
    url: required('DATABASE_URL'),
    poolMin: Number(optional('DB_POOL_MIN', '2')),
    poolMax: Number(optional('DB_POOL_MAX', '10')),
    idleTimeoutMs: 30_000,
    connectionTimeoutMs: 2_000,
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
    refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
  },

  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:5173'),
    credentials: true,
  },

  rateLimit: {
    windowMs: Number(optional('RATE_LIMIT_WINDOW_MS', '900000')),
    max: Number(optional('RATE_LIMIT_MAX', '100')),
    authMax: 10,
  },

  bcrypt: {
    rounds: Number(optional('BCRYPT_ROUNDS', '12')),
  },

  gracefulShutdownMs: 10_000,
} as const;

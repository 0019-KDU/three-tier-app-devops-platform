type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

// In production, suppress debug/info to keep the console clean.
// Errors and warnings always go through.
const MIN_LEVEL: Level = import.meta.env.DEV ? 'debug' : 'warn';

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '';

function sendToBackend(level: Level, message: string, context?: Record<string, unknown>): void {
  // Fire-and-forget — never block the UI on log delivery
  fetch(`${BASE_URL}/api/v1/logs/client`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ level, message, context }),
    // keepalive lets the request complete even if the page is unloading
    keepalive: true,
  }).catch(() => { /* intentionally silent */ });
}

function log(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[MIN_LEVEL]) return;

  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    url:       window.location.pathname,
    ...context,
  };

  if (import.meta.env.DEV) {
    const colors: Record<Level, string> = {
      debug: 'color:#888',
      info:  'color:#0ea5e9',
      warn:  'color:#f59e0b',
      error: 'color:#ef4444',
    };
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'debug' : level](
      `%c[${level.toUpperCase()}] ${message}`,
      colors[level],
      context ?? '',
    );
  } else {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'debug' : level](entry);
  }

  // Ship warn/error to the backend so they appear in server logs
  if (level === 'warn' || level === 'error') {
    sendToBackend(level, message, context);
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info:  (message: string, context?: Record<string, unknown>) => log('info',  message, context),
  warn:  (message: string, context?: Record<string, unknown>) => log('warn',  message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};

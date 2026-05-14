import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logger } from './utils/logger';
import './index.css';

// ── Global error handlers ─────────────────────────────────────────────────────

window.onerror = (message, source, lineno, colno, error) => {
  logger.error('Uncaught global error', {
    message: String(message),
    source:  source ?? undefined,
    lineno:  lineno ?? undefined,
    colno:   colno ?? undefined,
    stack:   error?.stack,
  });
};

window.onunhandledrejection = (event) => {
  const reason = event.reason instanceof Error
    ? { message: event.reason.message, stack: event.reason.stack }
    : { reason: String(event.reason) };

  logger.error('Unhandled promise rejection', reason);
};

// ── Render ────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

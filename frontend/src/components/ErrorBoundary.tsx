import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorId:  string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorId: null };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const errorId = crypto.randomUUID();
    this.setState({ errorId });

    logger.error('Uncaught render error', {
      errorId,
      name:             error.name,
      message:          error.message,
      stack:            error.stack,
      componentStack:   info.componentStack ?? undefined,
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, errorId: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6">
            An unexpected error occurred. The issue has been reported automatically.
          </p>
          {this.state.errorId && (
            <p className="text-xs text-gray-400 font-mono mb-6">
              Error ID: {this.state.errorId}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white
                         hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300
                         text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

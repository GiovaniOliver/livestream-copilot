"use client";

/**
 * ErrorBoundary Component
 *
 * A React error boundary that catches JavaScript errors anywhere in the child
 * component tree, logs them, and displays a fallback UI.
 *
 * Features:
 * - Captures errors with full context
 * - Displays user-friendly error message
 * - Provides retry functionality
 * - Shows error details in development mode
 */

import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
          <div className="w-full max-w-md rounded-lg border border-red-500/20 bg-red-500/5 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <svg
                  className="h-5 w-5 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-400">
                  Please try again or reload the page.
                </p>
              </div>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-4 overflow-hidden rounded border border-gray-700 bg-gray-900">
                <div className="border-b border-gray-700 bg-gray-800 px-3 py-2">
                  <span className="font-mono text-xs text-gray-400">
                    Error Details (dev only)
                  </span>
                </div>
                <pre className="max-h-48 overflow-auto p-3 font-mono text-xs text-red-400">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Higher-order component to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.ComponentType<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

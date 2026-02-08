"use client";

/**
 * Global Error Handler for Next.js App Router
 *
 * This component handles errors at the root level, including errors
 * in the root layout. It must be a Client Component and render its own
 * html and body tags since the root layout is replaced.
 */

import { useEffect } from "react";
import { logger } from "../lib/logger";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error
    logger.error("Global error caught:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0D0D12]">
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
          <div className="w-full max-w-lg text-center">
            {/* Icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <svg
                className="h-8 w-8 text-red-500"
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

            {/* Title */}
            <h1 className="mb-2 text-2xl font-bold text-white">
              Something went wrong
            </h1>

            {/* Description */}
            <p className="mb-8 text-gray-400">
              An unexpected error has occurred. Please try again.
            </p>

            {/* Error digest (for support) */}
            {error.digest && (
              <p className="mb-6 font-mono text-xs text-gray-500">
                Error ID: {error.digest}
              </p>
            )}

            {/* Show error in development */}
            {process.env.NODE_ENV === "development" && (
              <div className="mb-6 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 text-left">
                <div className="border-b border-gray-700 bg-gray-800 px-4 py-2">
                  <span className="font-mono text-xs text-gray-400">
                    Error Details (development only)
                  </span>
                </div>
                <pre className="max-h-48 overflow-auto p-4 font-mono text-xs text-red-400">
                  {error.message}
                  {"\n\n"}
                  {error.stack}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <button
                onClick={reset}
                className="rounded-lg bg-white/10 px-6 py-3 font-medium text-white transition-colors hover:bg-white/20"
              >
                Try Again
              </button>
              <a
                href="/"
                className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

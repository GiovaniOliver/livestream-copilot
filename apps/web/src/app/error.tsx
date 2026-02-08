"use client";

/**
 * Error Handler for Next.js App Router
 *
 * This component handles errors in route segments. It catches errors
 * during rendering, in Server Components, and in Data Fetching.
 */

import { useEffect } from "react";
import { logger } from "../lib/logger";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error
    logger.error("Error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <svg
            className="h-7 w-7 text-red-500"
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
        <h2 className="mb-2 text-xl font-bold text-white">
          Something went wrong
        </h2>

        {/* Description */}
        <p className="mb-6 text-gray-400">
          We encountered an error loading this page. Please try again.
        </p>

        {/* Error details in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 text-left">
            <div className="border-b border-gray-700 bg-gray-800 px-3 py-2">
              <span className="font-mono text-xs text-gray-400">
                Error Details
              </span>
            </div>
            <pre className="max-h-32 overflow-auto p-3 font-mono text-xs text-red-400">
              {error.message}
            </pre>
          </div>
        )}

        {/* Error ID for support */}
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-gray-500">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Try Again
          </button>
          <a
            href="/"
            className="rounded-lg bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

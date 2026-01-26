/**
 * Sentry Error Monitoring Module
 *
 * Provides error tracking, performance monitoring, and observability
 * for the desktop-companion service.
 *
 * Features:
 * - Automatic error capture with stack traces
 * - User context attachment
 * - Request/response tracking
 * - Performance monitoring
 * - Source map support for debugging
 */

import * as Sentry from "@sentry/node";
import type { Express, Request, Response, NextFunction } from "express";

let initialized = false;

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  debug?: boolean;
}

/**
 * Initialize Sentry SDK
 * Must be called before any other code runs
 */
export function initSentry(config: SentryConfig): boolean {
  if (initialized) {
    return true;
  }

  if (!config.dsn) {
    console.log("[sentry] Sentry DSN not configured - error tracking disabled");
    return false;
  }

  try {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment || "development",
      release: config.release,
      debug: config.debug ?? false,

      // Performance monitoring
      tracesSampleRate: config.environment === "production" ? 0.2 : 1.0,

      // Only capture errors in production by default
      beforeSend(event, hint) {
        // Filter out expected errors
        const error = hint.originalException;
        if (error instanceof Error) {
          // Don't send validation errors to Sentry
          if (error.message.includes("Validation failed")) {
            return null;
          }
        }
        return event;
      },

      // Integrations
      integrations: [
        Sentry.httpIntegration({ tracing: true }),
        Sentry.expressIntegration(),
      ],
    });

    initialized = true;
    console.log(`[sentry] Initialized (env: ${config.environment})`);
    return true;
  } catch (error) {
    console.error("[sentry] Failed to initialize:", error);
    return false;
  }
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return initialized;
}

/**
 * Set user context for error tracking
 */
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  if (!initialized) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser(): void {
  if (!initialized) return;
  Sentry.setUser(null);
}

/**
 * Add custom context/tags
 */
export function setTag(key: string, value: string): void {
  if (!initialized) return;
  Sentry.setTag(key, value);
}

/**
 * Add extra context data
 */
export function setExtra(key: string, value: unknown): void {
  if (!initialized) return;
  Sentry.setExtra(key, value);
}

/**
 * Capture an exception manually
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): string | undefined {
  if (!initialized) {
    console.error("[sentry] Not initialized, logging error:", error);
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message manually
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
): string | undefined {
  if (!initialized) return undefined;
  return Sentry.captureMessage(message, level);
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Span | undefined {
  if (!initialized) return undefined;
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Setup Sentry request handler for Express
 * Must be added before routes
 */
export function setupExpressRequestHandler(app: Express): void {
  if (!initialized) return;
  Sentry.setupExpressErrorHandler(app);
}

/**
 * Sentry error handler middleware for Express
 * Must be added after routes but before other error handlers
 */
export function sentryErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!initialized) {
    next(err);
    return;
  }

  // Add request context
  Sentry.withScope((scope) => {
    scope.setExtra("url", req.url);
    scope.setExtra("method", req.method);
    scope.setExtra("headers", req.headers);
    scope.setExtra("query", req.query);

    // Don't log body for security reasons unless in dev
    if (process.env.NODE_ENV === "development") {
      scope.setExtra("body", req.body);
    }

    Sentry.captureException(err);
  });

  next(err);
}

/**
 * Flush Sentry events before shutdown
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!initialized) return true;
  return Sentry.flush(timeout);
}

// Re-export Sentry for advanced usage
export { Sentry };

/**
 * Redis Client Module
 *
 * Provides a managed Redis connection for distributed features such as
 * rate limiting and caching.  The client is created lazily on first access
 * and reconnects automatically via ioredis defaults.
 *
 * If REDIS_URL is not configured, or if the connection cannot be established,
 * the module exposes helpers that let consumers fall back to in-memory
 * alternatives without throwing.
 *
 * Security considerations:
 * - REDIS_URL is read from the environment, never hard-coded.
 * - TLS is used automatically when the URL scheme is "rediss://".
 * - Connection errors are logged without leaking credentials.
 *
 * @module utils/redis
 */

import Redis from "ioredis";
import { createLogger } from "../logger/index.js";

const redisLogger = createLogger("redis");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Snapshot of the Redis connection state (immutable). */
export interface RedisHealthStatus {
  readonly connected: boolean;
  readonly lastError: string | null;
  readonly upSinceMs: number | null;
}

// ---------------------------------------------------------------------------
// State  (module-scoped, never exported directly)
// ---------------------------------------------------------------------------

let client: Redis | null = null;
let connected = false;
let lastError: string | null = null;
let upSinceMs: number | null = null;

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Initialises the Redis client if a REDIS_URL is available.
 *
 * Safe to call multiple times -- subsequent calls are no-ops if a client
 * already exists.  Returns `true` when a client was created (or already
 * existed) and `false` when no URL was configured.
 */
export function initRedis(redisUrl?: string): boolean {
  if (client) {
    return true;
  }

  const url = redisUrl ?? process.env.REDIS_URL;

  if (!url) {
    redisLogger.info(
      "REDIS_URL not configured -- distributed features will use in-memory fallback"
    );
    return false;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        // Exponential back-off capped at 5 seconds
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      // Disable offline command queueing so callers get immediate feedback
      enableOfflineQueue: false,
      // Connection timeout
      connectTimeout: 5000,
      // TLS is negotiated automatically when URL is rediss://
      lazyConnect: false,
    });

    client.on("connect", () => {
      connected = true;
      upSinceMs = Date.now();
      lastError = null;
      redisLogger.info("Redis connection established");
    });

    client.on("ready", () => {
      connected = true;
      redisLogger.info("Redis client ready");
    });

    client.on("error", (err: Error) => {
      connected = false;
      lastError = err.message;
      // Log at warn, not error -- transient reconnect attempts are expected
      redisLogger.warn({ err }, "Redis connection error");
    });

    client.on("close", () => {
      connected = false;
      upSinceMs = null;
      redisLogger.info("Redis connection closed");
    });

    client.on("reconnecting", () => {
      redisLogger.info("Redis reconnecting...");
    });

    return true;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown initialisation error";
    redisLogger.warn(
      { err },
      "Failed to create Redis client -- falling back to in-memory"
    );
    lastError = errorMessage;
    client = null;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the current Redis client instance, or `null` when Redis is
 * unavailable.  Consumers MUST check for `null` before use.
 */
export function getRedisClient(): Redis | null {
  return client;
}

/**
 * Returns `true` when the Redis client is connected and ready.
 */
export function isRedisConnected(): boolean {
  return connected && client !== null;
}

/**
 * Returns an immutable snapshot of the current health status.
 */
export function getRedisHealth(): RedisHealthStatus {
  return Object.freeze({
    connected,
    lastError,
    upSinceMs,
  });
}

/**
 * Gracefully disconnects the Redis client.
 * Safe to call even when no client exists.
 */
export async function disconnectRedis(): Promise<void> {
  if (!client) {
    return;
  }

  try {
    await client.quit();
    redisLogger.info("Redis client disconnected gracefully");
  } catch (err) {
    redisLogger.warn({ err }, "Error during Redis disconnect -- forcing close");
    client.disconnect();
  } finally {
    client = null;
    connected = false;
    upSinceMs = null;
  }
}

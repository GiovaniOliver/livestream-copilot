/**
 * Distributed Rate Limiter
 *
 * Implements a sliding-window rate limiter backed by Redis sorted sets.
 * When Redis is unavailable the limiter falls back transparently to an
 * in-memory Map so the application continues to function on a single node.
 *
 * Algorithm  (Redis path):
 *   1.  Remove entries older than `windowMs` from the sorted set.
 *   2.  Count remaining entries.
 *   3.  If count < limit, add the current timestamp and allow.
 *   4.  Set a TTL on the key equal to `windowMs` for automatic cleanup.
 *   All four steps are executed inside a single MULTI/EXEC pipeline so
 *   the check-and-increment is atomic.
 *
 * Security considerations:
 * - Keys are prefixed to avoid collision with other Redis consumers.
 * - No user-supplied data is interpolated into Redis commands.
 * - In-memory fallback is per-process; it cannot enforce global limits
 *   across instances, but it prevents unbounded access on a single node.
 *
 * @module utils/rateLimiter
 */

import { createLogger } from "../logger/index.js";
import { getRedisClient, isRedisConnected } from "./redis.js";

const rateLimitLogger = createLogger("rate-limit");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Immutable result of a rate-limit check. */
export interface RateLimitResult {
  /** Whether the request is allowed through. */
  readonly allowed: boolean;
  /** How many requests remain in the current window. */
  readonly remaining: number;
  /** Unix-ms timestamp when the window resets. */
  readonly resetAt: number;
}

/** Configuration for a RateLimiter instance. */
export interface RateLimiterConfig {
  /** Prefix prepended to every Redis key (default: "rl:"). */
  readonly keyPrefix?: string;
}

// ---------------------------------------------------------------------------
// In-memory fallback types
// ---------------------------------------------------------------------------

interface MemoryWindowEntry {
  readonly timestamps: number[];
  readonly windowStart: number;
}

// ---------------------------------------------------------------------------
// RateLimiter class
// ---------------------------------------------------------------------------

export class RateLimiter {
  private readonly keyPrefix: string;

  /**
   * In-memory fallback store.
   * Only used when Redis is not connected.
   * Each key maps to an array of request timestamps within the window.
   */
  private readonly memoryStore: Map<string, MemoryWindowEntry>;

  constructor(config: RateLimiterConfig = {}) {
    this.keyPrefix = config.keyPrefix ?? "rl:";
    this.memoryStore = new Map();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Check (and consume) a rate-limit token for `key`.
   *
   * @param key       Unique identifier (e.g. API-key ID or IP address).
   * @param limit     Maximum number of requests allowed in the window.
   * @param windowMs  Window duration in milliseconds.
   * @returns An immutable {@link RateLimitResult}.
   */
  async checkLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    if (isRedisConnected()) {
      try {
        return await this.checkLimitRedis(key, limit, windowMs);
      } catch (err) {
        rateLimitLogger.warn(
          { err, key: this.keyPrefix + key },
          "Redis rate-limit check failed -- falling back to in-memory"
        );
        return this.checkLimitMemory(key, limit, windowMs);
      }
    }

    return this.checkLimitMemory(key, limit, windowMs);
  }

  // -----------------------------------------------------------------------
  // Redis-backed sliding window
  // -----------------------------------------------------------------------

  private async checkLimitRedis(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const redis = getRedisClient();
    if (!redis) {
      return this.checkLimitMemory(key, limit, windowMs);
    }

    const redisKey = `${this.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    // Unique member: timestamp + random suffix avoids collisions when
    // multiple requests arrive within the same millisecond.
    const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

    // Atomic pipeline: remove old + count + conditional add + set TTL
    const pipeline = redis.multi();

    // 1. Remove entries older than the window
    pipeline.zremrangebyscore(redisKey, "-inf", windowStart);

    // 2. Count current entries
    pipeline.zcard(redisKey);

    // 3. Add the current request (we may roll it back logically)
    pipeline.zadd(redisKey, now, member);

    // 4. Ensure TTL is set so Redis auto-cleans abandoned keys
    pipeline.pexpire(redisKey, windowMs);

    const results = await pipeline.exec();

    if (!results) {
      // Pipeline returned null (connection issue) -- fall back
      return this.checkLimitMemory(key, limit, windowMs);
    }

    // results[1] is the ZCARD result: [error, count]
    const [zcardErr, currentCount] = results[1] as [Error | null, number];

    if (zcardErr) {
      throw zcardErr;
    }

    const resetAt = now + windowMs;

    if (currentCount >= limit) {
      // Over the limit -- remove the member we just added
      redis.zrem(redisKey, member).catch((err) => {
        rateLimitLogger.warn({ err }, "Failed to remove excess rate-limit entry");
      });

      return Object.freeze({
        allowed: false,
        remaining: 0,
        resetAt,
      });
    }

    const remaining = Math.max(0, limit - currentCount - 1);

    return Object.freeze({
      allowed: true,
      remaining,
      resetAt,
    });
  }

  // -----------------------------------------------------------------------
  // In-memory sliding window fallback
  // -----------------------------------------------------------------------

  private checkLimitMemory(
    key: string,
    limit: number,
    windowMs: number
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;
    const prefixedKey = `${this.keyPrefix}${key}`;

    const existing = this.memoryStore.get(prefixedKey);

    // Filter out timestamps older than the window (immutable: create new array)
    const activeTimestamps = existing
      ? existing.timestamps.filter((ts) => ts > windowStart)
      : [];

    const resetAt = now + windowMs;

    if (activeTimestamps.length >= limit) {
      // Update the store with the pruned list (no new timestamp added)
      this.memoryStore.set(prefixedKey, {
        timestamps: activeTimestamps,
        windowStart,
      });

      return Object.freeze({
        allowed: false,
        remaining: 0,
        resetAt,
      });
    }

    // Create new array with the current timestamp appended (immutable)
    const updatedTimestamps = [...activeTimestamps, now];

    this.memoryStore.set(prefixedKey, {
      timestamps: updatedTimestamps,
      windowStart,
    });

    const remaining = Math.max(0, limit - updatedTimestamps.length);

    return Object.freeze({
      allowed: true,
      remaining,
      resetAt,
    });
  }

  // -----------------------------------------------------------------------
  // Maintenance
  // -----------------------------------------------------------------------

  /**
   * Removes expired entries from the in-memory store.
   * Call periodically (e.g. every 60 s) to prevent unbounded growth.
   * Has no effect when Redis is the primary backend.
   */
  pruneMemoryStore(windowMs: number): void {
    const now = Date.now();
    const cutoff = now - windowMs;

    for (const [key, entry] of this.memoryStore.entries()) {
      const active = entry.timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) {
        this.memoryStore.delete(key);
      } else {
        this.memoryStore.set(key, {
          timestamps: active,
          windowStart: cutoff,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

/** Default rate limiter shared across the application. */
export const rateLimiter = new RateLimiter({ keyPrefix: "fluxboard:rl:" });

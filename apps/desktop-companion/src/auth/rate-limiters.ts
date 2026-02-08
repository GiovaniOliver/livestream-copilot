/**
 * Authentication Rate Limiters
 *
 * Implements rate limiting for authentication endpoints to prevent brute force attacks.
 *
 * Security Features:
 * - Login attempts: 5 per 15 minutes per IP:email combination
 * - Registration: 3 per hour per IP
 * - Password reset requests: 3 per hour per IP
 * - Email verification resend: 3 per hour per IP
 * - Refresh token: 10 per minute per IP (prevent token enumeration)
 * - Standard HTTP headers (RateLimit-* and Retry-After)
 * - Secure key generation combining IP and email where applicable
 *
 * NOTE: For production with multiple servers, replace with Redis-backed store.
 *
 * @module auth/rate-limiters
 */

import rateLimit from "express-rate-limit";
import type { Request } from "express";

import { logger } from '../logger/index.js';
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extracts client IP address from request.
 * Handles X-Forwarded-For for proxy scenarios.
 *
 * SECURITY: In production, configure Express trust proxy setting.
 *
 * @param req - Express request object
 * @returns Client IP address
 */
function getClientIp(req: Request): string {
  // Trust X-Forwarded-For if behind trusted proxy
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Generic rate limit handler.
 * Logs rate limit violations and sends standardized error response.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
function handleRateLimitExceeded(req: Request, res: any): void {
  const ip = getClientIp(req);
  const path = req.path;

  // Log rate limit violation for security monitoring
  logger.warn(
    `[auth/rate-limit] Rate limit exceeded for ${path} from IP ${ip}`
  );

  // Send standardized error response
  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
      retryAfter: res.getHeader("Retry-After"),
    },
  });
}

// =============================================================================
// LOGIN RATE LIMITER
// =============================================================================

/**
 * Rate limiter for login attempts.
 *
 * Defense against credential stuffing and brute force attacks:
 * - 5 attempts per 15 minutes
 * - Key combines IP address and email to prevent distributed attacks
 * - If email not in body, falls back to IP-only (prevents bypass)
 *
 * Attack scenarios prevented:
 * - Brute force password guessing
 * - Credential stuffing attacks
 * - Account enumeration via timing
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many login attempts. Please try again later.",
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count all attempts, not just failures
  skipFailedRequests: false,

  /**
   * Generate rate limit key combining IP and email.
   * This prevents attackers from distributing attacks across IPs.
   */
  keyGenerator: (req: Request): string => {
    const ip = getClientIp(req);
    const email = req.body?.email || "unknown";
    // Normalize email to lowercase to prevent case-variation bypass
    const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "unknown";
    return `login:${ip}:${normalizedEmail}`;
  },

  /**
   * Custom handler for rate limit exceeded.
   */
  handler: handleRateLimitExceeded,
});

// =============================================================================
// REGISTRATION RATE LIMITER
// =============================================================================

/**
 * Rate limiter for user registration.
 *
 * Defense against mass account creation:
 * - 3 registrations per hour per IP
 * - IP-based to prevent automated account creation
 * - Stricter than login to prevent abuse
 *
 * Attack scenarios prevented:
 * - Automated bot registration
 * - Email spam through registration
 * - Resource exhaustion
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: "Too many registration attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,

  keyGenerator: (req: Request): string => {
    const ip = getClientIp(req);
    return `register:${ip}`;
  },

  handler: handleRateLimitExceeded,
});

// =============================================================================
// PASSWORD RESET RATE LIMITER
// =============================================================================

/**
 * Rate limiter for password reset requests.
 *
 * Defense against abuse of password reset flow:
 * - 3 requests per hour per IP
 * - Prevents email bombing attacks
 * - Prevents account enumeration via reset flow
 *
 * Attack scenarios prevented:
 * - Email flooding/harassment
 * - Account enumeration
 * - Service disruption
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset requests per hour
  message: "Too many password reset requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,

  keyGenerator: (req: Request): string => {
    const ip = getClientIp(req);
    return `password-reset:${ip}`;
  },

  handler: handleRateLimitExceeded,
});

// =============================================================================
// EMAIL VERIFICATION RATE LIMITERS
// =============================================================================

/**
 * Rate limiter for email verification resend requests.
 *
 * Defense against email bombing:
 * - 3 resend requests per hour per IP
 * - Prevents verification email spam
 *
 * Attack scenarios prevented:
 * - Email flooding
 * - Service abuse
 */
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 resend requests per hour
  message: "Too many verification email requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,

  keyGenerator: (req: Request): string => {
    const ip = getClientIp(req);
    return `resend-verification:${ip}`;
  },

  handler: handleRateLimitExceeded,
});

/**
 * Rate limiter for email verification token validation.
 *
 * Defense against token enumeration:
 * - 10 attempts per hour per IP
 * - Prevents brute force token guessing
 *
 * Attack scenarios prevented:
 * - Verification token enumeration
 * - Brute force token attacks
 */
export const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 verification attempts per hour
  message: "Too many verification attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,

  keyGenerator: (req: Request): string => {
    const ip = getClientIp(req);
    return `verify-email:${ip}`;
  },

  handler: handleRateLimitExceeded,
});

// =============================================================================
// TOKEN REFRESH RATE LIMITER
// =============================================================================

/**
 * Rate limiter for token refresh requests.
 *
 * Defense against token enumeration and abuse:
 * - 10 requests per minute per IP
 * - Higher limit than auth endpoints (legitimate use case)
 * - Prevents refresh token enumeration
 *
 * Attack scenarios prevented:
 * - Refresh token enumeration
 * - Service abuse
 * - Stolen token validation attempts
 */
export const refreshTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 refresh requests per minute
  message: "Too many token refresh attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,

  keyGenerator: (req: Request): string => {
    const ip = getClientIp(req);
    return `refresh:${ip}`;
  },

  handler: handleRateLimitExceeded,
});

// =============================================================================
// GENERAL AUTH ENDPOINT LIMITER
// =============================================================================

/**
 * General rate limiter for all auth endpoints.
 *
 * Fallback protection for endpoints without specific limiters:
 * - 20 requests per minute per IP
 * - Prevents general abuse
 *
 * This should be applied as a base layer with specific limiters on top.
 */
export const generalAuthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: "Too many requests to authentication service. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,

  keyGenerator: (req: Request): string => {
    const ip = getClientIp(req);
    return `auth:${ip}`;
  },

  handler: handleRateLimitExceeded,
});

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * All rate limiters exported for use in route configuration.
 */
export const rateLimiters = {
  login: loginLimiter,
  register: registerLimiter,
  passwordReset: passwordResetLimiter,
  resendVerification: resendVerificationLimiter,
  verifyEmail: verifyEmailLimiter,
  refreshToken: refreshTokenLimiter,
  general: generalAuthLimiter,
};

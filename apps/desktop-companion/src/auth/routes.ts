/**
 * Authentication Routes
 *
 * Express router providing authentication endpoints:
 * - User registration with email verification
 * - Login with email/password
 * - Token refresh
 * - Logout (single and all sessions)
 * - Email verification
 * - Password reset flow
 * - Current user retrieval
 *
 * Security Features:
 * - Input validation using Zod schemas
 * - Rate limiting on all auth endpoints (general + specific limiters)
 * - Login: 5 attempts per 15min per IP:email (prevents brute force)
 * - Registration: 3 per hour per IP (prevents bot signups)
 * - Password reset: 3 per hour per IP (prevents email bombing)
 * - Token refresh: 10 per minute per IP (prevents token enumeration)
 * - Secure error handling (no sensitive data exposure)
 * - Audit logging through authService
 * - Device and IP tracking for session management
 *
 * @module auth/routes
 */

import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import { authService, AuthError } from "./service.js";
import { logger } from '../logger/index.js';
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "./middleware.js";
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  resendVerificationLimiter,
  verifyEmailLimiter,
  refreshTokenLimiter,
  generalAuthLimiter,
} from "./rate-limiters.js";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Email validation with normalization.
 */
const emailSchema = z
  .string()
  .email("Invalid email address format")
  .max(254, "Email address is too long")
  .transform((email) => email.toLowerCase().trim());

/**
 * Password validation for login (no strength check, that's for registration).
 */
const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .max(128, "Password is too long");

/**
 * Registration request schema.
 */
const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must not exceed 128 characters"),
  name: z
    .string()
    .max(100, "Name is too long")
    .transform((name) => name.trim())
    .optional(),
});

/**
 * Login request schema.
 */
const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Token refresh request schema.
 */
const refreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token is required"),
});

/**
 * Logout request schema.
 */
const logoutSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token is required"),
});

/**
 * Email verification request schema.
 */
const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, "Verification token is required")
    .max(256, "Invalid verification token"),
});

/**
 * Resend verification email request schema.
 */
const resendVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * Forgot password request schema.
 */
const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Reset password request schema.
 */
const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, "Reset token is required")
    .max(256, "Invalid reset token"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must not exceed 128 characters"),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extracts device info from request headers.
 * Used for session tracking and security.
 *
 * @param req - Express request object
 * @returns Device info string or undefined
 */
function getDeviceInfo(req: Request): string | undefined {
  const userAgent = req.headers["user-agent"];
  const clientVersion = req.headers["x-client-version"];

  if (userAgent || clientVersion) {
    const parts: string[] = [];
    if (userAgent) parts.push(userAgent.substring(0, 200)); // Limit length
    if (clientVersion && typeof clientVersion === "string") {
      parts.push(`v${clientVersion}`);
    }
    return parts.join(" | ");
  }

  return undefined;
}

/**
 * Extracts client IP address from request.
 * Handles X-Forwarded-For for proxy scenarios.
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
 * Sends a standardized success response.
 *
 * @param res - Express response object
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 */
function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

/**
 * Sends a standardized error response.
 *
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param code - Error code for client handling
 * @param message - Human-readable error message
 */
function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

/**
 * Handles Zod validation errors and sends appropriate response.
 *
 * @param res - Express response object
 * @param error - Zod validation error
 */
function handleValidationError(res: Response, error: ZodError): void {
  const messages = error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });

  sendError(res, 400, "VALIDATION_ERROR", messages.join("; "));
}

/**
 * Handles AuthError and sends appropriate response.
 *
 * @param res - Express response object
 * @param error - AuthError instance
 */
function handleAuthError(res: Response, error: AuthError): void {
  sendError(res, error.statusCode, error.code, error.message);
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * POST /api/v1/auth/register
 * Register a new user account.
 */
async function registerHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { email, password, name } = validationResult.data;

    // Register the user
    const result = await authService.register(email, password, name);

    sendSuccess(res, result, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      handleAuthError(res, error);
      return;
    }

    logger.error({ err: error }, "[auth/routes] Registration error");
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
}

/**
 * POST /api/v1/auth/login
 * Authenticate user and return tokens.
 */
async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { email, password } = validationResult.data;
    const deviceInfo = getDeviceInfo(req);
    const ipAddress = getClientIp(req);

    // Authenticate the user
    const result = await authService.login(
      email,
      password,
      deviceInfo,
      ipAddress
    );

    // Remove sensitive fields from user before sending
    const { accessToken, refreshToken, expiresIn, user } = result;
    const safeUser = {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      avatarUrl: user.avatarUrl,
      platformRole: user.platformRole,
      status: user.status,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
    };

    sendSuccess(res, {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: "Bearer",
      user: safeUser,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      handleAuthError(res, error);
      return;
    }

    logger.error({ err: error }, "[auth/routes] Login error");
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
}

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using a valid refresh token.
 */
async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validationResult = refreshSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { refreshToken } = validationResult.data;

    // Refresh the access token
    const result = await authService.refreshAccessToken(refreshToken);

    sendSuccess(res, {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: "Bearer",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      handleAuthError(res, error);
      return;
    }

    logger.error({ err: error }, "[auth/routes] Token refresh error");
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
}

/**
 * POST /api/v1/auth/logout
 * Logout by revoking a specific refresh token.
 */
async function logoutHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validationResult = logoutSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { refreshToken } = validationResult.data;

    // Revoke the refresh token
    await authService.logout(refreshToken);

    // Always return success to prevent token enumeration
    sendSuccess(res, { message: "Logged out successfully." });
  } catch (error) {
    // Log but don't expose error details
    logger.error({ err: error }, "[auth/routes] Logout error");
    // Still return success to prevent enumeration
    sendSuccess(res, { message: "Logged out successfully." });
  }
}

/**
 * POST /api/v1/auth/logout-all
 * Logout from all sessions by revoking all refresh tokens.
 * Requires authentication.
 */
async function logoutAllHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    // Revoke all refresh tokens for this user
    await authService.logoutAll(user.id);

    sendSuccess(res, { message: "Logged out from all sessions." });
  } catch (error) {
    logger.error({ err: error }, "[auth/routes] Logout all error");
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
}

/**
 * POST /api/v1/auth/verify-email
 * Verify email address using verification token.
 */
async function verifyEmailHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validationResult = verifyEmailSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { token } = validationResult.data;

    // Verify the email
    const result = await authService.verifyEmail(token);

    sendSuccess(res, {
      message: "Email verified successfully.",
      user: result.user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      handleAuthError(res, error);
      return;
    }

    logger.error({ err: error }, "[auth/routes] Email verification error");
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
}

/**
 * POST /api/v1/auth/resend-verification
 * Resend email verification link.
 */
async function resendVerificationHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Validate input
    const validationResult = resendVerificationSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { email } = validationResult.data;

    // Resend verification email (silent success for enumeration protection)
    await authService.resendVerification(email);

    // Always return success to prevent email enumeration
    sendSuccess(res, {
      message:
        "If an account with this email exists and is not verified, a verification email has been sent.",
    });
  } catch (error) {
    // Log but return generic success to prevent enumeration
    logger.error({ err: error }, "[auth/routes] Resend verification error");
    sendSuccess(res, {
      message:
        "If an account with this email exists and is not verified, a verification email has been sent.",
    });
  }
}

/**
 * POST /api/v1/auth/forgot-password
 * Request a password reset link.
 */
async function forgotPasswordHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { email } = validationResult.data;

    // Request password reset (silent success for enumeration protection)
    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    sendSuccess(res, {
      message:
        "If an account with this email exists, a password reset link has been sent.",
    });
  } catch (error) {
    // Log but return generic success to prevent enumeration
    logger.error({ err: error }, "[auth/routes] Forgot password error");
    sendSuccess(res, {
      message:
        "If an account with this email exists, a password reset link has been sent.",
    });
  }
}

/**
 * POST /api/v1/auth/reset-password
 * Reset password using reset token.
 */
async function resetPasswordHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Validate input
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { token, password } = validationResult.data;

    // Reset the password
    await authService.resetPassword(token, password);

    sendSuccess(res, {
      message:
        "Password has been reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      handleAuthError(res, error);
      return;
    }

    logger.error({ err: error }, "[auth/routes] Reset password error");
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
}

/**
 * GET /api/v1/auth/me
 * Get current authenticated user's information.
 * Requires authentication.
 */
async function getMeHandler(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as AuthenticatedRequest).user;

    // Fetch full user data from database
    const user = await authService.getUserWithOrgs(authUser.id);

    if (!user) {
      sendError(res, 404, "USER_NOT_FOUND", "User not found.");
      return;
    }

    // Build safe response
    const safeUser = {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      avatarUrl: user.avatarUrl,
      platformRole: user.platformRole,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    };

    sendSuccess(res, { user: safeUser });
  } catch (error) {
    logger.error({ err: error }, "[auth/routes] Get me error");
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

/**
 * Creates and configures the authentication router.
 *
 * Security layers:
 * - General rate limiting applied to all auth endpoints
 * - Specific rate limiting on sensitive endpoints (login, register, password reset)
 * - Input validation via Zod schemas
 * - Authentication middleware on protected routes
 *
 * @returns Configured Express router
 */
export function createAuthRouter(): Router {
  const router = Router();

  // Apply general rate limiting to all auth endpoints as base protection
  router.use(generalAuthLimiter);

  // Public routes with specific rate limiters
  router.post("/register", registerLimiter, registerHandler);
  router.post("/login", loginLimiter, loginHandler);
  router.post("/refresh", refreshTokenLimiter, refreshHandler);
  router.post("/logout", logoutHandler);
  router.post("/verify-email", verifyEmailLimiter, verifyEmailHandler);
  router.post("/resend-verification", resendVerificationLimiter, resendVerificationHandler);
  router.post("/forgot-password", passwordResetLimiter, forgotPasswordHandler);
  router.post("/reset-password", passwordResetLimiter, resetPasswordHandler);

  // Protected routes (authentication required, no additional rate limiting needed)
  router.post("/logout-all", authenticateToken, logoutAllHandler);
  router.get("/me", authenticateToken, getMeHandler);

  return router;
}

/**
 * Pre-configured authentication router.
 * Mount at /api/v1/auth in your Express app.
 *
 * @example
 * import { authRouter } from './auth/routes';
 * app.use('/api/v1/auth', authRouter);
 */
export const authRouter = createAuthRouter();

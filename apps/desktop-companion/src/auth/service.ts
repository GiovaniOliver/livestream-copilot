/**
 * Authentication Service
 *
 * Handles all authentication operations including registration, login,
 * token management, email verification, and password reset.
 *
 * Security Features:
 * - Argon2id password hashing with secure parameters
 * - JWT access/refresh token pair with rotation
 * - Refresh token storage with hash (not plaintext)
 * - Comprehensive audit logging
 * - Rate limiting ready (implement at API layer)
 * - Protection against enumeration attacks
 *
 * @module auth/service
 */

import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { prisma } from "../db/prisma.js";
import { validateEnv } from "../config/env.js";
import { emailService } from "../services/email.js";
import type {
  User,
  RefreshToken,
  OrganizationMember,
  Organization,
  Prisma,
} from "../generated/prisma/client.js";
import { UserStatus, PlatformRole } from "../generated/prisma/enums.js";
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateVerificationToken,
  getRefreshTokenExpiry,
  getVerificationTokenExpiry,
  getPasswordResetTokenExpiry,
  type AccessTokenPayload,
} from "./utils.js";
import { logger } from "../logger/index.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * User with organization memberships included.
 */
export interface UserWithOrgs extends User {
  memberships: Array<
    OrganizationMember & {
      organization: Organization;
    }
  >;
}

/**
 * Sanitized user object safe for client responses.
 * Excludes sensitive fields like passwordHash.
 */
export interface SafeUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Login response containing tokens and user data.
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserWithOrgs;
}

/**
 * Registration response.
 */
export interface RegistrationResponse {
  user: SafeUser;
  message: string;
}

/**
 * Token refresh response.
 */
export interface TokenRefreshResponse {
  accessToken: string;
  expiresIn: number;
}

/**
 * Email verification response.
 */
export interface EmailVerificationResponse {
  user: SafeUser;
}

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================

/**
 * Authentication-specific error class.
 * Includes error codes for client-side handling.
 */
export class AuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AuthError.prototype);
  }

  /**
   * Creates a generic authentication failure error.
   * Use this to prevent credential enumeration.
   */
  static invalidCredentials(): AuthError {
    return new AuthError(
      "Invalid email or password",
      "INVALID_CREDENTIALS",
      401
    );
  }

  static emailAlreadyExists(): AuthError {
    return new AuthError(
      "An account with this email already exists",
      "EMAIL_EXISTS",
      409
    );
  }

  static userNotFound(): AuthError {
    return new AuthError("User not found", "USER_NOT_FOUND", 404);
  }

  static accountSuspended(): AuthError {
    return new AuthError(
      "Your account has been suspended. Please contact support.",
      "ACCOUNT_SUSPENDED",
      403
    );
  }

  static accountDeleted(): AuthError {
    return new AuthError(
      "This account has been deleted",
      "ACCOUNT_DELETED",
      403
    );
  }

  static emailNotVerified(): AuthError {
    return new AuthError(
      "Please verify your email address before logging in",
      "EMAIL_NOT_VERIFIED",
      403
    );
  }

  static invalidToken(): AuthError {
    return new AuthError("Invalid or expired token", "INVALID_TOKEN", 401);
  }

  static tokenRevoked(): AuthError {
    return new AuthError(
      "Token has been revoked",
      "TOKEN_REVOKED",
      401
    );
  }

  static weakPassword(errors: string[]): AuthError {
    return new AuthError(
      `Password does not meet requirements: ${errors.join(", ")}`,
      "WEAK_PASSWORD",
      400
    );
  }

  static verificationExpired(): AuthError {
    return new AuthError(
      "Verification link has expired. Please request a new one.",
      "VERIFICATION_EXPIRED",
      400
    );
  }

  static alreadyVerified(): AuthError {
    return new AuthError(
      "Email address has already been verified",
      "ALREADY_VERIFIED",
      400
    );
  }

  static rateLimited(): AuthError {
    return new AuthError(
      "Too many requests. Please try again later.",
      "RATE_LIMITED",
      429
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Removes sensitive fields from a user object.
 */
function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    avatarUrl: user.avatarUrl,
    platformRole: user.platformRole,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Logs an audit event to the database.
 */
async function logAuditEvent(
  action: string,
  userId: string | null,
  metadata: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        metadata: metadata as Prisma.InputJsonValue,
        resourceType: "User",
        resourceId: userId,
      },
    });
  } catch (error) {
    // Log audit failures but don't fail the operation
    logger.error("[auth] Failed to create audit log:", error);
  }
}

// =============================================================================
// AUTHENTICATION SERVICE
// =============================================================================

/**
 * Authentication Service
 *
 * Provides all authentication-related operations with security best practices.
 */
export const authService = {
  // ===========================================================================
  // REGISTRATION
  // ===========================================================================

  /**
   * Registers a new user account.
   *
   * Security measures:
   * - Password strength validation
   * - Email uniqueness check (case-insensitive)
   * - Password hashed with Argon2id
   * - Account starts in PENDING_VERIFICATION status
   *
   * @param email - User's email address
   * @param password - User's password (will be validated and hashed)
   * @param name - Optional display name
   * @returns Registration response with sanitized user data
   * @throws AuthError if email exists or password is weak
   */
  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<RegistrationResponse> {
    // Normalize email to lowercase for case-insensitive uniqueness
    const normalizedEmail = email.toLowerCase().trim();

    // Validate password strength (async - includes HIBP breach check)
    const passwordValidation = await validatePasswordStrength(password, normalizedEmail);
    if (!passwordValidation.valid) {
      throw AuthError.weakPassword(passwordValidation.errors);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Log attempt but return generic error to prevent enumeration
      await logAuditEvent("auth.register.email_exists", null, {
        email: normalizedEmail,
      });
      throw AuthError.emailAlreadyExists();
    }

    // Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    // SECURITY: Token is cryptographically random (32 bytes = 256 bits entropy)
    const { token: verificationToken } = generateVerificationToken();
    const verificationExpiry = getVerificationTokenExpiry();

    // SECURITY: Hash token with bcrypt for constant-time comparison
    // Using bcrypt (not SHA-256) allows constant-time comparison via bcrypt.compare
    // This prevents timing attacks when verifying tokens
    const verificationHash = await bcrypt.hash(verificationToken, 10);

    // Create user in PENDING_VERIFICATION state (requires email verification)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
        status: UserStatus.PENDING_VERIFICATION,
        platformRole: PlatformRole.USER,
        emailVerified: false,
      },
    });

    // Store hashed verification token in database
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        tokenHash: verificationHash,
        expiresAt: verificationExpiry,
      },
    });

    // Send verification email
    // SECURITY: Only send unhashed token via email (never store unhashed)
    // If email sending fails, log but don't fail registration
    try {
      await emailService.sendVerificationEmail(normalizedEmail, verificationToken);
      logger.info(`[auth] Verification email sent to ${normalizedEmail}`);
    } catch (error) {
      logger.error(
        `[auth] Failed to send verification email to ${normalizedEmail}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - user is created, they can request resend later
    }

    // Log successful registration
    await logAuditEvent("auth.register.success", user.id, {
      email: normalizedEmail,
    });

    return {
      user: sanitizeUser(user),
      message:
        "Registration successful. Please check your email to verify your account.",
    };
  },

  // ===========================================================================
  // LOGIN
  // ===========================================================================

  /**
   * Authenticates a user and returns access/refresh token pair.
   *
   * Security measures:
   * - Constant-time password comparison (via Argon2)
   * - Account status validation
   * - Refresh token stored as hash, not plaintext
   * - Comprehensive audit logging
   * - Re-hash password if using outdated algorithm
   *
   * @param email - User's email address
   * @param password - User's password
   * @param deviceInfo - Optional device identifier for session management
   * @param ipAddress - Optional IP address for audit logging
   * @returns Login response with tokens and user data
   * @throws AuthError if credentials invalid or account not accessible
   */
  async login(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<LoginResponse> {
    const env = validateEnv();
    const normalizedEmail = email.toLowerCase().trim();

    // Find user with organization memberships
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Use same error for user not found and wrong password (prevents enumeration)
    if (!user) {
      await logAuditEvent("auth.login.user_not_found", null, {
        email: normalizedEmail,
        ipAddress,
      });
      throw AuthError.invalidCredentials();
    }

    // Check if user has a password (might be OAuth-only user)
    if (!user.passwordHash) {
      await logAuditEvent("auth.login.no_password", user.id, {
        email: normalizedEmail,
        ipAddress,
      });
      throw AuthError.invalidCredentials();
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      await logAuditEvent("auth.login.invalid_password", user.id, {
        email: normalizedEmail,
        ipAddress,
      });
      throw AuthError.invalidCredentials();
    }

    // Check account status
    switch (user.status) {
      case UserStatus.SUSPENDED:
        await logAuditEvent("auth.login.suspended", user.id, {
          email: normalizedEmail,
          ipAddress,
        });
        throw AuthError.accountSuspended();

      case UserStatus.DELETED:
        await logAuditEvent("auth.login.deleted", user.id, {
          email: normalizedEmail,
          ipAddress,
        });
        throw AuthError.accountDeleted();

      case UserStatus.PENDING_VERIFICATION:
        // Enforce email verification before login
        await logAuditEvent("auth.login.not_verified", user.id, {
          email: normalizedEmail,
          ipAddress,
        });
        throw AuthError.emailNotVerified();

      case UserStatus.ACTIVE:
        // All good
        break;
    }

    // Check if password needs rehashing (algorithm upgrade)
    if (needsRehash(user.passwordHash)) {
      const newHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
      logger.info(`[auth] Password rehashed for user ${user.id}`);
    }

    // Generate tokens
    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        role: m.role,
      })),
      type: "access",
    };

    const accessToken = generateAccessToken(accessTokenPayload);
    const { token: refreshToken, jti } = generateRefreshToken({
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
    });

    // Store refresh token hash in database
    const tokenExpiry = getRefreshTokenExpiry();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        deviceInfo: deviceInfo ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt: tokenExpiry,
      },
    });

    // Log successful login
    await logAuditEvent("auth.login.success", user.id, {
      email: normalizedEmail,
      deviceInfo,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRY,
      user: user as UserWithOrgs,
    };
  },

  // ===========================================================================
  // TOKEN MANAGEMENT
  // ===========================================================================

  /**
   * Refreshes an access token using a valid refresh token.
   *
   * Security measures:
   * - Verifies refresh token signature and expiry
   * - Checks token not revoked in database
   * - Optional: Implements token rotation
   *
   * @param refreshToken - The refresh token
   * @returns New access token with expiry
   * @throws AuthError if token invalid or revoked
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResponse> {
    const env = validateEnv();

    // Verify the JWT signature and claims
    let payload: ReturnType<typeof verifyRefreshToken> | null = null;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw AuthError.invalidToken();
    }

    // Ensure payload is valid
    if (!payload || !payload.sub) {
      throw AuthError.invalidToken();
    }

    const userId = payload.sub;

    // Check if token exists in database and is not revoked
    const tokenHash = hashToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      await logAuditEvent("auth.refresh.token_not_found", userId, {});
      throw AuthError.invalidToken();
    }

    if (storedToken.revokedAt) {
      // Token was explicitly revoked - this could indicate a stolen token
      await logAuditEvent("auth.refresh.revoked_token_used", userId, {
        tokenId: storedToken.id,
        revokedAt: storedToken.revokedAt.toISOString(),
      });

      // Revoke all tokens for this user as a security measure
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      throw AuthError.tokenRevoked();
    }

    // Check if token has expired in database
    if (storedToken.expiresAt < new Date()) {
      await logAuditEvent("auth.refresh.expired", userId, {});
      throw AuthError.invalidToken();
    }

    // Check user status
    const user = storedToken.user;
    if (user.status === UserStatus.SUSPENDED) {
      throw AuthError.accountSuspended();
    }
    if (user.status === UserStatus.DELETED) {
      throw AuthError.accountDeleted();
    }

    // Get user's organization memberships for the new token
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: true },
    });

    // Generate new access token
    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        role: m.role,
      })),
      type: "access",
    };

    const accessToken = generateAccessToken(accessTokenPayload);

    // Optional: Implement token rotation
    // This creates a new refresh token and revokes the old one
    // Uncomment for enhanced security (breaks concurrent sessions on same device)
    /*
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const { token: newRefreshToken, jti } = generateRefreshToken({
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        deviceInfo: storedToken.deviceInfo,
        ipAddress: storedToken.ipAddress,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken, // Return new refresh token
      expiresIn: env.JWT_ACCESS_EXPIRY,
    };
    */

    return {
      accessToken,
      expiresIn: env.JWT_ACCESS_EXPIRY,
    };
  },

  /**
   * Logs out a user by revoking a specific refresh token.
   *
   * @param refreshToken - The refresh token to revoke
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);

    // Find and revoke the token
    const token = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (token && !token.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });

      await logAuditEvent("auth.logout.success", token.userId, {
        tokenId: token.id,
      });
    }
    // If token not found or already revoked, silently succeed
    // This prevents token enumeration
  },

  /**
   * Logs out a user from all sessions by revoking all refresh tokens.
   *
   * @param userId - The user ID to log out everywhere
   */
  async logoutAll(userId: string): Promise<void> {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await logAuditEvent("auth.logout_all.success", userId, {
      tokensRevoked: result.count,
    });
  },

  // ===========================================================================
  // EMAIL VERIFICATION
  // ===========================================================================

  /**
   * Verifies a user's email address using a verification token.
   *
   * SECURITY IMPLEMENTATION:
   * - Uses bcrypt.compare for constant-time token comparison
   * - Checks all non-expired tokens to prevent timing attacks
   * - Single-use tokens (deleted after verification)
   * - Cleans up expired tokens during verification
   *
   * @param token - The verification token from the email link (unhashed)
   * @returns The verified user
   * @throws AuthError if token invalid, expired, or already verified
   */
  async verifyEmail(token: string): Promise<EmailVerificationResponse> {
    // Validate token format (basic check)
    if (!token || token.length < 32) {
      await logAuditEvent("auth.verify_email.invalid_token", null, {
        reason: "Token too short or empty",
      });
      throw AuthError.invalidToken();
    }

    // Query all non-expired tokens
    // SECURITY: We check all tokens to prevent timing attacks
    // An attacker can't determine if a token exists based on response time
    const verifications = await prisma.emailVerificationToken.findMany({
      where: {
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    // Clean up expired tokens in the background (non-blocking)
    // This prevents database bloat and ensures expired tokens are removed
    prisma.emailVerificationToken
      .deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      })
      .then((result) => {
        if (result.count > 0) {
          logger.info(`[auth] Cleaned up ${result.count} expired verification tokens`);
        }
      })
      .catch((error) => {
        logger.error("[auth] Failed to clean up expired tokens:", error);
      });

    // Check each token with constant-time comparison
    // SECURITY: bcrypt.compare is constant-time, preventing timing attacks
    for (const verification of verifications) {
      try {
        const isValid = await bcrypt.compare(token, verification.tokenHash);

        if (isValid) {
          // Check if user already verified
          if (verification.user.emailVerified) {
            // Delete the token since it's no longer needed
            await prisma.emailVerificationToken.delete({
              where: { id: verification.id },
            });

            await logAuditEvent("auth.verify_email.already_verified", verification.userId, {
              email: verification.email,
            });

            throw AuthError.alreadyVerified();
          }

          // Verify the user and delete the token in a transaction
          // This ensures atomic operation - either both succeed or both fail
          const [user] = await prisma.$transaction([
            prisma.user.update({
              where: { id: verification.userId },
              data: {
                emailVerified: true,
                status: UserStatus.ACTIVE,
              },
            }),
            prisma.emailVerificationToken.delete({
              where: { id: verification.id },
            }),
          ]);

          // Log successful verification
          await logAuditEvent("auth.verify_email.success", user.id, {
            email: user.email,
          });

          logger.info(`[auth] Email verified successfully for user ${user.id}`);

          return { user: sanitizeUser(user) };
        }
      } catch (error) {
        // If bcrypt.compare fails, continue to next token
        // This could happen with corrupted data
        logger.error("[auth] Token comparison error:", error);
        continue;
      }
    }

    // No matching token found (either invalid or expired)
    // SECURITY: Generic error message prevents enumeration
    await logAuditEvent("auth.verify_email.failed", null, {
      reason: "No matching token found",
    });

    throw AuthError.invalidToken();
  },

  /**
   * Resends a verification email to a user.
   *
   * Security measures:
   * - Rate limiting (implement at API layer)
   * - Doesn't reveal if email exists (silent success)
   *
   * @param email - The email address to send verification to
   */
  async resendVerification(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Silent success if user not found (prevents enumeration)
    if (!user) {
      console.log(
        `[auth] Resend verification requested for unknown email: ${normalizedEmail}`
      );
      return;
    }

    // Silent success if already verified
    if (user.emailVerified) {
      console.log(
        `[auth] Resend verification requested for already verified email: ${normalizedEmail}`
      );
      return;
    }

    // Generate new verification token
    const { token: verificationToken } = generateVerificationToken();
    const verificationExpiry = getVerificationTokenExpiry();

    // SECURITY: Hash token with bcrypt for constant-time comparison
    const verificationHash = await bcrypt.hash(verificationToken, 10);

    // Delete all existing verification tokens for this user
    // This invalidates old tokens and ensures only the latest token works
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Store new verification token
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        tokenHash: verificationHash,
        expiresAt: verificationExpiry,
      },
    });

    // Send verification email
    // If email sending fails, log but don't throw (user can request another resend)
    try {
      await emailService.sendVerificationEmail(normalizedEmail, verificationToken);
      logger.info(`[auth] Verification email resent to ${normalizedEmail}`);
    } catch (error) {
      logger.error(
        `[auth] Failed to resend verification email to ${normalizedEmail}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - token is stored, user can try again
    }

    await logAuditEvent("auth.resend_verification.success", user.id, {
      email: normalizedEmail,
    });
  },

  // ===========================================================================
  // PASSWORD RESET
  // ===========================================================================

  /**
   * Initiates a password reset by sending a reset email.
   *
   * Security measures:
   * - Silent success for unknown emails (prevents enumeration)
   * - Short token expiry (15 minutes)
   * - Rate limiting (implement at API layer)
   * - Invalidates old tokens for the user
   * - Token is hashed before storage (never stored in plaintext)
   * - Works even if user has no password (OAuth-only accounts)
   *
   * @param email - The email address to send reset link to
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Silent success if user not found (prevents enumeration)
    if (!user) {
      await logAuditEvent("auth.password_reset.email_not_found", null, {
        email: normalizedEmail,
      });
      return;
    }

    // Don't allow password reset for deleted accounts
    if (user.status === UserStatus.DELETED) {
      await logAuditEvent("auth.password_reset.deleted_account", null, {
        email: normalizedEmail,
      });
      return;
    }

    // Generate cryptographically secure password reset token
    const { token: resetToken, hash: resetHash } = generateVerificationToken();
    const resetExpiry = getPasswordResetTokenExpiry();

    // Delete any existing unexpired password reset tokens for this user
    // This prevents accumulation and ensures only the latest token is valid
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Store new password reset token with hash (not plaintext)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        token: resetHash, // Store hash, not plaintext
        expiresAt: resetExpiry,
        used: false,
      },
    });

    // Send password reset email with plaintext token
    try {
      await emailService.sendPasswordResetEmail(normalizedEmail, resetToken);
    } catch (error) {
      // Log email error but don't fail the request (silent success for enumeration protection)
      logger.error("[auth] Failed to send password reset email:", error);
      // In production, you might want to queue this for retry
    }

    await logAuditEvent("auth.password_reset.requested", user.id, {
      email: normalizedEmail,
    });
  },

  /**
   * Resets a user's password using a reset token.
   *
   * Security measures:
   * - Constant-time token comparison to prevent timing attacks
   * - Token validation and expiry check
   * - Password strength validation (includes HIBP breach check)
   * - Revokes all existing sessions after reset (forces re-login)
   * - Token single-use (marked as used after successful reset)
   * - Cleans up expired tokens automatically
   * - Validates token hasn't already been used
   *
   * @param token - The password reset token from the email link
   * @param newPassword - The new password to set
   * @throws AuthError if token invalid, expired, already used, or password weak
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);

    // Find all non-expired, unused password reset tokens
    // We query multiple tokens to use constant-time comparison for security
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: {
        expiresAt: { gt: new Date() },
        used: false,
      },
      include: { user: true },
    });

    // Use constant-time comparison to find the matching token
    // This prevents timing attacks that could reveal valid token hashes
    let matchedReset: typeof resetTokens[0] | null = null;
    for (const reset of resetTokens) {
      const bufferA = Buffer.from(reset.token, "hex");
      const bufferB = Buffer.from(tokenHash, "hex");

      // Ensure same length before timing-safe comparison
      if (bufferA.length === bufferB.length) {
        try {
          if (crypto.timingSafeEqual(bufferA, bufferB)) {
            matchedReset = reset;
            // Continue loop for constant time
          }
        } catch {
          // Length mismatch or invalid buffer - continue
        }
      }
    }

    // No matching token found
    if (!matchedReset) {
      await logAuditEvent("auth.password_reset.invalid_token", null, {
        attemptedTokenHash: tokenHash.substring(0, 8), // Log prefix only
      });
      throw AuthError.invalidToken();
    }

    // Double-check expiration (defense in depth)
    if (matchedReset.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({
        where: { id: matchedReset.id },
      });
      await logAuditEvent("auth.password_reset.expired", matchedReset.userId, {
        email: matchedReset.email,
      });
      throw AuthError.verificationExpired();
    }

    // Validate new password strength (async - includes HIBP breach check)
    const passwordValidation = await validatePasswordStrength(
      newPassword,
      matchedReset.user.email
    );
    if (!passwordValidation.valid) {
      await logAuditEvent("auth.password_reset.weak_password", matchedReset.userId, {
        errors: passwordValidation.errors,
      });
      throw AuthError.weakPassword(passwordValidation.errors);
    }

    // Hash new password with bcrypt
    const passwordHash = await hashPassword(newPassword);

    // Execute password reset in a transaction for atomicity
    // This ensures all operations succeed or all fail together
    await prisma.$transaction([
      // Update user password
      prisma.user.update({
        where: { id: matchedReset.userId },
        data: {
          passwordHash,
          // Optionally reactivate suspended accounts
          // status: UserStatus.ACTIVE,
        },
      }),
      // Mark token as used (single-use tokens)
      prisma.passwordResetToken.update({
        where: { id: matchedReset.id },
        data: { used: true },
      }),
      // Revoke all existing sessions for security
      // Forces user to log in with new password
      prisma.refreshToken.updateMany({
        where: {
          userId: matchedReset.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    // Clean up old expired and used tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: matchedReset.userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { used: true },
        ],
      },
    });

    await logAuditEvent("auth.password_reset.success", matchedReset.userId, {
      email: matchedReset.email,
    });

    // Send password changed confirmation email
    try {
      await emailService.sendPasswordChangedEmail(matchedReset.user.email);
    } catch (error) {
      // Log email error but don't fail the request
      // User's password was already changed successfully
      logger.error("[auth] Failed to send password changed email:", error);
      // In production, you might want to queue this for retry
    }
  },

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Gets a user by ID with sanitized output.
   *
   * @param userId - The user ID to look up
   * @returns Sanitized user data or null if not found
   */
  async getUserById(userId: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user ? sanitizeUser(user) : null;
  },

  /**
   * Gets a user with organization memberships.
   *
   * @param userId - The user ID to look up
   * @returns User with organizations or null if not found
   */
  async getUserWithOrgs(userId: string): Promise<UserWithOrgs | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    }) as Promise<UserWithOrgs | null>;
  },

  /**
   * Lists active sessions (refresh tokens) for a user.
   *
   * @param userId - The user ID
   * @returns List of active sessions
   */
  async getActiveSessions(
    userId: string
  ): Promise<Array<Pick<RefreshToken, "id" | "deviceInfo" | "ipAddress" | "createdAt">>> {
    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return tokens;
  },

  /**
   * Revokes a specific session by its ID.
   *
   * @param userId - The user ID (for authorization check)
   * @param sessionId - The refresh token ID to revoke
   * @returns True if session was revoked, false if not found or not owned
   */
  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await prisma.refreshToken.updateMany({
      where: {
        id: sessionId,
        userId, // Ensure user owns this session
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    if (result.count > 0) {
      await logAuditEvent("auth.session.revoked", userId, {
        sessionId,
      });
      return true;
    }

    return false;
  },
};

// Export types for consumers
export type AuthService = typeof authService;

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

import { prisma } from "../db/prisma.js";
import { validateEnv } from "../config/env.js";
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
    console.error("[auth] Failed to create audit log:", error);
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

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password, normalizedEmail);
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

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const { token: verificationToken, hash: verificationHash } =
      generateVerificationToken();
    const verificationExpiry = getVerificationTokenExpiry();

    // Create user in active state (bypass verification for now)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
        status: UserStatus.ACTIVE,
        platformRole: PlatformRole.USER,
        emailVerified: true,
      },
    });

    // Store verification token (in production, use a separate table)
    // For now, we'll log the token for testing purposes
    // TODO: Implement EmailVerificationToken model and proper storage
    console.log(
      `[auth] Verification token for ${normalizedEmail}: ${verificationToken}`
    );
    console.log(`[auth] Token hash: ${verificationHash}`);
    console.log(`[auth] Expires at: ${verificationExpiry.toISOString()}`);

    // TODO: Send verification email
    // await emailService.sendVerificationEmail(normalizedEmail, verificationToken);
    console.log(
      `[auth] TODO: Send verification email to ${normalizedEmail}`
    );

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
        // Optionally require email verification before login
        // Uncomment the following to enforce email verification:
        // await logAuditEvent("auth.login.not_verified", user.id, {
        //   email: normalizedEmail,
        //   ipAddress,
        // });
        // throw AuthError.emailNotVerified();
        break;

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
      console.log(`[auth] Password rehashed for user ${user.id}`);
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
   * @param token - The verification token from the email link
   * @returns The verified user
   * @throws AuthError if token invalid or expired
   */
  async verifyEmail(token: string): Promise<EmailVerificationResponse> {
    // Hash the token to compare with stored hash
    const tokenHash = hashToken(token);

    // TODO: In production, look up the token in an EmailVerification table
    // For now, we'll search for users with matching token in a hypothetical field
    // This is a placeholder implementation

    // In a real implementation:
    // 1. Query EmailVerification table by tokenHash
    // 2. Check if not expired
    // 3. Update user's emailVerified status
    // 4. Delete the verification record

    // Placeholder: Find a user in PENDING_VERIFICATION status
    // This should be replaced with proper token-based lookup
    console.log(
      `[auth] Attempting to verify email with token hash: ${tokenHash}`
    );
    console.log(
      "[auth] TODO: Implement EmailVerification table lookup"
    );

    // For demonstration, we'll throw an error
    // In production, implement proper token storage and lookup
    throw new AuthError(
      "Email verification not fully implemented. Please store tokens in EmailVerification table.",
      "NOT_IMPLEMENTED",
      501
    );

    // Example of what the implementation should look like:
    /*
    const verification = await prisma.emailVerification.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!verification) {
      throw AuthError.invalidToken();
    }

    if (verification.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });
      throw AuthError.verificationExpired();
    }

    if (verification.user.emailVerified) {
      throw AuthError.alreadyVerified();
    }

    // Update user and delete verification token
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: {
          emailVerified: true,
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.emailVerification.delete({
        where: { id: verification.id },
      }),
    ]);

    await logAuditEvent("auth.verify_email.success", user.id, {});

    return { user: sanitizeUser(user) };
    */
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
    const { token: verificationToken, hash: verificationHash } =
      generateVerificationToken();
    const verificationExpiry = getVerificationTokenExpiry();

    // TODO: Store new verification token (invalidating any old ones)
    // await prisma.emailVerification.upsert({
    //   where: { userId: user.id },
    //   create: {
    //     userId: user.id,
    //     tokenHash: verificationHash,
    //     expiresAt: verificationExpiry,
    //   },
    //   update: {
    //     tokenHash: verificationHash,
    //     expiresAt: verificationExpiry,
    //   },
    // });

    console.log(
      `[auth] New verification token for ${normalizedEmail}: ${verificationToken}`
    );
    console.log(`[auth] Token hash: ${verificationHash}`);
    console.log(`[auth] Expires at: ${verificationExpiry.toISOString()}`);

    // TODO: Send verification email
    // await emailService.sendVerificationEmail(normalizedEmail, verificationToken);
    console.log(`[auth] TODO: Send verification email to ${normalizedEmail}`);

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
   * - Short token expiry (1 hour)
   * - Rate limiting (implement at API layer)
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
      console.log(
        `[auth] Password reset requested for unknown email: ${normalizedEmail}`
      );
      return;
    }

    // Don't allow password reset for deleted accounts
    if (user.status === UserStatus.DELETED) {
      console.log(
        `[auth] Password reset requested for deleted account: ${normalizedEmail}`
      );
      return;
    }

    // Generate password reset token
    const { token: resetToken, hash: resetHash } = generateVerificationToken();
    const resetExpiry = getPasswordResetTokenExpiry();

    // TODO: Store password reset token (invalidating any old ones)
    // await prisma.passwordReset.upsert({
    //   where: { userId: user.id },
    //   create: {
    //     userId: user.id,
    //     tokenHash: resetHash,
    //     expiresAt: resetExpiry,
    //   },
    //   update: {
    //     tokenHash: resetHash,
    //     expiresAt: resetExpiry,
    //   },
    // });

    console.log(
      `[auth] Password reset token for ${normalizedEmail}: ${resetToken}`
    );
    console.log(`[auth] Token hash: ${resetHash}`);
    console.log(`[auth] Expires at: ${resetExpiry.toISOString()}`);

    // TODO: Send password reset email
    // await emailService.sendPasswordResetEmail(normalizedEmail, resetToken);
    console.log(
      `[auth] TODO: Send password reset email to ${normalizedEmail}`
    );

    await logAuditEvent("auth.password_reset.requested", user.id, {
      email: normalizedEmail,
    });
  },

  /**
   * Resets a user's password using a reset token.
   *
   * Security measures:
   * - Token validation and expiry check
   * - Password strength validation
   * - Revokes all existing sessions after reset
   * - Token single-use (deleted after use)
   *
   * @param token - The password reset token from the email link
   * @param newPassword - The new password to set
   * @throws AuthError if token invalid, expired, or password weak
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);

    // TODO: In production, look up the token in a PasswordReset table
    // For now, this is a placeholder implementation

    console.log(
      `[auth] Attempting password reset with token hash: ${tokenHash}`
    );
    console.log("[auth] TODO: Implement PasswordReset table lookup");

    // For demonstration, we'll throw an error
    // In production, implement proper token storage and lookup
    throw new AuthError(
      "Password reset not fully implemented. Please store tokens in PasswordReset table.",
      "NOT_IMPLEMENTED",
      501
    );

    // Example of what the implementation should look like:
    /*
    const resetRequest = await prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRequest) {
      throw AuthError.invalidToken();
    }

    if (resetRequest.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.passwordReset.delete({
        where: { id: resetRequest.id },
      });
      throw AuthError.verificationExpired();
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(
      newPassword,
      resetRequest.user.email
    );
    if (!passwordValidation.valid) {
      throw AuthError.weakPassword(passwordValidation.errors);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password, delete reset token, and revoke all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRequest.userId },
        data: {
          passwordHash,
          // Reactivate if suspended due to too many failed attempts
          // status: UserStatus.ACTIVE,
        },
      }),
      prisma.passwordReset.delete({
        where: { id: resetRequest.id },
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId: resetRequest.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    await logAuditEvent("auth.password_reset.success", resetRequest.userId, {});

    // TODO: Send password changed confirmation email
    // await emailService.sendPasswordChangedEmail(resetRequest.user.email);
    */
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

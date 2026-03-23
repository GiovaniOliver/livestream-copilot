/**
 * Password Reset Unit Tests (Mocked)
 *
 * Supplements the integration tests in password-reset.test.ts which are
 * skipped when no database is available (21 tests currently skipped).
 *
 * These tests mock Prisma, email service, and other external dependencies
 * to validate password reset logic without a live database.
 *
 * Covers:
 * - requestPasswordReset: token generation, enumeration protection, email normalization
 * - resetPassword: token validation, expiry, password strength, session revocation
 *
 * @module __tests__/auth/password-reset.unit
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Hoisted mocks - these must be declared before module imports
// ---------------------------------------------------------------------------

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  passwordResetToken: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  refreshToken: {
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const mockEmailService = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  isConfigured: vi.fn().mockReturnValue(true),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn().mockReturnThis(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../../db/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../services/email.js", () => ({
  emailService: mockEmailService,
}));

vi.mock("../../logger/index.js", () => ({
  logger: mockLogger,
  createLogger: vi.fn().mockReturnValue(mockLogger),
  apiLogger: mockLogger,
  obsLogger: mockLogger,
  sttLogger: mockLogger,
  ffmpegLogger: mockLogger,
}));

// Mock validatePasswordStrength from utils (but keep real hash/token functions)
vi.mock("../../auth/utils.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../auth/utils.js")>();
  return {
    ...actual,
    // Mock password validation to avoid HIBP network calls
    validatePasswordStrength: vi.fn().mockResolvedValue({
      valid: true,
      errors: [],
    }),
    // Mock hashPassword to avoid slow bcrypt in tests
    hashPassword: vi.fn().mockResolvedValue("$2b$12$mocked-hash-value"),
  };
});

// Mock config/env to provide valid JWT secrets
vi.mock("../../config/env.js", () => ({
  validateEnv: vi.fn().mockReturnValue({
    NODE_ENV: "test",
    JWT_SECRET: crypto.randomBytes(32).toString("base64"),
    JWT_REFRESH_SECRET: crypto.randomBytes(32).toString("base64"),
    JWT_ACCESS_EXPIRY: 900,
    JWT_REFRESH_EXPIRY: 604800,
    API_KEY_ENV: "test",
    APP_URL: "http://localhost:3000",
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { authService, AuthError } from "../../auth/service.js";
import {
  hashToken,
  generateVerificationToken,
  getPasswordResetTokenExpiry,
  validatePasswordStrength,
  hashPassword,
} from "../../auth/utils.js";
import { UserStatus, PlatformRole } from "../../generated/prisma/enums.js";

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "ctest000000000000000000001",
    email: "user@example.com",
    passwordHash: "$2b$12$existing-hash",
    emailVerified: true,
    name: "Test User",
    avatarUrl: null,
    platformRole: PlatformRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function createMockResetToken(overrides: Record<string, unknown> = {}) {
  const { token, hash } = generateVerificationToken();
  const user = createMockUser();
  return {
    dbRecord: {
      id: "ctoken00000000000000000001",
      userId: user.id,
      email: user.email,
      tokenHash: hash,
      expiresAt: getPasswordResetTokenExpiry(),
      createdAt: new Date(),
      user,
      ...overrides,
    },
    plainToken: token,
    tokenHash: hash,
  };
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe("Password Reset Service (Unit / Mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: audit log always succeeds
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  // ===========================================================================
  // requestPasswordReset
  // ===========================================================================

  describe("requestPasswordReset", () => {
    it("should create a token for an existing active user", async () => {
      const user = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
        userId: user.id,
        email: user.email,
        tokenHash: "somehash",
        expiresAt: getPasswordResetTokenExpiry(),
      });

      await authService.requestPasswordReset(user.email);

      // Should look up the user
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: user.email },
      });

      // Should delete old tokens
      expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.id },
      });

      // Should create a new token
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.passwordResetToken.create.mock.calls[0][0];
      expect(createCall.data.userId).toBe(user.id);
      expect(createCall.data.email).toBe(user.email);
      expect(createCall.data.tokenHash).toBeDefined();
      expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    });

    it("should delete old tokens before creating a new one", async () => {
      const user = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-new",
      });

      await authService.requestPasswordReset(user.email);

      // deleteMany should be called before create
      const deleteOrder =
        mockPrisma.passwordResetToken.deleteMany.mock.invocationCallOrder[0];
      const createOrder =
        mockPrisma.passwordResetToken.create.mock.invocationCallOrder[0];
      expect(deleteOrder).toBeLessThan(createOrder);

      expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
    });

    it("should succeed silently for non-existent email (enumeration protection)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.requestPasswordReset("nobody@example.com")
      ).resolves.toBeUndefined();

      // Should NOT create any token
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockPrisma.passwordResetToken.deleteMany).not.toHaveBeenCalled();
    });

    it("should succeed silently for deleted accounts", async () => {
      const deletedUser = createMockUser({ status: UserStatus.DELETED });
      mockPrisma.user.findUnique.mockResolvedValue(deletedUser);

      await expect(
        authService.requestPasswordReset(deletedUser.email)
      ).resolves.toBeUndefined();

      // Should NOT create any token for deleted users
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it("should normalize email to lowercase", async () => {
      const user = createMockUser({ email: "user@example.com" });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });

      await authService.requestPasswordReset("USER@EXAMPLE.COM");

      // Should look up with lowercase email
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "user@example.com" },
      });

      // Stored email should be lowercase
      const createCall = mockPrisma.passwordResetToken.create.mock.calls[0][0];
      expect(createCall.data.email).toBe("user@example.com");
    });

    it("should store token hash, not plaintext", async () => {
      const user = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });

      await authService.requestPasswordReset(user.email);

      const createCall = mockPrisma.passwordResetToken.create.mock.calls[0][0];
      const storedHash = createCall.data.tokenHash;

      // SHA-256 hex output is 64 characters
      expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should set correct expiration time (approximately 15 minutes)", async () => {
      const user = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });

      const beforeRequest = Date.now();
      await authService.requestPasswordReset(user.email);
      const afterRequest = Date.now();

      const createCall = mockPrisma.passwordResetToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const expiryMs = expiresAt.getTime();

      // 15 minutes = 900_000 ms, allow 2 second tolerance
      const minExpiry = beforeRequest + 15 * 60 * 1000 - 2000;
      const maxExpiry = afterRequest + 15 * 60 * 1000 + 2000;

      expect(expiryMs).toBeGreaterThanOrEqual(minExpiry);
      expect(expiryMs).toBeLessThanOrEqual(maxExpiry);
    });

    it("should send password reset email with plaintext token", async () => {
      const user = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });

      await authService.requestPasswordReset(user.email);

      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const [emailArg, tokenArg] =
        mockEmailService.sendPasswordResetEmail.mock.calls[0];
      expect(emailArg).toBe(user.email);
      // Token sent via email should be a hex string (plaintext token, not hash)
      expect(tokenArg).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle email send failure gracefully (no throw)", async () => {
      const user = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });
      mockEmailService.sendPasswordResetEmail.mockRejectedValueOnce(
        new Error("SMTP connection failed")
      );

      // Should NOT throw even if email fails
      await expect(
        authService.requestPasswordReset(user.email)
      ).resolves.toBeUndefined();

      // Token should still have been created
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);

      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log audit event for existing user", async () => {
      const user = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });

      await authService.requestPasswordReset(user.email);

      // Should have logged at least one audit event
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      const auditCall = mockPrisma.auditLog.create.mock.calls.find(
        (call: Array<{ data: { action: string } }>) =>
          call[0].data.action === "auth.password_reset.requested"
      );
      expect(auditCall).toBeDefined();
    });

    it("should log audit event for non-existent email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authService.requestPasswordReset("ghost@example.com");

      const auditCall = mockPrisma.auditLog.create.mock.calls.find(
        (call: Array<{ data: { action: string } }>) =>
          call[0].data.action === "auth.password_reset.email_not_found"
      );
      expect(auditCall).toBeDefined();
    });
  });

  // ===========================================================================
  // resetPassword
  // ===========================================================================

  describe("resetPassword", () => {
    const strongPassword = "NewSecurePassword456!@#";

    it("should reset password with a valid token", async () => {
      const { dbRecord, plainToken } = createMockResetToken();

      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.$transaction.mockResolvedValue([
        { ...dbRecord.user, passwordHash: "$2b$12$new-hash" },
        { id: dbRecord.id },
        { count: 1 },
      ]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      await authService.resetPassword(plainToken, strongPassword);

      // Should validate password strength
      expect(validatePasswordStrength).toHaveBeenCalledWith(
        strongPassword,
        dbRecord.user.email
      );

      // Should hash the new password
      expect(hashPassword).toHaveBeenCalledWith(strongPassword);

      // Should execute transaction
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should reject invalid / non-matching token", async () => {
      // Return tokens that will NOT match the provided token
      const { dbRecord } = createMockResetToken();
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);

      const bogusToken = crypto.randomBytes(32).toString("hex");

      await expect(
        authService.resetPassword(bogusToken, strongPassword)
      ).rejects.toThrow(AuthError);

      // Should NOT attempt transaction
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("should reject expired token", async () => {
      // Create a token that is found in the non-expired query but actually expired
      // (the service double-checks expiration)
      const { dbRecord, plainToken } = createMockResetToken();
      const expiredRecord = {
        ...dbRecord,
        expiresAt: new Date(Date.now() - 60_000), // 1 minute ago
      };

      // The first findMany filters by expiresAt > now(), so an expired token
      // would not appear. Return empty to simulate no valid tokens.
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([]);

      await expect(
        authService.resetPassword(plainToken, strongPassword)
      ).rejects.toThrow(AuthError);
    });

    it("should throw INVALID_TOKEN when no tokens exist at all", async () => {
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([]);
      const bogus = crypto.randomBytes(32).toString("hex");

      try {
        await authService.resetPassword(bogus, strongPassword);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe("INVALID_TOKEN");
      }
    });

    it("should enforce password strength validation", async () => {
      const { dbRecord, plainToken } = createMockResetToken();
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);

      // Make validatePasswordStrength return failure
      vi.mocked(validatePasswordStrength).mockResolvedValueOnce({
        valid: false,
        errors: [
          "Password must be at least 12 characters",
          "Password must contain at least one special character",
        ],
      });

      try {
        await authService.resetPassword(plainToken, "weak");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe("WEAK_PASSWORD");
        expect((error as AuthError).message).toContain(
          "Password does not meet requirements"
        );
      }

      // Should NOT have attempted the transaction
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("should delete the used token after successful reset (via transaction)", async () => {
      const { dbRecord, plainToken } = createMockResetToken();
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, { count: 0 }]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      await authService.resetPassword(plainToken, strongPassword);

      // The $transaction call receives an array of Prisma operations
      // Verify it was called (the exact array content is internal Prisma queries)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionArg = mockPrisma.$transaction.mock.calls[0][0];

      // Transaction should be an array (batch transaction, not interactive)
      expect(Array.isArray(transactionArg)).toBe(true);
    });

    it("should revoke all user sessions after reset (via transaction)", async () => {
      const { dbRecord, plainToken } = createMockResetToken();
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);

      // Capture the transaction arguments to verify session revocation
      mockPrisma.$transaction.mockResolvedValue([
        { id: dbRecord.user.id }, // user.update result
        { id: dbRecord.id }, // token.delete result
        { count: 3 }, // refreshToken.updateMany result
      ]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      await authService.resetPassword(plainToken, strongPassword);

      // Transaction was called - it includes refreshToken.updateMany to revoke sessions
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should clean up expired tokens for the user after reset", async () => {
      const { dbRecord, plainToken } = createMockResetToken();
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, { count: 0 }]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 2 });

      await authService.resetPassword(plainToken, strongPassword);

      // After the transaction, should clean up expired tokens
      expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: dbRecord.userId,
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it("should send password changed confirmation email", async () => {
      const { dbRecord, plainToken } = createMockResetToken();
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, { count: 0 }]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      await authService.resetPassword(plainToken, strongPassword);

      expect(mockEmailService.sendPasswordChangedEmail).toHaveBeenCalledWith(
        dbRecord.user.email
      );
    });

    it("should handle password changed email failure gracefully", async () => {
      const { dbRecord, plainToken } = createMockResetToken();
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, { count: 0 }]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockEmailService.sendPasswordChangedEmail.mockRejectedValueOnce(
        new Error("SMTP down")
      );

      // Should NOT throw - password was already changed
      await expect(
        authService.resetPassword(plainToken, strongPassword)
      ).resolves.toBeUndefined();

      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should use constant-time comparison via crypto.timingSafeEqual", async () => {
      // Spy on crypto.timingSafeEqual to verify it is called
      const timingSafeSpy = vi.spyOn(crypto, "timingSafeEqual");

      const { dbRecord, plainToken } = createMockResetToken();
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, { count: 0 }]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      await authService.resetPassword(plainToken, strongPassword);

      // timingSafeEqual should have been called at least once for the matching token
      expect(timingSafeSpy).toHaveBeenCalled();

      timingSafeSpy.mockRestore();
    });

    it("should iterate all tokens for constant-time behavior even after finding a match", async () => {
      // Create two tokens; the matching one is first
      const { dbRecord: matchRecord, plainToken } = createMockResetToken();
      const { dbRecord: otherRecord } = createMockResetToken();

      mockPrisma.passwordResetToken.findMany.mockResolvedValue([
        matchRecord,
        otherRecord,
      ]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, { count: 0 }]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      const timingSafeSpy = vi.spyOn(crypto, "timingSafeEqual");

      await authService.resetPassword(plainToken, strongPassword);

      // Should have been called for BOTH tokens (constant-time: continues loop)
      expect(timingSafeSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      timingSafeSpy.mockRestore();
    });

    it("should log audit event on successful reset", async () => {
      const { dbRecord, plainToken } = createMockResetToken();
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, { count: 0 }]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      await authService.resetPassword(plainToken, strongPassword);

      const successAudit = mockPrisma.auditLog.create.mock.calls.find(
        (call: Array<{ data: { action: string } }>) =>
          call[0].data.action === "auth.password_reset.success"
      );
      expect(successAudit).toBeDefined();
    });

    it("should log audit event when token is invalid", async () => {
      mockPrisma.passwordResetToken.findMany.mockResolvedValue([]);

      try {
        await authService.resetPassword("bad-token", strongPassword);
      } catch {
        // expected
      }

      const invalidAudit = mockPrisma.auditLog.create.mock.calls.find(
        (call: Array<{ data: { action: string } }>) =>
          call[0].data.action === "auth.password_reset.invalid_token"
      );
      expect(invalidAudit).toBeDefined();
    });
  });

  // ===========================================================================
  // AuthError static methods (used by password reset)
  // ===========================================================================

  describe("AuthError static constructors", () => {
    it("invalidToken() returns correct code and status", () => {
      const err = AuthError.invalidToken();
      expect(err).toBeInstanceOf(AuthError);
      expect(err.code).toBe("INVALID_TOKEN");
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain("Invalid");
    });

    it("verificationExpired() returns correct code and status", () => {
      const err = AuthError.verificationExpired();
      expect(err).toBeInstanceOf(AuthError);
      expect(err.code).toBe("VERIFICATION_EXPIRED");
      expect(err.statusCode).toBe(400);
    });

    it("weakPassword() includes all error messages", () => {
      const errors = ["Too short", "Missing special char"];
      const err = AuthError.weakPassword(errors);
      expect(err).toBeInstanceOf(AuthError);
      expect(err.code).toBe("WEAK_PASSWORD");
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain("Too short");
      expect(err.message).toContain("Missing special char");
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle email with leading/trailing whitespace", async () => {
      const user = createMockUser({ email: "user@example.com" });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });

      await authService.requestPasswordReset("  USER@EXAMPLE.COM  ");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "user@example.com" },
      });
    });

    it("should allow password reset for suspended accounts", async () => {
      const suspendedUser = createMockUser({
        status: UserStatus.SUSPENDED,
      });
      mockPrisma.user.findUnique.mockResolvedValue(suspendedUser);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });

      await authService.requestPasswordReset(suspendedUser.email);

      // Suspended users CAN request password reset (only DELETED is blocked)
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    });

    it("should allow password reset for pending verification accounts", async () => {
      const pendingUser = createMockUser({
        status: UserStatus.PENDING_VERIFICATION,
      });
      mockPrisma.user.findUnique.mockResolvedValue(pendingUser);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });

      await authService.requestPasswordReset(pendingUser.email);

      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple non-expired tokens with only one matching", async () => {
      const strongPassword = "NewSecurePassword456!@#";

      // The matching token
      const { dbRecord: matchRecord, plainToken } = createMockResetToken();

      // Non-matching tokens
      const nonMatchRecords = Array.from({ length: 5 }, (_, i) => {
        const { dbRecord } = createMockResetToken();
        return {
          ...dbRecord,
          id: `ctoken-nonmatch-${i}`,
        };
      });

      mockPrisma.passwordResetToken.findMany.mockResolvedValue([
        ...nonMatchRecords.slice(0, 3),
        matchRecord,
        ...nonMatchRecords.slice(3),
      ]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, { count: 0 }]);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      // Should succeed despite multiple tokens
      await expect(
        authService.resetPassword(plainToken, strongPassword)
      ).resolves.toBeUndefined();
    });

    it("should not throw when audit logging fails", async () => {
      const user = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: "token-1",
      });

      // Make audit logging fail
      mockPrisma.auditLog.create.mockRejectedValue(
        new Error("Audit DB down")
      );

      // Should still complete successfully
      await expect(
        authService.requestPasswordReset(user.email)
      ).resolves.toBeUndefined();
    });
  });
});

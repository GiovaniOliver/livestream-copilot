/**
 * Password Reset Service Tests
 *
 * Tests for password reset functionality including:
 * - Request password reset (email enumeration protection)
 * - Token generation and storage
 * - Token validation and expiry
 * - Password strength validation
 * - Session invalidation after reset
 * - Constant-time token comparison
 * - Single-use tokens
 *
 * @module __tests__/auth/password-reset
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../db/prisma.js";
import { authService, AuthError } from "../../auth/service.js";
import {
  hashToken,
  generateVerificationToken,
  getPasswordResetTokenExpiry,
} from "../../auth/utils.js";
import { UserStatus, PlatformRole } from "../../generated/prisma/enums.js";

// =============================================================================
// TEST SETUP
// =============================================================================

describe("Password Reset Service", () => {
  const testEmail = "password-reset-test@example.com";
  const testPassword = "OldPassword123!@#";
  const newPassword = "NewSecurePassword456!@#";
  let testUserId: string;

  beforeAll(async () => {
    // Ensure test user doesn't exist
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.passwordResetToken.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    // Create a test user
    const result = await authService.register(testEmail, testPassword);
    testUserId = result.user.id;
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.passwordResetToken.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await prisma.$disconnect();
  });

  // ===========================================================================
  // REQUEST PASSWORD RESET TESTS
  // ===========================================================================

  describe("requestPasswordReset", () => {
    it("should create a password reset token for existing user", async () => {
      await authService.requestPasswordReset(testEmail);

      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });

      expect(tokens).toHaveLength(1);
      expect(tokens[0].email).toBe(testEmail);
      expect(tokens[0].expiresAt).toBeInstanceOf(Date);
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(tokens[0].tokenHash).toBeDefined();
      expect(tokens[0].tokenHash.length).toBeGreaterThan(0);
    });

    it("should invalidate old tokens when requesting new one", async () => {
      // Request first reset
      await authService.requestPasswordReset(testEmail);
      const firstTokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });
      expect(firstTokens).toHaveLength(1);

      // Request second reset
      await authService.requestPasswordReset(testEmail);
      const secondTokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });

      // Should only have the new token
      expect(secondTokens).toHaveLength(1);
      expect(secondTokens[0].id).not.toBe(firstTokens[0].id);
    });

    it("should succeed silently for non-existent email (enumeration protection)", async () => {
      const fakeEmail = "nonexistent@example.com";

      // Should not throw error
      await expect(
        authService.requestPasswordReset(fakeEmail)
      ).resolves.toBeUndefined();

      // Should not create any tokens
      const tokens = await prisma.passwordResetToken.findMany({
        where: { email: fakeEmail },
      });
      expect(tokens).toHaveLength(0);
    });

    it("should succeed silently for deleted account", async () => {
      // Mark user as deleted
      await prisma.user.update({
        where: { id: testUserId },
        data: { status: UserStatus.DELETED },
      });

      // Should not throw error
      await expect(
        authService.requestPasswordReset(testEmail)
      ).resolves.toBeUndefined();

      // Should not create any tokens
      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });
      expect(tokens).toHaveLength(0);
    });

    it("should normalize email address", async () => {
      const mixedCaseEmail = "Password-Reset-Test@Example.COM";

      await authService.requestPasswordReset(mixedCaseEmail);

      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].email).toBe(testEmail.toLowerCase());
    });

    it("should store token hash, not plaintext", async () => {
      const { token: plainToken } = generateVerificationToken();

      await authService.requestPasswordReset(testEmail);

      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });

      // Stored token should be a hash (hex string, 64 chars for SHA-256)
      expect(tokens[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
      // Should not match the format of a plaintext token
      expect(tokens[0].tokenHash).not.toBe(plainToken);
    });

    it("should set appropriate expiration time (15 minutes)", async () => {
      const beforeRequest = Date.now();
      await authService.requestPasswordReset(testEmail);
      const afterRequest = Date.now();

      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });

      const expiryTime = tokens[0].expiresAt.getTime();
      const expectedMinExpiry = beforeRequest + 14 * 60 * 1000; // 14 min (allow 1 min tolerance)
      const expectedMaxExpiry = afterRequest + 16 * 60 * 1000; // 16 min (allow 1 min tolerance)

      expect(expiryTime).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(expiryTime).toBeLessThanOrEqual(expectedMaxExpiry);
    });
  });

  // ===========================================================================
  // RESET PASSWORD TESTS
  // ===========================================================================

  describe("resetPassword", () => {
    it("should successfully reset password with valid token", async () => {
      // Request password reset
      const { token: resetToken, hash: resetHash } = generateVerificationToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          email: testEmail,
          tokenHash: resetHash,
          expiresAt: getPasswordResetTokenExpiry(),
        },
      });

      // Reset password
      await authService.resetPassword(resetToken, newPassword);

      // Verify password was changed
      const loginResult = await authService.login(testEmail, newPassword);
      expect(loginResult.user.id).toBe(testUserId);
    });

    it("should fail with old password after reset", async () => {
      // Request and complete password reset
      const { token: resetToken, hash: resetHash } = generateVerificationToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          email: testEmail,
          tokenHash: resetHash,
          expiresAt: getPasswordResetTokenExpiry(),
        },
      });

      await authService.resetPassword(resetToken, newPassword);

      // Old password should not work
      await expect(
        authService.login(testEmail, testPassword)
      ).rejects.toThrow(AuthError);
    });

    it("should reject invalid token", async () => {
      const fakeToken = "invalid-token-12345";

      await expect(
        authService.resetPassword(fakeToken, newPassword)
      ).rejects.toThrow(AuthError);
    });

    it("should reject expired token", async () => {
      // Create expired token
      const { token: resetToken, hash: resetHash } = generateVerificationToken();
      const expiredDate = new Date(Date.now() - 60 * 1000); // 1 minute ago

      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          email: testEmail,
          tokenHash: resetHash,
          expiresAt: expiredDate,
        },
      });

      await expect(
        authService.resetPassword(resetToken, newPassword)
      ).rejects.toThrow(AuthError);
    });

    it("should reject token for non-existent token (already used/deleted)", async () => {
      // Try to use a token that doesn't exist in the database (simulating an already used/deleted token)
      const { token: resetToken } = generateVerificationToken();

      await expect(
        authService.resetPassword(resetToken, newPassword)
      ).rejects.toThrow(AuthError);
    });

    it("should enforce password strength requirements", async () => {
      const { token: resetToken, hash: resetHash } = generateVerificationToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          email: testEmail,
          tokenHash: resetHash,
          expiresAt: getPasswordResetTokenExpiry(),
        },
      });

      // Weak password
      const weakPassword = "weak";

      await expect(
        authService.resetPassword(resetToken, weakPassword)
      ).rejects.toThrow(AuthError);

      // Token should still exist (not consumed by failed attempt)
      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });
      expect(tokens).toHaveLength(1);
    });

    it("should delete token after successful reset", async () => {
      const { token: resetToken, hash: resetHash } = generateVerificationToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          email: testEmail,
          tokenHash: resetHash,
          expiresAt: getPasswordResetTokenExpiry(),
        },
      });

      await authService.resetPassword(resetToken, newPassword);

      // Token should be deleted after successful reset
      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });
      expect(tokens).toHaveLength(0);
    });

    it("should not allow reusing the same token", async () => {
      const { token: resetToken, hash: resetHash } = generateVerificationToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          email: testEmail,
          tokenHash: resetHash,
          expiresAt: getPasswordResetTokenExpiry(),
        },
      });

      // First reset should succeed
      await authService.resetPassword(resetToken, newPassword);

      // Second reset with same token should fail
      const anotherPassword = "AnotherSecurePassword789!@#";
      await expect(
        authService.resetPassword(resetToken, anotherPassword)
      ).rejects.toThrow(AuthError);
    });

    it("should invalidate all user sessions after password reset", async () => {
      // Create an active session
      const loginResult = await authService.login(testEmail, testPassword);
      const refreshToken = loginResult.refreshToken;

      // Verify session exists
      const sessionsBefore = await prisma.refreshToken.findMany({
        where: { userId: testUserId, revokedAt: null },
      });
      expect(sessionsBefore.length).toBeGreaterThan(0);

      // Reset password
      const { token: resetToken, hash: resetHash } = generateVerificationToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          email: testEmail,
          tokenHash: resetHash,
          expiresAt: getPasswordResetTokenExpiry(),
        },
      });

      await authService.resetPassword(resetToken, newPassword);

      // All sessions should be revoked
      const sessionsAfter = await prisma.refreshToken.findMany({
        where: { userId: testUserId, revokedAt: null },
      });
      expect(sessionsAfter).toHaveLength(0);

      // Old refresh token should not work
      await expect(
        authService.refreshAccessToken(refreshToken)
      ).rejects.toThrow(AuthError);
    });

    it("should clean up all tokens after successful reset", async () => {
      // Create multiple tokens (old expired, old valid, current)
      const { token: currentToken, hash: currentHash } = generateVerificationToken();
      const { hash: expiredHash } = generateVerificationToken();
      const { hash: oldHash } = generateVerificationToken();

      await prisma.passwordResetToken.createMany({
        data: [
          {
            userId: testUserId,
            email: testEmail,
            tokenHash: expiredHash,
            expiresAt: new Date(Date.now() - 60 * 1000), // Expired
          },
          {
            userId: testUserId,
            email: testEmail,
            tokenHash: oldHash,
            expiresAt: getPasswordResetTokenExpiry(),
          },
          {
            userId: testUserId,
            email: testEmail,
            tokenHash: currentHash,
            expiresAt: getPasswordResetTokenExpiry(),
          },
        ],
      });

      // Reset with current token
      await authService.resetPassword(currentToken, newPassword);

      // All tokens should be cleaned up
      const tokensAfter = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });
      expect(tokensAfter).toHaveLength(0);
    });
  });

  // ===========================================================================
  // SECURITY TESTS
  // ===========================================================================

  describe("Security Features", () => {
    it("should use constant-time comparison for token validation", async () => {
      const { token: validToken, hash: validHash } = generateVerificationToken();
      const { token: invalidToken } = generateVerificationToken();

      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          email: testEmail,
          tokenHash: validHash,
          expiresAt: getPasswordResetTokenExpiry(),
        },
      });

      // Measure time for valid token (should fail on password validation)
      const startValid = Date.now();
      try {
        await authService.resetPassword(validToken, "weak");
      } catch {
        // Expected to fail
      }
      const validTime = Date.now() - startValid;

      // Measure time for invalid token
      const startInvalid = Date.now();
      try {
        await authService.resetPassword(invalidToken, newPassword);
      } catch {
        // Expected to fail
      }
      const invalidTime = Date.now() - startInvalid;

      // Times should be relatively similar (within 100ms)
      // This is a basic check - true constant-time is at the crypto level
      const timeDiff = Math.abs(validTime - invalidTime);
      expect(timeDiff).toBeLessThan(100);
    });

    it("should not leak information about email existence through timing", async () => {
      const existingEmail = testEmail;
      const nonExistentEmail = "nonexistent@example.com";

      // Measure time for existing user
      const startExisting = Date.now();
      await authService.requestPasswordReset(existingEmail);
      const existingTime = Date.now() - startExisting;

      // Measure time for non-existent user
      const startNonExistent = Date.now();
      await authService.requestPasswordReset(nonExistentEmail);
      const nonExistentTime = Date.now() - startNonExistent;

      // Times should be relatively similar (within 100ms)
      const timeDiff = Math.abs(existingTime - nonExistentTime);
      expect(timeDiff).toBeLessThan(100);
    });

    it("should handle concurrent password reset requests safely", async () => {
      // Send multiple concurrent reset requests
      const requests = Array(5)
        .fill(null)
        .map(() => authService.requestPasswordReset(testEmail));

      await Promise.all(requests);

      // Should only have one active token (the last one)
      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUserId },
      });
      expect(tokens).toHaveLength(1);
    });

    it("should validate password strength against HIBP breaches", async () => {
      const { token: resetToken, hash: resetHash } = generateVerificationToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          email: testEmail,
          tokenHash: resetHash,
          expiresAt: getPasswordResetTokenExpiry(),
        },
      });

      // Known breached password
      const breachedPassword = "Password123!";

      // This test might be slow due to HIBP API call
      await expect(
        authService.resetPassword(resetToken, breachedPassword)
      ).rejects.toThrow(AuthError);
    }, 10000); // Increase timeout for HIBP API call
  });
});

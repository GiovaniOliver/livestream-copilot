/**
 * Authentication Routes Integration Tests
 *
 * Tests for the /api/v1/auth endpoints using supertest.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { mockUser, generateTestToken } from "../utils/test-app.js";

// Mock the auth service
vi.mock("../../auth/service.js", () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    getUserWithOrgs: vi.fn(),
  },
  AuthError: class AuthError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode: number, code: string) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  },
}));

// Mock the auth utils
vi.mock("../../auth/utils.js", () => ({
  verifyAccessToken: vi.fn(),
  hashApiKey: vi.fn(),
  validateApiKeyFormat: vi.fn(),
}));

import { authService, AuthError } from "../../auth/service.js";
import * as authUtils from "../../auth/utils.js";

describe("Auth API Routes", () => {
  let app: Application;

  beforeAll(async () => {
    const express = (await import("express")).default;
    const { createAuthRouter } = await import("../../auth/routes.js");

    app = express();
    app.use(express.json());
    app.use("/api/v1/auth", createAuthRouter());
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user with valid data", async () => {
      const mockResult = {
        user: {
          id: "new-user-id",
          email: "newuser@example.com",
          name: "New User",
        },
        message: "Registration successful. Please verify your email.",
      };

      vi.mocked(authService.register).mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "newuser@example.com",
          password: "SecurePassword123!",
          name: "New User",
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("newuser@example.com");
      expect(authService.register).toHaveBeenCalledWith(
        "newuser@example.com",
        "SecurePassword123!",
        "New User"
      );
    });

    it("should reject registration with invalid email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "not-an-email",
          password: "SecurePassword123!",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject registration with short password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "test@example.com",
          password: "short",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.message).toContain("12 characters");
    });

    it("should handle duplicate email error", async () => {
      vi.mocked(authService.register).mockRejectedValue(
        new AuthError("Email already in use", 409, "EMAIL_EXISTS")
      );

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "existing@example.com",
          password: "SecurePassword123!",
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("EMAIL_EXISTS");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login with valid credentials", async () => {
      const mockResult = {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
        expiresIn: 3600,
        user: {
          id: "user-id",
          email: "test@example.com",
          emailVerified: true,
          name: "Test User",
          avatarUrl: null,
          platformRole: "USER",
          status: "active",
          memberships: [
            {
              organization: { id: "org-1", name: "Test Org" },
              role: "MEMBER",
            },
          ],
        },
      };

      vi.mocked(authService.login).mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe("access-token-123");
      expect(response.body.data.refreshToken).toBe("refresh-token-456");
      expect(response.body.data.user.email).toBe("test@example.com");
      expect(response.body.data.tokenType).toBe("Bearer");
    });

    it("should reject login with invalid credentials", async () => {
      vi.mocked(authService.login).mockRejectedValue(
        new AuthError("Invalid email or password", 401, "INVALID_CREDENTIALS")
      );

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should reject login with missing email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          password: "password123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject login with missing password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "test@example.com",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("should refresh token with valid refresh token", async () => {
      const mockResult = {
        accessToken: "new-access-token",
        expiresIn: 3600,
      };

      vi.mocked(authService.refreshAccessToken).mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .send({
          refreshToken: "valid-refresh-token",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe("new-access-token");
      expect(response.body.data.tokenType).toBe("Bearer");
    });

    it("should reject refresh with invalid token", async () => {
      vi.mocked(authService.refreshAccessToken).mockRejectedValue(
        new AuthError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN")
      );

      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .send({
          refreshToken: "invalid-token",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_REFRESH_TOKEN");
    });

    it("should reject refresh with missing token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout successfully", async () => {
      vi.mocked(authService.logout).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/v1/auth/logout")
        .send({
          refreshToken: "valid-refresh-token",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Logged out successfully.");
    });

    it("should return success even with invalid token (no enumeration)", async () => {
      vi.mocked(authService.logout).mockRejectedValue(new Error("Token not found"));

      const response = await request(app)
        .post("/api/v1/auth/logout")
        .send({
          refreshToken: "invalid-token",
        })
        .expect(200);

      // Returns success to prevent token enumeration
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/v1/auth/logout-all", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/v1/auth/logout-all")
        .expect(401);

      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("should logout all sessions when authenticated", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(authService.logoutAll).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/v1/auth/logout-all")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Logged out from all sessions.");
      expect(authService.logoutAll).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("POST /api/v1/auth/verify-email", () => {
    it("should verify email with valid token", async () => {
      const mockResult = {
        user: { id: "user-id", email: "test@example.com", emailVerified: true },
      };

      vi.mocked(authService.verifyEmail).mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({
          token: "valid-verification-token",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Email verified successfully.");
    });

    it("should reject invalid verification token", async () => {
      vi.mocked(authService.verifyEmail).mockRejectedValue(
        new AuthError("Invalid or expired token", 400, "INVALID_TOKEN")
      );

      const response = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({
          token: "invalid-token",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });
  });

  describe("POST /api/v1/auth/resend-verification", () => {
    it("should return success regardless of email existence (no enumeration)", async () => {
      vi.mocked(authService.resendVerification).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({
          email: "test@example.com",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain("verification email has been sent");
    });

    it("should return success even when email not found (no enumeration)", async () => {
      vi.mocked(authService.resendVerification).mockRejectedValue(
        new Error("User not found")
      );

      const response = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({
          email: "nonexistent@example.com",
        })
        .expect(200);

      // Returns success to prevent email enumeration
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("should return success regardless of email existence (no enumeration)", async () => {
      vi.mocked(authService.requestPasswordReset).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "test@example.com",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain("password reset link");
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("should reset password with valid token", async () => {
      vi.mocked(authService.resetPassword).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "valid-reset-token",
          password: "NewSecurePassword123!",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain("Password has been reset");
    });

    it("should reject reset with invalid token", async () => {
      vi.mocked(authService.resetPassword).mockRejectedValue(
        new AuthError("Invalid or expired reset token", 400, "INVALID_RESET_TOKEN")
      );

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "invalid-token",
          password: "NewSecurePassword123!",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("INVALID_RESET_TOKEN");
    });

    it("should reject reset with weak password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "valid-token",
          password: "weak",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .expect(401);

      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("should return current user when authenticated", async () => {
      const mockUserData = { passwordHash: null, 
        id: mockUser.id,
        email: mockUser.email,
        emailVerified: true,
        name: "Test User",
        avatarUrl: null,
        platformRole: "USER",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            organization: { id: "org-1", name: "Test Org", slug: "test-org" },
            role: "MEMBER",
            createdAt: new Date(),
          },
        ],
      };

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(authService.getUserWithOrgs).mockResolvedValue(mockUserData);

      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(mockUser.id);
      expect(response.body.data.user.email).toBe(mockUser.email);
      expect(response.body.data.user.organizations).toHaveLength(1);
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(authService.getUserWithOrgs).mockResolvedValue(null);

      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("USER_NOT_FOUND");
    });
  });
});

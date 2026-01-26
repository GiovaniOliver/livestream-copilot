/**
 * Authentication Middleware Unit Tests
 *
 * Tests for JWT token and API key authentication middleware.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  authenticateToken,
  optionalAuth,
  requirePlatformRole,
  requireOrgRole,
  requireApiKeyPermission,
  extractClientInfo,
  isAuthenticated,
  getAuthenticatedUser,
  type AuthenticatedRequest,
  type AuthenticatedUser,
} from "../../auth/middleware.js";
import * as authUtils from "../../auth/utils.js";

// Mock the auth utils module
vi.mock("../../auth/utils.js", () => ({
  verifyAccessToken: vi.fn(),
  hashApiKey: vi.fn(),
  validateApiKeyFormat: vi.fn(),
}));

// Mock the Prisma client
vi.mock("../../db/prisma.js", () => ({
  prisma: {
    aPIKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Authentication Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      headers: {},
      params: {},
      body: {},
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" } as any,
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      setHeader: vi.fn(),
    };

    mockNext = vi.fn();
  });

  describe("authenticateToken", () => {
    it("should call next when valid token is provided", () => {
      const mockPayload = {
        sub: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [{ id: "org-1", role: "MEMBER" }],
        type: "access" as const,
      };
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue(mockPayload);
      mockRequest.headers = { authorization: "Bearer valid-token" };

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(authUtils.verifyAccessToken).toHaveBeenCalledWith("valid-token");
      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user).toBeDefined();
      expect((mockRequest as AuthenticatedRequest).user.id).toBe("user-123");
      expect((mockRequest as AuthenticatedRequest).user.authMethod).toBe("jwt");
    });

    it("should return 401 when no token is provided", () => {
      mockRequest.headers = {};

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "MISSING_TOKEN",
          message: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when token format is invalid", () => {
      mockRequest.headers = { authorization: "InvalidFormat" };

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "MISSING_TOKEN",
          message: expect.any(String),
        },
      });
    });

    it("should return 401 when token is invalid", () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue(null);
      mockRequest.headers = { authorization: "Bearer invalid-token" };

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "INVALID_TOKEN",
          message: expect.any(String),
        },
      });
    });

    it("should handle Bearer scheme case-insensitively", () => {
      const mockPayload = {
        sub: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        type: "access" as const,
      };
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue(mockPayload);
      mockRequest.headers = { authorization: "bearer valid-token" };

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(authUtils.verifyAccessToken).toHaveBeenCalledWith("valid-token");
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("optionalAuth", () => {
    it("should call next and attach user when valid token is provided", () => {
      const mockPayload = {
        sub: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        type: "access" as const,
      };
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue(mockPayload);
      mockRequest.headers = { authorization: "Bearer valid-token" };

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user).toBeDefined();
    });

    it("should call next without user when no token is provided", () => {
      mockRequest.headers = {};

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).user).toBeUndefined();
    });

    it("should call next without user when token is invalid", () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue(null);
      mockRequest.headers = { authorization: "Bearer invalid-token" };

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).user).toBeUndefined();
    });
  });

  describe("requirePlatformRole", () => {
    it("should call next when user has required role", () => {
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "ADMIN",
        organizations: [],
        authMethod: "jwt",
      };

      const middleware = requirePlatformRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next when user is SUPER_ADMIN regardless of required role", () => {
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "SUPER_ADMIN",
        organizations: [],
        authMethod: "jwt",
      };

      const middleware = requirePlatformRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 401 when user is not authenticated", () => {
      const middleware = requirePlatformRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "NOT_AUTHENTICATED",
          message: expect.any(String),
        },
      });
    });

    it("should return 403 when user lacks required role", () => {
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        authMethod: "jwt",
      };

      const middleware = requirePlatformRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: expect.any(String),
        },
      });
    });
  });

  describe("requireOrgRole", () => {
    it("should call next when user has required org role", () => {
      mockRequest.params = { orgId: "org-1" };
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [{ id: "org-1", role: "ADMIN" }],
        authMethod: "jwt",
      };

      const middleware = requireOrgRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next when user is org OWNER regardless of required role", () => {
      mockRequest.params = { orgId: "org-1" };
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [{ id: "org-1", role: "OWNER" }],
        authMethod: "jwt",
      };

      const middleware = requireOrgRole(["MEMBER"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next when user is platform SUPER_ADMIN", () => {
      mockRequest.params = { orgId: "org-1" };
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "SUPER_ADMIN",
        organizations: [],
        authMethod: "jwt",
      };

      const middleware = requireOrgRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 400 when organization ID is missing", () => {
      mockRequest.params = {};
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        authMethod: "jwt",
      };

      const middleware = requireOrgRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "MISSING_ORG_ID",
          message: expect.any(String),
        },
      });
    });

    it("should return 403 when user is not a member of the organization", () => {
      mockRequest.params = { orgId: "org-1" };
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [{ id: "org-2", role: "ADMIN" }],
        authMethod: "jwt",
      };

      const middleware = requireOrgRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "NOT_ORG_MEMBER",
          message: expect.any(String),
        },
      });
    });

    it("should return 403 when user lacks required org role", () => {
      mockRequest.params = { orgId: "org-1" };
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [{ id: "org-1", role: "VIEWER" }],
        authMethod: "jwt",
      };

      const middleware = requireOrgRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "INSUFFICIENT_ORG_PERMISSIONS",
          message: expect.any(String),
        },
      });
    });

    it("should get orgId from body if not in params", () => {
      mockRequest.params = {};
      mockRequest.body = { organizationId: "org-1" };
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [{ id: "org-1", role: "ADMIN" }],
        authMethod: "jwt",
      };

      const middleware = requireOrgRole(["ADMIN"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("requireApiKeyPermission", () => {
    it("should call next when using JWT auth (full permissions)", () => {
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        authMethod: "jwt",
      };

      const middleware = requireApiKeyPermission(["webhooks:write"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next when API key has required permission", () => {
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        authMethod: "api_key",
        apiKeyId: "key-123",
        apiKeyPermissions: ["webhooks:write", "sessions:read"],
      };

      const middleware = requireApiKeyPermission(["webhooks:write"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next when API key has wildcard permission", () => {
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        authMethod: "api_key",
        apiKeyId: "key-123",
        apiKeyPermissions: ["*"],
      };

      const middleware = requireApiKeyPermission(["webhooks:write"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 403 when API key lacks required permission", () => {
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        authMethod: "api_key",
        apiKeyId: "key-123",
        apiKeyPermissions: ["sessions:read"],
      };

      const middleware = requireApiKeyPermission(["webhooks:write"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: "INSUFFICIENT_API_KEY_PERMISSIONS",
          message: expect.any(String),
        },
      });
    });

    it("should return 401 when user is not authenticated", () => {
      const middleware = requireApiKeyPermission(["webhooks:write"]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe("extractClientInfo", () => {
    it("should extract IP from request", () => {
      mockRequest.ip = "192.168.1.1";

      extractClientInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).clientIp).toBe("192.168.1.1");
    });

    it("should extract IP from X-Forwarded-For header", () => {
      mockRequest.headers = { "x-forwarded-for": "203.0.113.1, 198.51.100.1" };
      mockRequest.ip = "127.0.0.1";

      extractClientInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).clientIp).toBe("203.0.113.1");
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when user is attached to request", () => {
      (mockRequest as AuthenticatedRequest).user = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        authMethod: "jwt",
      };

      expect(isAuthenticated(mockRequest as Request)).toBe(true);
    });

    it("should return false when user is not attached", () => {
      expect(isAuthenticated(mockRequest as Request)).toBe(false);
    });
  });

  describe("getAuthenticatedUser", () => {
    it("should return user when authenticated", () => {
      const user: AuthenticatedUser = {
        id: "user-123",
        email: "test@example.com",
        platformRole: "USER",
        organizations: [],
        authMethod: "jwt",
      };
      (mockRequest as AuthenticatedRequest).user = user;

      expect(getAuthenticatedUser(mockRequest as Request)).toEqual(user);
    });

    it("should return undefined when not authenticated", () => {
      expect(getAuthenticatedUser(mockRequest as Request)).toBeUndefined();
    });
  });
});

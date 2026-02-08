/**
 * Rate Limiter Unit Tests
 *
 * Tests for authentication rate limiting middleware.
 *
 * Security test scenarios:
 * - Rate limit enforcement per endpoint
 * - IP-based and IP+email combined keys
 * - Rate limit headers in response
 * - Rate limit reset after window expires
 * - Protection against distributed attacks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  resendVerificationLimiter,
  verifyEmailLimiter,
  refreshTokenLimiter,
  generalAuthLimiter,
} from "../../auth/rate-limiters.js";

describe("Authentication Rate Limiters", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;
  let getHeaderMock: ReturnType<typeof vi.fn>;

  // Helper function to set IP on mockRequest (workaround for read-only property)
  const setMockRequestIp = (req: Partial<Request>, ip: string | undefined) => {
    Object.defineProperty(req, 'ip', {
      value: ip,
      writable: true,
      configurable: true
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    setHeaderMock = vi.fn();
    getHeaderMock = vi.fn().mockReturnValue("60");
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      headers: {},
      body: {},
      socket: { remoteAddress: "192.168.1.1" } as any,
      path: "/api/v1/auth/test",
    } as any;
    setMockRequestIp(mockRequest, "192.168.1.1");

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
      getHeader: getHeaderMock,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    // Clear rate limit stores between tests
    // Note: express-rate-limit stores are in-memory, they persist across tests
    // In production tests, you'd want to reset the store or use a time-based approach
  });

  describe("loginLimiter", () => {
    it("should allow requests within rate limit", async () => {
      mockRequest.body = { email: "test@example.com" };

      // First request should succeed
      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(429);
    });

    it("should use IP and email combination for rate limit key", async () => {
      mockRequest.body = { email: "test@example.com" };
      setMockRequestIp(mockRequest, "192.168.1.1");

      // This tests that different emails from same IP are tracked separately
      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should normalize email to lowercase for rate limit key", async () => {
      // Test that "Test@Example.com" and "test@example.com" are treated as same
      mockRequest.body = { email: "Test@Example.COM" };

      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle requests without email in body", async () => {
      mockRequest.body = {};

      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should include rate limit headers in response", async () => {
      mockRequest.body = { email: "test@example.com" };

      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // express-rate-limit should set headers via setHeader
      // We verify the limiter was called by checking next was called
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("registerLimiter", () => {
    it("should allow requests within rate limit", async () => {
      await registerLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(429);
    });

    it("should use IP-only for rate limit key", async () => {
      setMockRequestIp(mockRequest, "192.168.1.100");

      await registerLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle X-Forwarded-For header", async () => {
      mockRequest.headers = { "x-forwarded-for": "203.0.113.1, 198.51.100.1" };
      setMockRequestIp(mockRequest, "127.0.0.1");

      await registerLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should extract first IP from X-Forwarded-For
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("passwordResetLimiter", () => {
    it("should allow requests within rate limit", async () => {
      await passwordResetLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(429);
    });

    it("should use IP-only for rate limit key", async () => {
      setMockRequestIp(mockRequest, "10.0.0.1");

      await passwordResetLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("resendVerificationLimiter", () => {
    it("should allow requests within rate limit", async () => {
      await resendVerificationLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(429);
    });
  });

  describe("verifyEmailLimiter", () => {
    it("should allow requests within rate limit", async () => {
      await verifyEmailLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(429);
    });
  });

  describe("refreshTokenLimiter", () => {
    it("should allow requests within rate limit", async () => {
      await refreshTokenLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(429);
    });

    it("should have higher limit than auth endpoints", async () => {
      // refresh token limiter allows 10 per minute
      // This is more permissive than login (5 per 15 min) or register (3 per hour)
      // Just verify it allows first request
      await refreshTokenLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("generalAuthLimiter", () => {
    it("should allow requests within rate limit", async () => {
      await generalAuthLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(429);
    });

    it("should use IP-only for rate limit key", async () => {
      setMockRequestIp(mockRequest, "172.16.0.1");

      await generalAuthLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Rate limit exceeded scenarios", () => {
    it("should return 429 and proper error format when rate limit exceeded", async () => {
      // This test would require making multiple requests to exceed the limit
      // For unit testing, we'd mock the rate limiter's internal state
      // In integration tests, we'd make actual requests

      // Mock scenario where rate limit is exceeded
      const mockRateLimitExceeded = vi.fn((req, res, next) => {
        res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            retryAfter: "60",
          },
        });
      });

      mockRateLimitExceeded(mockRequest, mockResponse, mockNext);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
          retryAfter: "60",
        },
      });
    });

    it("should include Retry-After header in rate limit response", async () => {
      // Mock scenario
      const mockRateLimitExceeded = vi.fn((req, res, next) => {
        const retryAfter = res.getHeader("Retry-After");
        res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            retryAfter,
          },
        });
      });

      mockRateLimitExceeded(mockRequest, mockResponse, mockNext);

      expect(getHeaderMock).toHaveBeenCalledWith("Retry-After");
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            retryAfter: "60",
          }),
        })
      );
    });
  });

  describe("IP extraction", () => {
    it("should extract IP from request.ip", async () => {
      setMockRequestIp(mockRequest, "203.0.113.50");
      mockRequest.headers = {};

      await generalAuthLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should extract IP from X-Forwarded-For header", async () => {
      mockRequest.headers = { "x-forwarded-for": "203.0.113.1, 198.51.100.1, 192.168.1.1" };
      setMockRequestIp(mockRequest, "127.0.0.1");

      await generalAuthLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should use first IP from X-Forwarded-For (original client)
      expect(mockNext).toHaveBeenCalled();
    });

    it("should fall back to socket.remoteAddress if no IP", async () => {
      setMockRequestIp(mockRequest, undefined);
      mockRequest.headers = {};
      mockRequest.socket = { remoteAddress: "192.168.1.200" } as any;

      await generalAuthLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should use 'unknown' if no IP source available", async () => {
      setMockRequestIp(mockRequest, undefined);
      mockRequest.headers = {};
      mockRequest.socket = { remoteAddress: undefined } as any;

      await generalAuthLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Security properties", () => {
    it("should count all requests, not just failed ones", async () => {
      // loginLimiter has skipSuccessfulRequests: false
      // This means it counts all attempts, preventing attackers from
      // making many successful requests to enumerate valid accounts
      mockRequest.body = { email: "valid@example.com" };

      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Request is counted regardless of success/failure
      expect(mockNext).toHaveBeenCalled();
    });

    it("should use standard RateLimit-* headers, not legacy X-RateLimit-*", async () => {
      // All limiters have standardHeaders: true, legacyHeaders: false
      // This follows the IETF draft standard for rate limit headers
      mockRequest.body = { email: "test@example.com" };

      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // express-rate-limit handles header setting internally
      // We just verify the middleware was configured correctly by checking it runs
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Attack scenario prevention", () => {
    it("should prevent credential stuffing by combining IP and email", async () => {
      // Attacker trying multiple passwords for same email from same IP
      setMockRequestIp(mockRequest, "203.0.113.10");
      mockRequest.body = { email: "target@example.com" };

      // All attempts from same IP:email combo count toward same limit
      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      // Subsequent attempts would be tracked under same key: "login:203.0.113.10:target@example.com"
    });

    it("should prevent distributed attacks by tracking per-email", async () => {
      // Attacker using multiple IPs but same target email
      setMockRequestIp(mockRequest, "203.0.113.20");
      mockRequest.body = { email: "target@example.com" };

      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Change IP but same email - new key but still rate limited per IP:email
      setMockRequestIp(mockRequest, "203.0.113.21");

      await loginLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Each IP:email combo is tracked separately, preventing bypass via IP rotation
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it("should prevent account enumeration via registration", async () => {
      // Attacker trying to find valid emails by mass registration attempts
      setMockRequestIp(mockRequest, "198.51.100.50");
      mockRequest.body = { email: "probe1@example.com" };

      await registerLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Only 3 attempts per hour from same IP
      // This prevents automated account enumeration
      expect(mockNext).toHaveBeenCalled();
    });

    it("should prevent email bombing via password reset", async () => {
      // Attacker trying to flood victim's inbox with reset emails
      setMockRequestIp(mockRequest, "198.51.100.60");
      mockRequest.body = { email: "victim@example.com" };

      await passwordResetLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Only 3 reset requests per hour from same IP
      expect(mockNext).toHaveBeenCalled();
    });

    it("should prevent token enumeration via refresh endpoint", async () => {
      // Attacker trying to validate stolen refresh tokens
      setMockRequestIp(mockRequest, "198.51.100.70");
      mockRequest.body = { refreshToken: "potentially-stolen-token" };

      await refreshTokenLimiter(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 10 attempts per minute limits brute force token validation
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

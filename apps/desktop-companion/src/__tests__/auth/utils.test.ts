/**
 * Authentication Utilities Unit Tests
 *
 * Tests for password validation, hashing, JWT operations, and HIBP integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  needsRehash,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  validateApiKeyFormat,
  getApiKeyEnvironment,
  generateJti,
  secureCompare,
  type PasswordValidationResult,
  type AccessTokenPayload,
} from "../../auth/utils.js";
import * as hibp from "hibp";

// Mock the hibp module
vi.mock("hibp", () => ({
  pwnedPassword: vi.fn(),
}));

// Mock the logger module (use vi.hoisted to avoid hoisting issues)
const { mockLoggerWarn } = vi.hoisted(() => ({
  mockLoggerWarn: vi.fn(),
}));
vi.mock("../../logger/index.js", () => ({
  logger: {
    info: vi.fn(),
    warn: mockLoggerWarn,
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// PASSWORD VALIDATION TESTS
// ============================================================================

describe("validatePasswordStrength", () => {
  describe("Basic Requirements", () => {
    it("should accept a strong password with all requirements", async () => {
      // Mock HIBP to return 0 (not breached)
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength("SecureP@ssw0rd123");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(hibp.pwnedPassword).toHaveBeenCalledWith("SecureP@ssw0rd123");
    });

    it("should reject password shorter than 12 characters", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength("Short1@");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 12 characters");
    });

    it("should reject password longer than 128 characters", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const longPassword = "A1@" + "a".repeat(126); // 129 chars total
      const result = await validatePasswordStrength(longPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must not exceed 128 characters"
      );
    });

    it("should reject password without uppercase letter", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength("securep@ssw0rd123");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter"
      );
    });

    it("should reject password without lowercase letter", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength("SECUREP@SSW0RD123");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter"
      );
    });

    it("should reject password without number", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength("SecureP@ssword");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one number");
    });

    it("should reject password without special character", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength("SecurePassw0rd123");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character"
      );
    });

    it("should accumulate multiple validation errors", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength("weak");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("Email Similarity Check", () => {
    it("should reject password similar to email local part", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength(
        "JohnDoe123!@#",
        "johndoe@example.com"
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password should not be similar to your email address"
      );
    });

    it("should reject password that contains email local part", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength(
        "MyPassword_alice_123!",
        "alice@example.com"
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password should not be similar to your email address"
      );
    });

    it("should accept password when email is not provided", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength("SecureP@ssw0rd123");

      expect(result.valid).toBe(true);
    });

    it("should accept password dissimilar to email", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength(
        "CompletelyDifferent123!@#",
        "johndoe@example.com"
      );

      expect(result.valid).toBe(true);
    });

    it("should handle short email local parts (< 3 chars)", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength(
        "AB_SecureP@ssw0rd123",
        "ab@example.com"
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("HIBP Breach Detection", () => {
    it("should reject password found in data breaches", async () => {
      // Mock HIBP to return a high count (password is breached)
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(3861493);

      const result = await validatePasswordStrength("Password123!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("3,861,493 data breaches")
      );
      expect(hibp.pwnedPassword).toHaveBeenCalledWith("Password123!");
    });

    it("should accept password not found in breaches", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const result = await validatePasswordStrength(
        "UniqueSecureP@ssw0rd9876!"
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject commonly breached passwords", async () => {
      const commonPasswords = [
        { password: "Password123!", count: 3861493 },
        { password: "Welcome123!", count: 123456 },
        { password: "Admin123!@#", count: 987654 },
      ];

      for (const { password, count } of commonPasswords) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(count);

        const result = await validatePasswordStrength(password);

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.stringContaining("data breaches")
        );
      }
    });

    it("should gracefully handle HIBP API failures", async () => {
      // Mock HIBP to throw an error (network failure, timeout, etc.)
      vi.mocked(hibp.pwnedPassword).mockRejectedValue(
        new Error("Network error")
      );

      const result = await validatePasswordStrength("SecureP@ssw0rd123");

      // Should still validate other requirements but not fail due to HIBP error
      expect(result.valid).toBe(true);
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Network error",
          timestamp: expect.any(String),
        }),
        "[auth] HIBP API check failed"
      );
    });

    it("should gracefully handle HIBP rate limiting", async () => {
      // Mock HIBP to throw a rate limit error
      vi.mocked(hibp.pwnedPassword).mockRejectedValue(
        new Error("Too Many Requests")
      );

      const result = await validatePasswordStrength("SecureP@ssw0rd123");

      expect(result.valid).toBe(true);
      expect(mockLoggerWarn).toHaveBeenCalled();
    });

    it("should continue validation if HIBP is unavailable", async () => {
      vi.mocked(hibp.pwnedPassword).mockRejectedValue(
        new Error("Service unavailable")
      );

      // Password that fails other requirements
      const result = await validatePasswordStrength("weak");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Should have errors for other validations, not HIBP
      expect(result.errors).not.toContainEqual(
        expect.stringContaining("data breaches")
      );
    });

    it("should handle HIBP timeout gracefully", async () => {
      vi.mocked(hibp.pwnedPassword).mockRejectedValue(new Error("Timeout"));

      const result = await validatePasswordStrength("SecureP@ssw0rd123");

      expect(result.valid).toBe(true);
    });
  });

  describe("Real-world Password Examples", () => {
    it("should reject well-known breached passwords", async () => {
      const breachedPasswords = [
        "Password123!",
        "Welcome123!",
        "Admin@123456",
      ];

      for (const password of breachedPasswords) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(100000);

        const result = await validatePasswordStrength(password);

        expect(result.valid).toBe(false);
      }
    });

    it("should accept strong unique passwords", async () => {
      vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

      const strongPasswords = [
        "9K#mPq2$vL8xNw4R",
        "Tr0ub4dor&3Plaid",
        "Correct-horse-battery-staple-2024!",
      ];

      for (const password of strongPasswords) {
        const result = await validatePasswordStrength(password);

        expect(result.valid).toBe(true);
      }
    });
  });
});

// ============================================================================
// PASSWORD HASHING TESTS
// ============================================================================

describe("hashPassword", () => {
  it("should hash a password successfully", async () => {
    const password = "SecureP@ssw0rd123";
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format
  });

  it("should generate different hashes for the same password", async () => {
    const password = "SecureP@ssw0rd123";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2); // Different salts
  });

  it("should reject passwords exceeding maximum length", async () => {
    const longPassword = "A".repeat(129);

    await expect(hashPassword(longPassword)).rejects.toThrow(
      "Password exceeds maximum length"
    );
  });

  it("should hash passwords at maximum length", async () => {
    const maxPassword = "A".repeat(128);
    const hash = await hashPassword(maxPassword);

    expect(hash).toBeDefined();
  });
});

// ============================================================================
// PASSWORD VERIFICATION TESTS
// ============================================================================

describe("verifyPassword", () => {
  it("should verify correct password", async () => {
    const password = "SecureP@ssw0rd123";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const password = "SecureP@ssw0rd123";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword("WrongP@ssw0rd123", hash);

    expect(isValid).toBe(false);
  });

  it("should return false for empty password", async () => {
    const hash = await hashPassword("SecureP@ssw0rd123");

    const isValid = await verifyPassword("", hash);

    expect(isValid).toBe(false);
  });

  it("should return false for empty hash", async () => {
    const isValid = await verifyPassword("SecureP@ssw0rd123", "");

    expect(isValid).toBe(false);
  });

  it("should return false for malformed hash", async () => {
    const isValid = await verifyPassword("SecureP@ssw0rd123", "invalid-hash");

    expect(isValid).toBe(false);
  });

  it("should handle special characters in password", async () => {
    const password = "P@$$w0rd!#%^&*()_+-={}[]|:;<>?,./~`";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });
});

// ============================================================================
// PASSWORD REHASH DETECTION TESTS
// ============================================================================

describe("needsRehash", () => {
  it("should return true for hashes with lower cost factor", async () => {
    // Generate hash with cost factor 10 (lower than default 12)
    const bcrypt = await import("bcrypt");
    const oldHash = await bcrypt.hash("password", 10);

    expect(needsRehash(oldHash)).toBe(true);
  });

  it("should return false for hashes with current cost factor", async () => {
    const hash = await hashPassword("SecureP@ssw0rd123");

    expect(needsRehash(hash)).toBe(false);
  });

  it("should return true for invalid hash format", () => {
    expect(needsRehash("invalid-hash")).toBe(true);
  });

  it("should return true for empty string", () => {
    expect(needsRehash("")).toBe(true);
  });
});

// ============================================================================
// JWT TOKEN TESTS
// ============================================================================

describe("JWT Access Tokens", () => {
  it("should generate and verify access token", () => {
    const payload: AccessTokenPayload = {
      sub: "user-123",
      email: "test@example.com",
      platformRole: "USER",
      organizations: [{ id: "org-1", role: "ADMIN" }],
      type: "access",
    };

    const token = generateAccessToken(payload);
    const verified = verifyAccessToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe("user-123");
    expect(verified?.email).toBe("test@example.com");
    expect(verified?.type).toBe("access");
  });

  it("should return null for invalid token", () => {
    const verified = verifyAccessToken("invalid-token");

    expect(verified).toBeNull();
  });

  it("should return null for refresh token used as access token", () => {
    const { token } = generateRefreshToken({ sub: "user-123" });
    const verified = verifyAccessToken(token);

    expect(verified).toBeNull();
  });
});

describe("JWT Refresh Tokens", () => {
  it("should generate and verify refresh token", () => {
    const { token, jti } = generateRefreshToken({ sub: "user-123" });
    const verified = verifyRefreshToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe("user-123");
    expect(verified?.type).toBe("refresh");
    expect(verified?.jti).toBe(jti);
  });

  it("should generate unique JTI for each token", () => {
    const { jti: jti1 } = generateRefreshToken({ sub: "user-123" });
    const { jti: jti2 } = generateRefreshToken({ sub: "user-123" });

    expect(jti1).not.toBe(jti2);
  });

  it("should return null for access token used as refresh token", () => {
    const payload: AccessTokenPayload = {
      sub: "user-123",
      email: "test@example.com",
      platformRole: "USER",
      organizations: [],
      type: "access",
    };
    const token = generateAccessToken(payload);
    const verified = verifyRefreshToken(token);

    expect(verified).toBeNull();
  });
});

// ============================================================================
// API KEY TESTS
// ============================================================================

describe("API Key Generation", () => {
  it("should generate valid API key", () => {
    const { key, hash, prefix } = generateApiKey();

    expect(key).toMatch(/^lsc_(live|test)_[A-Za-z0-9_-]+$/);
    expect(hash).toHaveLength(64); // SHA-256 hex
    expect(prefix).toMatch(/^lsc_(live|test)_[A-Za-z0-9_-]{8}$/);
  });

  it("should generate unique keys", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    expect(key1.key).not.toBe(key2.key);
    expect(key1.hash).not.toBe(key2.hash);
  });

  it("should verify API key against hash", () => {
    const { key, hash } = generateApiKey();

    expect(verifyApiKey(key, hash)).toBe(true);
  });

  it("should reject wrong API key", () => {
    const { hash } = generateApiKey();
    const { key: wrongKey } = generateApiKey();

    expect(verifyApiKey(wrongKey, hash)).toBe(false);
  });

  it("should validate API key format", () => {
    const { key } = generateApiKey();

    expect(validateApiKeyFormat(key)).toBe(true);
  });

  it("should reject invalid API key format", () => {
    expect(validateApiKeyFormat("invalid")).toBe(false);
    expect(validateApiKeyFormat("lsc_invalid_format")).toBe(false);
    expect(validateApiKeyFormat("")).toBe(false);
  });

  it("should extract environment from API key", () => {
    const { key } = generateApiKey();
    const env = getApiKeyEnvironment(key);

    expect(env).toMatch(/^(live|test)$/);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe("generateJti", () => {
  it("should generate valid UUID v4", () => {
    const jti = generateJti();

    expect(jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("should generate unique JTIs", () => {
    const jti1 = generateJti();
    const jti2 = generateJti();

    expect(jti1).not.toBe(jti2);
  });
});

describe("secureCompare", () => {
  it("should return true for equal strings", () => {
    expect(secureCompare("test", "test")).toBe(true);
  });

  it("should return false for different strings", () => {
    expect(secureCompare("test", "different")).toBe(false);
  });

  it("should return false for different lengths", () => {
    expect(secureCompare("short", "longer string")).toBe(false);
  });

  it("should handle empty strings", () => {
    expect(secureCompare("", "")).toBe(true);
    expect(secureCompare("", "non-empty")).toBe(false);
  });
});

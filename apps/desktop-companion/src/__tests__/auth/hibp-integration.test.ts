/**
 * HIBP Integration Tests
 *
 * These tests verify the actual HIBP API integration.
 * They can be run with real API calls or mocked for CI/CD.
 */

import { describe, it, expect, vi } from "vitest";
import { validatePasswordStrength } from "../../auth/utils.js";
import * as hibp from "hibp";

// Toggle this to test with real HIBP API (requires internet)
// Set to false for CI/CD to use mocks
const USE_REAL_API = false;

describe("HIBP Integration (Real API)", () => {
  if (!USE_REAL_API) {
    // Mock HIBP for CI/CD
    vi.mock("hibp", () => ({
      pwnedPassword: vi.fn(),
    }));
  }

  describe("Known Breached Passwords", () => {
    it("should detect 'password' as breached", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(10000000);
      }

      // 'password' is one of the most breached passwords
      const result = await validatePasswordStrength("Password123!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("data breaches")
      );
    });

    it("should detect 'welcome' variant as breached", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(100000);
      }

      const result = await validatePasswordStrength("Welcome123!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("data breaches")
      );
    });

    it("should detect 'admin' variant as breached", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(50000);
      }

      const result = await validatePasswordStrength("Admin@123456");

      expect(result.valid).toBe(false);
    });
  });

  describe("Secure Passwords", () => {
    it("should accept randomly generated strong password", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);
      }

      // A truly random password unlikely to be in any breach
      const strongPassword = "9K#mPq2$vL8xNw4R";
      const result = await validatePasswordStrength(strongPassword);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept passphrase style password", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);
      }

      const passphrase = "correct-horse-battery-staple-2024!";
      const result = await validatePasswordStrength(passphrase);

      expect(result.valid).toBe(true);
    });

    it("should accept unique mixed-case password with symbols", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);
      }

      const uniquePassword = "Tr0ub4dor&3Plaid";
      const result = await validatePasswordStrength(uniquePassword);

      expect(result.valid).toBe(true);
    });
  });

  describe("API Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockRejectedValue(
          new Error("Network error")
        );
      }

      // Mock console.warn to suppress error output
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await validatePasswordStrength("SecureP@ssw0rd123");

      // Should still validate successfully (graceful degradation)
      expect(result.valid).toBe(true);

      warnSpy.mockRestore();
    });

    it("should handle timeout errors", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockRejectedValue(
          new Error("Request timeout")
        );
      }

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await validatePasswordStrength("AnotherSecure123!@#");

      expect(result.valid).toBe(true);

      warnSpy.mockRestore();
    });

    it("should handle rate limiting", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockRejectedValue(
          new Error("429 Too Many Requests")
        );
      }

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await validatePasswordStrength("YetAnotherSecure456!@#");

      expect(result.valid).toBe(true);

      warnSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long passwords", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);
      }

      // Generate a 100-character password
      const longPassword =
        "ThisIsAVeryLongPasswordThatMeetsAllRequirements123!@#" +
        "AndItContinuesWithMoreCharactersToReach100Chars!@#$%^";

      const result = await validatePasswordStrength(longPassword);

      expect(result.valid).toBe(true);
    });

    it("should handle passwords with unicode characters", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);
      }

      const unicodePassword = "Pä$$w0rd123!🔒";
      const result = await validatePasswordStrength(unicodePassword);

      // Should pass all requirements including HIBP
      expect(result.valid).toBe(true);
    });

    it("should handle passwords with all special characters", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);
      }

      const specialPassword = "!@#$%^&*()_+{}[]|:;<>?,./~`P@ssw0rd123";
      const result = await validatePasswordStrength(specialPassword);

      expect(result.valid).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should complete validation within reasonable time", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);
      }

      const startTime = Date.now();

      await validatePasswordStrength("SecureP@ssw0rd123");

      const duration = Date.now() - startTime;

      // Should complete in less than 2 seconds (generous for network calls)
      expect(duration).toBeLessThan(2000);
    }, 3000); // Set test timeout to 3 seconds

    it("should validate multiple passwords efficiently", async () => {
      if (!USE_REAL_API) {
        vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);
      }

      const passwords = [
        "FirstP@ssw0rd123",
        "SecondP@ssw0rd456",
        "ThirdP@ssw0rd789",
      ];

      const startTime = Date.now();

      for (const password of passwords) {
        await validatePasswordStrength(password);
      }

      const duration = Date.now() - startTime;

      // Should complete all validations in less than 5 seconds
      expect(duration).toBeLessThan(5000);
    }, 6000);
  });
});

describe("HIBP API Response Format", () => {
  it("should handle zero breach count correctly", async () => {
    vi.mock("hibp", () => ({
      pwnedPassword: vi.fn(),
    }));

    vi.mocked(hibp.pwnedPassword).mockResolvedValue(0);

    const result = await validatePasswordStrength("UniqueP@ssw0rd999");

    expect(result.valid).toBe(true);
    expect(result.errors).not.toContainEqual(
      expect.stringContaining("data breaches")
    );
  });

  it("should handle single breach count", async () => {
    vi.mocked(hibp.pwnedPassword).mockResolvedValue(1);

    const result = await validatePasswordStrength("RareBreachP@ss123");

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("1 data breach")
    );
  });

  it("should handle large breach counts", async () => {
    vi.mocked(hibp.pwnedPassword).mockResolvedValue(23174662);

    const result = await validatePasswordStrength("Password1234!");

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("23,174,662")
    );
  });
});

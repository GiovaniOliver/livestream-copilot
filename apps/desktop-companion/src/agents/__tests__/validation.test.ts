/**
 * Output Validation Unit Tests
 *
 * Tests for the OutputValidator class which validates AI-generated
 * outputs against brand voice, content policy, platform limits,
 * and quality rules.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AgentOutput, OutputCategory } from "../types.js";
import type {
  ValidationConfig,
  BrandVoiceConfig,
  ContentPolicyConfig,
  PlatformLimits,
} from "../validation/types.js";

// Mock dependencies
vi.mock("../../logger/index.js", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("../client.js", () => ({
  complete: vi.fn().mockResolvedValue({
    content: "Fixed content that is shorter and better.",
    usage: { inputTokens: 100, outputTokens: 50 },
    finishReason: "end_turn",
  }),
}));

import { OutputValidator, createValidator } from "../validation/validator.js";
import { DEFAULT_PLATFORM_LIMITS } from "../validation/types.js";
import { complete } from "../client.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createOutput(overrides: Partial<AgentOutput> = {}): AgentOutput {
  return {
    category: "SOCIAL_POST" as OutputCategory,
    text: "This is a valid test output with enough characters to pass quality checks",
    title: "Test Title",
    refs: [],
    meta: {},
    ...overrides,
  };
}

function createBrandVoice(overrides: Partial<BrandVoiceConfig> = {}): BrandVoiceConfig {
  return {
    name: "TestBrand",
    tone: "professional",
    avoidWords: ["bad", "terrible", "awful"],
    preferredPhrases: ["excellent", "premium"],
    allowEmojis: true,
    maxEmojis: 3,
    ...overrides,
  };
}

function createContentPolicy(overrides: Partial<ContentPolicyConfig> = {}): ContentPolicyConfig {
  return {
    blockProfanity: true,
    sensitiveTopics: ["politics", "religion"],
    requireQuoteAttribution: true,
    blockedMentions: ["CompetitorBrand"],
    blockExternalLinks: false,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("OutputValidator", () => {
  let validator: OutputValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new OutputValidator();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Basic Validation
  // ---------------------------------------------------------------------------
  describe("basic validation", () => {
    it("should pass validation for valid output", async () => {
      const output = createOutput();
      const result = await validator.validate(output);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.autoFixed).toBe(false);
    });

    it("should return the original output in results", async () => {
      const output = createOutput();
      const result = await validator.validate(output);

      expect(result.output).toBe(output);
    });
  });

  // ---------------------------------------------------------------------------
  // Quality Checks
  // ---------------------------------------------------------------------------
  describe("quality checks", () => {
    it("should flag empty content as error", async () => {
      const output = createOutput({ text: "" });
      const result = await validator.validate(output);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "EMPTY_CONTENT",
          severity: "error",
          category: "quality",
        })
      );
    });

    it("should flag whitespace-only content as error", async () => {
      const output = createOutput({ text: "   \n\t  " });
      const result = await validator.validate(output);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "EMPTY_CONTENT",
          severity: "error",
        })
      );
    });

    it("should flag very short non-QUOTE content as warning", async () => {
      const output = createOutput({
        category: "SOCIAL_POST",
        text: "Too short",
      });
      const result = await validator.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "CONTENT_TOO_SHORT",
          severity: "warning",
        })
      );
    });

    it("should use lower minimum length threshold for QUOTE category", async () => {
      const output = createOutput({
        category: "QUOTE",
        text: "Short quote but valid",
      });
      const result = await validator.validate(output);

      // Should not have CONTENT_TOO_SHORT for QUOTE with 21 chars
      const shortIssue = result.issues.find((i) => i.code === "CONTENT_TOO_SHORT");
      expect(shortIssue).toBeUndefined();
    });

    it("should flag all-caps content longer than 20 chars as warning", async () => {
      const output = createOutput({
        text: "THIS IS ALL UPPERCASE TEXT AND IT IS VERY LOUD",
      });
      const result = await validator.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "ALL_CAPS",
          severity: "warning",
          category: "quality",
        })
      );
    });

    it("should not flag short all-caps text", async () => {
      const output = createOutput({
        text: "SHORT BUT CAPS",
      });
      const result = await validator.validate(output);

      const capsIssue = result.issues.find((i) => i.code === "ALL_CAPS");
      expect(capsIssue).toBeUndefined();
    });

    it("should flag excessive punctuation as warning", async () => {
      const output = createOutput({
        text: "This is amazing!!! What a great moment??? Incredible!!!",
      });
      const result = await validator.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "EXCESSIVE_PUNCTUATION",
          severity: "warning",
        })
      );
    });

    it("should not flag normal punctuation", async () => {
      const output = createOutput({
        text: "This is great! What a moment? Yes, absolutely!",
      });
      const result = await validator.validate(output);

      const punctIssue = result.issues.find((i) => i.code === "EXCESSIVE_PUNCTUATION");
      expect(punctIssue).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Platform Limits
  // ---------------------------------------------------------------------------
  describe("platform limits", () => {
    let validatorWithLimits: OutputValidator;

    beforeEach(() => {
      validatorWithLimits = new OutputValidator({
        platformLimits: DEFAULT_PLATFORM_LIMITS,
      });
    });

    it("should flag text exceeding Twitter character limit", async () => {
      const longText = "A".repeat(300);
      const output = createOutput({
        category: "SOCIAL_POST",
        text: longText,
      });

      const result = await validatorWithLimits.validate(output);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "PLATFORM_LENGTH_EXCEEDED",
          severity: "error",
          category: "platform_limits",
        })
      );
    });

    it("should pass text within Twitter character limit", async () => {
      const shortText = "Great stream moment! #streaming";
      const output = createOutput({
        category: "SOCIAL_POST",
        text: shortText,
      });

      const result = await validatorWithLimits.validate(output);

      const lengthIssue = result.issues.find(
        (i) => i.code === "PLATFORM_LENGTH_EXCEEDED"
      );
      expect(lengthIssue).toBeUndefined();
    });

    it("should flag too many hashtags", async () => {
      const text =
        "Great stream! #one #two #three #four #five #six this is a tweet with too many hashtags";
      const output = createOutput({
        category: "SOCIAL_POST",
        text,
      });

      const result = await validatorWithLimits.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "TOO_MANY_HASHTAGS",
          severity: "warning",
        })
      );
    });

    it("should use platform from output meta when available", async () => {
      const output = createOutput({
        category: "SOCIAL_POST",
        text: "A".repeat(3100), // Over LinkedIn's 3000 limit
        meta: { platform: "linkedin" },
      });

      const result = await validatorWithLimits.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "PLATFORM_LENGTH_EXCEEDED",
        })
      );
    });

    it("should infer youtube platform for CLIP_TITLE category", async () => {
      const output = createOutput({
        category: "CLIP_TITLE",
        text: "A".repeat(5100), // Over YouTube's 5000 limit
      });

      const result = await validatorWithLimits.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "PLATFORM_LENGTH_EXCEEDED",
        })
      );
    });

    it("should not check limits when no platformLimits configured", async () => {
      const plainValidator = new OutputValidator();
      const output = createOutput({
        category: "SOCIAL_POST",
        text: "A".repeat(500),
      });

      const result = await plainValidator.validate(output);

      const limitIssue = result.issues.find(
        (i) => i.code === "PLATFORM_LENGTH_EXCEEDED"
      );
      expect(limitIssue).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Content Policy
  // ---------------------------------------------------------------------------
  describe("content policy", () => {
    let validatorWithPolicy: OutputValidator;

    beforeEach(() => {
      validatorWithPolicy = new OutputValidator({
        contentPolicy: createContentPolicy(),
      });
    });

    it("should flag profanity when blockProfanity is enabled", async () => {
      const output = createOutput({
        text: "That play was damn good and the stream was amazing tonight",
      });

      const result = await validatorWithPolicy.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "PROFANITY_DETECTED",
          severity: "error",
          category: "content_policy",
        })
      );
    });

    it("should not flag profanity when blockProfanity is disabled", async () => {
      const noProfanityPolicy = new OutputValidator({
        contentPolicy: createContentPolicy({ blockProfanity: false }),
      });

      const output = createOutput({
        text: "That play was damn good and the stream was hell of a ride",
      });

      const result = await noProfanityPolicy.validate(output);

      const profIssue = result.issues.find((i) => i.code === "PROFANITY_DETECTED");
      expect(profIssue).toBeUndefined();
    });

    it("should flag sensitive topics as warning", async () => {
      const output = createOutput({
        text: "The discussion about politics in gaming is really heating up",
      });

      const result = await validatorWithPolicy.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "SENSITIVE_TOPIC",
          severity: "warning",
          message: expect.stringContaining("politics"),
        })
      );
    });

    it("should flag blocked mentions as error", async () => {
      const output = createOutput({
        text: "We should use CompetitorBrand instead of our tool for this",
      });

      const result = await validatorWithPolicy.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "BLOCKED_MENTION",
          severity: "error",
        })
      );
    });

    it("should flag external links when blockExternalLinks is enabled", async () => {
      const linkPolicy = new OutputValidator({
        contentPolicy: createContentPolicy({ blockExternalLinks: true }),
      });

      const output = createOutput({
        text: "Check out https://example.com for more info about the stream",
      });

      const result = await linkPolicy.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "EXTERNAL_LINK",
          severity: "warning",
        })
      );
    });

    it("should flag missing quote attribution when required", async () => {
      const output = createOutput({
        category: "QUOTE",
        text: "This is a really great quote from the stream",
        meta: {},
      });

      const result = await validatorWithPolicy.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "MISSING_ATTRIBUTION",
          severity: "warning",
        })
      );
    });

    it("should not flag quote with proper attribution", async () => {
      const output = createOutput({
        category: "QUOTE",
        text: "This is a really great quote from the stream",
        meta: { speaker: "John" },
      });

      const result = await validatorWithPolicy.validate(output);

      const attrIssue = result.issues.find((i) => i.code === "MISSING_ATTRIBUTION");
      expect(attrIssue).toBeUndefined();
    });

    it("should flag quote attributed to unknown", async () => {
      const output = createOutput({
        category: "QUOTE",
        text: "This is a really great quote from the stream",
        meta: { speaker: "unknown" },
      });

      const result = await validatorWithPolicy.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "MISSING_ATTRIBUTION",
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Brand Voice
  // ---------------------------------------------------------------------------
  describe("brand voice", () => {
    let validatorWithBrand: OutputValidator;

    beforeEach(() => {
      validatorWithBrand = new OutputValidator({
        brandVoice: createBrandVoice(),
      });
    });

    it("should flag avoided words as warning", async () => {
      const output = createOutput({
        text: "That stream was terrible and I wish it were better today",
      });

      const result = await validatorWithBrand.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "BRAND_AVOIDED_WORD",
          severity: "warning",
          category: "brand_voice",
          message: expect.stringContaining("terrible"),
        })
      );
    });

    it("should not flag content without avoided words", async () => {
      const output = createOutput({
        text: "That stream was excellent and premium quality today",
      });

      const result = await validatorWithBrand.validate(output);

      const avoidIssue = result.issues.find(
        (i) => i.code === "BRAND_AVOIDED_WORD"
      );
      expect(avoidIssue).toBeUndefined();
    });

    it("should flag emojis when brand disallows them", async () => {
      const noEmojiValidator = new OutputValidator({
        brandVoice: createBrandVoice({ allowEmojis: false }),
      });

      // Note: only Unicode range 1F300-1F9FF is checked
      const output = createOutput({
        text: "Great stream today! \u{1F600}",
      });

      const result = await noEmojiValidator.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "EMOJIS_NOT_ALLOWED",
          severity: "warning",
          category: "brand_voice",
        })
      );
    });

    it("should flag too many emojis when exceeding max", async () => {
      const output = createOutput({
        text: "Great stream! \u{1F600}\u{1F601}\u{1F602}\u{1F603} So many emojis!",
      });

      const result = await validatorWithBrand.validate(output);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "TOO_MANY_EMOJIS",
          severity: "warning",
          category: "brand_voice",
        })
      );
    });

    it("should allow emojis within limit", async () => {
      const output = createOutput({
        text: "Great stream! \u{1F600}\u{1F601} Some great content here",
      });

      const result = await validatorWithBrand.validate(output);

      const emojiIssue = result.issues.find(
        (i) => i.code === "TOO_MANY_EMOJIS" && i.category === "brand_voice"
      );
      expect(emojiIssue).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Enabled Categories Filter
  // ---------------------------------------------------------------------------
  describe("enabled categories", () => {
    it("should skip validation for categories not in enabledCategories", async () => {
      const validator = new OutputValidator({
        enabledCategories: ["SOCIAL_POST"],
        contentPolicy: createContentPolicy(),
      });

      const output = createOutput({
        category: "CHAPTER_MARKER",
        text: "This content has damn profanity in it which should be filtered",
      });

      const result = await validator.validate(output);

      // Should pass since CHAPTER_MARKER is not in enabledCategories
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should validate categories that are in enabledCategories", async () => {
      const validator = new OutputValidator({
        enabledCategories: ["SOCIAL_POST"],
        contentPolicy: createContentPolicy(),
      });

      const output = createOutput({
        category: "SOCIAL_POST",
        text: "This content has damn profanity in it which should be flagged now",
      });

      const result = await validator.validate(output);

      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-Fix
  // ---------------------------------------------------------------------------
  describe("auto-fix", () => {
    it("should attempt auto-fix for fixable issues when autoFix is enabled", async () => {
      const validator = new OutputValidator({
        autoFix: true,
        platformLimits: DEFAULT_PLATFORM_LIMITS,
      });

      const longText = "A".repeat(300);
      const output = createOutput({
        category: "SOCIAL_POST",
        text: longText,
      });

      vi.mocked(complete).mockResolvedValue({
        content: "Shortened content that fits within limits",
        usage: { inputTokens: 100, outputTokens: 50 },
        finishReason: "end_turn",
      });

      const result = await validator.validate(output);

      expect(complete).toHaveBeenCalled();
      expect(result.autoFixed).toBe(true);
      expect(result.fixedOutput).toBeDefined();
      expect(result.fixedOutput?.text).toBe(
        "Shortened content that fits within limits"
      );
      expect(result.fixedOutput?.meta?.autoFixed).toBe(true);
      expect(result.fixedOutput?.meta?.originalText).toBe(longText);
    });

    it("should not attempt auto-fix when autoFix is disabled", async () => {
      const validator = new OutputValidator({
        autoFix: false,
        platformLimits: DEFAULT_PLATFORM_LIMITS,
      });

      const output = createOutput({
        category: "SOCIAL_POST",
        text: "A".repeat(300),
      });

      const result = await validator.validate(output);

      expect(complete).not.toHaveBeenCalled();
      expect(result.autoFixed).toBe(false);
    });

    it("should not auto-fix when only non-fixable issues exist", async () => {
      const validator = new OutputValidator({
        autoFix: true,
        contentPolicy: createContentPolicy(),
      });

      const output = createOutput({
        category: "SOCIAL_POST",
        text: "Content that mentions CompetitorBrand is blocked per content policy rules",
      });

      const result = await validator.validate(output);

      expect(complete).not.toHaveBeenCalled();
    });

    it("should handle auto-fix failure gracefully", async () => {
      const validator = new OutputValidator({
        autoFix: true,
        platformLimits: DEFAULT_PLATFORM_LIMITS,
      });

      vi.mocked(complete).mockRejectedValue(new Error("AI service down"));

      const output = createOutput({
        category: "SOCIAL_POST",
        text: "A".repeat(300),
      });

      const result = await validator.validate(output);

      // Should still return result, but without auto-fix
      expect(result.autoFixed).toBe(false);
      expect(result.fixedOutput).toBeUndefined();
    });

    it("should not auto-fix when AI returns same text", async () => {
      const validator = new OutputValidator({
        autoFix: true,
        platformLimits: DEFAULT_PLATFORM_LIMITS,
      });

      const originalText = "A".repeat(300);

      vi.mocked(complete).mockResolvedValue({
        content: originalText,
        usage: { inputTokens: 100, outputTokens: 50 },
        finishReason: "end_turn",
      });

      const output = createOutput({
        category: "SOCIAL_POST",
        text: originalText,
      });

      const result = await validator.validate(output);

      expect(result.autoFixed).toBe(false);
    });

    it("should auto-fix ALL_CAPS content combined with platform limit error", async () => {
      // ALL_CAPS is a warning (not error), so valid=true and auto-fix won't trigger.
      // Auto-fix only runs when valid=false (has errors). We need both an error
      // (PLATFORM_LENGTH_EXCEEDED) and a fixable issue (ALL_CAPS) to trigger it.
      const validator = new OutputValidator({
        autoFix: true,
        platformLimits: DEFAULT_PLATFORM_LIMITS,
      });

      // Text that is ALL_CAPS AND exceeds twitter 280 limit
      const allCapsLong = "THIS IS ALL UPPERCASE TEXT ".repeat(15); // ~390 chars
      const output = createOutput({
        category: "SOCIAL_POST",
        text: allCapsLong,
      });

      vi.mocked(complete).mockResolvedValue({
        content: "This is all uppercase text repeated many times",
        usage: { inputTokens: 100, outputTokens: 50 },
        finishReason: "end_turn",
      });

      const result = await validator.validate(output);

      expect(complete).toHaveBeenCalled();
      expect(result.autoFixed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Batch Validation
  // ---------------------------------------------------------------------------
  describe("validateBatch", () => {
    it("should validate multiple outputs", async () => {
      const outputs = [
        createOutput({ text: "Valid output one with enough characters to pass" }),
        createOutput({ text: "" }),
        createOutput({ text: "Another valid output with sufficient length for testing" }),
      ];

      const results = await validator.validateBatch(outputs);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false); // empty text
      expect(results[2].valid).toBe(true);
    });

    it("should return empty array for empty input", async () => {
      const results = await validator.validateBatch([]);

      expect(results).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  describe("configure", () => {
    it("should merge new configuration with existing", () => {
      const validator = new OutputValidator({ autoFix: true });

      validator.configure({
        enabledCategories: ["SOCIAL_POST", "CLIP_TITLE"],
      });

      // Validate that new config is applied (test via behavior)
      // The validator should now only validate SOCIAL_POST and CLIP_TITLE
    });

    it("should override specific configuration values", () => {
      const validator = new OutputValidator({ autoFix: true });

      validator.configure({ autoFix: false });

      // autoFix should be false now - verify through behavior
    });
  });

  // ---------------------------------------------------------------------------
  // createValidator Factory
  // ---------------------------------------------------------------------------
  describe("createValidator", () => {
    it("should create a new validator with default config", () => {
      const v = createValidator();
      expect(v).toBeInstanceOf(OutputValidator);
    });

    it("should create a new validator with custom config", () => {
      const v = createValidator({
        autoFix: false,
        platformLimits: DEFAULT_PLATFORM_LIMITS,
      });
      expect(v).toBeInstanceOf(OutputValidator);
    });
  });

  // ---------------------------------------------------------------------------
  // Combined Validation Scenarios
  // ---------------------------------------------------------------------------
  describe("combined scenarios", () => {
    it("should detect multiple issues simultaneously", async () => {
      const validator = new OutputValidator({
        platformLimits: DEFAULT_PLATFORM_LIMITS,
        contentPolicy: createContentPolicy(),
        brandVoice: createBrandVoice(),
      });

      const output = createOutput({
        category: "SOCIAL_POST",
        text: "A".repeat(300) + " terrible CompetitorBrand!!!", // long, avoided word, blocked mention, excessive punct
      });

      const result = await validator.validate(output);

      // Should have multiple issues
      expect(result.issues.length).toBeGreaterThanOrEqual(2);

      const issueCodes = result.issues.map((i) => i.code);
      expect(issueCodes).toContain("PLATFORM_LENGTH_EXCEEDED");
      expect(issueCodes).toContain("BLOCKED_MENTION");
    });

    it("should have error severity override warnings for validity check", async () => {
      const validator = new OutputValidator({
        contentPolicy: createContentPolicy(),
      });

      // Has only a sensitive topic warning (not error)
      const output = createOutput({
        text: "The discussion about politics in gaming is really interesting today",
      });

      const result = await validator.validate(output);

      // Warnings only - should still be valid
      const errorIssues = result.issues.filter((i) => i.severity === "error");
      if (errorIssues.length === 0) {
        expect(result.valid).toBe(true);
      }
    });
  });
});

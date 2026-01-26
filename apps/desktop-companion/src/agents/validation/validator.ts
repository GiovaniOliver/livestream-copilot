/**
 * Output Validator
 *
 * Validates AI-generated outputs against brand voice, content policy,
 * and platform-specific requirements.
 */

import { logger } from "../../logger/index.js";
import { complete } from "../client.js";
import type { AgentOutput, OutputCategory } from "../types.js";
import type {
  BrandVoiceConfig,
  ContentPolicyConfig,
  PlatformLimits,
  ValidationConfig,
  ValidationIssue,
  ValidationResult,
  DEFAULT_PLATFORM_LIMITS,
} from "./types.js";

const validatorLogger = logger.child({ module: "validator" });

/**
 * Common profanity patterns (basic list - extend as needed).
 */
const PROFANITY_PATTERNS = [
  /\b(damn|hell|crap)\b/gi,
  // Add more patterns as needed
];

/**
 * Output validator class.
 */
export class OutputValidator {
  private config: ValidationConfig;

  constructor(config: ValidationConfig = {}) {
    this.config = {
      autoFix: true,
      ...config,
    };
  }

  /**
   * Update validator configuration.
   */
  configure(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate a single output.
   */
  async validate(output: AgentOutput): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // Check if category is enabled for validation
    if (
      this.config.enabledCategories &&
      !this.config.enabledCategories.includes(output.category)
    ) {
      return {
        valid: true,
        issues: [],
        output,
        autoFixed: false,
      };
    }

    // Run validation checks
    issues.push(...this.checkPlatformLimits(output));
    issues.push(...this.checkContentPolicy(output));
    issues.push(...this.checkBrandVoice(output));
    issues.push(...this.checkQuality(output));

    // Determine if valid (no errors)
    const valid = !issues.some((i) => i.severity === "error");

    // Attempt auto-fix if enabled
    let fixedOutput: AgentOutput | undefined;
    let autoFixed = false;

    if (!valid && this.config.autoFix) {
      const fixed = await this.attemptAutoFix(output, issues);
      if (fixed) {
        fixedOutput = fixed;
        autoFixed = true;
      }
    }

    validatorLogger.debug(
      {
        category: output.category,
        issueCount: issues.length,
        valid,
        autoFixed,
      },
      "Output validated"
    );

    return {
      valid: autoFixed ? true : valid,
      issues,
      output,
      fixedOutput,
      autoFixed,
    };
  }

  /**
   * Validate multiple outputs.
   */
  async validateBatch(outputs: AgentOutput[]): Promise<ValidationResult[]> {
    return Promise.all(outputs.map((o) => this.validate(o)));
  }

  /**
   * Check platform-specific limits.
   */
  private checkPlatformLimits(output: AgentOutput): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const limits = this.config.platformLimits;

    if (!limits) return issues;

    // Determine target platform from output category/meta
    const platform = (output.meta?.platform as string) || this.inferPlatform(output);
    const platformLimit = limits[platform];

    if (!platformLimit) return issues;

    // Check text length
    if (output.text.length > platformLimit.maxLength) {
      issues.push({
        code: "PLATFORM_LENGTH_EXCEEDED",
        message: `Text exceeds ${platform} character limit (${output.text.length}/${platformLimit.maxLength})`,
        severity: "error",
        category: "platform_limits",
        suggestion: `Shorten to ${platformLimit.maxLength} characters`,
        field: "text",
      });
    }

    // Check hashtag count
    if (platformLimit.maxHashtags) {
      const hashtagCount = (output.text.match(/#\w+/g) || []).length;
      if (hashtagCount > platformLimit.maxHashtags) {
        issues.push({
          code: "TOO_MANY_HASHTAGS",
          message: `Too many hashtags for ${platform} (${hashtagCount}/${platformLimit.maxHashtags})`,
          severity: "warning",
          category: "platform_limits",
          suggestion: `Reduce to ${platformLimit.maxHashtags} hashtags`,
          field: "text",
        });
      }
    }

    // Check emoji count
    if (platformLimit.maxEmojis) {
      const emojiCount = (output.text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
      if (emojiCount > platformLimit.maxEmojis) {
        issues.push({
          code: "TOO_MANY_EMOJIS",
          message: `Too many emojis for ${platform} (${emojiCount}/${platformLimit.maxEmojis})`,
          severity: "warning",
          category: "platform_limits",
          field: "text",
        });
      }
    }

    return issues;
  }

  /**
   * Check content policy violations.
   */
  private checkContentPolicy(output: AgentOutput): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const policy = this.config.contentPolicy;

    if (!policy) return issues;

    const textLower = output.text.toLowerCase();

    // Check profanity
    if (policy.blockProfanity) {
      for (const pattern of PROFANITY_PATTERNS) {
        if (pattern.test(output.text)) {
          issues.push({
            code: "PROFANITY_DETECTED",
            message: "Content contains potentially inappropriate language",
            severity: "error",
            category: "content_policy",
            suggestion: "Remove or replace inappropriate words",
            field: "text",
          });
          break;
        }
      }
    }

    // Check sensitive topics
    if (policy.sensitiveTopics) {
      for (const topic of policy.sensitiveTopics) {
        if (textLower.includes(topic.toLowerCase())) {
          issues.push({
            code: "SENSITIVE_TOPIC",
            message: `Content mentions sensitive topic: ${topic}`,
            severity: "warning",
            category: "content_policy",
            suggestion: "Review content for appropriateness",
            field: "text",
          });
        }
      }
    }

    // Check blocked mentions
    if (policy.blockedMentions) {
      for (const mention of policy.blockedMentions) {
        if (textLower.includes(mention.toLowerCase())) {
          issues.push({
            code: "BLOCKED_MENTION",
            message: `Content mentions blocked entity: ${mention}`,
            severity: "error",
            category: "content_policy",
            suggestion: "Remove the mention",
            field: "text",
          });
        }
      }
    }

    // Check external links
    if (policy.blockExternalLinks) {
      const urlPattern = /https?:\/\/[^\s]+/gi;
      if (urlPattern.test(output.text)) {
        issues.push({
          code: "EXTERNAL_LINK",
          message: "Content contains external links",
          severity: "warning",
          category: "content_policy",
          suggestion: "Remove external links or get approval",
          field: "text",
        });
      }
    }

    // Check quote attribution
    if (policy.requireQuoteAttribution && output.category === "QUOTE") {
      if (!output.meta?.speaker || output.meta.speaker === "unknown") {
        issues.push({
          code: "MISSING_ATTRIBUTION",
          message: "Quote is missing speaker attribution",
          severity: "warning",
          category: "content_policy",
          suggestion: "Add speaker name",
          field: "meta.speaker",
        });
      }
    }

    return issues;
  }

  /**
   * Check brand voice consistency.
   */
  private checkBrandVoice(output: AgentOutput): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const brand = this.config.brandVoice;

    if (!brand) return issues;

    const textLower = output.text.toLowerCase();

    // Check avoided words
    for (const word of brand.avoidWords) {
      if (textLower.includes(word.toLowerCase())) {
        issues.push({
          code: "BRAND_AVOIDED_WORD",
          message: `Content uses word to avoid: "${word}"`,
          severity: "warning",
          category: "brand_voice",
          suggestion: `Replace "${word}" with an alternative`,
          field: "text",
        });
      }
    }

    // Check emoji usage
    if (!brand.allowEmojis) {
      const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(output.text);
      if (hasEmojis) {
        issues.push({
          code: "EMOJIS_NOT_ALLOWED",
          message: "Content contains emojis but brand policy disallows them",
          severity: "warning",
          category: "brand_voice",
          suggestion: "Remove emojis",
          field: "text",
        });
      }
    } else if (brand.maxEmojis) {
      const emojiCount = (output.text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
      if (emojiCount > brand.maxEmojis) {
        issues.push({
          code: "TOO_MANY_EMOJIS",
          message: `Too many emojis (${emojiCount}/${brand.maxEmojis})`,
          severity: "warning",
          category: "brand_voice",
          field: "text",
        });
      }
    }

    return issues;
  }

  /**
   * Check content quality.
   */
  private checkQuality(output: AgentOutput): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for empty content
    if (!output.text || output.text.trim().length === 0) {
      issues.push({
        code: "EMPTY_CONTENT",
        message: "Output has no text content",
        severity: "error",
        category: "quality",
        field: "text",
      });
      return issues;
    }

    // Check for very short content (except for certain categories)
    const minLength = output.category === "QUOTE" ? 10 : 20;
    if (output.text.length < minLength) {
      issues.push({
        code: "CONTENT_TOO_SHORT",
        message: `Content is very short (${output.text.length} chars)`,
        severity: "warning",
        category: "quality",
        field: "text",
      });
    }

    // Check for all caps
    if (output.text === output.text.toUpperCase() && output.text.length > 20) {
      issues.push({
        code: "ALL_CAPS",
        message: "Content is all uppercase",
        severity: "warning",
        category: "quality",
        suggestion: "Convert to normal case",
        field: "text",
      });
    }

    // Check for excessive punctuation
    const excessivePunctuation = /[!?]{3,}/g;
    if (excessivePunctuation.test(output.text)) {
      issues.push({
        code: "EXCESSIVE_PUNCTUATION",
        message: "Content has excessive punctuation",
        severity: "warning",
        category: "quality",
        suggestion: "Reduce punctuation marks",
        field: "text",
      });
    }

    return issues;
  }

  /**
   * Infer target platform from output category.
   */
  private inferPlatform(output: AgentOutput): string {
    switch (output.category) {
      case "SOCIAL_POST":
        return "twitter"; // Default for social posts
      case "CLIP_TITLE":
        return "youtube";
      case "EPISODE_META":
        return "youtube"; // Podcast platforms
      default:
        return "twitter";
    }
  }

  /**
   * Attempt to auto-fix issues using AI.
   */
  private async attemptAutoFix(
    output: AgentOutput,
    issues: ValidationIssue[]
  ): Promise<AgentOutput | null> {
    // Only auto-fix certain issue types
    const fixableIssues = issues.filter(
      (i) =>
        i.code === "PLATFORM_LENGTH_EXCEEDED" ||
        i.code === "ALL_CAPS" ||
        i.code === "EXCESSIVE_PUNCTUATION"
    );

    if (fixableIssues.length === 0) {
      return null;
    }

    try {
      const prompt = `Fix the following content issues without changing the meaning:

ORIGINAL CONTENT:
"""
${output.text}
"""

ISSUES TO FIX:
${fixableIssues.map((i) => `- ${i.message}: ${i.suggestion || ""}`).join("\n")}

Provide ONLY the fixed text, no explanations.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: "claude-sonnet-4-20250514",
        maxTokens: 500,
        temperature: 0.3,
        systemPrompt: "You fix content while preserving its meaning and tone.",
      });

      const fixedText = response.content.trim();

      if (fixedText && fixedText !== output.text) {
        validatorLogger.info(
          { category: output.category, fixedIssues: fixableIssues.length },
          "Output auto-fixed"
        );

        return {
          ...output,
          text: fixedText,
          meta: {
            ...output.meta,
            autoFixed: true,
            originalText: output.text,
          },
        };
      }
    } catch (error) {
      validatorLogger.error({ err: error }, "Failed to auto-fix output");
    }

    return null;
  }
}

/**
 * Create a validator with default configuration.
 */
export function createValidator(config?: ValidationConfig): OutputValidator {
  return new OutputValidator(config);
}

/**
 * Global validator instance.
 */
export const outputValidator = new OutputValidator();

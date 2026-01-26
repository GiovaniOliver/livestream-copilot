/**
 * Validation Types
 *
 * Types for the brand/compliance validation gate.
 */

import type { AgentOutput, OutputCategory } from "../types.js";

/**
 * Validation severity levels.
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Validation rule categories.
 */
export type ValidationRuleCategory =
  | "brand_voice"
  | "content_policy"
  | "platform_limits"
  | "legal_compliance"
  | "quality";

/**
 * A validation issue found during review.
 */
export interface ValidationIssue {
  /** Unique issue code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Rule category */
  category: ValidationRuleCategory;
  /** Suggested fix if available */
  suggestion?: string;
  /** Field or text that triggered the issue */
  field?: string;
}

/**
 * Result of validating an output.
 */
export interface ValidationResult {
  /** Whether the output passed validation */
  valid: boolean;
  /** List of issues found */
  issues: ValidationIssue[];
  /** The original output */
  output: AgentOutput;
  /** Modified output if auto-fixed */
  fixedOutput?: AgentOutput;
  /** Whether the output was auto-fixed */
  autoFixed: boolean;
}

/**
 * Brand voice configuration.
 */
export interface BrandVoiceConfig {
  /** Brand name */
  name: string;
  /** Preferred tone */
  tone: "professional" | "casual" | "energetic" | "friendly" | "authoritative";
  /** Words to avoid */
  avoidWords: string[];
  /** Preferred phrases */
  preferredPhrases: string[];
  /** Whether to allow emojis */
  allowEmojis: boolean;
  /** Max emoji count per output */
  maxEmojis?: number;
  /** Hashtag preferences */
  hashtagStyle?: "none" | "minimal" | "moderate" | "heavy";
}

/**
 * Content policy configuration.
 */
export interface ContentPolicyConfig {
  /** Block profanity */
  blockProfanity: boolean;
  /** Block sensitive topics */
  sensitiveTopics: string[];
  /** Require attribution for quotes */
  requireQuoteAttribution: boolean;
  /** Block competitor mentions */
  blockedMentions: string[];
  /** Block external links */
  blockExternalLinks: boolean;
}

/**
 * Platform-specific limits.
 */
export interface PlatformLimits {
  [platform: string]: {
    maxLength: number;
    maxHashtags?: number;
    maxMentions?: number;
    maxEmojis?: number;
  };
}

/**
 * Full validation configuration.
 */
export interface ValidationConfig {
  /** Brand voice settings */
  brandVoice?: BrandVoiceConfig;
  /** Content policy settings */
  contentPolicy?: ContentPolicyConfig;
  /** Platform limits */
  platformLimits?: PlatformLimits;
  /** Categories to validate */
  enabledCategories?: OutputCategory[];
  /** Auto-fix minor issues */
  autoFix?: boolean;
}

/**
 * Default platform limits.
 */
export const DEFAULT_PLATFORM_LIMITS: PlatformLimits = {
  twitter: {
    maxLength: 280,
    maxHashtags: 5,
    maxMentions: 5,
    maxEmojis: 5,
  },
  linkedin: {
    maxLength: 3000,
    maxHashtags: 5,
    maxMentions: 10,
  },
  instagram: {
    maxLength: 2200,
    maxHashtags: 30,
  },
  youtube: {
    maxLength: 5000,
    maxHashtags: 15,
  },
  tiktok: {
    maxLength: 2200,
    maxHashtags: 10,
  },
};

/**
 * Validation Module
 *
 * Brand voice and compliance validation for AI-generated outputs.
 */

export type {
  ValidationSeverity,
  ValidationRuleCategory,
  ValidationIssue,
  ValidationResult,
  BrandVoiceConfig,
  ContentPolicyConfig,
  PlatformLimits,
  ValidationConfig,
} from "./types.js";

export { DEFAULT_PLATFORM_LIMITS } from "./types.js";

export {
  OutputValidator,
  createValidator,
  outputValidator,
} from "./validator.js";

/**
 * Configuration Module
 *
 * This module provides type-safe access to environment configuration.
 * All environment variables are validated at import time, ensuring
 * the application fails fast with clear error messages if configuration
 * is missing or invalid.
 *
 * Usage:
 *   import { config } from './config';
 *   console.log(config.HTTP_PORT); // Type-safe access
 */

import dotenv from "dotenv";
import { validateEnv, type Env, envSchema, getEnvSchemaInfo } from "./env.js";

// Load .env file before validation
dotenv.config();

/**
 * Validated configuration object.
 * This is validated once at module load time.
 * If validation fails, the application will exit with a detailed error message.
 */
let config: Env;

try {
  config = validateEnv();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

export { config };
export type { Env };
export type Config = Env;

// Re-export utilities for testing and documentation
export { validateEnv, envSchema, getEnvSchemaInfo };

/**
 * Type guard to check if we're in development mode
 */
export function isDevelopment(): boolean {
  return config.NODE_ENV === "development";
}

/**
 * Type guard to check if we're in production mode
 */
export function isProduction(): boolean {
  return config.NODE_ENV === "production";
}

/**
 * Type guard to check if we're in test mode
 */
export function isTest(): boolean {
  return config.NODE_ENV === "test";
}

/**
 * Check if Opik observability is configured
 */
export function isOpikConfigured(): boolean {
  return !!(config.OPIK_WORKSPACE_NAME && config.OPIK_PROJECT_NAME);
}

/**
 * Get the configured STT API key based on provider
 */
export function getSTTApiKey(): string | undefined {
  switch (config.STT_PROVIDER) {
    case "deepgram":
      return config.DEEPGRAM_API_KEY;
    case "assemblyai":
      return config.ASSEMBLYAI_API_KEY;
    case "whisper":
      return undefined; // Whisper uses local model
    default:
      return undefined;
  }
}

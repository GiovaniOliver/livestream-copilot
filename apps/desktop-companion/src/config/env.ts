import { z } from "zod";

/**
 * Environment variable schema with validation and defaults.
 * All environment variables are validated at startup to ensure
 * the application has all required configuration.
 */
export const envSchema = z.object({
  // ===================
  // Server Configuration
  // ===================
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .describe("Application environment"),
  HTTP_PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3123)
    .describe("HTTP server port"),
  WS_PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3124)
    .describe("WebSocket server port"),

  // ===================
  // App Configuration
  // ===================
  APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .describe("Application base URL"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3002")
    .describe("Comma-separated list of allowed CORS origins"),

  // ===================
  // JWT Configuration
  // ===================
  JWT_SECRET: z
    .string()
    .min(32)
    .describe("Secret key for signing access tokens (minimum 32 characters)"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .describe("Secret key for signing refresh tokens (minimum 32 characters)"),
  JWT_ACCESS_EXPIRY: z.coerce
    .number()
    .int()
    .positive()
    .default(900)
    .describe("Access token expiry in seconds (default: 900 = 15 minutes)"),
  JWT_REFRESH_EXPIRY: z.coerce
    .number()
    .int()
    .positive()
    .default(604800)
    .describe("Refresh token expiry in seconds (default: 604800 = 7 days)"),

  // ===================
  // OAuth Providers
  // ===================
  GOOGLE_CLIENT_ID: z
    .string()
    .optional()
    .describe("Google OAuth client ID"),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("Google OAuth client secret"),
  GITHUB_CLIENT_ID: z
    .string()
    .optional()
    .describe("GitHub OAuth client ID"),
  GITHUB_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("GitHub OAuth client secret"),
  TWITCH_CLIENT_ID: z
    .string()
    .optional()
    .describe("Twitch OAuth client ID"),
  TWITCH_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("Twitch OAuth client secret"),

  // ===================
  // Social Media Platforms
  // ===================
  YOUTUBE_CLIENT_ID: z
    .string()
    .optional()
    .describe("YouTube/Google OAuth client ID for social posting"),
  YOUTUBE_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("YouTube/Google OAuth client secret for social posting"),
  TWITTER_CLIENT_ID: z
    .string()
    .optional()
    .describe("Twitter/X OAuth 2.0 client ID"),
  TWITTER_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("Twitter/X OAuth 2.0 client secret"),
  TIKTOK_CLIENT_KEY: z
    .string()
    .optional()
    .describe("TikTok client key (app key)"),
  TIKTOK_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("TikTok client secret"),
  LINKEDIN_CLIENT_ID: z
    .string()
    .optional()
    .describe("LinkedIn OAuth client ID"),
  LINKEDIN_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("LinkedIn OAuth client secret"),

  // ===================
  // Email Configuration
  // ===================
  EMAIL_PROVIDER: z
    .enum(["resend", "sendgrid", "smtp"])
    .default("resend")
    .describe("Email service provider"),
  RESEND_API_KEY: z
    .string()
    .optional()
    .describe("Resend API key for sending emails"),
  EMAIL_FROM: z
    .string()
    .email()
    .default("noreply@fluxboard.app")
    .describe("Default sender email address"),

  // ===================
  // OBS Configuration
  // ===================
  OBS_WS_URL: z
    .string()
    .url()
    .default("ws://127.0.0.1:4455")
    .describe("OBS WebSocket URL"),
  OBS_WS_PASSWORD: z
    .string()
    .optional()
    .describe("OBS WebSocket password (if authentication is enabled)"),
  REPLAY_BUFFER_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(300)
    .describe("Replay buffer duration in seconds (configured in OBS)"),

  // ===================
  // Database Configuration
  // ===================
  DATABASE_URL: z
    .string()
    .url()
    .optional()
    .describe("Database connection URL (e.g., postgresql://user:pass@host:5432/db)"),

  // ===================
  // STT (Speech-to-Text) Configuration
  // ===================
  STT_PROVIDER: z
    .enum(["deepgram", "assemblyai", "whisper"])
    .default("deepgram")
    .describe("Speech-to-text provider to use"),
  DEEPGRAM_API_KEY: z
    .string()
    .optional()
    .describe("Deepgram API key for STT"),
  ASSEMBLYAI_API_KEY: z
    .string()
    .optional()
    .describe("AssemblyAI API key for STT"),
  WHISPER_MODEL_PATH: z
    .string()
    .optional()
    .describe("Path to local Whisper model (for local STT)"),

  // ===================
  // AI Agent Configuration
  // ===================
  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .describe("Anthropic API key for Claude models"),
  OPENAI_API_KEY: z
    .string()
    .optional()
    .describe("OpenAI API key (alternative to Claude)"),
  AI_PROVIDER: z
    .enum(["anthropic", "openai"])
    .default("anthropic")
    .describe("AI provider to use for agents"),
  AI_MODEL: z
    .string()
    .default("claude-sonnet-4-20250514")
    .describe("Model identifier for AI agent"),
  AI_MAX_TOKENS: z.coerce
    .number()
    .int()
    .positive()
    .default(4096)
    .describe("Max tokens for AI responses"),

  // ===================
  // Observability (Opik) Configuration
  // ===================
  OPIK_WORKSPACE_NAME: z
    .string()
    .optional()
    .describe("Opik workspace name for tracing"),
  OPIK_PROJECT_NAME: z
    .string()
    .optional()
    .describe("Opik project name for tracing"),
  OPIK_API_KEY: z
    .string()
    .optional()
    .describe("Opik API key (not required for self-hosted)"),
  OPIK_URL_OVERRIDE: z
    .string()
    .url()
    .optional()
    .describe("Opik URL override for self-hosted deployments"),

  // ===================
  // Logging Configuration
  // ===================
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info")
    .describe("Minimum log level to output"),
  LOG_FORMAT: z
    .enum(["json", "pretty"])
    .default("pretty")
    .describe("Log output format"),

  // ===================
  // Path Configuration
  // ===================
  SESSION_DIR: z
    .string()
    .default("./sessions")
    .describe("Directory to store session data"),
  FFMPEG_PATH: z
    .string()
    .optional()
    .describe("Path to ffmpeg binary (uses PATH if not specified)"),

  // ===================
  // Bunny.net Storage Configuration
  // ===================
  BUNNY_STORAGE_ZONE: z
    .string()
    .optional()
    .describe("Bunny.net storage zone name"),
  BUNNY_STORAGE_API_KEY: z
    .string()
    .optional()
    .describe("Bunny.net storage API key"),
  BUNNY_CDN_URL: z
    .string()
    .url()
    .optional()
    .describe("Bunny.net CDN URL for serving files"),
  BUNNY_STREAM_LIBRARY_ID: z
    .string()
    .optional()
    .describe("Bunny.net Stream library ID for video hosting"),
  BUNNY_STREAM_API_KEY: z
    .string()
    .optional()
    .describe("Bunny.net Stream API key"),

  // ===================
  // Frontend Configuration
  // ===================
  FRONTEND_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .describe("Frontend application URL for OAuth redirects"),

  // ===================
  // Stripe Configuration
  // ===================
  STRIPE_SECRET_KEY: z
    .string()
    .optional()
    .describe("Stripe secret key for server-side API calls"),
  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .optional()
    .describe("Stripe publishable key for client-side usage"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional()
    .describe("Stripe webhook signing secret for verifying webhook events"),
  STRIPE_STARTER_MONTHLY_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe price ID for Starter monthly plan"),
  STRIPE_STARTER_YEARLY_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe price ID for Starter yearly plan"),
  STRIPE_PRO_MONTHLY_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe price ID for Pro monthly plan"),
  STRIPE_PRO_YEARLY_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe price ID for Pro yearly plan"),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe price ID for Enterprise monthly plan"),
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe price ID for Enterprise yearly plan"),

  // ===================
  // API Key Configuration
  // ===================
  API_KEY_ENV: z
    .enum(["live", "test"])
    .default("test")
    .describe("Environment prefix for generated API keys (live or test)"),

  // ===================
  // Sentry Error Monitoring
  // ===================
  SENTRY_DSN: z
    .string()
    .url()
    .optional()
    .describe("Sentry DSN for error tracking"),
  SENTRY_ENVIRONMENT: z
    .string()
    .optional()
    .describe("Sentry environment name (defaults to NODE_ENV)"),
  SENTRY_RELEASE: z
    .string()
    .optional()
    .describe("Sentry release identifier for source map association"),
});

/**
 * Inferred TypeScript type from the Zod schema.
 * Use this type throughout the application for type-safe config access.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Format Zod validation errors into a human-readable message.
 */
function formatValidationErrors(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".");
    const message = issue.message;

    switch (issue.code) {
      case "invalid_type":
        if (issue.received === "undefined") {
          return `  - ${path}: Required but not provided`;
        }
        return `  - ${path}: Expected ${issue.expected}, received ${issue.received}`;
      case "invalid_enum_value":
        return `  - ${path}: Invalid value. Expected one of: ${(issue.options as string[]).join(", ")}`;
      case "invalid_string":
        if (issue.validation === "url") {
          return `  - ${path}: Must be a valid URL`;
        }
        return `  - ${path}: ${message}`;
      default:
        return `  - ${path}: ${message}`;
    }
  });

  return issues.join("\n");
}

/**
 * Validates environment variables against the schema.
 * Throws a detailed error message if validation fails.
 *
 * @param env - The environment object to validate (defaults to process.env)
 * @returns Validated and typed configuration object
 * @throws Error with detailed validation message if validation fails
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const errorMessage = formatValidationErrors(result.error);
    const missingRequired = result.error.issues
      .filter(
        (issue) =>
          issue.code === "invalid_type" && issue.received === "undefined"
      )
      .map((issue) => issue.path.join("."));

    let fullMessage = "\n";
    fullMessage += "=".repeat(60) + "\n";
    fullMessage += "  ENVIRONMENT CONFIGURATION ERROR\n";
    fullMessage += "=".repeat(60) + "\n\n";
    fullMessage += "The following environment variables have issues:\n\n";
    fullMessage += errorMessage + "\n\n";

    if (missingRequired.length > 0) {
      fullMessage += "-".repeat(60) + "\n";
      fullMessage += "Missing required variables:\n";
      missingRequired.forEach((varName) => {
        fullMessage += `  - ${varName}\n`;
      });
      fullMessage += "\n";
    }

    fullMessage += "-".repeat(60) + "\n";
    fullMessage += "Please check your .env file or environment variables.\n";
    fullMessage += "See .env.example for reference.\n";
    fullMessage += "=".repeat(60) + "\n";

    throw new Error(fullMessage);
  }

  return result.data;
}

/**
 * Returns schema information for documentation purposes.
 * Useful for generating .env.example or documentation.
 */
export function getEnvSchemaInfo(): Array<{
  key: string;
  type: string;
  required: boolean;
  default?: unknown;
  description?: string;
}> {
  const shape = envSchema.shape;
  const info: Array<{
    key: string;
    type: string;
    required: boolean;
    default?: unknown;
    description?: string;
  }> = [];

  for (const [key, schema] of Object.entries(shape)) {
    const zodSchema = schema as z.ZodTypeAny;
    const description = zodSchema.description;

    // Unwrap defaults and optionals to get the base type
    let baseSchema = zodSchema;
    let hasDefault = false;
    let defaultValue: unknown;
    let isOptional = false;

    // Check for ZodDefault
    if (baseSchema._def.typeName === "ZodDefault") {
      hasDefault = true;
      defaultValue = baseSchema._def.defaultValue();
      baseSchema = baseSchema._def.innerType;
    }

    // Check for ZodOptional
    if (baseSchema._def.typeName === "ZodOptional") {
      isOptional = true;
      baseSchema = baseSchema._def.innerType;
    }

    // Determine type string
    let typeStr = baseSchema._def.typeName.replace("Zod", "").toLowerCase();
    if (baseSchema._def.typeName === "ZodEnum") {
      typeStr = `enum(${baseSchema._def.values.join("|")})`;
    }
    if (baseSchema._def.typeName === "ZodNumber") {
      if (baseSchema._def.coerce) {
        typeStr = "number (coerced from string)";
      }
    }

    info.push({
      key,
      type: typeStr,
      required: !isOptional && !hasDefault,
      default: hasDefault ? defaultValue : undefined,
      description,
    });
  }

  return info;
}

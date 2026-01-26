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
});
/**
 * Format Zod validation errors into a human-readable message.
 */
function formatValidationErrors(error) {
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
                return `  - ${path}: Invalid value. Expected one of: ${issue.options.join(", ")}`;
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
export function validateEnv(env = process.env) {
    const result = envSchema.safeParse(env);
    if (!result.success) {
        const errorMessage = formatValidationErrors(result.error);
        const missingRequired = result.error.issues
            .filter((issue) => issue.code === "invalid_type" && issue.received === "undefined")
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
export function getEnvSchemaInfo() {
    const shape = envSchema.shape;
    const info = [];
    for (const [key, schema] of Object.entries(shape)) {
        const zodSchema = schema;
        const description = zodSchema.description;
        // Unwrap defaults and optionals to get the base type
        let baseSchema = zodSchema;
        let hasDefault = false;
        let defaultValue;
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

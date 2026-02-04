/**
 * Centralized application configuration
 *
 * This module provides type-safe access to environment variables and configuration values.
 * All environment-dependent configuration should be accessed through this module.
 */

/**
 * Validates that a required environment variable is set
 */
function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please add ${key} to your .env.local file`
    );
  }

  return value;
}

/**
 * Gets an optional environment variable with a default value
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * API Configuration
 */
export const API_CONFIG = {
  /**
   * Base URL for REST API endpoints
   * @default "http://localhost:3123"
   */
  baseUrl: getEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3123'),

  /**
   * Base URL for WebSocket connections
   * @default "ws://localhost:3124"
   */
  wsUrl: getEnv('NEXT_PUBLIC_WS_URL', 'ws://localhost:3124'),

  /**
   * Desktop companion API URL (legacy)
   * @default "http://localhost:3123"
   */
  desktopApiUrl: getEnv('NEXT_PUBLIC_DESKTOP_API_URL', 'http://localhost:3123'),

  /**
   * Desktop companion WebSocket URL (legacy)
   * @default "ws://localhost:3124"
   */
  desktopWsUrl: getEnv('NEXT_PUBLIC_DESKTOP_WS_URL', 'ws://localhost:3124'),

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout: parseInt(getEnv('NEXT_PUBLIC_API_TIMEOUT', '30000'), 10),

  /**
   * Enable request/response logging
   * @default false in production, true in development
   */
  enableLogging: process.env.NODE_ENV === 'development',
} as const;

/**
 * Application Configuration
 */
export const APP_CONFIG = {
  /**
   * Application name
   */
  name: 'Livestream Copilot',

  /**
   * Application version (from package.json)
   */
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  /**
   * Environment name
   */
  environment: process.env.NODE_ENV || 'development',

  /**
   * Is production environment
   */
  isProduction: process.env.NODE_ENV === 'production',

  /**
   * Is development environment
   */
  isDevelopment: process.env.NODE_ENV === 'development',

  /**
   * Public URL of the application
   */
  publicUrl: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
} as const;

/**
 * Feature Flags
 */
export const FEATURES = {
  /**
   * Enable visual triggers feature
   */
  visualTriggers: getEnv('NEXT_PUBLIC_FEATURE_VISUAL_TRIGGERS', 'true') === 'true',

  /**
   * Enable gesture recognition
   */
  gestureRecognition: getEnv('NEXT_PUBLIC_FEATURE_GESTURES', 'true') === 'true',

  /**
   * Enable clip queue
   */
  clipQueue: getEnv('NEXT_PUBLIC_FEATURE_CLIP_QUEUE', 'true') === 'true',

  /**
   * Enable analytics
   */
  analytics: getEnv('NEXT_PUBLIC_FEATURE_ANALYTICS', 'false') === 'true',
} as const;

/**
 * Media Configuration
 */
export const MEDIA_CONFIG = {
  /**
   * Maximum file upload size (bytes)
   * @default 500MB
   */
  maxUploadSize: parseInt(getEnv('NEXT_PUBLIC_MAX_UPLOAD_SIZE', String(500 * 1024 * 1024)), 10),

  /**
   * Supported video formats
   */
  supportedVideoFormats: ['mp4', 'webm', 'mov', 'avi'],

  /**
   * Supported image formats
   */
  supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
} as const;

/**
 * Type for API configuration
 */
export type ApiConfig = typeof API_CONFIG;

/**
 * Type for app configuration
 */
export type AppConfig = typeof APP_CONFIG;

/**
 * Type for feature flags
 */
export type Features = typeof FEATURES;

/**
 * Type for media configuration
 */
export type MediaConfig = typeof MEDIA_CONFIG;

/**
 * Complete configuration type
 */
export type Config = typeof config;

/**
 * Type-safe configuration object
 */
export const config = {
  api: API_CONFIG,
  app: APP_CONFIG,
  features: FEATURES,
  media: MEDIA_CONFIG,
} as const;

/**
 * Validates configuration at build time
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate API URLs
  try {
    new URL(API_CONFIG.baseUrl);
  } catch {
    errors.push(`Invalid API_URL: ${API_CONFIG.baseUrl}`);
  }

  // Validate WebSocket URLs (basic check, not using URL constructor)
  if (!API_CONFIG.wsUrl.startsWith('ws://') && !API_CONFIG.wsUrl.startsWith('wss://')) {
    errors.push(`Invalid WS_URL: ${API_CONFIG.wsUrl}`);
  }

  // Validate timeout
  if (API_CONFIG.timeout <= 0) {
    errors.push(`Invalid timeout: ${API_CONFIG.timeout}`);
  }

  // Validate max upload size
  if (MEDIA_CONFIG.maxUploadSize <= 0) {
    errors.push(`Invalid max upload size: ${MEDIA_CONFIG.maxUploadSize}`);
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.join('\n')}`
    );
  }
}

// Run validation in development
if (process.env.NODE_ENV === 'development') {
  validateConfig();
}

// Export individual configs for convenience
export { API_CONFIG as api, APP_CONFIG as app, FEATURES as features, MEDIA_CONFIG as media };

// Default export
export default config;

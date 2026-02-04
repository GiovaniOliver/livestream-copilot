# Configuration Usage Guide

## Overview

This guide explains how to use the centralized configuration system in the FluxBoard web application. All environment-dependent configuration is now managed through a single source of truth: `lib/config.ts`.

## Importing Configuration

```typescript
import { API_CONFIG, config } from '@/lib/config';

// Use specific config
const apiUrl = API_CONFIG.baseUrl;

// Or use grouped config
const apiUrl = config.api.baseUrl;
```

## Available Configuration

### API Configuration (`API_CONFIG` or `config.api`)

Contains all API-related settings:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `baseUrl` | string | `http://localhost:3123` | Base URL for REST API endpoints |
| `wsUrl` | string | `ws://localhost:3124` | Base URL for WebSocket connections |
| `desktopApiUrl` | string | `http://localhost:3123` | Desktop companion API URL (legacy) |
| `desktopWsUrl` | string | `ws://localhost:3124` | Desktop companion WebSocket URL (legacy) |
| `timeout` | number | `30000` | Request timeout in milliseconds |
| `enableLogging` | boolean | `true` in dev | Enable request/response logging |

**Usage:**
```typescript
import { API_CONFIG } from '@/lib/config';

// Fetch from API
const response = await fetch(`${API_CONFIG.baseUrl}/api/sessions`);

// Connect to WebSocket
const ws = new WebSocket(API_CONFIG.wsUrl);

// Use with custom timeout
const data = await apiClient.get('/data', { timeout: API_CONFIG.timeout });
```

### App Configuration (`APP_CONFIG` or `config.app`)

Contains application metadata:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | `Livestream Copilot` | Application name |
| `version` | string | `1.0.0` | Application version |
| `environment` | string | `development` | Environment name |
| `isProduction` | boolean | false | Is production environment |
| `isDevelopment` | boolean | true | Is development environment |
| `publicUrl` | string | `http://localhost:3000` | Public URL of the application |

**Usage:**
```typescript
import { APP_CONFIG } from '@/lib/config';

console.log(`Running ${APP_CONFIG.name} v${APP_CONFIG.version}`);

if (APP_CONFIG.isDevelopment) {
  // Enable development features
}
```

### Feature Flags (`FEATURES` or `config.features`)

Controls feature availability:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `visualTriggers` | boolean | `true` | Enable visual triggers feature |
| `gestureRecognition` | boolean | `true` | Enable gesture recognition |
| `clipQueue` | boolean | `true` | Enable clip queue |
| `analytics` | boolean | `false` | Enable analytics |

**Usage:**
```typescript
import { FEATURES } from '@/lib/config';

if (FEATURES.gestureRecognition) {
  // Initialize gesture recognition
}

if (FEATURES.analytics) {
  trackEvent('page_view');
}
```

### Media Configuration (`MEDIA_CONFIG` or `config.media`)

Contains media handling settings:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxUploadSize` | number | `524288000` | Maximum file upload size (500MB) |
| `supportedVideoFormats` | string[] | `['mp4', 'webm', 'mov', 'avi']` | Supported video formats |
| `supportedImageFormats` | string[] | `['jpg', 'jpeg', 'png', 'gif', 'webp']` | Supported image formats |

**Usage:**
```typescript
import { MEDIA_CONFIG } from '@/lib/config';

// Validate file upload
if (file.size > MEDIA_CONFIG.maxUploadSize) {
  throw new Error('File too large');
}

// Check format
const ext = file.name.split('.').pop()?.toLowerCase();
if (!MEDIA_CONFIG.supportedVideoFormats.includes(ext)) {
  throw new Error('Unsupported format');
}
```

## Adding New Configuration

### Step 1: Add Environment Variable

Add to `.env.sample`:
```bash
# My new feature
NEXT_PUBLIC_MY_FEATURE_SETTING=value
```

### Step 2: Add to Config

Update `lib/config.ts`:
```typescript
export const MY_FEATURE_CONFIG = {
  /**
   * My setting description
   * @default "default_value"
   */
  mySetting: getEnv('NEXT_PUBLIC_MY_FEATURE_SETTING', 'default_value'),
} as const;

// Add to main config object
export const config = {
  api: API_CONFIG,
  app: APP_CONFIG,
  features: FEATURES,
  media: MEDIA_CONFIG,
  myFeature: MY_FEATURE_CONFIG, // Add here
} as const;
```

### Step 3: Export Types

Add TypeScript types:
```typescript
export type MyFeatureConfig = typeof MY_FEATURE_CONFIG;

// Update Config type
export type Config = typeof config;
```

### Step 4: Export from Index

Update `lib/index.ts`:
```typescript
export { MY_FEATURE_CONFIG } from './config';
export type { MyFeatureConfig } from './config';
```

### Step 5: Document

Add your configuration to this file under "Available Configuration".

## Best Practices

### DO:
- Always use centralized config instead of `process.env` directly
- Use the provided helper functions (`getEnv`, `requireEnv`)
- Add JSDoc comments for all config properties
- Set sensible defaults
- Validate config values when needed

### DON'T:
- Don't hardcode URLs or endpoints in components
- Don't use `process.env` directly in components or hooks
- Don't forget to add new env vars to `.env.sample`
- Don't skip type annotations

## Environment Variables

All environment variables should be defined in `.env.local` (not committed) and documented in `.env.sample` (committed).

### Variable Naming Convention

- `NEXT_PUBLIC_*` - Client-side accessible variables
- `*_URL` - Endpoint URLs
- `*_API_*` - API-related settings
- `NEXT_PUBLIC_FEATURE_*` - Feature flags

### Example .env.local

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3123
NEXT_PUBLIC_WS_URL=ws://localhost:3124
NEXT_PUBLIC_API_TIMEOUT=30000

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_VERSION=1.0.0

# Feature Flags
NEXT_PUBLIC_FEATURE_VISUAL_TRIGGERS=true
NEXT_PUBLIC_FEATURE_GESTURES=true
```

## Migration from Old Pattern

### Before (Hardcoded):
```typescript
const apiBase = process.env.NEXT_PUBLIC_DESKTOP_API_URL || "http://localhost:3123";
const wsBase = process.env.NEXT_PUBLIC_DESKTOP_WS_URL || "ws://localhost:3124";
```

### After (Centralized):
```typescript
import { API_CONFIG } from '@/lib/config';

const apiBase = API_CONFIG.desktopApiUrl;
const wsBase = API_CONFIG.desktopWsUrl;
```

## Configuration Validation

The config module automatically validates settings on load in development mode. If validation fails, you'll see an error message indicating which config value is invalid.

Example validation error:
```
Configuration validation failed:
Invalid API_URL: not-a-url
Invalid timeout: -1
```

## Type Safety

All configuration is fully type-safe:

```typescript
import { config, type Config } from '@/lib/config';

// TypeScript knows all available properties
const timeout: number = config.api.timeout;
const features: boolean = config.features.clipQueue;

// Type checking prevents typos
const wrong = config.api.nonExistent; // ❌ TypeScript error
```

## Testing

When writing tests, you can override configuration:

```typescript
import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://test-api.com');

// Re-import config to get new values
vi.resetModules();
const { API_CONFIG } = await import('@/lib/config');

expect(API_CONFIG.baseUrl).toBe('http://test-api.com');
```

## Troubleshooting

### Config not updating
Make sure to restart the dev server after changing `.env.local`.

### TypeScript errors
Run `pnpm run type-check` to verify types are correct.

### Validation errors
Check that all required environment variables are set in `.env.local`.

## Related Files

- `apps/web/src/lib/config.ts` - Main config module
- `apps/web/src/lib/index.ts` - Re-exports config
- `apps/web/.env.sample` - Environment variable template
- `apps/web/.env.local` - Your local environment (not committed)

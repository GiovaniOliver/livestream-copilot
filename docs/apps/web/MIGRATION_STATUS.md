# API Endpoint Configuration Migration Status (SOC-410)

## Summary

Centralized API endpoint configuration has been implemented. This document tracks the migration progress and lists remaining files that need to be updated.

## Completed

### Core Infrastructure
- [x] Created `src/lib/config.ts` - Centralized configuration module
- [x] Created `.env.sample` - Environment variable template
- [x] Updated `src/lib/index.ts` - Export config from main lib index
- [x] Created `src/lib/CONFIG_USAGE.md` - Documentation

### Critical Files Updated
- [x] `src/hooks/useClipQueue.ts` - Updated to use `API_CONFIG.desktopApiUrl` and `API_CONFIG.desktopWsUrl`
- [x] `src/components/clip-queue/ClipQueueDashboard.tsx` - Updated to use `API_CONFIG.desktopApiUrl` and `API_CONFIG.desktopWsUrl`
- [x] `src/lib/api/client.ts` - Updated to use `API_CONFIG.baseUrl` and `API_CONFIG.timeout`
- [x] `src/lib/api/websocket.ts` - Updated to use `API_CONFIG.wsUrl`
- [x] `src/lib/constants.ts` - Re-exports `API_CONFIG` from config module (backward compatibility)

### High Priority Production Files (All Completed)
- [x] `src/app/auth/callback/page.tsx` - Updated to use `API_CONFIG.baseUrl`
- [x] `src/app/dashboard/agent-observability/page.tsx` - Updated to use `API_CONFIG.baseUrl`
- [x] `src/app/dashboard/agent-workflows/[workflow]/page.tsx` - Updated to use `API_CONFIG.desktopApiUrl`
- [x] `src/app/dashboard/session/[id]/streamer/page.tsx` - Updated to use `API_CONFIG.desktopWsUrl`
- [x] `src/components/dashboards/streamer/types.ts` - Updated to use `API_CONFIG.desktopApiUrl` (2 instances)
- [x] `src/hooks/useLiveStream.ts` - Updated to use `API_CONFIG.baseUrl`
- [x] `src/hooks/useMediaPipeGestures.ts` - Updated to use `API_CONFIG.desktopWsUrl`
- [x] `src/hooks/useSessions.ts` - Updated to use `API_CONFIG.wsUrl`
- [x] `src/lib/api/auth.ts` - Updated to use `API_CONFIG.baseUrl`
- [x] `src/lib/api/clips.ts` - Updated to use `API_CONFIG.baseUrl` (2 instances)
- [x] `src/lib/api/health.ts` - Updated to use `API_CONFIG.baseUrl`

## Migration Complete! ✅

All high-priority production files have been migrated to use the centralized API configuration.

### Summary of Changes
- **Total files migrated:** 17 files
- **Core infrastructure:** 4 files (config.ts, .env.sample, index.ts, constants.ts)
- **Production files:** 11 files
- **Documentation:** 2 files (CONFIG_USAGE.md, MIGRATION_STATUS.md)

### Remaining Files (Optional - Test Files)

### Test Files (Optional Migration)

The following test files still use environment variables directly. This is acceptable for test mocks:

1. **src/__tests__/hooks/useSessions.test.ts** (Lines 19-20, 196)
   - Uses `vi.stubEnv()` for test mocking
   - No migration needed - test environment setup is intentionally explicit

2. **src/__tests__/setup.ts** (Lines 15-16)
   - Sets up test environment variables
   - No migration needed - test setup should remain explicit

## Migration Checklist

For each file:

1. [ ] Add import: `import { API_CONFIG } from '@/lib/config';`
2. [ ] Replace hardcoded URLs with `API_CONFIG` properties
3. [ ] Remove comments about default values (now centralized)
4. [ ] Test the component/hook still works
5. [ ] Check TypeScript types are correct
6. [ ] Update any related documentation

## Configuration Properties Reference

| Old Pattern | New Config Property | Description |
|-------------|-------------------|-------------|
| `process.env.NEXT_PUBLIC_API_URL` | `API_CONFIG.baseUrl` | REST API base URL |
| `process.env.NEXT_PUBLIC_WS_URL` | `API_CONFIG.wsUrl` | WebSocket URL |
| `process.env.NEXT_PUBLIC_DESKTOP_API_URL` | `API_CONFIG.desktopApiUrl` | Desktop API URL (legacy) |
| `process.env.NEXT_PUBLIC_DESKTOP_WS_URL` | `API_CONFIG.desktopWsUrl` | Desktop WS URL (legacy) |
| Hardcoded timeout | `API_CONFIG.timeout` | Request timeout (30s default) |

## Benefits

- **Single Source of Truth**: All API configuration in one place
- **Type Safety**: Full TypeScript support with autocomplete
- **Validation**: Automatic validation in development
- **Documentation**: Centralized docs in CONFIG_USAGE.md
- **Maintainability**: Easy to update endpoints across entire app
- **Testing**: Easier to mock configuration in tests

## ✅ Migration Completed

All production files have been successfully migrated to use centralized API configuration.

### What Was Accomplished
1. ✅ Updated all 11 high-priority production files
2. ✅ Resolved constants.ts API_CONFIG conflict (now re-exports from config.ts)
3. ✅ Test files kept as-is (explicit mocking is preferred for tests)
4. ✅ All files now use `API_CONFIG` from `@/lib/config`
5. ✅ Backward compatibility maintained via constants.ts re-export
6. ✅ Documentation updated (MIGRATION_STATUS.md)

### Next Steps
1. Run application in development to verify functionality
2. Test all WebSocket connections
3. Verify API calls work correctly
4. Deploy to staging environment
5. Monitor for any configuration issues

## Notes

- Test files can keep their mocks as-is if preferred
- The old `constants.ts` API_CONFIG should be addressed to avoid confusion
- Consider adding a migration script for future similar changes
- Document any environment-specific overrides

## Environment Variables

All variables should be defined in `.env.local` (local) and `.env.sample` (template):

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3123
NEXT_PUBLIC_WS_URL=ws://localhost:3124
NEXT_PUBLIC_API_TIMEOUT=30000

# Legacy Desktop API
NEXT_PUBLIC_DESKTOP_API_URL=http://localhost:3123
NEXT_PUBLIC_DESKTOP_WS_URL=ws://localhost:3124

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_VERSION=1.0.0

# Features
NEXT_PUBLIC_FEATURE_VISUAL_TRIGGERS=true
NEXT_PUBLIC_FEATURE_GESTURES=true
NEXT_PUBLIC_FEATURE_CLIP_QUEUE=true
NEXT_PUBLIC_FEATURE_ANALYTICS=false

# Media
NEXT_PUBLIC_MAX_UPLOAD_SIZE=524288000
```

## Contact

For questions about this migration, refer to:
- `apps/web/src/lib/config.ts` - Main configuration file
- `apps/web/src/lib/CONFIG_USAGE.md` - Usage documentation
- SOC-410 ticket - Original requirement

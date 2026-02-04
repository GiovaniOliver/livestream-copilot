# Quick Start Guide - FluxBoard

## Current Issue: Environment Configuration

The desktop companion API server failed to start due to missing/invalid environment variables.

### Required Fixes

Open `apps/desktop-companion/.env` and update these values:

#### 1. JWT Secrets (Security)
```bash
# Generate 32+ character secrets
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters-also-long
```

**Quick Generate Secrets:**
```bash
# Option A: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option B: Using OpenSSL
openssl rand -hex 32

# Option C: Just use these (for development only):
JWT_SECRET=dev_secret_key_1234567890abcdefghijklmnopqrstuvwxyz
JWT_REFRESH_SECRET=dev_refresh_secret_1234567890abcdefghijklmnopqrstuvwxyz
```

#### 2. Bunny CDN URL (Media Storage)
```bash
# If you're not using Bunny.net yet, use a placeholder:
BUNNY_CDN_URL=https://example.b-cdn.net

# Or if you have a Bunny.net account:
BUNNY_CDN_URL=https://your-pull-zone.b-cdn.net
```

### Complete .env Template for Quick Start

```bash
# Database
DATABASE_URL=your-database-url-here

# JWT Secrets (generate using commands above)
JWT_SECRET=dev_secret_key_1234567890abcdefghijklmnopqrstuvwxyz
JWT_REFRESH_SECRET=dev_refresh_secret_1234567890abcdefghijklmnopqrstuvwxyz

# API Keys (optional for now)
ANTHROPIC_API_KEY=
DEEPGRAM_API_KEY=

# Server Ports
HTTP_PORT=3123
WS_PORT=3124

# OBS (optional if not using OBS)
OBS_WS_URL=ws://localhost:4455
OBS_WS_PASSWORD=

# STT Provider
STT_PROVIDER=deepgram

# Bunny.net CDN (placeholder for now)
BUNNY_CDN_URL=https://example.b-cdn.net
BUNNY_STORAGE_ZONE=
BUNNY_API_KEY=

# Bunny Stream (optional)
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=

# Stripe (optional for now)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Logging
LOG_LEVEL=info
LOG_FORMAT=pretty
NODE_ENV=development

# Session Storage
SESSION_DIR=./sessions

# FFmpeg (will auto-detect if installed)
FFMPEG_PATH=/usr/local/bin/ffmpeg
FFPROBE_PATH=/usr/local/bin/ffprobe
CLIP_OUTPUT_FORMAT=mp4

# Observability (optional)
OPIK_API_KEY=
OPIK_WORKSPACE_NAME=
OPIK_PROJECT_NAME=livestream-copilot
```

---

## After Fixing .env

### 1. Restart the Desktop Companion API

The background process needs to be restarted after fixing the .env file.

### 2. Verify API is Running

```bash
curl http://localhost:3123/health
```

Expected response:
```json
{
  "ok": true,
  "service": "desktop-companion",
  "version": "0.1.0"
}
```

### 3. Start Web Dashboard

```bash
cd apps/web
npm run dev
```

Open http://localhost:3000

### 4. Test Authentication

1. Navigate to http://localhost:3000/auth/register
2. Create an account
3. Login at http://localhost:3000/auth/login
4. You should be redirected to http://localhost:3000/dashboard

---

## Environment File Locations

| App | File | Status |
|-----|------|--------|
| Desktop Companion | `apps/desktop-companion/.env` | ⚠️ EXISTS (needs JWT secrets) |
| Web Dashboard | `apps/web/.env.local` | ❌ MISSING (create manually) |
| Mobile App | `apps/mobile/.env` | ❌ MISSING (optional for now) |

### Create Web Dashboard .env.local

```bash
cd apps/web
echo "NEXT_PUBLIC_API_URL=http://localhost:3123" > .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:3124" >> .env.local
```

### Create Mobile App .env (Optional)

```bash
cd apps/mobile
echo "EXPO_PUBLIC_API_URL=http://localhost:3123" > .env
echo "EXPO_PUBLIC_WS_URL=ws://localhost:3124" >> .env
```

---

## Troubleshooting

### Issue: "JWT_SECRET too short"
**Fix:** Use a secret with at least 32 characters (see generation commands above)

### Issue: "BUNNY_CDN_URL invalid"
**Fix:** Use `https://example.b-cdn.net` as placeholder

### Issue: "Database connection failed"
**Fix:** Verify DATABASE_URL is correct and PostgreSQL is running

### Issue: "API still not running"
**Fix:** Kill the background process and restart:
```bash
# Find the process
ps aux | grep tsx

# Kill it
kill <process-id>

# Restart
cd apps/desktop-companion
npm run dev
```

---

## Next Steps After API Starts

1. ✅ Register a user account
2. ✅ Login to dashboard
3. ✅ Create a new session
4. ✅ Test real-time WebSocket updates
5. ✅ Explore workflow dashboards

---

**Need Help?** Check the detailed documentation in:
- `STARTUP_GUIDE.md` - Complete setup instructions
- `SESSION_SUMMARY.md` - Feature documentation
- `CURRENT_STATUS_REPORT.md` - Development status

# FluxBoard Startup Guide

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database running
- [ ] OBS Studio installed and configured
- [ ] API keys obtained (see Environment Variables section)

## Quick Start (All Apps at Once)

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for all workspaces (desktop-companion, web, mobile).

### 2. Configure Environment Variables

#### Desktop Companion (apps/desktop-companion/.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fluxboard

# AI Provider (Required for AI agents)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
AI_MODEL=claude-3-5-sonnet-20241022

# Speech-to-Text (Required for transcription)
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=your-deepgram-key-here

# OBS WebSocket (Required for clip capture)
OBS_WS_URL=ws://localhost:4455
OBS_WS_PASSWORD=your-obs-password

# Server Ports
HTTP_PORT=3123
WS_PORT=3001

# Session Storage
SESSION_DIR=./sessions

# FFmpeg (Optional - for clip trimming)
FFMPEG_PATH=/usr/local/bin/ffmpeg
FFPROBE_PATH=/usr/local/bin/ffprobe
CLIP_OUTPUT_FORMAT=mp4
OBS_REPLAY_OUTPUT_DIR=/path/to/obs/replays

# Observability (Optional)
OPIK_API_KEY=your-opik-key
OPIK_WORKSPACE_NAME=your-workspace
OPIK_PROJECT_NAME=livestream-copilot

# Logging
LOG_LEVEL=info
LOG_FORMAT=pretty
NODE_ENV=development
```

#### Web App (apps/web/.env)

```bash
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3123
```

#### Mobile App (apps/mobile/.env)

```bash
EXPO_PUBLIC_API_URL=http://localhost:3123
EXPO_PUBLIC_WS_URL=ws://localhost:3001
```

### 3. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Start All Applications

```bash
npm run dev
```

This will start:
- **API** (Desktop Companion) - http://localhost:3123
- **WEB** (Next.js Dashboard) - http://localhost:3000
- **MOBILE** (Expo) - Expo Dev Server

## Running Individual Apps

### Desktop Companion Only

```bash
npm run dev:api-only
```

### Web Dashboard Only

```bash
npm run dev:web-only
```

### Mobile App Only

```bash
cd apps/mobile
npm run start
```

## Testing the System

### 1. Check Health Status

```bash
curl http://localhost:3123/health
```

Expected response:
```json
{
  "ok": true,
  "service": "desktop-companion",
  "version": "1.0.0",
  "components": {
    "database": true,
    "obs": true,
    "stt": true,
    "ai": true,
    "ffmpeg": true,
    "agents": true
  }
}
```

### 2. Start a Session

```bash
curl -X POST http://localhost:3123/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "streamer",
    "title": "Test Stream",
    "description": "Testing the system",
    "participants": [{"name": "Host", "role": "host"}]
  }'
```

### 3. Open Dashboards

- **Web Dashboard**: http://localhost:3000/dashboard
- **Streamer View**: http://localhost:3000/dashboard/[sessionId]/streamer
- **Podcast View**: http://localhost:3000/dashboard/[sessionId]/podcast
- **Debate View**: http://localhost:3000/dashboard/[sessionId]/debate

### 4. Test Mobile App

```bash
# Scan QR code with Expo Go app
# Or press 'a' for Android emulator
# Or press 'i' for iOS simulator
```

## Troubleshooting

### Desktop Companion Won't Start

1. **Check PostgreSQL is running**:
   ```bash
   psql -U your_user -d fluxboard -c "SELECT 1;"
   ```

2. **Verify environment variables**:
   ```bash
   cd apps/desktop-companion
   cat .env
   ```

3. **Check OBS WebSocket**:
   - Open OBS Studio
   - Go to Tools → WebSocket Server Settings
   - Ensure "Enable WebSocket server" is checked
   - Note the port (default: 4455) and password

4. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

### Web App Build Errors

1. **Clear Next.js cache**:
   ```bash
   cd apps/web
   rm -rf .next
   npm run dev
   ```

2. **Check Node version**:
   ```bash
   node --version  # Should be 18+
   ```

### Mobile App Connection Issues

1. **Check API URL** in apps/mobile/.env:
   - If on physical device, use your computer's IP address
   - Example: `EXPO_PUBLIC_API_URL=http://192.168.1.100:3123`

2. **Check firewall** allows connections on ports 3000, 3001, 3123

### OBS Not Connecting

1. **Enable obs-websocket plugin** in OBS Studio:
   - Tools → WebSocket Server Settings
   - Enable WebSocket server
   - Set password (or leave blank)

2. **Check URL and password** in desktop-companion/.env match OBS settings

### STT Not Working

1. **Verify Deepgram API key**:
   ```bash
   curl https://api.deepgram.com/v1/projects \
     -H "Authorization: Token YOUR_API_KEY"
   ```

2. **Check STT status**:
   ```bash
   curl http://localhost:3123/stt/status
   ```

### AI Agents Not Generating Content

1. **Verify Anthropic API key**:
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: YOUR_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
   ```

2. **Check agent configuration**:
   - Ensure ANTHROPIC_API_KEY is set in desktop-companion/.env
   - Restart desktop companion after setting API key

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps (API, Web, Mobile) |
| `npm run dev:api` | Start desktop companion only |
| `npm run dev:web` | Start web dashboard only |
| `npm run dev:mobile` | Start mobile app only |
| `npm run install:all` | Install all dependencies |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

## System Architecture

```
┌─────────────────────┐
│   OBS Studio        │ (Capture source)
└──────────┬──────────┘
           │ WebSocket
           ↓
┌─────────────────────┐
│ Desktop Companion   │ (API Server)
│                     │
│ - Session Mgmt      │
│ - STT Integration   │
│ - AI Agents         │
│ - Clip Processing   │
│ - Export System     │
└──────────┬──────────┘
           │
           ├─── HTTP/REST ───→ Web Dashboard (localhost:3000)
           │
           ├─── HTTP/REST ───→ Mobile App
           │
           └─── WebSocket ──→ Real-time Events
```

## Default Ports

| Service | Port | Description |
|---------|------|-------------|
| Desktop Companion HTTP | 3123 | REST API |
| Desktop Companion WebSocket | 3001 | Real-time events |
| Web Dashboard | 3000 | Next.js dev server |
| OBS WebSocket | 4455 | OBS integration |
| PostgreSQL | 5432 | Database |

## Next Steps

1. **Configure API Keys** - Set up Anthropic and Deepgram keys
2. **Run Database Migrations** - `npm run db:migrate`
3. **Start OBS Studio** - Enable WebSocket server
4. **Start All Apps** - `npm run dev`
5. **Test Session Flow** - Create session, capture clips, generate AI content
6. **Review Documentation** - See SESSION_SUMMARY.md for feature details

## Getting Help

- **Session Summary**: `SESSION_SUMMARY.md` - Complete feature documentation
- **API Documentation**: `apps/desktop-companion/*.md` - API guides
- **Component Docs**: `apps/web/src/components/*/README.md` - UI components
- **Test Scripts**: `apps/desktop-companion/tests/` - Automated tests

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production` in all .env files
- [ ] Use production database URL
- [ ] Configure proper CORS settings
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Test all workflows end-to-end
- [ ] Review security settings
- [ ] Set up error tracking (e.g., Sentry)

---

**Happy streaming! 🎥✨**

For detailed feature documentation, see [SESSION_SUMMARY.md](./SESSION_SUMMARY.md)

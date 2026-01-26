# FluxBoard - Quick Startup Instructions

## Prerequisites Check

Before starting, verify these files exist:

1. ✅ `apps/desktop-companion/.env` - Backend configuration
2. ✅ `apps/web/.env.local` - Web app configuration  
3. ✅ `apps/mobile/.env` - Mobile app configuration

## Option 1: Using Startup Scripts (RECOMMENDED)

### Terminal 1: Start Backend API
```cmd
start-backend.bat
```
This will:
- Generate Prisma client
- Run database migrations
- Start API server on http://localhost:3123
- Start WebSocket on ws://localhost:3124

### Terminal 2: Start Web App
```cmd
start-web.bat
```
This will:
- Start Next.js dev server on http://localhost:3000

### Terminal 3: Start Mobile App (Optional)
```cmd
cd apps\mobile
npm run start
```
Then scan the QR code with Expo Go on your phone.

---

## Option 2: Manual Startup

### Step 1: Backend API Setup
```cmd
cd apps\desktop-companion

# Generate Prisma client
npm run db:generate

# Run migrations (first time only)
npm run db:migrate

# Start server
npm run dev
```

Wait for "HTTP server listening on port 3123"

### Step 2: Web Dashboard
```cmd
cd apps\web
npm run dev
```

Wait for "Ready on http://localhost:3000"

### Step 3: Mobile App (Optional)
```cmd
cd apps\mobile
npm run start
```

---

## Verification Steps

### 1. Check Backend API
```cmd
curl http://localhost:3123/health
```
Expected: `{"ok":true,"timestamp":"..."}`

### 2. Check Web App
Open browser to: http://localhost:3000

### 3. Check WebSocket
Open browser console and check WebSocket connection status in the dashboard header.

---

## Common Issues

### Issue: "Cannot find module 'prisma'"
**Solution:** Run `npm run db:generate` in apps/desktop-companion

### Issue: "Port 3000 already in use"
**Solution:** 
```cmd
# Find process on port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /F /PID <PID>
```

### Issue: "Database connection failed"
**Solution:** Check DATABASE_URL in apps/desktop-companion/.env

### Issue: "tsx watch not starting"
**Solution:**
```cmd
# Try running directly
cd apps\desktop-companion
npx tsx watch src/index.ts
```

### Issue: ".next/dev/lock" error
**Solution:**
```cmd
cd apps\web
del .next\dev\lock
npm run dev
```

---

## Test the Full Stack

### 1. Create a Test Session
```cmd
curl -X POST http://localhost:3123/session/start ^
  -H "Content-Type: application/json" ^
  -d "{\"workflow\":\"streamer\",\"captureMode\":\"av\",\"title\":\"Test Stream\"}"
```

### 2. Check Session Status
```cmd
curl http://localhost:3123/session/status
```

### 3. View in Dashboard
Navigate to http://localhost:3000/dashboard

---

## Next Steps After Startup

1. **Register an account** at http://localhost:3000/auth/register
2. **Test authentication** - Login and verify token refresh
3. **Create a session** - Use the dashboard to start a session
4. **Check real-time updates** - Watch WebSocket events in browser console
5. **Run tests** - Execute test suite to verify all features

---

## Development Workflow

### Starting Fresh Each Day
```cmd
# Terminal 1
start-backend.bat

# Terminal 2  
start-web.bat

# Terminal 3 (optional)
cd apps\mobile && npm run start
```

### Running Tests
```cmd
cd apps\desktop-companion
.\tests\run-all-tests.sh --quick
```

### Viewing Logs
- **Backend:** Check terminal output
- **Web:** Check browser console
- **Database:** Use `npm run db:studio` to view data

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3123 | http://localhost:3123 |
| WebSocket | 3124 | ws://localhost:3124 |
| Web App | 3000 | http://localhost:3000 |
| Prisma Studio | 5555 | http://localhost:5555 |
| Expo Dev | Auto | Check terminal for QR code |

---

## Environment Variables Quick Reference

### Backend (.env)
```env
DATABASE_URL=prisma+postgres://...
ANTHROPIC_API_KEY=sk-ant-...
DEEPGRAM_API_KEY=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

### Web (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3123
NEXT_PUBLIC_WS_URL=ws://localhost:3124
```

### Mobile (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:3123
EXPO_PUBLIC_WS_URL=ws://localhost:3124
```

---

**Need Help?** Check:
- `DEVELOPMENT_STATUS_SUMMARY.md` - Current development status
- `CURRENT_STATUS_REPORT.md` - Detailed feature analysis
- `WEB_DASHBOARD_INTEGRATION_PLAN.md` - Integration steps
- `README.md` - Project overview

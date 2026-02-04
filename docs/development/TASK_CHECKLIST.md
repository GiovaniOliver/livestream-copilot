# FluxBoard - Development Task Checklist
**Created:** 2026-01-21  
**Status:** Ready for Integration Phase

---

## ✅ COMPLETED TASKS

### Environment Setup
- [x] Mobile app `.env` file created
- [x] Web app `.env.local` file exists
- [x] Desktop companion `.env` file exists
- [x] Created startup scripts (`start-backend.bat`, `start-web.bat`)
- [x] Created comprehensive documentation

### Documentation
- [x] **DEVELOPMENT_STATUS_SUMMARY.md** - Complete status overview
- [x] **STARTUP_INSTRUCTIONS.md** - Step-by-step startup guide
- [x] **CURRENT_STATUS_REPORT.md** - Detailed 65-70% completion analysis
- [x] **WEB_DASHBOARD_INTEGRATION_PLAN.md** - Integration roadmap

---

## 🔲 HIGH PRIORITY TASKS (This Week)

### Day 1: Backend Startup & Database Setup

#### Task 1.1: Database Migrations (5 minutes)
**Priority:** 🔴 CRITICAL - Must be done first

**Steps:**
1. Open a new terminal
2. Navigate to project root
3. Run:
   ```cmd
   cd apps\desktop-companion
   npm run db:generate
   npm run db:migrate
   ```

**Expected Output:**
```
✔ Generated Prisma Client
✔ Migrations applied successfully
```

**Verification:**
- Check for `apps/desktop-companion/src/generated/prisma` folder
- No error messages during migration

---

#### Task 1.2: Start Backend API (10 minutes)
**Priority:** 🔴 CRITICAL

**Steps:**
1. In same terminal (apps/desktop-companion):
   ```cmd
   npm run dev
   ```

**Expected Output:**
```
[info] Initializing desktop-companion service...
[info] Database connection established
[info] FFmpeg and FFprobe are available
[info] HTTP server listening on port 3123
[info] WebSocket server listening on port 3124
```

**Verification:**
```cmd
# In a new terminal
curl http://localhost:3123/health
```

**Expected Response:**
```json
{"ok":true,"timestamp":"2026-01-21T..."}
```

**If It Fails:**
- Check if ports 3123/3124 are already in use:
  ```cmd
  netstat -ano | findstr "3123 3124"
  ```
- Kill processes if needed:
  ```cmd
  taskkill /F /PID <process_id>
  ```
- Check `.env` file has all required values (DATABASE_URL especially)

---

#### Task 1.3: Add Missing API Endpoints (4 hours)
**Priority:** 🔴 HIGH

**Why:** Frontend expects REST endpoints that don't exist yet

**File to Create/Modify:**
`apps/desktop-companion/src/api/sessions.ts`

**Endpoints to Add:**

1. **GET /api/sessions** - List all sessions
   ```typescript
   router.get('/', authenticate, async (req, res) => {
     const userId = req.user.id;
     const sessions = await SessionService.list({
       userId,
       limit: req.query.limit ? parseInt(req.query.limit) : 50,
       offset: req.query.offset ? parseInt(req.query.offset) : 0
     });
     res.json(sessions);
   });
   ```

2. **GET /api/sessions/:id** - Get session details
   ```typescript
   router.get('/:id', authenticate, async (req, res) => {
     const session = await SessionService.getById(req.params.id);
     if (!session) {
       return res.status(404).json({ error: 'Session not found' });
     }
     res.json(session);
   });
   ```

3. **GET /api/sessions/:id/outputs** - Get session outputs
   ```typescript
   router.get('/:id/outputs', authenticate, async (req, res) => {
     const outputs = await OutputService.listBySession(req.params.id);
     res.json(outputs);
   });
   ```

**Service Methods to Add:**
`apps/desktop-companion/src/db/services/session.service.ts`

```typescript
export async function list(options: {
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  return prisma.session.findMany({
    where: options.userId ? { userId: options.userId } : {},
    take: options.limit || 50,
    skip: options.offset || 0,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { events: true, outputs: true, clips: true }
      }
    }
  });
}

export async function getById(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      events: { take: 100, orderBy: { createdAt: 'desc' } },
      outputs: { take: 50, orderBy: { createdAt: 'desc' } },
      clips: { take: 20, orderBy: { createdAt: 'desc' } }
    }
  });
}
```

**Mount the Router:**
In `apps/desktop-companion/src/index.ts`, add:
```typescript
import { sessionsRouter } from './api/sessions.js';
// ...
app.use('/api/sessions', sessionsRouter);
```

**Testing:**
```cmd
# List sessions
curl http://localhost:3123/api/sessions

# Get specific session
curl http://localhost:3123/api/sessions/<session-id>

# Get session outputs
curl http://localhost:3123/api/sessions/<session-id>/outputs
```

---

### Day 2: Web Dashboard Integration

#### Task 2.1: Update API Client (1 hour)
**Priority:** 🟡 HIGH

**File:** `apps/web/src/lib/api/sessions.ts`

**Changes:**
1. Update `listSessions()` to call `GET /api/sessions`
2. Update `getSession()` to call `GET /api/sessions/:id`  
3. Add `getSessionOutputs()` calling `GET /api/sessions/:id/outputs`

**Example:**
```typescript
export async function listSessions(): Promise<SessionListItem[]> {
  const response = await apiClient.get('/api/sessions');
  return response.data;
}

export async function getSession(id: string): Promise<SessionDetail> {
  const response = await apiClient.get(`/api/sessions/${id}`);
  return response.data;
}

export async function getSessionOutputs(id: string): Promise<Output[]> {
  const response = await apiClient.get(`/api/sessions/${id}/outputs`);
  return response.data;
}
```

---

#### Task 2.2: Create useSessions Hook (1 hour)
**Priority:** 🟡 HIGH

**File to Create:** `apps/web/src/hooks/useSessions.ts`

**Purpose:** Centralized session management with real-time updates

**Implementation:** See `WEB_DASHBOARD_INTEGRATION_PLAN.md` Step 5 for full code

**Features:**
- Load sessions from API
- Create/end sessions
- Auto-refresh on WebSocket events
- Loading/error states

---

#### Task 2.3: Update Dashboard Page (2 hours)
**Priority:** 🟡 HIGH

**File:** `apps/web/src/app/dashboard/page.tsx`

**Changes:**
1. Replace `getSessions()` with `useSessions()` hook
2. Remove localStorage logic
3. Add error handling UI
4. Connect to WebSocket for real-time updates

**Before:**
```typescript
const data = getSessions(); // localStorage
```

**After:**
```typescript
const { sessions, isLoading, error, createSession } = useSessions();
```

---

#### Task 2.4: Wire WebSocket to Dashboards (3 hours)
**Priority:** 🟡 HIGH

**Files:**
- `apps/web/src/components/dashboard/StreamerDashboard.tsx`
- `apps/web/src/components/dashboard/PodcastDashboard.tsx`
- `apps/web/src/components/dashboard/DebateDashboard.tsx`

**Changes:**
1. Consume WebSocket events from `useWebSocket()`
2. Update UI when new events arrive
3. Remove mock data
4. Add loading states

**Example:**
```typescript
const { outputs, clips, moments } = useWebSocket();

// Auto-update when new data arrives
useEffect(() => {
  if (outputs.length > 0) {
    // Update UI with new outputs
  }
}, [outputs]);
```

---

### Day 3: Export Integration & Testing

#### Task 3.1: Connect Export Modal (2 hours)
**Priority:** 🟡 MEDIUM

**File:** `apps/web/src/components/export/ExportModal.tsx`

**Changes:**
1. Import export API functions
2. Call backend on export button click
3. Handle export response
4. Show download/copy options

**Implementation:**
```typescript
import { exportPost, exportClip } from '@/lib/api/export';

const handleExport = async () => {
  setLoading(true);
  try {
    if (exportType === 'post') {
      const result = await exportPost({
        platform: selectedPlatform,
        content: editedCaption
      });
      // Show success, copy to clipboard
    }
    // ...
  } catch (error) {
    setError(error.message);
  } finally {
    setLoaded(false);
  }
};
```

---

#### Task 3.2: Run Full Test Suite (1 hour)
**Priority:** 🟡 MEDIUM

**Steps:**
1. Ensure backend is running
2. Run tests:
   ```cmd
   cd apps\desktop-companion
   .\tests\run-all-tests.sh --quick
   ```

**Expected Results:**
- All session lifecycle tests pass
- OBS integration tests pass (if OBS running)  
- Agent tests pass (if ANTHROPIC_API_KEY set)
- WebSocket tests pass

**Fix any failures before proceeding**

---

#### Task 3.3: Manual Testing Checklist (1 hour)
**Priority:** 🟡 HIGH

**Authentication Flow:**
- [ ] Register new account
- [ ] Verify email validation
- [ ] Login with credentials
- [ ] Test OAuth (Google/GitHub/Twitch)
- [ ] Test password reset
- [ ] Verify token refresh

**Session Management:**
- [ ] Create session via dashboard
- [ ] Start session via API
- [ ] Check session status
- [ ] View session in dashboard
- [ ] End session
- [ ] Verify session persisted to database

**Real-Time Updates:**
- [ ] Start session
- [ ] Send test event
- [ ] Verify event appears in dashboard
- [ ] Check WebSocket connection status
- [ ] Verify auto-reconnect works

**Export System:**
- [ ] Export to X/Twitter
- [ ] Export to LinkedIn
- [ ] Export clip with format conversion
- [ ] Verify file generation
- [ ] Test copy to clipboard

---

## 🟡 MEDIUM PRIORITY TASKS (Next Week)

### Task 4: Media Asset Management (3-4 days)
**Priority:** 🟡 MEDIUM

**Scope:**
- Implement Bunny.net upload endpoints
- Add media list/retrieval API
- Connect to upload UI
- Test video storage and delivery

**Files to Create:**
- `apps/desktop-companion/src/media/bunny-client.ts`
- `apps/desktop-companion/src/api/media.ts`

---

### Task 5: Output Retrieval Enhancement (1 day)
**Priority:** 🟡 MEDIUM

**Scope:**
- Add filtering/pagination to outputs API
- Create outputs list UI
- Add search functionality
- Implement favorites

---

### Task 6: Mobile UI Polish (2-3 days)
**Priority:** 🟡 MEDIUM

**Scope:**
- Complete CaptureScreen implementation
- Enhance OBSControlScreen
- Complete VideoSourceScreen
- Add loading states
- Polish navigation

---

### Task 7: Organization Management (2-3 days)
**Priority:** 🟡 MEDIUM

**Scope:**
- Implement org CRUD endpoints
- Add member management
- Create invitation system
- Build org settings UI

---

## 🟢 LOW PRIORITY TASKS (Future)

### Task 8: Agent Observability (1-2 days)
- Implement Opik metrics collection
- Create observability dashboard
- Add performance monitoring
- Track agent execution times

### Task 9: Analytics & Reports (2-3 days)
- Session analytics endpoints
- Usage statistics
- Export analytics
- Dashboard visualizations

### Task 10: Additional Features
- [ ] Search/Discovery
- [ ] API Key Management UI
- [ ] Mobile Offline Mode
- [ ] Settings UI
- [ ] Internationalization (i18n)
- [ ] Push Notifications
- [ ] 2FA/MFA
- [ ] Rate limiting enforcement

---

## 🎯 Success Metrics

### Week 1 Goals (HIGH PRIORITY)
- [ ] Backend API running and healthy
- [ ] Database migrations complete
- [ ] Web dashboard connected to API
- [ ] Real-time events flowing to UI
- [ ] Export functionality working
- [ ] All tests passing

### Week 2 Goals (MEDIUM PRIORITY)
- [ ] Media upload system working
- [ ] Organization management functional
- [ ] Mobile UI polished
- [ ] Agent observability dashboard

### Production Ready Criteria
- [ ] All HIGH priority tasks complete
- [ ] 90%+ test coverage
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Deployment scripts ready

---

## 📊 Current Progress

```
Overall Progress: ████████████░░░░░░░░ 65%

Backend API:      ██████████████░░░░░░ 70%
Web Dashboard:    ████████░░░░░░░░░░░░ 40%
Mobile App:       ████████████░░░░░░░░ 60%
Database:         ███████████████████░ 95%
Testing:          ████████████████████ 100%
Documentation:    ██████████████████░░ 90%
```

---

## 🚀 Quick Start for Today

### Immediate Actions (Next 30 minutes)

1. **Open 3 terminals:**
   - Terminal 1: Backend
   - Terminal 2: Web
   - Terminal 3: Testing

2. **Terminal 1 - Start Backend:**
   ```cmd
   cd apps\desktop-companion
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```
   Wait for "HTTP server listening" message

3. **Terminal 2 - Start Web:**
   ```cmd
   cd apps\web
   npm run dev
   ```
   Wait for "Ready on http://localhost:3000"

4. **Terminal 3 - Verify:**
   ```cmd
   curl http://localhost:3123/health
   ```

5. **Browser - Test:**
   - Open http://localhost:3000
   - Check console for errors
   - Try to register/login
   - Create a test session

---

## 📝 Notes

### Known Issues
1. tsx watch sometimes hangs - use `npx tsx watch src/index.ts` directly if needed
2. Port 3000/3123 conflicts - kill Node processes before starting
3. .next/dev/lock errors - delete lock file manually

### Environment Variables
Make sure these are set in `.env` files:
- `DATABASE_URL` - Prisma Postgres connection
- `ANTHROPIC_API_KEY` - For AI agents
- `DEEPGRAM_API_KEY` - For STT (optional for testing)
- `JWT_SECRET` - For auth
- `JWT_REFRESH_SECRET` - For refresh tokens

### Helpful Commands
```cmd
# Check what's running
netstat -ano | findstr "3000 3123 3124"

# View database
npm run db:studio

# Run specific test suite
cd apps\desktop-companion\tests
.\test-session-lifecycle.sh

# Clear Next.js cache
cd apps\web
rd /s /q .next
```

---

**Last Updated:** 2026-01-21  
**Next Review:** After completing Day 1 tasks


# Web Dashboard Integration Plan

## Current State Analysis

### ✅ What's Already Working
- **WebSocket Infrastructure:** `WebSocketContext` exists and is functional
- **API Client:** Fully configured with typed methods
- **Sessions API:** Complete TypeScript definitions in `sessions.ts`
- **StreamerDashboard:** Already using `useWebSocket()` hook for real-time events
- **UI Components:** All dashboard layouts complete

### ❌ What Needs Fixing
1. **Dashboard Page:** Using `localStorage` instead of API calls (`getSessions()` from local store)
2. **Session Creation:** Creating sessions locally instead of calling `/session/start`
3. **Environment Configuration:** `.env` file needs to be created manually
4. **WebSocket Connection:** Not auto-connecting on dashboard mount
5. **Session Details:** Not fetching from API

---

## Integration Steps

### Step 1: Environment Setup

Create `.env.local` file in `apps/web/`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3123
NEXT_PUBLIC_WS_URL=ws://localhost:3124
```

**Note:** Security hooks prevent automated creation. User must create this file manually.

---

### Step 2: Update Dashboard Page to Use API

**File:** `apps/web/src/app/dashboard/page.tsx`

**Changes Needed:**
1. Replace `getSessions()` with `listSessions()` from `@/lib/api/sessions`
2. Add async data fetching with loading states
3. Add error handling
4. Connect WebSocket for real-time updates
5. Update session creation to call API

**Current Code:**
```typescript
const loadSessions = useCallback(() => {
  const data = getSessions();
  setSessions(data);
  setIsLoading(false);
}, []);
```

**New Code:**
```typescript
const loadSessions = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);
    const data = await listSessions();
    setSessions(data);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to load sessions");
  } finally {
    setIsLoading(false);
  }
}, []);
```

---

### Step 3: Update NewSessionModal to Call API

**File:** `apps/web/src/components/dashboard/NewSessionModal.tsx`

**Changes Needed:**
1. Import `startSession` from `@/lib/api/sessions`
2. Call API instead of local storage
3. Handle API errors

**Current Behavior:** Creates session in localStorage

**New Behavior:** POST to `/session/start`

---

### Step 4: Connect WebSocket on Dashboard Mount

**File:** `apps/web/src/app/dashboard/layout.tsx`

**Changes Needed:**
1. Wrap dashboard layout with `WebSocketProvider`
2. Auto-connect WebSocket using `NEXT_PUBLIC_WS_URL`
3. Listen for session events to refresh data

---

### Step 5: Create API-backed Session Hook

**New File:** `apps/web/src/hooks/useSessions.ts`

Custom hook to manage sessions with API integration:

```typescript
export function useSessions() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, events } = useWebSocket();

  // Load sessions from API
  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start new session
  const createSession = useCallback(async (config: StartSessionConfig) => {
    const response = await startSession(config);
    await loadSessions();
    return response;
  }, [loadSessions]);

  // End session
  const endSessionHandler = useCallback(async (id: string) => {
    await endSession(id);
    await loadSessions();
  }, [loadSessions]);

  // Auto-refresh when WebSocket events arrive
  useEffect(() => {
    if (events.length > 0) {
      // Debounced refresh
      const timer = setTimeout(loadSessions, 1000);
      return () => clearTimeout(timer);
    }
  }, [events.length, loadSessions]);

  // Initial load
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    isLoading,
    error,
    loadSessions,
    createSession,
    endSession: endSessionHandler,
  };
}
```

---

### Step 6: Update Session Detail Pages

**Files:**
- `apps/web/src/app/dashboard/session/[id]/page.tsx`
- All workflow dashboard pages

**Changes Needed:**
1. Fetch session details from `/api/sessions/:id`
2. Connect WebSocket for real-time updates
3. Display loading states

---

### Step 7: Add WebSocket Connection Status Indicator

**File:** `apps/web/src/components/dashboard/ConnectionStatus.tsx`

Already exists! Just needs to be placed in the dashboard header.

**Usage:**
```tsx
<ConnectionStatus wsUrl={process.env.NEXT_PUBLIC_WS_URL!} />
```

---

### Step 8: Handle API Errors Gracefully

Create error boundary and fallback UI:

**New File:** `apps/web/src/components/dashboard/ErrorBoundary.tsx`

Shows user-friendly errors when API is unavailable.

---

## API Endpoint Mapping

| Frontend Action | API Endpoint | Method | Status |
|----------------|--------------|--------|--------|
| List Sessions | `/api/sessions` | GET | ⚠️ Not implemented in backend |
| Get Session | `/api/sessions/:id` | GET | ⚠️ Not implemented |
| Start Session | `/session/start` | POST | ✅ Implemented |
| End Session | `/session/stop` | POST | ✅ Implemented |
| Get Active Session | `/session/status` | GET | ✅ Implemented |

**Critical Finding:** Backend only has `/session/start`, `/session/stop`, `/session/status` - NOT RESTful `/api/sessions` routes!

---

## Backend API Gap Analysis

The `sessions.ts` API client expects these routes:
- `GET /api/sessions` - List sessions
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions` - Create session
- `POST /api/sessions/:id/end` - End session
- `PATCH /api/sessions/:id` - Update session

**But the desktop companion only provides:**
- `POST /session/start`
- `POST /session/stop`
- `GET /session/status`

**Solution:** We have two options:

### Option A: Update Frontend to Match Backend
Change `sessions.ts` API client to use actual backend routes:
- `/session/start` instead of `/api/sessions`
- `/session/stop` instead of `/api/sessions/:id/end`
- Use localStorage for session list (since no `/api/sessions` exists)

### Option B: Add Missing Backend Routes
Implement REST routes in desktop companion:
- `GET /api/sessions` → List all sessions from database
- `GET /api/sessions/:id` → Get session details
- These would query the database Session model

**Recommendation:** **Option A** for immediate integration (simpler), then Option B for production completeness.

---

## Implementation Priority

### Phase 1: Quick Win (1-2 hours)
1. Create `.env.local` file manually
2. Update API client to use actual backend routes
3. Update dashboard to call `/session/start` and `/session/status`
4. Test with backend running

### Phase 2: Real-time Integration (2-3 hours)
1. Ensure WebSocket connects on dashboard mount
2. Update StreamerDashboard and other workflow dashboards
3. Add loading/error states

### Phase 3: Backend Routes (3-4 hours - if needed)
1. Add `GET /api/sessions` to backend
2. Add `GET /api/sessions/:id` to backend
3. Update frontend to use new routes

---

## Testing Checklist

- [ ] Environment file created
- [ ] API calls succeed (not 404)
- [ ] WebSocket connects automatically
- [ ] Real-time events display in dashboards
- [ ] Session creation works
- [ ] Session ending works
- [ ] Loading states show correctly
- [ ] Errors display user-friendly messages
- [ ] Dashboard refreshes on new events

---

## Files to Modify

### High Priority
1. `apps/web/.env.local` - Create manually
2. `apps/web/src/lib/api/sessions.ts` - Update routes to match backend
3. `apps/web/src/app/dashboard/page.tsx` - Use API instead of localStorage
4. `apps/web/src/components/dashboard/NewSessionModal.tsx` - Call API on submit
5. `apps/web/src/app/dashboard/layout.tsx` - Add WebSocketProvider

### Medium Priority
6. `apps/web/src/hooks/useSessions.ts` - Create custom hook
7. `apps/web/src/app/dashboard/session/[id]/page.tsx` - Fetch from API
8. `apps/web/src/components/dashboard/ErrorBoundary.tsx` - Error handling

### Low Priority
9. Backend: `apps/desktop-companion/src/routes/sessions.ts` - Add REST routes
10. Backend: `apps/desktop-companion/src/db/services/session.service.ts` - Add list/get methods

---

## Next Steps

1. User creates `.env.local` file manually
2. Update `sessions.ts` API client to use correct backend routes
3. Implement `useSessions` hook
4. Update dashboard page to use the hook
5. Test with backend running
6. Add WebSocket auto-connection
7. Verify real-time updates work

**Estimated Time:** 4-6 hours for full integration

# Environment Configuration Fix

## Step 1: Fix Desktop Companion .env File

You have `apps/desktop-companion/.env` open in your IDE. Add or update these three values:

```bash
# JWT Secrets (Required - minimum 32 characters)
JWT_SECRET=5ff486cda95b6a34a287cf7cdc2b36352bd8804247232f80f60784def93d521b
JWT_REFRESH_SECRET=570bfd28e83f439e4237471c72adfa327e2c057d0b567c81ab4c7e8ffc1b9702

# Bunny CDN URL (Required - use placeholder if not using Bunny.net)
BUNNY_CDN_URL=https://example.b-cdn.net
```

**If these lines already exist in your .env**, replace them with the values above.
**If they don't exist**, add them to the file.

### Save the file after making these changes!

---

## Step 2: Create Web App .env.local File

Create a new file: `apps/web/.env.local` with this content:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3123
NEXT_PUBLIC_WS_URL=ws://localhost:3124
```

**Note:** Your web app is currently running on http://localhost:**3002** because ports 3000 and 3001 were in use.

---

## Step 3: Update Next.js to Latest Stable

Run these commands:

```bash
# Stop all services first (Ctrl+C in the terminal running npm run dev)

# Update Next.js to latest stable (15.1.4 as of now)
cd apps/web
npm install next@latest react@latest react-dom@latest

# Or using the root package manager:
npm install next@latest react@latest react-dom@latest --workspace=apps/web
```

---

## Step 4: Restart All Services

After making the above changes:

```bash
# From project root
npm run dev
```

This will start:
- API on http://localhost:3123
- Web on http://localhost:3000 (or 3002 if ports are busy)
- Mobile on port 8081

---

## Step 5: Test the System

1. Open your browser to http://localhost:3002 (or whatever port Next.js shows)
2. Navigate to http://localhost:3002/auth/register
3. Create an account:
   - Email: test@example.com
   - Password: YourPassword123!
   - Name: Test User
4. Click Register
5. If successful, you'll be redirected to the dashboard

---

## Troubleshooting

### API Still Won't Start?

Check the terminal output for the API service. Look for:
```
[API] ✓ FluxBoard Desktop Companion started successfully
[API] • HTTP Server: http://localhost:3123
[API] • WebSocket Server: ws://localhost:3124
```

If you see environment errors, double-check the .env file has:
- JWT_SECRET with 32+ characters
- JWT_REFRESH_SECRET with 32+ characters
- BUNNY_CDN_URL starting with https://

### Web App Can't Connect to API?

1. Verify API is running: `curl http://localhost:3123/health`
2. Check `.env.local` exists in `apps/web/` folder
3. Restart the web server

### Port Conflicts?

If ports are in use:
- Web will automatically use next available port (3000 → 3001 → 3002, etc.)
- Mobile will ask to use port 8082 if 8081 is busy
- API ports (3123, 3124) are less likely to conflict

---

## What Should Happen After Fixing

✅ API starts without errors
✅ Web dashboard loads at http://localhost:3002
✅ You can register and login
✅ Dashboard shows "Not connected to live updates" warning (until you start a session)
✅ No more "Failed to fetch" errors

---

## Quick Copy-Paste for .env

**For `apps/desktop-companion/.env`:**
```
JWT_SECRET=5ff486cda95b6a34a287cf7cdc2b36352bd8804247232f80f60784def93d521b
JWT_REFRESH_SECRET=570bfd28e83f439e4237471c72adfa327e2c057d0b567c81ab4c7e8ffc1b9702
BUNNY_CDN_URL=https://example.b-cdn.net
```

**For `apps/web/.env.local` (create new file):**
```
NEXT_PUBLIC_API_URL=http://localhost:3123
NEXT_PUBLIC_WS_URL=ws://localhost:3124
```

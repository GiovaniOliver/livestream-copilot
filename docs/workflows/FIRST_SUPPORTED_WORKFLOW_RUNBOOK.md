# First Supported Workflow Runbook

Status: canonical local demo runbook for Phase 1  
Workflow: `streamer`  
Capture mode: `av`  
Dashboard route: `/dashboard/session/:id/content-creator`  
UI label: `Producer Desk`  
Last validated: 2026-03-19

This runbook turns the contract in [FIRST_SUPPORTED_WORKFLOW.md](./FIRST_SUPPORTED_WORKFLOW.md) into a repeatable local operator path.

Use this document for demo setup, validation, and troubleshooting. Do not use `docs/setup/START_HERE.md` as the source of truth for the current Phase 1 streamer demo.

## Scope

The Phase 1 success path is one session where all of the following are true:

- live preview is visible in Producer Desk
- at least one `MOMENT_MARKER` is persisted
- at least one clip completes and is queryable as an artifact
- at least one `SOCIAL_POST` draft is persisted
- at least one supporting structured output (`CLIP_TITLE`, `CHAPTER_MARKER`, or `QUOTE`) is persisted
- the session ends cleanly

Reference docs:

- Contract: [FIRST_SUPPORTED_WORKFLOW.md](./FIRST_SUPPORTED_WORKFLOW.md)
- Stream ingest details: [../guides/STREAMING_PIPELINE.md](../guides/STREAMING_PIPELINE.md)
- Validation harness: [`apps/desktop-companion/tests/test-full-workflow.sh`](../../apps/desktop-companion/tests/test-full-workflow.sh)

## Required Environment

Backend (`apps/desktop-companion/.env`):

- required: `DATABASE_URL`
- required: `JWT_SECRET`
- required: `JWT_REFRESH_SECRET`
- required: `TOKEN_ENCRYPTION_KEY`
- required for real agent outputs: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- optional for live STT: `DEEPGRAM_API_KEY`
- optional overrides:
  - `HTTP_PORT` default `3123`
  - `WS_PORT` default `3124`
  - `OBS_WS_URL` default `ws://127.0.0.1:4455`
  - `OBS_REPLAY_OUTPUT_DIR` should point at the same folder OBS writes replay-buffer files into
  - `FFMPEG_PATH` absolute path to `ffmpeg` when `PATH` is not inherited reliably
  - `FFPROBE_PATH` absolute path to `ffprobe` when `PATH` is not inherited reliably

Web (`apps/web/.env.local`):

- set `NEXT_PUBLIC_API_URL` to the backend HTTP origin
- set `NEXT_PUBLIC_WS_URL` to the backend WebSocket origin

Important:

- the web app defaults to `3125/3126` if you do not set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`
- the validated backend defaults are `3123/3124`, so set the web env explicitly unless you intentionally changed backend ports

External prerequisites:

- OBS Studio with WebSocket enabled
- OBS replay buffer enabled
- FFmpeg and FFprobe available on `PATH` or via `FFMPEG_PATH`
- optional for shell harness automation: `bash`, `jq`, `websocat`

## Recommended Validation Mode

For repeatable local validation, prefer an isolated database schema and replay-buffer folder instead of sharing the default dev database.

Example PowerShell backend shell:

```powershell
$env:HTTP_PORT = "4565"
$env:WS_PORT = "4566"
$env:DATABASE_URL = "postgresql://<user>:<pass>@<host>:5432/<db>?schema=liv_demo"
$env:OBS_REPLAY_OUTPUT_DIR = ".tmp/liv-demo-replays"
pnpm --dir apps/desktop-companion db:generate
pnpm --dir apps/desktop-companion db:push
pnpm --dir apps/desktop-companion dev
```

Matching web shell:

```powershell
$env:NEXT_PUBLIC_API_URL = "http://localhost:4565"
$env:NEXT_PUBLIC_WS_URL = "ws://localhost:4566"
pnpm --dir apps/web dev
```

If you are using the default backend ports instead, replace `4565/4566` with `3123/3124`.

On Windows, prefer setting both `FFMPEG_PATH` and `FFPROBE_PATH` explicitly when you launch the backend from a fresh or detached PowerShell shell. Local validation succeeded with:

```powershell
$env:FFMPEG_PATH = "C:\ProgramData\chocolatey\bin\ffmpeg.exe"
$env:FFPROBE_PATH = "C:\ProgramData\chocolatey\bin\ffprobe.exe"
```

## Local Auth Bootstrap

The export endpoints are authenticated and organization-scoped. Local validation is easiest if you create a verified dev user instead of going through the email verification loop.

Create or update a local test user:

```powershell
pnpm --dir apps/desktop-companion dev:create-user --email liv13@example.com --password "SecurePass123!@" --name "LIV 13 Demo"
```

Then log in against your active backend port:

```powershell
$loginBody = @{
  email = "liv13@example.com"
  password = "SecurePass123!@"
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4565/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody

$token = $login.accessToken
$login.user.organizations
```

Important:

- the first successful local login now auto-creates a personal workspace when the user has no organizations
- the same organization bootstrap also runs for OAuth logins and refresh token flows
- if you create a user directly in Prisma but never log in, `POST /api/v1/export/*` can still fail with `NO_ORGANIZATION`

## Startup Order

1. Start the desktop companion backend.
2. Confirm backend health:

```powershell
Invoke-RestMethod http://localhost:4565/health
Invoke-RestMethod http://localhost:4565/obs/status
Invoke-RestMethod http://localhost:4565/api/video/status
```

3. Start the web app with matching `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`.
4. Start OBS streaming to MediaMTX:
   - server: `rtmp://localhost:1935/live`
   - stream key: `stream`
5. Confirm replay buffer is enabled in OBS and writing files into the folder referenced by `OBS_REPLAY_OUTPUT_DIR`.

## Session Start Payload

Create the demo session with the canonical workflow and capture mode:

```powershell
$body = @{
  workflow = "streamer"
  captureMode = "av"
  title = "Phase 1 Streamer Demo"
  participants = @(
    @{ id = "host"; name = "Host" },
    @{ id = "guest"; name = "Guest" }
  )
} | ConvertTo-Json -Depth 4

$session = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4565/session/start" `
  -ContentType "application/json" `
  -Body $body

$session
```

Record:

- `sessionId`
- returned `ws` URL if present

Open the dashboard at:

- `http://localhost:3000/dashboard/session/<sessionId>/content-creator`

## Demo Loop

### 1. Live Preview

Confirm Producer Desk shows a live preview card and an active stream state.

Checks:

- `GET /obs/status`
- `GET /api/video/status`
- dashboard route loads without API/WebSocket mismatch

### 2. Transcript Flow

Preferred path:

- start real STT with `POST /stt/start` if the configured provider is available

Deterministic fallback:

- inject transcript segments directly with `POST /event/transcript`

Example:

```powershell
$segment = @{
  speakerId = "host"
  text = "Welcome back to the stream. Today we are building the first supported workflow live."
  t0 = 1.0
  t1 = 8.0
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4565/event/transcript" `
  -ContentType "application/json" `
  -Body $segment
```

Inject enough transcript volume for the agent router to generate outputs.

### 3. Moment Markers

Persist at least one moment marker:

```powershell
$moment = @{
  label = "Strong intro"
  t = 12.0
  confidence = 0.92
  notes = "Good highlight candidate"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4565/event/moment" `
  -ContentType "application/json" `
  -Body $moment
```

Expected result:

- the marker is visible in Producer Desk's Moment Rail

### 4. Clip Completion

Create a clip through the canonical clip-intent path:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4565/clip/start" `
  -ContentType "application/json" `
  -Body '{"t":5.0,"source":"api"}'

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4565/clip/end" `
  -ContentType "application/json" `
  -Body '{"t":12.0,"source":"api"}'
```

If you need to force a replay-buffer save:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4565/obs/replay/save" `
  -ContentType "application/json" `
  -Body '{}'
```

Expected result:

- a clip artifact is written under `apps/desktop-companion/sessions/<sessionId>/clips/`
- Producer Desk shows the clip in Detected Clips
- the clip card exposes both the artifact path and an `Open Clip` link

### 5. Output Verification

Query outputs directly:

```powershell
Invoke-RestMethod "http://localhost:4565/api/outputs?sessionId=$($session.sessionId)"
```

Expected result:

- at least one `SOCIAL_POST`
- at least one of `CLIP_TITLE`, `CHAPTER_MARKER`, `QUOTE`

Dashboard expectations:

- Post Drafts panel shows the `SOCIAL_POST`
- Supporting Outputs panel shows the structured output(s)

### 6. Clip Export

Preferred operator path:

- sign into the web app with the same user you created for validation
- open Producer Desk and use the clip card's `Export` action
- wait for the modal to report a completed export, then use the returned download link

Authenticated API fallback:

```powershell
$headers = @{
  Authorization = "Bearer $token"
}

$exportBody = @{
  clipId = "<clip-artifact-id>"
  format = "MP4"
  platform = "YOUTUBE"
  options = @{
    quality = "high"
    generateThumbnail = $true
    optimizeForPlatform = $true
    targetAspectRatio = "16:9"
  }
} | ConvertTo-Json -Depth 4

$export = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4565/api/v1/export/clip" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $exportBody

$status = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:4565/api/v1/export/$($export.exportId)/status" `
  -Headers $headers

$status
```

Optional download verification:

```powershell
Invoke-WebRequest `
  -Uri "http://localhost:4565$($status.downloadUrl)" `
  -Headers $headers `
  -OutFile ".tmp/export-download.bin"
```

Expected result:

- `status` reaches `COMPLETED`
- `downloadUrl` resolves to `/api/v1/export/<exportId>/download`
- the exported media is written under `apps/desktop-companion/exports/clips/`
- a thumbnail is written alongside the export when `generateThumbnail` is `true`

## Session End

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4565/session/stop" `
  -ContentType "application/json" `
  -Body '{}'
```

Confirm the session is inactive:

```powershell
Invoke-RestMethod "http://localhost:4565/session/status"
```

## Checklist

- [ ] Backend started with known `HTTP_PORT` and `WS_PORT`
- [ ] Web app points to the same backend via `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`
- [ ] OBS is streaming to `rtmp://localhost:1935/live` with stream key `stream`
- [ ] OBS replay buffer is enabled and writing files into the folder referenced by `OBS_REPLAY_OUTPUT_DIR`
- [ ] Test user exists and can log in through `/api/v1/auth/login`
- [ ] The authenticated user has at least one organization/workspace
- [ ] Session created with `workflow="streamer"` and `captureMode="av"`
- [ ] Producer Desk route loads
- [ ] Live preview is visible
- [ ] At least one transcript segment is persisted
- [ ] At least one moment marker is persisted
- [ ] At least one clip artifact is created
- [ ] At least one `SOCIAL_POST` is persisted
- [ ] At least one supporting output (`CLIP_TITLE`, `CHAPTER_MARKER`, or `QUOTE`) is persisted
- [ ] At least one clip export reaches `COMPLETED`
- [ ] The export download URL returns the generated asset
- [ ] Session stops cleanly

## Troubleshooting

### Web app connects to the wrong backend

Symptom:

- dashboard API calls target `3125/3126` while the backend is on `3123/3124` or `4565/4566`

Fix:

- set `NEXT_PUBLIC_API_URL`
- set `NEXT_PUBLIC_WS_URL`
- restart the web dev server after changing env

### Replay buffer save fails

Symptom:

- backend logs show `SaveReplayBuffer failed`

What to check:

- OBS replay buffer is actually enabled
- `OBS_REPLAY_OUTPUT_DIR` points to the OBS replay folder
- the replay file is fresh enough; an older seeded replay can age out before the clip request is made

Note:

- the backend can recover by scanning `OBS_REPLAY_OUTPUT_DIR` for a recent replay file, but only if a usable file is present

### Export returns `NO_ORGANIZATION`

Symptom:

- `POST /api/v1/export/clip` or `POST /api/v1/export/post` returns `403 NO_ORGANIZATION`

Fix:

- log in once through `/api/v1/auth/login` or the OAuth callback flow
- confirm `GET /api/v1/auth/me` returns at least one organization in `user.organizations`
- for local validation, create the user with `pnpm --dir apps/desktop-companion dev:create-user ...` and then complete one real login

### Export cannot find FFmpeg in a fresh shell

Symptom:

- backend health or export calls report FFmpeg as unavailable even though it works in another terminal

Fix:

- set `FFMPEG_PATH` and `FFPROBE_PATH` to absolute executable paths before starting the backend
- this is especially important on Windows when the server is launched from a detached PowerShell process

### Preview is missing

What to check:

- OBS is streaming to `rtmp://localhost:1935/live`
- MediaMTX is up
- `GET /api/video/status` shows streaming state
- WHEP/HLS endpoints from [../guides/STREAMING_PIPELINE.md](../guides/STREAMING_PIPELINE.md) are reachable

### No outputs are generated

What to check:

- the AI provider key is configured
- you injected enough transcript volume for the router threshold
- outputs are visible via `GET /api/outputs?sessionId=...` even if the dashboard is stale

### Live STT is unavailable

This does not block the Phase 1 demo.

Use `POST /event/transcript` to inject canonical `TRANSCRIPT_SEGMENT` events deterministically and continue the rest of the flow.

### Database schema drift

Symptom:

- backend boot fails with missing-column Prisma errors

Fix:

- use an isolated schema for demo validation
- rerun `pnpm --dir apps/desktop-companion db:push`
- avoid reusing a stale local database from an older session

## Validation Evidence

The current runbook is based on a successful local export validation on 2026-03-19 where:

- an isolated Prisma schema `liv13_export_validation` was used for repeatable testing
- the backend ran on `4575/4576`
- health checks reported `ffmpeg: true`, `database: true`, and `agents: true`
- the seeded local user `liv13@example.com` completed a real `/api/v1/auth/login`
- that first login auto-created the workspace `LIV 13 Demo's Workspace` with slug `liv-13-demo-workspace-1fw1vx8b`
- the validated session id was `liv13-export-session`
- the exported clip artifact id was `53efe651-8db2-4578-be31-63d1155d2872`
- `POST /api/v1/export/clip` returned export id `cmmy0tqpd0005i74knr6e3ou7`
- `GET /api/v1/export/cmmy0tqpd0005i74knr6e3ou7/status` returned `COMPLETED`
- the validated download URL was `/api/v1/export/cmmy0tqpd0005i74knr6e3ou7/download`
- the exported filename was `53efe651-8db2-4578-be31-63d1155d2872_youtube.mp4`
- the downloaded export size was `1902159` bytes
- the generated files were written to:
  - `apps/desktop-companion/exports/clips/53efe651-8db2-4578-be31-63d1155d2872_youtube.mp4`
  - `apps/desktop-companion/exports/clips/53efe651-8db2-4578-be31-63d1155d2872_youtube_thumb.jpg`

Treat that as the most recent known-good path unless a newer validation doc supersedes it.

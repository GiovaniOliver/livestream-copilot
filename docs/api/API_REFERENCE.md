# FluxBoard Livestream Copilot - API Reference

> **Base URL:** `http://localhost:4555`
> **WebSocket:** `ws://localhost:9001`
> **Version:** 1.0.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [Health and Status](#health-and-status)
3. [Auth](#auth-endpoints)
4. [OAuth](#oauth-endpoints)
5. [Sessions](#session-endpoints)
6. [Events and Moments](#event-endpoints)
7. [Outputs](#output-endpoints)
8. [Clips](#clip-endpoints)
9. [Clip Queue](#clip-queue-endpoints)
10. [OBS Integration](#obs-endpoints)
11. [Recordings](#recording-endpoints)
12. [Triggers](#trigger-endpoints)
13. [Billing](#billing-endpoints)
14. [Export](#export-endpoints)
15. [Branding](#branding-endpoints)
16. [Social Media](#social-endpoints)
17. [Video Streaming](#video-endpoints)
18. [AI Agents](#agent-endpoints)
19. [Speech-to-Text](#stt-endpoints)
20. [Legacy Endpoints](#legacy-endpoints)
21. [WebSocket Events](#websocket-events)
22. [Error Codes](#error-codes)

---

## Authentication

The API supports two authentication methods:

### Bearer JWT

Obtain a token from `/api/v1/auth/login` or `/api/v1/auth/refresh`, then pass it in the `Authorization` header.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Key

Pass a static API key in the `x-api-key` header for service-to-service communication.

```
x-api-key: your-api-key-here
```

### Rate Limits

| Endpoint Group      | Limit                    |
|---------------------|--------------------------|
| Session list        | 30 req/min per IP        |
| Session read        | 100 req/min per IP       |
| Output regenerate   | 10 req/min per user      |
| Auth login          | 5 per 15min per IP:email |
| Auth register       | 3 per hour per IP        |
| Auth password reset | 3 per hour per IP        |
| Auth token refresh  | 10 per min per IP        |

When rate limited, the server returns HTTP `429` with `RateLimit-*` headers.

### Response Envelope

Most API v1 endpoints return a standard envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email: Invalid email format"
  }
}
```

OBS and legacy endpoints use a simpler format:

```json
{
  "ok": true,
  ...
}
```

---

## Health and Status

### GET /health

Returns service health including all component statuses.

**Authentication:** None

```bash
curl http://localhost:4555/health
```

```json
{
  "ok": true,
  "service": "desktop-companion",
  "version": "1.0.0",
  "uptime": 3600.5,
  "timestamp": "2026-02-26T12:00:00.000Z",
  "database": true,
  "ffmpeg": true,
  "agents": true,
  "sessionId": null,
  "components": {
    "database": true,
    "obs": true,
    "stt": true,
    "ai": true,
    "ffmpeg": true,
    "agents": true,
    "replayBuffer": {
      "active": true,
      "lastSavedAt": null,
      "lastError": null
    },
    "video": {
      "enabled": true,
      "serverRunning": true,
      "streamActive": false
    }
  },
  "session": { "active": false }
}
```

Alias: `GET /api/health`

### GET /ffmpeg/status

Returns FFmpeg and FFprobe availability.

**Authentication:** None

```bash
curl http://localhost:4555/ffmpeg/status
```

---

## Auth Endpoints

All auth endpoints are under `/api/v1/auth`.

### POST /api/v1/auth/register

Create a new user account.

**Authentication:** None

```bash
curl -X POST http://localhost:4555/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "creator@example.com",
    "password": "SecurePass123!@",
    "name": "Stream Creator"
  }'
```

| Field    | Type   | Required | Description                          |
|----------|--------|----------|--------------------------------------|
| email    | string | Yes      | Valid email, max 254 chars           |
| password | string | Yes      | 12-128 chars                         |
| name     | string | No       | Display name, max 100 chars          |

**Responses:**
- `201` - User created (tokens in response)
- `400` - Validation error
- `409` - Email already registered
- `429` - Rate limited (3/hour/IP)

### POST /api/v1/auth/login

Authenticate with email and password.

```bash
curl -X POST http://localhost:4555/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "creator@example.com",
    "password": "SecurePass123!@"
  }'
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "cmlbc...",
      "email": "creator@example.com",
      "name": "Stream Creator",
      "organizations": [
        { "id": "org_abc", "name": "My Team", "role": "OWNER" }
      ]
    }
  }
}
```

**Responses:**
- `200` - Login successful
- `401` - Invalid credentials
- `429` - Rate limited (5/15min/IP:email)

### POST /api/v1/auth/refresh

Exchange a refresh token for a new access token.

```bash
curl -X POST http://localhost:4555/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "eyJhbGciOi..." }'
```

**Responses:**
- `200` - New access token
- `401` - Invalid or expired refresh token

### POST /api/v1/auth/logout

Revoke a single refresh token. Always returns 200 to prevent token enumeration.

```bash
curl -X POST http://localhost:4555/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "eyJhbGciOi..." }'
```

### POST /api/v1/auth/logout-all

Revoke all refresh tokens for the authenticated user.

**Authentication:** Required

```bash
curl -X POST http://localhost:4555/api/v1/auth/logout-all \
  -H "Authorization: Bearer eyJhbGciOi..."
```

### POST /api/v1/auth/verify-email

Verify an email address using a token sent via email.

```bash
curl -X POST http://localhost:4555/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{ "token": "verification-token-here" }'
```

### POST /api/v1/auth/resend-verification

Resend verification email. Always returns 200 to prevent email enumeration.

```bash
curl -X POST http://localhost:4555/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{ "email": "creator@example.com" }'
```

### POST /api/v1/auth/forgot-password

Request a password reset link. Always returns 200.

```bash
curl -X POST http://localhost:4555/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "creator@example.com" }'
```

### POST /api/v1/auth/reset-password

Reset password using a reset token.

```bash
curl -X POST http://localhost:4555/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-here",
    "password": "NewSecurePass456!@"
  }'
```

### GET /api/v1/auth/me

Get the authenticated user's profile and organization memberships.

**Authentication:** Required

```bash
curl http://localhost:4555/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

## OAuth Endpoints

All OAuth endpoints are under `/api/v1/auth/oauth`. Supported providers: **Google**, **GitHub**, **Twitch**.

### GET /api/v1/auth/oauth/providers

List configured OAuth providers.

**Authentication:** None

```bash
curl http://localhost:4555/api/v1/auth/oauth/providers
```

### GET /api/v1/auth/oauth/{provider}

Initiate OAuth flow. Redirects the user to the provider's consent screen.

**Authentication:** None

```
GET /api/v1/auth/oauth/google
```

### GET /api/v1/auth/oauth/{provider}/callback

OAuth callback handler. Exchanges the code for tokens and redirects to the frontend with access and refresh tokens as query parameters.

### POST /api/v1/auth/oauth/{provider}/link

Link an OAuth account to the currently authenticated user.

**Authentication:** Required

```bash
curl -X POST http://localhost:4555/api/v1/auth/oauth/github/link \
  -H "Authorization: Bearer eyJhbGciOi..."
```

### DELETE /api/v1/auth/oauth/{provider}

Unlink an OAuth account. Prevents unlinking the last authentication method.

**Authentication:** Required

```bash
curl -X DELETE http://localhost:4555/api/v1/auth/oauth/github \
  -H "Authorization: Bearer eyJhbGciOi..."
```

### GET /api/v1/auth/oauth/connections

List all linked OAuth accounts for the current user.

**Authentication:** Required

```bash
curl http://localhost:4555/api/v1/auth/oauth/connections \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

## Session Endpoints

Sessions track livestream capture workflows including participants, events, outputs, and clips.

### GET /api/sessions

List sessions with filtering and pagination.

```bash
curl "http://localhost:4555/api/sessions?workflow=podcast&limit=10&orderBy=startedAt&orderDir=desc"
```

| Parameter   | Type    | Default   | Description                               |
|-------------|---------|-----------|-------------------------------------------|
| workflow    | string  | -         | Filter by workflow type                   |
| captureMode | string  | -         | Filter by capture mode                    |
| active      | string  | -         | "true" or "false"                         |
| limit       | integer | 50        | Max 100                                   |
| offset      | integer | 0         |                                           |
| orderBy     | string  | startedAt | `startedAt`, `createdAt`, `updatedAt`     |
| orderDir    | string  | desc      | `asc` or `desc`                           |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "cmlbcgemg0000i7b80ufgh3ko",
        "workflow": "podcast",
        "captureMode": "av",
        "title": "Episode 42",
        "participants": ["Alex", "Jordan"],
        "status": "completed",
        "startedAt": "2026-02-26T10:00:00.000Z",
        "endedAt": "2026-02-26T11:30:00.000Z",
        "isActive": false,
        "counts": { "events": 245, "outputs": 12, "clips": 5 }
      }
    ],
    "pagination": { "total": 47, "limit": 50, "offset": 0 }
  }
}
```

### GET /api/sessions/{id}

Get a session by ID. Pass `?include=relations` to include events, outputs, and clips.

```bash
curl http://localhost:4555/api/sessions/cmlbcgemg0000i7b80ufgh3ko?include=relations
```

**Responses:**
- `200` - Session found
- `400` - Invalid session ID format
- `404` - Session not found

### PATCH /api/sessions/{id}

Update session metadata (title, participants).

```bash
curl -X PATCH http://localhost:4555/api/sessions/cmlbcgemg0000i7b80ufgh3ko \
  -H "Content-Type: application/json" \
  -d '{ "title": "Updated Title", "participants": ["Alex", "Jordan", "Taylor"] }'
```

### DELETE /api/sessions/{id}

Delete a session and all related events, outputs, and clips. Active sessions cannot be deleted.

```bash
curl -X DELETE http://localhost:4555/api/sessions/cmlbcgemg0000i7b80ufgh3ko
```

### POST /api/sessions/{id}/end

End an active session.

```bash
curl -X POST http://localhost:4555/api/sessions/cmlbcgemg0000i7b80ufgh3ko/end
```

---

## Event Endpoints

Events are session-level data points: transcripts, markers, clip intents, and system signals.

### GET /api/events

List events across all sessions with filtering.

```bash
curl "http://localhost:4555/api/events?sessionId=cmlbc...&type=TRANSCRIPT_SEGMENT&limit=50"
```

| Parameter | Type    | Default | Description                          |
|-----------|---------|---------|--------------------------------------|
| sessionId | string  | -       | Filter by session                    |
| type      | string  | -       | Single event type                    |
| types     | string  | -       | Comma-separated event types          |
| afterTs   | string  | -       | Events after this unix timestamp     |
| beforeTs  | string  | -       | Events before this unix timestamp    |
| limit     | integer | 100     | Max 500                              |
| offset    | integer | 0       |                                      |
| orderDir  | string  | desc    | `asc` or `desc`                      |

### GET /api/events/{id}

Get a single event by ID.

### GET /api/events/moments

List moment markers (filtered by `sessionId` query parameter, required).

### POST /api/events/moments

Create a moment marker.

```bash
curl -X POST http://localhost:4555/api/events/moments \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "cmlbcgemg0000i7b80ufgh3ko",
    "type": "hype",
    "label": "Big reaction from chat",
    "timestamp": 342.5
  }'
```

| Field       | Type   | Required | Description                                            |
|-------------|--------|----------|--------------------------------------------------------|
| sessionId   | string | Yes      | Session to attach moment to                            |
| type        | string | No       | `hype`, `qa`, `sponsor`, `clip`, `highlight`, `marker` |
| label       | string | Yes      | Max 200 chars                                          |
| description | string | No       | Max 1000 chars                                         |
| timestamp   | number | Yes      | Seconds from session start                             |
| clipId      | string | No       | Link to a clip                                         |

### DELETE /api/events/moments/{momentId}

Delete a moment marker.

### Session-scoped Events

- `GET /api/sessions/{sessionId}/events` - Events for a specific session
- `GET /api/sessions/{sessionId}/events/moments` - Moments for a specific session
- `POST /api/sessions/{sessionId}/events/moments` - Create moment (sessionId from path)
- `DELETE /api/sessions/{sessionId}/events/moments/{momentId}` - Delete moment

---

## Output Endpoints

Outputs are AI-generated content (social posts, summaries, key points) produced by workflow agents.

### GET /api/outputs

List outputs with filtering.

```bash
curl "http://localhost:4555/api/outputs?sessionId=cmlbc...&status=draft&category=social_post"
```

### GET /api/outputs/{id}

Get output by ID. Includes session context.

### PATCH /api/outputs/{id}

Update output content, status, or metadata.

```bash
curl -X PATCH http://localhost:4555/api/outputs/output123 \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Updated content for the social post",
    "status": "approved"
  }'
```

### PATCH /api/outputs/{id}/status

Update only the output status.

```bash
curl -X PATCH http://localhost:4555/api/outputs/output123/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "approved" }'
```

### POST /api/outputs/{id}/regenerate

Regenerate output content using AI. Rate limited to 10 requests per minute.

```bash
curl -X POST http://localhost:4555/api/outputs/output123/regenerate \
  -H "Content-Type: application/json" \
  -d '{ "instructions": "Make it more concise and add emoji" }'
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "output": { "id": "output123", "text": "...", "status": "draft" },
    "regenerationMetadata": {
      "durationMs": 2340,
      "tokensUsed": 512
    }
  }
}
```

**Responses:**
- `200` - Regenerated
- `429` - Rate limited
- `503` - AI service not configured

### DELETE /api/outputs/{id}

Delete an output.

### POST /api/sessions/{sessionId}/outputs/approve-all

Approve all draft outputs for a session in one call.

```bash
curl -X POST http://localhost:4555/api/sessions/cmlbc.../outputs/approve-all
```

---

## Clip Endpoints

Clips are video segments captured from OBS replay buffer and trimmed via FFmpeg.

### GET /api/clips/{id}

Get clip by database ID or artifact ID.

```bash
curl http://localhost:4555/api/clips/artifact-uuid-here
```

### DELETE /api/clips/{id}

Delete a clip.

### GET /api/sessions/{sessionId}/clips

List clips for a session with pagination.

```bash
curl "http://localhost:4555/api/sessions/cmlbc.../clips?limit=20"
```

---

## Clip Queue Endpoints

The clip queue tracks clips from creation through processing (pending -> recording -> processing -> completed/failed).

### GET /api/clip-queue/stats

Get overall queue statistics.

```bash
curl http://localhost:4555/api/clip-queue/stats
```

### GET /api/clip-queue/{id}

Get a specific queue item.

### PATCH /api/clip-queue/{id}

Update queue item title.

### DELETE /api/clip-queue/{id}

Delete or cancel a queue item (cannot delete items currently processing).

### POST /api/clip-queue/{id}/retry

Retry a failed queue item by resetting it to pending.

### GET /api/sessions/{sessionId}/clip-queue

List queue items for a session, optionally filtered by status.

```bash
curl "http://localhost:4555/api/sessions/cmlbc.../clip-queue?status=PENDING"
```

### POST /api/sessions/{sessionId}/clip-queue/manual

Create a manual clip from the last N seconds.

```bash
curl -X POST http://localhost:4555/api/sessions/cmlbc.../clip-queue/manual \
  -H "Content-Type: application/json" \
  -d '{ "durationSeconds": 60, "title": "Great moment" }'
```

| Field           | Type    | Default | Description             |
|-----------------|---------|---------|-------------------------|
| durationSeconds | integer | 30      | 5 - 300 seconds         |
| title           | string  | -       | Optional title (max 200)|

---

## OBS Endpoints

Control OBS Studio via WebSocket. All endpoints are under `/api/obs` (aliased at `/obs`).

### GET /api/obs/status

Get OBS connection status including streaming, recording, replay buffer, and scenes.

```bash
curl http://localhost:4555/api/obs/status
```

```json
{
  "ok": true,
  "success": true,
  "data": {
    "connected": true,
    "streaming": true,
    "recording": false,
    "replayBufferActive": true,
    "currentScene": "Main Scene",
    "scenes": ["Main Scene", "BRB", "Starting Soon"],
    "wsUrl": "ws://localhost:4455",
    "hasPassword": true
  }
}
```

### POST /api/obs/reconnect

Force reconnect to OBS WebSocket.

### GET /api/obs/scenes

List all OBS scenes with the current active scene.

### POST /api/obs/scenes/switch

Switch the active scene.

```bash
curl -X POST http://localhost:4555/api/obs/scenes/switch \
  -H "Content-Type: application/json" \
  -d '{ "sceneName": "BRB" }'
```

### GET /api/obs/sources

List sources in a scene.

```bash
curl "http://localhost:4555/api/obs/sources?sceneName=Main%20Scene"
```

### POST /api/obs/sources/toggle

Toggle source visibility.

```bash
curl -X POST http://localhost:4555/api/obs/sources/toggle \
  -H "Content-Type: application/json" \
  -d '{ "sceneName": "Main Scene", "sourceName": "Webcam", "visible": false }'
```

### POST /api/obs/stream/start

Start streaming.

### POST /api/obs/stream/stop

Stop streaming.

### POST /api/obs/stream/toggle

Toggle streaming on/off.

### POST /api/obs/record/start

Start recording.

### POST /api/obs/record/stop

Stop recording. Returns the output file path.

### POST /api/obs/record/toggle

Toggle recording on/off.

### POST /api/obs/replay/save

Save the replay buffer to disk.

### POST /api/obs/quicklaunch

Start everything in one call: session + stream + recording + replay buffer.

```bash
curl -X POST http://localhost:4555/api/obs/quicklaunch \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "podcast",
    "title": "Episode 42",
    "participants": [{ "name": "Host" }, { "name": "Guest" }],
    "startStream": true,
    "startRecord": true,
    "startReplay": true
  }'
```

Returns `200` if all succeed, `207` if some components fail.

### POST /api/obs/quickstop

Stop everything: stream + recording + session.

---

## Recording Endpoints

Upload mobile recordings to a session (SOC-407).

### POST /api/sessions/{sessionId}/recordings/upload

Upload a video or audio file.

```bash
curl -X POST http://localhost:4555/api/sessions/cmlbc.../recordings/upload \
  -F "video=@recording.mp4" \
  -F "deviceId=iphone-14" \
  -F "captureMode=video"
```

**Max file size:** 500MB

### GET /api/sessions/{sessionId}/recordings

List recordings for a session with total size.

### DELETE /api/sessions/{sessionId}/recordings/{recordingId}

Delete a recording file.

---

## Trigger Endpoints

Configure auto-triggers that create clips when audio phrases or visual patterns are detected.

### GET /api/workflows/{workflow}/triggers

Get full trigger configuration for a workflow.

```bash
curl http://localhost:4555/api/workflows/streamer/triggers
```

### PUT /api/workflows/{workflow}/triggers

Update trigger configuration.

```bash
curl -X PUT http://localhost:4555/api/workflows/streamer/triggers \
  -H "Content-Type: application/json" \
  -d '{
    "audioEnabled": true,
    "visualEnabled": false,
    "autoClipEnabled": true,
    "autoClipDuration": 30,
    "triggerCooldown": 15
  }'
```

### POST /api/workflows/{workflow}/triggers/audio

Add an audio trigger phrase.

```bash
curl -X POST http://localhost:4555/api/workflows/streamer/triggers/audio \
  -H "Content-Type: application/json" \
  -d '{ "phrase": "clip that", "caseSensitive": false }'
```

### PATCH /api/workflows/{workflow}/triggers/audio/{triggerId}

Toggle an audio trigger on/off.

### DELETE /api/workflows/{workflow}/triggers/audio/{triggerId}

Remove an audio trigger phrase.

### GET /api/workflows/{workflow}/triggers/visual

List visual trigger reference images.

### POST /api/workflows/{workflow}/triggers/visual

Upload a visual trigger reference image.

```bash
curl -X POST http://localhost:4555/api/workflows/streamer/triggers/visual \
  -F "image=@victory-royale.png" \
  -F "label=Victory Screen" \
  -F "threshold=0.8"
```

**Supported formats:** JPEG, PNG, GIF, WebP (max 5MB)

### DELETE /api/workflows/{workflow}/triggers/visual/{triggerId}

Remove a visual trigger reference image.

---

## Billing Endpoints

Stripe-powered subscription billing under `/api/v1/billing`.

### GET /api/v1/billing/plans

Get available subscription plans (public, no auth required).

```bash
curl http://localhost:4555/api/v1/billing/plans
```

### POST /api/v1/billing/checkout-session

Create a Stripe checkout session. Redirects the user to Stripe.

**Authentication:** Required

```bash
curl -X POST http://localhost:4555/api/v1/billing/checkout-session \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{ "priceId": "price_abc123", "organizationId": "org_xyz" }'
```

### POST /api/v1/billing/portal

Create a Stripe customer portal session for managing subscriptions.

**Authentication:** Required

```bash
curl -X POST http://localhost:4555/api/v1/billing/portal \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{ "organizationId": "org_xyz" }'
```

### GET /api/v1/billing/subscription/{organizationId}

Get current subscription details for an organization.

**Authentication:** Required

### GET /api/v1/billing/usage/{organizationId}

Get usage data for an organization (sessions used, storage consumed, max duration).

**Authentication:** Required

### POST /api/v1/billing/webhook

Stripe webhook handler. Requires raw body and `Stripe-Signature` header. Do not call directly.

---

## Export Endpoints

Export content for social media under `/api/v1/export`. All routes require authentication.

### POST /api/v1/export/post

Export formatted text for a social platform.

```bash
curl -X POST http://localhost:4555/api/v1/export/post \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Just wrapped an amazing podcast episode!",
    "platform": "TWITTER",
    "sessionId": "cmlbc...",
    "options": {
      "optimizeHashtags": true,
      "addTimestamps": false
    }
  }'
```

### POST /api/v1/export/clip

Export a video clip with format conversion.

```bash
curl -X POST http://localhost:4555/api/v1/export/clip \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{
    "clipId": "clip-artifact-id",
    "format": "MP4",
    "platform": "TIKTOK",
    "options": {
      "quality": "high",
      "optimizeForPlatform": true,
      "targetAspectRatio": "9:16"
    }
  }'
```

### POST /api/v1/export/batch

Batch export multiple posts and clips.

### POST /api/v1/export/preview

Preview formatted text for multiple platforms without saving.

```bash
curl -X POST http://localhost:4555/api/v1/export/preview \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Check out this clip from today!",
    "platforms": ["TWITTER", "LINKEDIN", "INSTAGRAM"]
  }'
```

### GET /api/v1/export/history

Get export history with pagination (`limit`, `offset` query parameters).

### GET /api/v1/export/stats

Get export statistics (total exports, success rate, by platform).

### GET /api/v1/export/{id}/status

Get export job status and progress.

### GET /api/v1/export/{id}/download

Download an export file. Returns a streaming file response.

### DELETE /api/v1/export/{id}

Delete an export record and file.

---

## Branding Endpoints

Apply video branding (logos, intros, outros, lower thirds, text overlays) under `/api/v1/branding`. All routes require authentication.

### POST /api/v1/branding/export

Export a clip with full branding applied.

```bash
curl -X POST http://localhost:4555/api/v1/branding/export \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{
    "clipId": "clip-artifact-id",
    "format": "MP4",
    "quality": "high",
    "branding": {
      "name": "My Brand",
      "logo": {
        "path": "/assets/logo.png",
        "position": "bottom-right",
        "widthPercent": 15,
        "opacity": 0.8,
        "margin": 20
      },
      "lowerThirds": [{
        "text": "Live from Studio A",
        "startTime": 0,
        "duration": 5,
        "position": "left",
        "textColor": "#FFFFFF",
        "backgroundColor": "#000000",
        "fontSize": 24
      }]
    }
  }'
```

### POST /api/v1/branding/preview

Generate a 10-second branding preview.

### GET /api/v1/branding/presets

List saved branding presets for the current user.

### POST /api/v1/branding/presets

Create a branding preset.

```bash
curl -X POST http://localhost:4555/api/v1/branding/presets \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard Brand",
    "config": {
      "name": "Standard Brand",
      "logo": {
        "path": "/assets/logo.png",
        "position": "bottom-right",
        "widthPercent": 12,
        "opacity": 0.9,
        "margin": 16
      }
    },
    "isDefault": true
  }'
```

### PUT /api/v1/branding/presets/{id}

Update a branding preset.

### DELETE /api/v1/branding/presets/{id}

Delete a branding preset.

---

## Social Endpoints

Manage social media connections and post content under `/api/v1/social`.

Supported platforms: **YouTube**, **Twitter/X**, **TikTok**, **LinkedIn**, **Instagram**, **Facebook**, **Threads**, **Bluesky**

### GET /api/v1/social/platforms

List available platforms and their configuration status.

**Authentication:** Required

### POST /api/v1/social/connect

Initiate OAuth connection to a social platform.

**Authentication:** Required

```bash
curl -X POST http://localhost:4555/api/v1/social/connect \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{ "platform": "YOUTUBE" }'
```

### GET /api/v1/social/callback

OAuth callback handler (public). Redirects to the frontend.

### GET /api/v1/social/connections

List all connected social accounts.

### GET /api/v1/social/connections/{id}

Get a specific connection.

### DELETE /api/v1/social/connections/{id}

Disconnect a social account.

### POST /api/v1/social/post

Create a post on a connected platform.

```bash
curl -X POST http://localhost:4555/api/v1/social/post \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "conn_abc123",
    "content": {
      "text": "Just wrapped an epic stream session!",
      "hashtags": ["livestream", "content", "gaming"],
      "mediaFiles": [{
        "type": "video",
        "path": "/exports/clip_001.mp4",
        "mimeType": "video/mp4"
      }]
    },
    "options": {
      "visibility": "public"
    }
  }'
```

### POST /api/v1/social/post/multi

Post to multiple platforms simultaneously.

```bash
curl -X POST http://localhost:4555/api/v1/social/post/multi \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{
    "connectionIds": ["conn_twitter", "conn_linkedin", "conn_bluesky"],
    "content": {
      "text": "New episode dropping now!"
    }
  }'
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "results": {
      "conn_twitter": { "success": true, "postId": "..." },
      "conn_linkedin": { "success": true, "postId": "..." },
      "conn_bluesky": { "success": false, "error": "Rate limited" }
    },
    "summary": { "total": 3, "success": 2, "failed": 1 }
  }
}
```

### GET /api/v1/social/posts

Get post history with optional filtering.

| Parameter    | Type   | Description             |
|--------------|--------|-------------------------|
| connectionId | string | Filter by connection    |
| platform     | string | Filter by platform name |
| limit        | int    | Max 100                 |
| offset       | int    | Pagination offset       |

---

## Video Endpoints

Control the MediaMTX video streaming server (RTMP ingest, WebRTC/HLS playback) under `/api/video`.

### GET /api/video/status

Get streaming server status.

```bash
curl http://localhost:4555/api/video/status
```

### GET /api/video/config

Get MediaMTX configuration.

### GET /api/video/paths

Get active stream paths.

**Response:**
- `200` - Path list
- `503` - Server not running

### POST /api/video/start

Start the MediaMTX server.

**Response:**
- `200` - Started (or already running)
- `503` - Binary not available

### POST /api/video/stop

Stop the MediaMTX server.

---

## Agent Endpoints

Monitor AI workflow agents (Streamer, Podcast, Writers Room, Debate, Brainstorm).

### GET /api/agents/stats

Get agent router statistics, Opik observability config, and AI model info.

```bash
curl http://localhost:4555/api/agents/stats
```

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "workflowCount": 5,
    "agentCount": 5,
    "activeSessionCount": 1,
    "opik": {
      "configured": true,
      "workspaceName": "fluxboard",
      "projectName": "livestream-copilot",
      "dashboardUrl": "https://www.comet.com/opik/..."
    },
    "config": {
      "aiProvider": "anthropic",
      "aiModel": "claude-sonnet-4-20250514",
      "maxTokens": 4096
    }
  }
}
```

### GET /agents/status

Legacy agent status endpoint.

---

## STT Endpoints

Speech-to-text transcription control. Available at both `/stt/*` and `/api/stt/*`.

### POST /api/stt/start

Start speech-to-text transcription for the active session.

```bash
curl -X POST http://localhost:4555/api/stt/start \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en-US",
    "diarization": true,
    "interimResults": true,
    "keywords": ["FluxBoard", "clip that"]
  }'
```

### POST /api/stt/stop

Stop transcription.

### POST /api/stt/audio

Send audio data for transcription. Accepts either base64 JSON or raw binary.

**JSON body:**

```bash
curl -X POST http://localhost:4555/api/stt/audio \
  -H "Content-Type: application/json" \
  -d '{ "audio": "base64-encoded-audio-data" }'
```

**Raw binary:**

```bash
curl -X POST http://localhost:4555/api/stt/audio \
  -H "Content-Type: application/octet-stream" \
  --data-binary @audio-chunk.raw
```

### GET /api/stt/status

Get STT status and available providers.

```bash
curl http://localhost:4555/api/stt/status
```

---

## Legacy Endpoints

These endpoints use the simpler `{ ok: true }` response format and do not require authentication.

### POST /session/start

Start a new livestream session.

```bash
curl -X POST http://localhost:4555/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "podcast",
    "captureMode": "av",
    "title": "Episode 42 - AI in Content Creation",
    "participants": [
      { "id": "host1", "name": "Alex" },
      { "id": "guest1", "name": "Jordan" }
    ]
  }'
```

**Response (200):**

```json
{
  "ok": true,
  "sessionId": "cmlbcgemg0000i7b80ufgh3ko",
  "startedAt": 1740567600000,
  "ws": "ws://localhost:9001"
}
```

**Responses:**
- `200` - Session started
- `409` - Session already active

### POST /session/stop

Stop the active session. Returns duration.

### GET /session/status

Get active session status (workflow, participants, elapsed time).

### GET /session/force-stop

Clear session state immediately (GET convenience method).

### POST /session/force-stop

Clear session state (POST method, includes timestamp).

### POST /clip

Create a clip from the OBS replay buffer.

### POST /clip/start

Mark the start time for a new clip.

### POST /clip/end

End a clip and save it. Triggers FFmpeg trimming.

### POST /screenshot

Capture an OBS source screenshot.

```bash
curl -X POST http://localhost:4555/screenshot \
  -H "Content-Type: application/json" \
  -d '{ "sourceName": "Webcam" }'
```

### POST /frame

Alias for `/screenshot`.

---

## WebSocket Events

Connect to the WebSocket server to receive real-time events:

```javascript
const ws = new WebSocket("ws://localhost:9001");

ws.onopen = () => {
  console.log("Connected to FluxBoard WebSocket");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "hello":
      // Connection established
      break;
    case "SESSION_START":
      // Session began
      break;
    case "TRANSCRIPT_SEGMENT":
      // New transcript text
      break;
    case "ARTIFACT_CLIP_CREATED":
      // Clip saved
      break;
    case "OUTPUT_CREATED":
      // AI output generated
      break;
  }
};
```

### Event Types

| Type                     | Description                                       |
|--------------------------|---------------------------------------------------|
| `hello`                  | Connection handshake                              |
| `SESSION_START`          | Session started (sessionId, workflow, title)       |
| `SESSION_END`            | Session ended (sessionId, duration)                |
| `TRANSCRIPT_SEGMENT`     | Speech transcript chunk (text, speakerId)          |
| `MOMENT_MARKER`          | Manual or auto moment marker                       |
| `CLIP_INTENT_START`      | Clip recording started                             |
| `CLIP_INTENT_END`        | Clip recording ended                               |
| `ARTIFACT_CLIP_CREATED`  | Clip file saved (artifactId, path, t0, t1)         |
| `ARTIFACT_FRAME_CREATED` | Screenshot captured (artifactId, path, sourceName) |
| `OUTPUT_CREATED`         | AI output generated (category, title, text)        |
| `OUTPUT_VALIDATED`       | Output validation result                           |
| `AUTO_TRIGGER_DETECTED`  | Audio or visual trigger fired                      |
| `CLIP_QUEUE_UPDATED`     | Clip queue status changed                          |

### Sending Messages

The WebSocket accepts `MEDIAPIPE_DETECTION` messages from the browser for visual trigger processing:

```javascript
ws.send(JSON.stringify({
  type: "MEDIAPIPE_DETECTION",
  sessionId: "cmlbc...",
  payload: {
    detections: [
      { label: "thumbs_up", confidence: 0.95 }
    ]
  }
}));
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning                                   |
|------|-------------------------------------------|
| 200  | Success                                   |
| 201  | Created                                   |
| 207  | Partial success (quicklaunch/quickstop)   |
| 302  | Redirect (OAuth flows)                    |
| 400  | Bad request / validation error            |
| 401  | Authentication required or invalid        |
| 403  | Forbidden / insufficient permissions      |
| 404  | Resource not found                        |
| 409  | Conflict (session already active)         |
| 429  | Rate limit exceeded                       |
| 500  | Internal server error                     |
| 503  | Service unavailable (OBS, MediaMTX)       |

### Application Error Codes

| Code                    | Module   | Description                                 |
|-------------------------|----------|---------------------------------------------|
| `VALIDATION_ERROR`      | All      | Request body or query validation failed      |
| `INVALID_SESSION_ID`    | Sessions | Session ID format is invalid                 |
| `SESSION_NOT_FOUND`     | Sessions | Session does not exist                       |
| `SESSION_ACTIVE`        | Sessions | Cannot delete an active session              |
| `SESSION_ALREADY_ENDED` | Sessions | Session was already stopped                  |
| `OUTPUT_NOT_FOUND`      | Outputs  | Output does not exist                        |
| `CLIP_NOT_FOUND`        | Clips    | Clip does not exist                          |
| `EVENT_NOT_FOUND`       | Events   | Event does not exist                         |
| `NOT_A_MOMENT`          | Events   | Event is not a moment marker                 |
| `MOMENT_SESSION_MISMATCH` | Events | Moment does not belong to the session       |
| `AUTH_REQUIRED`         | Auth     | No valid authentication provided             |
| `INVALID_CREDENTIALS`   | Auth     | Email or password incorrect                  |
| `EMAIL_EXISTS`          | Auth     | Email already registered                     |
| `TOKEN_EXPIRED`         | Auth     | Access or refresh token expired              |
| `INVALID_PROVIDER`      | OAuth    | Unsupported OAuth provider                   |
| `ALREADY_LINKED`        | OAuth    | OAuth account already linked                 |
| `CANNOT_UNLINK`         | OAuth    | Last auth method cannot be removed           |
| `CHECKOUT_ERROR`        | Billing  | Stripe checkout session creation failed      |
| `PORTAL_ERROR`          | Billing  | Stripe portal session creation failed        |
| `WEBHOOK_ERROR`         | Billing  | Stripe webhook processing failed             |
| `EXPORT_NOT_FOUND`      | Export   | Export record does not exist                 |
| `EXPORT_NOT_READY`      | Export   | Export not yet completed                     |
| `NO_ORGANIZATION`       | Export   | User must belong to an organization          |
| `PRESET_NOT_FOUND`      | Branding | Branding preset does not exist               |
| `POST_FAILED`           | Social   | Social media post creation failed            |
| `PLATFORM_NOT_CONFIGURED` | Social | Social platform is not configured            |
| `AI_NOT_CONFIGURED`     | Agents   | AI provider not set (set ANTHROPIC_API_KEY)  |
| `INTERNAL_ERROR`        | All      | Unexpected server error                      |

---

## OpenAPI Specification

The full OpenAPI 3.1 specification is available at:

```
apps/desktop-companion/openapi.yaml
```

You can load this file into Swagger UI, Redoc, or any OpenAPI-compatible tool for interactive exploration.

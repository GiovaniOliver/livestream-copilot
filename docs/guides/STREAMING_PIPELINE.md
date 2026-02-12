# Streaming Pipeline (Content Creator)

This guide captures the current live preview + clip pipeline behavior for the Content Creator workflow, including recent fixes and how to validate the stream path end-to-end.

Last updated: 2026-02-09

## What Works Now

- OBS streams to MediaMTX via RTMP.
- Web dashboard previews the stream via WebRTC (WHEP), with an HLS availability check as a guard.
- Manual clip queue items can be created from the web UI (debug panel) and processed through the replay buffer via FFmpeg.
- Audio and visual trigger services are wired into the auto-clip manager when a session starts, and stopped on session stop.
- MediaMTX auto-starts on backend boot. If the bundled `mediamtx.yml` is missing, a config is generated into `apps/desktop-companion/data/mediamtx.yml`.

## Stream Ingest (OBS -> MediaMTX)

- OBS Server: `rtmp://localhost:1935/live`
- OBS Stream Key: `stream`
- Resulting path: `live/stream`

MediaMTX then serves:

- WHEP (WebRTC): `http://localhost:8889/live/stream/whep`
- HLS: `http://localhost:8888/live/stream/index.m3u8`

Important: WHEP is a playback endpoint only. Do not paste WHEP into the OBS server field. OBS should only use the RTMP server + stream key above.

## Live Preview (Web)

The live preview component:

- Uses WebRTC (WHEP) as the primary preview path.
- Performs a lightweight runtime check for WebRTC support (`RTCPeerConnection`) before attempting WebRTC.
- Performs a short HLS availability check (2s timeout) before attaching the HLS player.

If the preview flickers, confirm:

- MediaMTX is running with WHEP + HLS enabled.
- The stream path exists (`live/stream`).
- HLS index is reachable.

### Known HLS Console Noise

The browser may request variant playlists like:

- `http://localhost:8888/live/stream/video1_stream.m3u8`
- `http://localhost:8888/live/stream/audio2_stream.m3u8`

MediaMTX may not emit these variant files depending on encoding and playlist layout. If `index.m3u8` is OK, these 404s are usually harmless.

## Clip Pipeline (How Clips Are Made)

Clips are not trimmed directly from the RTMP stream. Instead:

1. Triggers create a clip queue item with `t0` and `t1`.
2. The clip queue processor searches for the most recent replay buffer file (e.g. `replay*.mp4` or `replay*.mkv`) in the session directory.
3. FFmpeg trims the replay buffer around `t0`/`t1`, generates a thumbnail, and writes a clip artifact.

This means OBS replay buffer must be enabled and saving to the session directory (or its parent) for clips to process.

## Triggers and Auto-Clips

Audio triggers:

- Use STT transcript segments.
- Only final segments are processed.
- Trigger phrases are matched with a cooldown.

Visual triggers:

- Start when the session starts and stop on session stop.

Manual triggers:

- Manual clip queue items can be created from the debug panel.

Auto-clip behavior:

- Auto clips only start if enabled in trigger config.
- Manual clips always auto-end even when auto-clip is disabled.

## Debug Panel (Content Creator Session)

The Content Creator session page includes a debug panel that can:

- Start/stop microphone STT (`/api/stt/start`, `/api/stt/stop`).
- Send mic audio to `/api/stt/audio` (16k PCM, base64).
- Enqueue a manual clip for the last N seconds (`POST /api/sessions/:id/clip-queue/manual`).
- Show recent WebSocket events and connection state.

## Local STT (Whisper)

To use local Whisper instead of Deepgram:

- Set `STT_PROVIDER=whisper` in `apps/desktop-companion/.env`.
- Download a Whisper model and set `WHISPER_MODEL_PATH` to the file path.

If `WHISPER_MODEL_PATH` is empty, `/api/stt/start` will fail.

## Recent Fixes (2026-02-09)

- WHEP endpoint was corrected to use the `live/stream/whep` path.
- Added WebRTC runtime support check to prevent repeated connection churn.
- Added HLS availability check before attaching the player.
- Trigger router was made resilient to missing `multer` (routes mount even without uploads).
- Manual clip queue endpoint added (`/api/sessions/:id/clip-queue/manual`).
- Audio trigger and clip processor lifecycle wired to session start/stop.

## Troubleshooting

If you see 404s for trigger endpoints:

- Ensure the desktop-companion server has been restarted after updates.
- Check server logs for `triggers` router loading.
- If `multer` is missing, image upload is disabled but routes should still return non-404 responses (503 for uploads only).

If clips never process:

- Confirm OBS replay buffer is enabled.
- Verify replay files (`replay*.mp4` / `replay*.mkv`) exist under the session directory.
- Check the clip queue processor logs for "Replay buffer not found".

If OBS cannot connect to `rtmp://localhost:1935/live`:

- Verify MediaMTX is running (ports `1935`, `8888`, `8889`, `9997` should be listening).
- If ports are closed, inspect desktop-companion logs for MediaMTX startup errors.

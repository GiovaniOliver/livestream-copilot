# Architecture

## High-level components

### 1) Capture Layer
Two capture modes are supported:

- **Desktop (OBS)**: OBS Replay Buffer + screenshots via obs-websocket.
- **Mobile**: Expo video recording (MVP) or “remote trigger” controlling OBS.

Capture outputs are standardized as timestamped artifacts:

- `FRAME` artifacts: still images (thumbnails, scene snapshots)
- `CLIP` artifacts: short mp4 cuts
- `AUDIO` artifacts: optional (for audio-only sessions)

### 2) Session Engine
The session engine is a workflow-agnostic pipeline that:

1. Ingests capture artifacts + audio transcript segments
2. Normalizes all inputs into an event stream (see `docs/EVENT_SCHEMAS.md`)
3. Runs workflow-specific “agent transforms” to produce outputs
4. Emits outputs for dashboards and exports

### 3) Agent Orchestration (Claude Code)
Claude Code is used as an orchestrator over local artifacts:

- `.claude/subagents/` — role-based subagents
- `.claude/skills/` — repeatable procedures (formatting, validation, packaging)
- `.claude/commands/` — slash commands (operator controls)
- `.claude/hooks/` — hook templates for automation triggers

### 4) Dashboards
Dashboards are “workflow skins” over the same underlying primitives:

- Moment
- Artifact
- Output
- Link

Desktop favors canvases (mind maps, claim graphs). Mobile favors review/approval stacks.

## Data flow (typical OBS session)

1. OBS is configured with Replay Buffer enabled.
2. Desktop companion connects to OBS via obs-websocket.
3. Mobile app sends `CLIP_START` / `CLIP_END` intent markers.
4. On CLIP_END, desktop companion calls `SaveReplayBuffer`, creates a raw replay file, then trims the exact range and emits a `ARTIFACT_CLIP_CREATED` event.
5. Transcript segments arrive (STT provider) and are emitted as `TRANSCRIPT_SEGMENT` events.
6. Agents convert events into outputs: posts, clip titles, beat suggestions, claims/evidence.


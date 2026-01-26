# FluxBoard (OBS + Mobile) — Agentic Live Workflow MVP

FluxBoard is a hackathon-oriented scaffold for a **workflow-first** agentic system that turns live sessions into structured, shareable assets **while they happen**.

Key ideas:

- **Workflow selection**: Streamer • Podcast • Writers Room • Brainstorm • Debate
- **Capture mode selection**: **audio-only**, **video-only**, or **audio+video**
- **Real-time outputs**: social drafts, clip titles, chapters, beats/script inserts, claims & evidence cards
- **Workflow-specific dashboards**: visual metaphors that match the activity (Producer Desk, Script Studio, Mind Map Room, Claims & Evidence Board)
- **Agent observability**: Comet **Opik** tracing hooks are included in the desktop companion for quick demo-time instrumentation.

## Monorepo layout

- `apps/mobile` — Expo (React Native) app for session setup + lightweight workflow dashboards.
- `apps/desktop-companion` — Node service that connects to OBS (obs-websocket) and exposes a local HTTP + WebSocket API for the mobile app and agent layer.
- `apps/web` — Static landing page + about page.
- `packages/shared` — Shared event schemas/types (Zod) used across apps.
- `.claude` — Claude Code automation pack: subagents, slash commands, skills, and hook templates.
- `docs` — Architecture, workflows, UI dashboard specs, and operations guides.
  - [CONTRIB.md](docs/CONTRIB.md) — Development workflow and setup
  - [RUNBOOK.md](docs/RUNBOOK.md) — Deployment and operations

## Observability (Comet Opik)

The desktop companion is instrumented with an Opik wrapper (`apps/desktop-companion/src/observability/opik.ts`). Opik can be configured via environment variables.

Minimal env setup (cloud or self-hosted):

- `OPIK_WORKSPACE_NAME`
- `OPIK_PROJECT_NAME`
- `OPIK_API_KEY` (required for Opik Cloud; optional for self-hosted depending on your setup)
- `OPIK_URL_OVERRIDE` (optional: cloud endpoint or self-hosted API URL)

See Opik docs for tracing concepts (traces, spans, threads) and SDK usage.

## Quick start (dev)

### 1) Install all dependencies

```bash
npm run install:all
```

### 2) Configure environment

```bash
cp .env.sample .env
# Edit .env with your API keys and database URL
```

### 3) Start all services

```bash
# Start everything (API + Web + Mobile)
npm run dev

# Or start individually:
npm run dev:api     # Desktop companion only
npm run dev:web     # Next.js web app only
npm run dev:mobile  # Expo mobile app only
```

### Default ports

| Service | Port |
|---------|------|
| Desktop Companion HTTP | 3123 |
| Desktop Companion WebSocket | 3124 |
| Web App | 3000 |

See [docs/CONTRIB.md](docs/CONTRIB.md) for detailed setup instructions.

## Next steps

- Add your preferred STT provider to emit `TRANSCRIPT_SEGMENT` events.
- Add gesture/voice detection to call `POST /clip/start` and `POST /clip/end`.
- Implement the ffmpeg trim step (`scripts/trim_clip.sh`) to turn replay-buffer saves into clean social clips.
- Connect a real agent runtime to generate `OUTPUT_CREATED` events.

## Documentation

- [Contributing Guide](docs/CONTRIB.md) — Development workflow, scripts reference, environment setup
- [Operations Runbook](docs/RUNBOOK.md) — Deployment, monitoring, troubleshooting, rollback procedures
- [Architecture](docs/ARCHITECTURE.md) — System components and data flow
- [Workflows](docs/WORKFLOWS.md) — Supported workflow types and agent roles
- [Observability](docs/OBSERVABILITY.md) — Comet Opik tracing setup


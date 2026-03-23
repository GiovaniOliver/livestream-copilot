# First Supported Workflow Contract

Status: Selected MVP slice for Phase 1  
Canonical workflow ID: `streamer`  
Dashboard aliases: `content-creator` route, "Producer Desk" UI label  
Required capture mode: `av`

Operator runbook: [FIRST_SUPPORTED_WORKFLOW_RUNBOOK.md](./FIRST_SUPPORTED_WORKFLOW_RUNBOOK.md)

## Decision

The first supported Livestream-Copilot workflow is the live streamer flow.

Use the backend/shared workflow identifier `streamer` as the source of truth. Treat the web app's "Content Creator" label and "Producer Desk" dashboard metaphor as presentation aliases for the same workflow.

This is the strongest first slice because the repo already has:

- shared session/event schemas centered on `streamer`
- a concrete backend `StreamerAgent`
- an implemented live preview and replay-buffer clip pipeline
- a web dashboard that already renders clips, moments, and output drafts

## Why This Workflow

The current repo has the most end-to-end support for the streamer/content-creator path:

- `packages/shared/src/schemas/session.ts` defines `streamer` as a canonical workflow type.
- `packages/shared/src/schemas/events.ts` already defines the live-loop events needed for transcript, clip, and output flow.
- `apps/desktop-companion/src/agents/workflows/streamer.agent.ts` is a concrete workflow agent that generates `SOCIAL_POST`, `CLIP_TITLE`, `CHAPTER_MARKER`, and `QUOTE`.
- `docs/guides/STREAMING_PIPELINE.md` documents the current OBS -> MediaMTX -> replay buffer -> clip path.
- `apps/web/src/app/dashboard/session/[id]/content-creator/page.tsx` already exposes the Producer Desk surfaces for live preview, detected clips, post drafts, and moment review.

Other workflows have UI and/or agent scaffolding, but the streamer flow has the clearest path to a repeatable live demo with visible artifacts.

## Naming Contract

Use these names consistently:

- API/session creation: `workflow: "streamer"`
- Shared event/session schemas: `streamer`
- Web route: `/dashboard/session/:id/content-creator`
- Web workflow label: `Content Creator`
- Desktop dashboard metaphor: `Producer Desk`

Do not introduce a second backend workflow ID such as `content_creator` for the MVP contract. If the UI continues to use that label, it should remain a frontend alias mapped back to `streamer`.

## Capture Mode Contract

The first supported capture mode is `av`.

Why `av`:

- transcript segments are required for moment detection and draft generation
- video/replay buffer is required for visible clip artifacts
- the current dashboard value is strongest when clips and transcript-driven outputs both show up during the same session

For Phase 1, `audio` and `video` only modes are out of scope as primary demo paths. They may exist as degraded technical modes, but they do not define MVP success.

## Operator Flow

1. The operator starts a session with `workflow="streamer"` and `captureMode="av"`.
2. OBS sends the live stream to MediaMTX, and the desktop companion exposes preview state to the web dashboard.
3. STT begins emitting `TRANSCRIPT_SEGMENT` events for the active session.
4. The operator and/or trigger system identifies notable moments:
   - manual markers via the moment rail/debug tools
   - automatic audio/visual triggers when configured
5. A clip request enters the queue:
   - automatically through trigger detection, or
   - manually through the clip queue/debug panel
6. The replay buffer is saved and trimmed into a real clip artifact.
7. The streamer agent turns transcript/moment/clip context into visible outputs, primarily social post drafts and supporting metadata.
8. The operator reviews results in Producer Desk:
   - live preview remains active
   - detected clips appear in the clip list
   - drafts appear in the post queue
   - moments appear in the rail/timeline
9. The operator can export a completed clip through Producer Desk or the authenticated `/api/v1/export/clip` flow once a clip artifact exists.
10. The session ends, and the generated clips/outputs remain queryable through the backend APIs.

## Required Event Contract

### Session lifecycle

- `SESSION_START` must exist for the session.
- `SESSION_END` must be emitted or the session must be explicitly ended through the session API.

### Transcript loop

- `TRANSCRIPT_SEGMENT` is required.
- Transcript volume must be sufficient to trigger the agent router's minimum transcript threshold and generate at least one output-worthy context window.

### Moment loop

- `MOMENT_MARKER` is required for at least one notable point in the session.
- Markers may be operator-created or system-created.

### Clip loop

At least one clip must complete through one of these valid paths:

- Auto path:
  - `AUTO_TRIGGER_DETECTED`
  - `CLIP_INTENT_START`
  - `CLIP_INTENT_END`
  - `CLIP_QUEUE_UPDATED`
  - `ARTIFACT_CLIP_CREATED`
- Manual path:
  - `CLIP_QUEUE_UPDATED`
  - `ARTIFACT_CLIP_CREATED`

`ARTIFACT_FRAME_CREATED` is optional for Phase 1.

### Output loop

- `OUTPUT_CREATED` is required for at least one `SOCIAL_POST`.
- `OUTPUT_CREATED` should also produce at least one supporting structured output from the current streamer agent set:
  - `CLIP_TITLE`, or
  - `CHAPTER_MARKER`, or
  - `QUOTE`

`OUTPUT_VALIDATED` is optional for Phase 1. It should not block the first demo path.

## Visible Output Set

The operator-visible MVP artifacts are:

- Live Preview: active stream preview in Producer Desk
- Detected Clips: at least one completed clip with timestamp/duration and downloadable artifact path
- Post Drafts: at least one generated `SOCIAL_POST` visible in the dashboard output list
- Moment Rail: at least one persisted moment marker visible in the timeline/rail

Supporting persisted outputs that strengthen the demo but are not required to have bespoke UI in Phase 1:

- `CLIP_TITLE`
- `CHAPTER_MARKER`
- `QUOTE`

## Validated Follow-On Export Path

After the workflow has produced a real clip artifact, the currently supported follow-on export path is:

- authenticate through the standard auth flow
- ensure the user has an organization/workspace membership
- export from Producer Desk or `POST /api/v1/export/clip`
- poll `GET /api/v1/export/:id/status`
- download the result from `GET /api/v1/export/:id/download`

The detailed local validation steps, including dev-user bootstrap and the latest known-good export evidence, are documented in [FIRST_SUPPORTED_WORKFLOW_RUNBOOK.md](./FIRST_SUPPORTED_WORKFLOW_RUNBOOK.md).

## Success Criteria

The Phase 1 workflow is considered successful when all of the following are true in one session:

- the session starts with `workflow="streamer"` and `captureMode="av"`
- the web dashboard reaches a usable live preview state
- transcript events are flowing during the live session
- at least one moment marker is recorded
- at least one clip queue item completes and becomes a stored clip artifact
- at least one `SOCIAL_POST` draft is created and visible to the operator
- at least one supporting structured output (`CLIP_TITLE`, `CHAPTER_MARKER`, or `QUOTE`) is persisted
- the session can be ended cleanly while preserving clips and outputs for later review

## Explicit Non-Goals For This Phase

These are not part of the first supported workflow contract:

- court-session, debate, brainstorm, writers room, or podcast as equal Phase 1 deliverables
- workflow switching mid-session
- final social publishing integrations
- perfect platform-specific output categorization in the web UI
- requiring thumbnails/frame artifacts for demo success
- requiring validation/compliance passes before drafts are shown

## Backlog Implications

This contract is the acceptance target for the next implementation issues:

- `LIV-4` should make transcript segment ingestion reliable enough to satisfy the transcript loop above.
- `LIV-5` should make clip completion and visible output generation reliable enough to satisfy the clip/output loops above.

Any future workflow work should be measured against whether it strengthens or distracts from this streamer `av` end-to-end path.

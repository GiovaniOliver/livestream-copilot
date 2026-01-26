# Skill: Comet Opik Observability

## Objective
Instrument the live workflow so each significant operation (session start, clip start/end, frame capture, agent output generation) is traceable end-to-end in **Comet Opik**.

## Inputs
- Session config (`session/current/session.config.json`)
- Event stream (`session/current/events.jsonl`)
- Desktop companion API responses (may include `opikTraceId`)

## Procedure
1. **Confirm Opik configuration**
   - Desktop companion: env vars `OPIK_WORKSPACE_NAME`, `OPIK_PROJECT_NAME`, and either `OPIK_API_KEY` (cloud) or `OPIK_URL_OVERRIDE` (self-hosted).
   - If missing, emit a note: observability disabled.
2. **Map workflow operations to trace names**
   - `session.start`
   - `clip.intent.start`
   - `clip.intent.end`
   - `frame.capture`
   - `agent.output.generate` (one span per agent output)
3. **Attach trace metadata to events**
   - When emitting an event, include `observability: { provider: "opik", traceId, spanId }` if available.
4. **Annotate and triage**
   - When a draft is marked `NEEDS_VERIFY` (e.g., debate workflow), add a span note indicating “verification required”.
   - For clip candidates, add a span note that includes the recommended platform and duration.
5. **Operator UX**
   - Surface the latest `traceId` in the UI.
   - If possible, also store an Opik URL in `observability.url` for one-click navigation.

## Output
- A short status summary:
  - Observability: enabled/disabled
  - Latest traceId/spanId (if present)
  - Any missing env vars or integration warnings

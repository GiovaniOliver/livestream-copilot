Show Comet Opik observability status.

1) Check environment variables:
   - `OPIK_WORKSPACE_NAME`
   - `OPIK_PROJECT_NAME`
   - `OPIK_API_KEY` (cloud) or `OPIK_URL_OVERRIDE` (self-hosted)
2) If a live session exists, read the last 50 events from `session/current/events.jsonl` and report:
   - Most recent `observability.traceId`
   - Count of events with observability metadata
3) Print recommended next actions:
   - If disabled: show the exact env vars to add.
   - If enabled: suggest opening the trace in Opik and inspecting spans for `clip.intent.end` and `frame.capture`.

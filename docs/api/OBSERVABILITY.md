# Observability (Comet Opik)

This scaffold supports **Comet Opik** for tracing end-to-end operations across capture + agents.

## What is instrumented

In `apps/desktop-companion`, we wrap key endpoints in Opik traces:

- `session.start`
- `clip.intent.start`
- `clip.intent.end` (includes spans for `obs.SaveReplayBuffer` and artifact emission)
- `frame.capture` (includes span for `obs.TakeSourceScreenshot`)

Each emitted event may include:

```json
{
  "observability": {
    "provider": "opik",
    "traceId": "...",
    "spanId": "..."
  }
}
```

## Configure

Copy the sample env file:

```bash
cp .env.sample .env
# Or for desktop-companion specific config:
cp apps/desktop-companion/.env.sample apps/desktop-companion/.env
```

Then set:

- `OPIK_WORKSPACE_NAME`
- `OPIK_PROJECT_NAME`
- For Opik Cloud: `OPIK_API_KEY` (and optionally `OPIK_URL_OVERRIDE=https://www.comet.com/opik/api`)
- For self-hosted: `OPIK_URL_OVERRIDE=http://<...>/api` (and the appropriate credentials for your deployment)

Run the companion and trigger a clip start/end. You should see `opikTraceId` in the HTTP responses and `observability.traceId` in WebSocket events.

## Notes

- This is an MVP scaffold. Expand tracing to include **agent spans** (`agent.output.generate`) once your agent runner is wired in.
- If you prefer OpenTelemetry, Opik supports it—swap the wrapper to emit OTEL spans.

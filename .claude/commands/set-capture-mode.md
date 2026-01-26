Update `captureMode` for the active session.

Rules:
- If set to `audio`, stop screenshot sampling and clip generation.
- If set to `video`, disable transcript-dependent outputs unless OCR/visual tags are enabled.
- If set to `av`, enable full pipeline.

Write changes to `session/current/session.config.json` and emit a status message.

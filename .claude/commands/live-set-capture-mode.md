Update the current session capture mode.

- Read `session/current/session.config.json`.
- Set `captureMode` to one of: `audio`, `video`, `av`.
- Write the updated config back to disk.
- Provide an operator summary of what will now be produced:
  - audio: transcript + audio moments (no clips)
  - video: clips/frames (no transcript unless separately enabled)
  - av: transcript + clips/frames

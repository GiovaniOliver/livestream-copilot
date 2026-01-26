Start a new session.

1) Read `session/current/session.config.json`.
2) Confirm workflow + captureMode.
3) If workflow requires transcript and captureMode is not `video`, ensure STT pipeline is running.
4) If captureMode includes video, ensure screenshot sampling and/or OBS replay buffer are active.
5) Emit a brief operator-ready status:
   - sessionId
   - workflow
   - captureMode
   - active agents

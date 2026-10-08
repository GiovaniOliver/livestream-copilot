<!-- Seeded 2026-10-07 from README.md "Next steps", docs/workflows/FIRST_SUPPORTED_WORKFLOW*.md, docs/apps/desktop-companion/IMPLEMENTATION_SUMMARY_SOC-397.md, docs/apps/desktop-companion/PASSWORD_RESET_CHECKLIST.md, the Paperclip roadmap (.paperclip/.../2026-03-18-livestream-copilot-roadmap.md) and tracked files in git; verified against git log. No dedicated status doc existed. -->
# TODO — Livestream-Copilot (FluxBoard)

## P0
- [ ] Remove apps/desktop-companion/env_debug.txt from git and rotate the JWT_SECRET, JWT_REFRESH_SECRET, TOKEN_ENCRYPTION_KEY and DATABASE_URL credentials it exposes (added 2026-10-07) #security

## P1
- [ ] Untrack Paperclip/Codex runtime state (.paperclip/codex-home incl. auth.json, *.sqlite, tmp/) and .claude/settings.local.json, and add them to .gitignore (added 2026-10-07) #cleanup
- [ ] Untrack generated artifacts from the 2026-03-23 checkpoint (apps/desktop-companion/exports/clips/*, test-output.txt, root backend-err.txt/backend-out.txt/test-output.txt) (added 2026-10-07) #cleanup

## P2
- [ ] Update README: replace the stale "Next steps" (all shipped) and fix doc links to files moved under docs/guides, docs/architecture, docs/workflows, docs/api (added 2026-10-07) #docs
- [ ] Deploy auth rate limiting and email verification (SOC-397) to a staging environment, test, then promote to production (added 2026-10-07) #deploy
- [ ] Configure production SMTP and APP_URL for password reset emails, incl. SPF/DKIM/DMARC on the From address (added 2026-10-07) #deploy
- [ ] Bring Podcast, Writers Room, Brainstorm and Debate workflows up to the streamer demo-readiness bar (currently UI/agent scaffolding only) (added 2026-10-07)

## Done
- [x] Agent runtime generating OUTPUT_CREATED events via Claude subagents (done 2026-01-25 @desktop)
- [x] Audio/visual triggers and auto-clip queue to start/end clips (done 2026-02-01 @desktop)
- [x] Define first supported workflow (streamer + av) and output contract, plus demo runbook (LIV-3, LIV-9) (done 2026-03-23 @desktop)
- [x] Route STT transcript segments through the canonical event pipeline (LIV-4) (done 2026-03-23 @desktop)
- [x] ffmpeg clip trim/export pipeline validated end to end (LIV-5, LIV-7) (done 2026-03-23 @desktop)

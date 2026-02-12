# Claude Code Automation Pack

This directory contains the Claude Code (CLI) automation layer for FluxBoard Livestream Copilot. These files are **developer/operator tooling only** -- they run inside Claude Code sessions on your local machine, NOT in production.

For the production runtime agent system, see [`apps/desktop-companion/src/agents/`](../apps/desktop-companion/src/agents/).

For the full architecture reference, see [`docs/architecture/AGENTIC_SYSTEM.md`](../docs/architecture/AGENTIC_SYSTEM.md).

## Folder Structure

```
.claude/
  commands/          # Slash commands for live session workflows
  skills/            # Reusable multi-step procedures
  subagents/         # Role-specialized agent definitions
  hooks/             # Shell hook templates for session lifecycle
  settings.example.json  # Example hook configuration
```

## Commands (Slash Commands)

Operator-invoked actions during a live session. Use as `/command-name` in Claude Code.

| Command | Purpose |
|---------|---------|
| [`live-start`](commands/live-start.md) | Start a new livestream session |
| [`live-clip-queue`](commands/live-clip-queue.md) | Build/update the clip queue |
| [`live-post-now`](commands/live-post-now.md) | Generate social posts immediately |
| [`live-set-capture-mode`](commands/live-set-capture-mode.md) | Set capture mode (`audio`, `video`, `av`) |
| [`live-wrap`](commands/live-wrap.md) | End-of-session packaging |
| [`opik-status`](commands/opik-status.md) | Show Comet Opik observability status |
| [`set-capture-mode`](commands/set-capture-mode.md) | Alias for `live-set-capture-mode` |

## Subagents

Role-specialized agents that Claude Code spawns for specific tasks during a session.

| Subagent | Role | Workflow |
|----------|------|----------|
| [`live-social-producer`](subagents/live-social-producer.md) | Generate platform-specific social posts from transcript | Streamer |
| [`debate-moderator`](subagents/debate-moderator.md) | Extract claims, rebuttals, and moderator prompts | Debate |
| [`brainstorm-scribe`](subagents/brainstorm-scribe.md) | Maintain attributed idea ledger | Brainstorm |
| [`clip-hook-strategist`](subagents/clip-hook-strategist.md) | Generate clip title variants and duration recommendations | All |
| [`podcast-packager`](subagents/podcast-packager.md) | Produce chapters, show notes, and promo copy | Podcast |

## Skills

Reusable multi-step procedures that commands and subagents invoke.

| Skill | Purpose |
|-------|---------|
| [`social-from-live`](skills/social-from-live/SKILL.md) | Generate per-platform social drafts from transcript |
| [`brainstorm-ledger`](skills/brainstorm-ledger/SKILL.md) | Build attributed idea ledger with grouping |
| [`debate-factcheck`](skills/debate-factcheck/SKILL.md) | Extract claims and verification evidence |
| [`podcast-packaging`](skills/podcast-packaging/SKILL.md) | Produce publish-ready podcast assets |
| [`opik-observability`](skills/opik-observability.md) | Comet Opik instrumentation procedures |

## Hooks (Templates)

Shell scripts triggered at session lifecycle events. Currently **placeholder templates** -- implement as needed.

| Hook | Trigger | Purpose |
|------|---------|---------|
| [`session_start.sh`](hooks/session_start.sh) | SessionStart | Start capture pipelines |
| [`start_capture.sh`](hooks/start_capture.sh) | SessionStart | OBS replay buffer, screenshot sampler, STT |
| [`attach_live_context.sh`](hooks/attach_live_context.sh) | UserPromptSubmit | Assemble context bundle from recent events |
| [`validate_outputs.sh`](hooks/validate_outputs.sh) | PostToolUse (Write/Edit) | Validate drafts (length, banned words, tags) |
| [`session_end.sh`](hooks/session_end.sh) | SessionEnd | Package deliverables, export summaries |
| [`package_deliverables.sh`](hooks/package_deliverables.sh) | SessionEnd | Final packaging (recaps, exports) |

See [`settings.example.json`](settings.example.json) for hook wiring configuration.

## Relationship to Production

```
Claude Code (.claude/)          Production Runtime
========================        ========================================
commands/ -> operator UX        apps/desktop-companion/src/agents/
subagents/ -> Claude spawns     ├── router.ts (event dispatcher)
skills/ -> multi-step procs     ├── base.ts (BaseAgent abstract class)
hooks/ -> lifecycle scripts     ├── workflows/*.agent.ts (5 agents)
                                └── validation/validator.ts (4 pipelines)
```

The `.claude/` layer is the **operator interface** for Claude Code sessions.
The `src/agents/` layer is the **production runtime** that runs on the server.

Both layers share the same workflow concepts (Streamer, Podcast, Debate, Brainstorm, Writers Room) but are independent codebases.

---

**Last Updated**: 2026-02-08

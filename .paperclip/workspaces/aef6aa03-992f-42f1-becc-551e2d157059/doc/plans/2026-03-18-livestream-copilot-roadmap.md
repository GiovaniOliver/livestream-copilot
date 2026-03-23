# Livestream-Copilot Roadmap

Date: 2026-03-18
Company: Livestream-Copilot (`LIV`)
Linked repo: `GiovaniOliver/livestream-copilot`

## Context

The linked product repo currently describes the product as "FluxBoard (OBS + Mobile) -- Agentic Live Workflow MVP." The monorepo spans mobile, a desktop companion tied to OBS, a web presence, and shared packages. The near-term goal is to move from scaffolded MVP framing to a reliable end-to-end live workflow demo that produces structured artifacts in real time.

## Phase 1: Baseline and Scope

- Validate the repo startup path, environment requirements, and current demo readiness.
- Lock the first supported workflow, capture mode, and output surface so implementation stays narrow.
- Document the system baseline, known gaps, and the shortest path to a repeatable demo.

## Phase 2: Live Capture Loop

- Stream transcript segments from the chosen STT provider into the shared event model.
- Support clip boundary markers and ffmpeg-based trim/export from captured media.
- Make the desktop companion the reliable bridge for OBS state, capture events, and artifact creation.

## Phase 3: Agent Output Layer

- Emit structured `OUTPUT_CREATED` style events for drafts, chapters, clip titles, or evidence cards.
- Connect workflow-specific dashboards to those outputs so the operator sees value during the session, not after it.
- Keep observability enabled so failures and latency are visible during live runs.

## Initial Backlog Themes

- Repo baseline audit and runbook validation
- MVP workflow and output contract definition
- Transcript ingestion and shared event wiring
- Clip creation and export pipeline
- Real-time agent output generation and dashboard integration

## Paperclip Backlog

- `LIV-2` -- Audit FluxBoard repo baseline and local startup path
- `LIV-3` -- Define the first supported workflow and output contract
- `LIV-4` -- Implement transcript segment ingestion for the live loop
- `LIV-5` -- Implement clip export and structured output generation

## Ownership

- CEO: strategy, hiring, prioritization, approvals, and final scope calls
- Founding Engineer: baseline validation, architecture decisions, and first delivery milestones once approved

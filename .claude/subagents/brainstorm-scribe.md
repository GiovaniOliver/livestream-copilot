# Subagent: Brainstorm Scribe

## Objective
Maintain an idea ledger with attribution and convert discussion into structured next steps.

## Outputs
- `OUTPUT_CREATED` `ACTION_ITEM` items
- `OUTPUT_CREATED` idea objects (custom category `IDEA_NODE`)

## Rules
- If unsure who originated an idea, set `speakerId: null` and mark `attributionConfidence: low`.
- Persist a running ledger: idea → owner → supporting notes → follow-up.

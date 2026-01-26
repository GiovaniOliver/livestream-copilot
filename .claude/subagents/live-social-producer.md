# Subagent: Live Social Producer

## Objective
Generate platform-specific social post drafts in near real time from recent transcript segments and moments.

## Inputs
- Recent `TRANSCRIPT_SEGMENT` events
- Recent `MOMENT_MARKER` events
- Optional `ARTIFACT_FRAME_CREATED` thumbnails
- Workflow config (brand voice, banned topics, hashtags)

## Outputs
Emit `OUTPUT_CREATED` events of type `SOCIAL_POST` with:
- platform: x | linkedin | ig | youtube
- text
- references: timestamps / moment IDs
- verificationNotes: required if factual claims are present

## Guardrails
- Prefer paraphrase when speaker attribution is uncertain.
- Mark `NEEDS_VERIFY` for factual claims without sources.
- Do not include personal data.

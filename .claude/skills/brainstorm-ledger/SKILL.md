# Skill: Brainstorm Ledger

## Purpose
Maintain an attributed idea ledger from real-time discussion.

## Canonical idea object
- `ideaId`
- `text`
- `originSpeakerId` (nullable)
- `attributionConfidence` (high|med|low)
- `tags`
- `supportingMoments` (moment IDs)
- `nextStep` (optional)

## Procedure
1. Extract new ideas from transcript segments.
2. De-duplicate (semantic near-duplicates).
3. Attribute: if multiple people co-create, record the origin and refinement notes.
4. Cluster ideas into themes when size >= 5.
5. Propose action items with owners.

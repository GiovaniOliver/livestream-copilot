# Event Schemas

All components (desktop companion, mobile app, and agent layer) communicate via a single event stream.

The shared schemas live in `packages/shared/src/schemas/*`.

## SessionConfig

```json
{
  "sessionId": "2f5a3e9b-2b75-4f65-9db6-6b5c0c8b6a2d",
  "workflow": "streamer",
  "captureMode": "av",
  "title": "Friday stream",
  "participants": [{"id":"p1","name":"Host"}],
  "startedAt": 1735276800000
}
```

## Event envelope

```json
{
  "id": "bca1fd2d-9f7c-4d0d-9d5b-2a3d2f3a0b40",
  "sessionId": "2f5a3e9b-2b75-4f65-9db6-6b5c0c8b6a2d",
  "ts": 1735276825123,
  "type": "TRANSCRIPT_SEGMENT",
  "payload": {
    "speakerId": "p1",
    "text": "Let's start with the roadmap...",
    "t0": 12.40,
    "t1": 16.05
  }
}
```

## Key events

### Transcript
- `TRANSCRIPT_SEGMENT` — rolling transcript chunks with optional speaker ID

### Moments
- `MOMENT_MARKER` — a detected or manual highlight with a label and optional confidence

### Clip intents (start/end)
- `CLIP_INTENT_START`
- `CLIP_INTENT_END`

### Artifacts
- `ARTIFACT_CLIP_CREATED` — trimmed clip ready for review
- `ARTIFACT_FRAME_CREATED` — screenshot / thumbnail ready for review

### Outputs
- `OUTPUT_CREATED` — agent-produced output (post, beat, claim, chapter, etc.)
- `OUTPUT_VALIDATED` — compliance/brand validation result

## Output categories (non-exhaustive)
- `SOCIAL_POST`
- `CLIP_TITLE`
- `BEAT`
- `SCRIPT_INSERT`
- `CLAIM`
- `EVIDENCE_CARD`
- `CHAPTER_MARKER`
- `QUOTE`
- `ACTION_ITEM`

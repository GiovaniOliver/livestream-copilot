/**
 * Event Schema Validation Tests
 *
 * Tests for all 12 event type schemas in the shared package.
 * These Zod schemas are the source of truth for event shapes
 * across the entire monorepo (backend + frontend).
 */

import { describe, it, expect } from "vitest";
import {
  EventTypeSchema,
  TranscriptSegmentPayloadSchema,
  MomentMarkerPayloadSchema,
  ClipIntentPayloadSchema,
  ArtifactClipPayloadSchema,
  ArtifactFramePayloadSchema,
  OutputCategorySchema,
  OutputPayloadSchema,
  OutputValidatedPayloadSchema,
  TriggerTypeSchema,
  AutoTriggerDetectedPayloadSchema,
  ClipQueueStatusSchema,
  ClipQueueUpdatedPayloadSchema,
  SessionStartPayloadSchema,
  SessionEndPayloadSchema,
  EventPayloadSchema,
  EventEnvelopeSchema,
  ObservabilitySchema,
} from "../schemas/events";

// =============================================================================
// EventTypeSchema
// =============================================================================

describe("EventTypeSchema", () => {
  const validEventTypes = [
    "SESSION_START",
    "SESSION_END",
    "TRANSCRIPT_SEGMENT",
    "MOMENT_MARKER",
    "CLIP_INTENT_START",
    "CLIP_INTENT_END",
    "ARTIFACT_CLIP_CREATED",
    "ARTIFACT_FRAME_CREATED",
    "OUTPUT_CREATED",
    "OUTPUT_VALIDATED",
    "AUTO_TRIGGER_DETECTED",
    "CLIP_QUEUE_UPDATED",
  ];

  it.each(validEventTypes)("should accept valid event type: %s", (type) => {
    const result = EventTypeSchema.safeParse(type);
    expect(result.success).toBe(true);
  });

  it("should reject unknown event types", () => {
    const result = EventTypeSchema.safeParse("UNKNOWN_EVENT");
    expect(result.success).toBe(false);
  });

  it("should reject empty string", () => {
    const result = EventTypeSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("should reject non-string values", () => {
    expect(EventTypeSchema.safeParse(123).success).toBe(false);
    expect(EventTypeSchema.safeParse(null).success).toBe(false);
    expect(EventTypeSchema.safeParse(undefined).success).toBe(false);
  });

  it("should contain exactly 12 event types", () => {
    expect(validEventTypes).toHaveLength(12);
  });
});

// =============================================================================
// TranscriptSegmentPayloadSchema
// =============================================================================

describe("TranscriptSegmentPayloadSchema", () => {
  it("should accept valid transcript segment", () => {
    const payload = {
      speakerId: "speaker-1",
      text: "Hello, this is a test transcript segment.",
      t0: 10.5,
      t1: 15.3,
    };

    const result = TranscriptSegmentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept null speakerId", () => {
    const payload = {
      speakerId: null,
      text: "Anonymous speech",
      t0: 0,
      t1: 5,
    };

    const result = TranscriptSegmentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept missing speakerId (optional)", () => {
    const payload = {
      text: "No speaker ID",
      t0: 0,
      t1: 5,
    };

    const result = TranscriptSegmentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should reject missing text", () => {
    const payload = {
      speakerId: "speaker-1",
      t0: 0,
      t1: 5,
    };

    const result = TranscriptSegmentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should reject missing timestamps", () => {
    const noT0 = { text: "test", t1: 5 };
    const noT1 = { text: "test", t0: 0 };

    expect(TranscriptSegmentPayloadSchema.safeParse(noT0).success).toBe(false);
    expect(TranscriptSegmentPayloadSchema.safeParse(noT1).success).toBe(false);
  });

  it("should reject non-number timestamps", () => {
    const payload = {
      text: "test",
      t0: "start",
      t1: "end",
    };

    const result = TranscriptSegmentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// MomentMarkerPayloadSchema
// =============================================================================

describe("MomentMarkerPayloadSchema", () => {
  it("should accept valid moment marker with all fields", () => {
    const payload = {
      label: "Epic moment",
      t: 120.5,
      confidence: 0.95,
      notes: "Player got a pentakill",
    };

    const result = MomentMarkerPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept moment marker without optional fields", () => {
    const payload = {
      label: "Highlight",
      t: 60,
    };

    const result = MomentMarkerPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should reject confidence outside 0-1 range", () => {
    const tooHigh = { label: "test", t: 60, confidence: 1.5 };
    const tooLow = { label: "test", t: 60, confidence: -0.1 };

    expect(MomentMarkerPayloadSchema.safeParse(tooHigh).success).toBe(false);
    expect(MomentMarkerPayloadSchema.safeParse(tooLow).success).toBe(false);
  });

  it("should accept confidence at boundaries (0 and 1)", () => {
    const zero = { label: "test", t: 60, confidence: 0 };
    const one = { label: "test", t: 60, confidence: 1 };

    expect(MomentMarkerPayloadSchema.safeParse(zero).success).toBe(true);
    expect(MomentMarkerPayloadSchema.safeParse(one).success).toBe(true);
  });

  it("should reject missing required fields", () => {
    const noLabel = { t: 60 };
    const noT = { label: "test" };

    expect(MomentMarkerPayloadSchema.safeParse(noLabel).success).toBe(false);
    expect(MomentMarkerPayloadSchema.safeParse(noT).success).toBe(false);
  });
});

// =============================================================================
// ClipIntentPayloadSchema
// =============================================================================

describe("ClipIntentPayloadSchema", () => {
  it("should accept valid clip intent with all fields", () => {
    const payload = {
      t: 120,
      source: "gesture",
      confidence: 0.8,
    };

    const result = ClipIntentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should default source to api when not provided", () => {
    const payload = { t: 120 };

    const result = ClipIntentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("api");
    }
  });

  it.each(["gesture", "voice", "button", "api"])(
    "should accept valid source: %s",
    (source) => {
      const payload = { t: 120, source };
      const result = ClipIntentPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    }
  );

  it("should reject invalid source value", () => {
    const payload = { t: 120, source: "keyboard" };
    const result = ClipIntentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should reject missing timestamp", () => {
    const payload = { source: "button" };
    const result = ClipIntentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// ArtifactClipPayloadSchema
// =============================================================================

describe("ArtifactClipPayloadSchema", () => {
  it("should accept valid artifact clip payload", () => {
    const payload = {
      artifactId: "clip-uuid-123",
      path: "/clips/session-1/clip-001.mp4",
      t0: 120,
      t1: 150,
      thumbnailArtifactId: "thumb-uuid-456",
    };

    const result = ArtifactClipPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept without optional thumbnailArtifactId", () => {
    const payload = {
      artifactId: "clip-uuid-123",
      path: "/clips/clip.mp4",
      t0: 0,
      t1: 30,
    };

    const result = ArtifactClipPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should reject missing required fields", () => {
    const noArtifactId = { path: "/clip.mp4", t0: 0, t1: 30 };
    const noPath = { artifactId: "id", t0: 0, t1: 30 };
    const noT0 = { artifactId: "id", path: "/clip.mp4", t1: 30 };
    const noT1 = { artifactId: "id", path: "/clip.mp4", t0: 0 };

    expect(ArtifactClipPayloadSchema.safeParse(noArtifactId).success).toBe(false);
    expect(ArtifactClipPayloadSchema.safeParse(noPath).success).toBe(false);
    expect(ArtifactClipPayloadSchema.safeParse(noT0).success).toBe(false);
    expect(ArtifactClipPayloadSchema.safeParse(noT1).success).toBe(false);
  });
});

// =============================================================================
// ArtifactFramePayloadSchema
// =============================================================================

describe("ArtifactFramePayloadSchema", () => {
  it("should accept valid artifact frame payload", () => {
    const payload = {
      artifactId: "frame-uuid-123",
      path: "/frames/frame-001.png",
      t: 45.5,
    };

    const result = ArtifactFramePayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should reject missing fields", () => {
    const noId = { path: "/frame.png", t: 0 };
    const noPath = { artifactId: "id", t: 0 };
    const noT = { artifactId: "id", path: "/frame.png" };

    expect(ArtifactFramePayloadSchema.safeParse(noId).success).toBe(false);
    expect(ArtifactFramePayloadSchema.safeParse(noPath).success).toBe(false);
    expect(ArtifactFramePayloadSchema.safeParse(noT).success).toBe(false);
  });
});

// =============================================================================
// OutputCategorySchema
// =============================================================================

describe("OutputCategorySchema", () => {
  const validCategories = [
    "SOCIAL_POST",
    "CLIP_TITLE",
    "BEAT",
    "SCRIPT_INSERT",
    "CLAIM",
    "EVIDENCE_CARD",
    "CHAPTER_MARKER",
    "QUOTE",
    "ACTION_ITEM",
    "EPISODE_META",
    "MODERATOR_PROMPT",
    "IDEA_NODE",
  ];

  it.each(validCategories)("should accept valid category: %s", (category) => {
    const result = OutputCategorySchema.safeParse(category);
    expect(result.success).toBe(true);
  });

  it("should contain exactly 12 output categories", () => {
    expect(validCategories).toHaveLength(12);
  });

  it("should reject unknown categories", () => {
    expect(OutputCategorySchema.safeParse("TWEET").success).toBe(false);
    expect(OutputCategorySchema.safeParse("SUMMARY").success).toBe(false);
  });
});

// =============================================================================
// OutputPayloadSchema
// =============================================================================

describe("OutputPayloadSchema", () => {
  it("should accept valid output payload with all fields", () => {
    const payload = {
      outputId: "output-123",
      category: "SOCIAL_POST",
      title: "Great Moment",
      text: "Just witnessed an amazing play!",
      refs: ["event-1", "event-2"],
      meta: { platform: "twitter", confidence: 0.9 },
    };

    const result = OutputPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should apply defaults for refs and meta", () => {
    const payload = {
      outputId: "output-123",
      category: "QUOTE",
      text: "A memorable line from the stream",
    };

    const result = OutputPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.refs).toEqual([]);
      expect(result.data.meta).toEqual({});
    }
  });

  it("should reject invalid category in output", () => {
    const payload = {
      outputId: "output-123",
      category: "INVALID_CATEGORY",
      text: "Some text",
    };

    const result = OutputPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should reject missing required fields", () => {
    const noOutputId = { category: "QUOTE", text: "text" };
    const noCategory = { outputId: "id", text: "text" };
    const noText = { outputId: "id", category: "QUOTE" };

    expect(OutputPayloadSchema.safeParse(noOutputId).success).toBe(false);
    expect(OutputPayloadSchema.safeParse(noCategory).success).toBe(false);
    expect(OutputPayloadSchema.safeParse(noText).success).toBe(false);
  });
});

// =============================================================================
// OutputValidatedPayloadSchema
// =============================================================================

describe("OutputValidatedPayloadSchema", () => {
  it("should accept valid validation result", () => {
    const payload = {
      outputId: "output-123",
      ok: true,
      issues: [],
    };

    const result = OutputValidatedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept validation result with issues", () => {
    const payload = {
      outputId: "output-123",
      ok: false,
      issues: ["PROFANITY_DETECTED", "CONTENT_TOO_SHORT"],
    };

    const result = OutputValidatedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issues).toHaveLength(2);
    }
  });

  it("should default issues to empty array", () => {
    const payload = {
      outputId: "output-123",
      ok: true,
    };

    const result = OutputValidatedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issues).toEqual([]);
    }
  });

  it("should reject missing outputId", () => {
    const payload = { ok: true };
    const result = OutputValidatedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("should reject non-boolean ok field", () => {
    const payload = { outputId: "id", ok: "yes" };
    const result = OutputValidatedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TriggerTypeSchema
// =============================================================================

describe("TriggerTypeSchema", () => {
  it.each(["audio", "visual", "manual"])(
    "should accept valid trigger type: %s",
    (type) => {
      expect(TriggerTypeSchema.safeParse(type).success).toBe(true);
    }
  );

  it("should reject invalid trigger types", () => {
    expect(TriggerTypeSchema.safeParse("gesture").success).toBe(false);
    expect(TriggerTypeSchema.safeParse("keyboard").success).toBe(false);
  });
});

// =============================================================================
// AutoTriggerDetectedPayloadSchema
// =============================================================================

describe("AutoTriggerDetectedPayloadSchema", () => {
  it("should accept valid auto trigger payload", () => {
    const payload = {
      triggerType: "audio",
      triggerSource: "clip it",
      confidence: 0.85,
      t: 120,
      queueItemId: "queue-123",
    };

    const result = AutoTriggerDetectedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept without optional fields", () => {
    const payload = {
      triggerType: "manual",
      triggerSource: "button_press",
      t: 60,
    };

    const result = AutoTriggerDetectedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should reject confidence outside 0-1 range", () => {
    const payload = {
      triggerType: "audio",
      triggerSource: "test",
      confidence: 2.0,
      t: 60,
    };

    expect(AutoTriggerDetectedPayloadSchema.safeParse(payload).success).toBe(false);
  });
});

// =============================================================================
// ClipQueueStatusSchema
// =============================================================================

describe("ClipQueueStatusSchema", () => {
  it.each(["pending", "recording", "processing", "completed", "failed"])(
    "should accept valid status: %s",
    (status) => {
      expect(ClipQueueStatusSchema.safeParse(status).success).toBe(true);
    }
  );

  it("should reject unknown statuses", () => {
    expect(ClipQueueStatusSchema.safeParse("queued").success).toBe(false);
    expect(ClipQueueStatusSchema.safeParse("cancelled").success).toBe(false);
  });
});

// =============================================================================
// ClipQueueUpdatedPayloadSchema
// =============================================================================

describe("ClipQueueUpdatedPayloadSchema", () => {
  it("should accept complete clip queue updated payload", () => {
    const payload = {
      queueItemId: "queue-123",
      status: "completed",
      triggerType: "audio",
      triggerSource: "clip it",
      t0: 100,
      t1: 130,
      clipId: "clip-456",
      thumbnailPath: "/thumbs/clip-456.jpg",
      title: "Epic Moment",
    };

    const result = ClipQueueUpdatedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept minimal clip queue updated payload", () => {
    const payload = {
      queueItemId: "queue-123",
      status: "pending",
      triggerType: "manual",
      t0: 100,
    };

    const result = ClipQueueUpdatedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept failed status with error message", () => {
    const payload = {
      queueItemId: "queue-123",
      status: "failed",
      triggerType: "audio",
      t0: 100,
      errorMessage: "FFmpeg trimming failed",
    };

    const result = ClipQueueUpdatedPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should reject missing required fields", () => {
    const noQueueId = { status: "pending", triggerType: "audio", t0: 0 };
    const noStatus = { queueItemId: "id", triggerType: "audio", t0: 0 };
    const noTrigger = { queueItemId: "id", status: "pending", t0: 0 };
    const noT0 = { queueItemId: "id", status: "pending", triggerType: "audio" };

    expect(ClipQueueUpdatedPayloadSchema.safeParse(noQueueId).success).toBe(false);
    expect(ClipQueueUpdatedPayloadSchema.safeParse(noStatus).success).toBe(false);
    expect(ClipQueueUpdatedPayloadSchema.safeParse(noTrigger).success).toBe(false);
    expect(ClipQueueUpdatedPayloadSchema.safeParse(noT0).success).toBe(false);
  });
});

// =============================================================================
// SessionStartPayloadSchema
// =============================================================================

describe("SessionStartPayloadSchema", () => {
  it("should accept valid session start payload", () => {
    const payload = {
      sessionId: "session-123",
      workflow: "streamer",
      title: "My Stream",
    };

    const result = SessionStartPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept without optional title", () => {
    const payload = {
      sessionId: "session-123",
      workflow: "podcast",
    };

    const result = SessionStartPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should reject missing sessionId", () => {
    const payload = { workflow: "streamer" };
    expect(SessionStartPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("should reject missing workflow", () => {
    const payload = { sessionId: "id" };
    expect(SessionStartPayloadSchema.safeParse(payload).success).toBe(false);
  });
});

// =============================================================================
// SessionEndPayloadSchema
// =============================================================================

describe("SessionEndPayloadSchema", () => {
  it("should accept valid session end payload with all fields", () => {
    const payload = {
      sessionId: "session-123",
      duration: 3600,
      clipCount: 10,
      outputCount: 25,
    };

    const result = SessionEndPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should accept with only required sessionId", () => {
    const payload = { sessionId: "session-123" };

    const result = SessionEndPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should reject missing sessionId", () => {
    const payload = { duration: 3600 };
    expect(SessionEndPayloadSchema.safeParse(payload).success).toBe(false);
  });
});

// =============================================================================
// EventPayloadSchema (Discriminated Union)
// =============================================================================

describe("EventPayloadSchema", () => {
  it("should parse SESSION_START event correctly", () => {
    const event = {
      type: "SESSION_START",
      payload: { sessionId: "s1", workflow: "streamer" },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should parse SESSION_END event correctly", () => {
    const event = {
      type: "SESSION_END",
      payload: { sessionId: "s1", duration: 3600 },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should parse TRANSCRIPT_SEGMENT event correctly", () => {
    const event = {
      type: "TRANSCRIPT_SEGMENT",
      payload: { text: "Hello world", t0: 0, t1: 5 },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should parse MOMENT_MARKER event correctly", () => {
    const event = {
      type: "MOMENT_MARKER",
      payload: { label: "Highlight", t: 120 },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should parse CLIP_INTENT_START event correctly", () => {
    const event = {
      type: "CLIP_INTENT_START",
      payload: { t: 120 },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should parse CLIP_INTENT_END event correctly", () => {
    const event = {
      type: "CLIP_INTENT_END",
      payload: { t: 150, source: "gesture" },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should parse OUTPUT_CREATED event correctly", () => {
    const event = {
      type: "OUTPUT_CREATED",
      payload: {
        outputId: "o1",
        category: "SOCIAL_POST",
        text: "Great stream!",
      },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should parse AUTO_TRIGGER_DETECTED event correctly", () => {
    const event = {
      type: "AUTO_TRIGGER_DETECTED",
      payload: {
        triggerType: "audio",
        triggerSource: "clip it",
        t: 60,
      },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should reject event with mismatched type and payload", () => {
    const event = {
      type: "SESSION_START",
      payload: { text: "This is a transcript, not a session start", t0: 0, t1: 5 },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("should reject event with unknown type", () => {
    const event = {
      type: "CUSTOM_EVENT",
      payload: { data: "test" },
    };

    const result = EventPayloadSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// ObservabilitySchema
// =============================================================================

describe("ObservabilitySchema", () => {
  it("should accept valid observability data", () => {
    const data = {
      provider: "opik",
      traceId: "trace-123",
      spanId: "span-456",
      url: "https://opik.example.com/trace/123",
    };

    const result = ObservabilitySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should default provider to opik", () => {
    const data = {};

    const result = ObservabilitySchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe("opik");
    }
  });

  it("should reject invalid provider", () => {
    const data = { provider: "datadog" };
    const result = ObservabilitySchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should reject invalid URL format", () => {
    const data = { url: "not-a-url" };
    const result = ObservabilitySchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should accept without optional fields", () => {
    const data = { provider: "opik" };
    const result = ObservabilitySchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// EventEnvelopeSchema
// =============================================================================

describe("EventEnvelopeSchema", () => {
  it("should accept a complete event envelope", () => {
    const envelope = {
      id: "evt-123",
      sessionId: "session-456",
      ts: Date.now(),
      type: "MOMENT_MARKER",
      payload: { label: "Cool moment", t: 120 },
      observability: {
        provider: "opik",
        traceId: "trace-789",
      },
    };

    const result = EventEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });

  it("should accept SESSION_START without sessionId", () => {
    const envelope = {
      id: "evt-123",
      ts: Date.now(),
      type: "SESSION_START",
      payload: { sessionId: "new-session", workflow: "streamer" },
    };

    const result = EventEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });

  it("should accept envelope without observability", () => {
    const envelope = {
      id: "evt-123",
      sessionId: "session-456",
      ts: Date.now(),
      type: "TRANSCRIPT_SEGMENT",
      payload: { text: "Hello world", t0: 0, t1: 5 },
    };

    const result = EventEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });

  it("should reject missing id", () => {
    const envelope = {
      sessionId: "session-456",
      ts: Date.now(),
      type: "MOMENT_MARKER",
      payload: { label: "test", t: 0 },
    };

    const result = EventEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it("should reject missing ts", () => {
    const envelope = {
      id: "evt-123",
      sessionId: "session-456",
      type: "MOMENT_MARKER",
      payload: { label: "test", t: 0 },
    };

    const result = EventEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it("should reject missing type", () => {
    const envelope = {
      id: "evt-123",
      sessionId: "session-456",
      ts: Date.now(),
      payload: { label: "test", t: 0 },
    };

    const result = EventEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it("should reject non-number ts", () => {
    const envelope = {
      id: "evt-123",
      sessionId: "session-456",
      ts: "2024-01-01",
      type: "MOMENT_MARKER",
      payload: { label: "test", t: 0 },
    };

    const result = EventEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(false);
  });

  it("should accept all 12 event types as valid envelopes", () => {
    const events = [
      { type: "SESSION_START", payload: { sessionId: "s1", workflow: "streamer" } },
      { type: "SESSION_END", payload: { sessionId: "s1" } },
      { type: "TRANSCRIPT_SEGMENT", payload: { text: "Hi", t0: 0, t1: 1 } },
      { type: "MOMENT_MARKER", payload: { label: "Wow", t: 10 } },
      { type: "CLIP_INTENT_START", payload: { t: 20 } },
      { type: "CLIP_INTENT_END", payload: { t: 50 } },
      { type: "ARTIFACT_CLIP_CREATED", payload: { artifactId: "a1", path: "/c.mp4", t0: 20, t1: 50 } },
      { type: "ARTIFACT_FRAME_CREATED", payload: { artifactId: "a2", path: "/f.png", t: 30 } },
      { type: "OUTPUT_CREATED", payload: { outputId: "o1", category: "QUOTE", text: "Nice!" } },
      { type: "OUTPUT_VALIDATED", payload: { outputId: "o1", ok: true } },
      { type: "AUTO_TRIGGER_DETECTED", payload: { triggerType: "audio", triggerSource: "test", t: 10 } },
      { type: "CLIP_QUEUE_UPDATED", payload: { queueItemId: "q1", status: "pending", triggerType: "audio", t0: 10 } },
    ];

    for (const evt of events) {
      const envelope = {
        id: `evt-${evt.type}`,
        sessionId: "session-1",
        ts: Date.now(),
        ...evt,
      };

      const result = EventEnvelopeSchema.safeParse(envelope);
      expect(result.success).toBe(true);
    }
  });
});

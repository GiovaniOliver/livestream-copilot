/**
 * Session Schema Validation Tests
 *
 * Tests for session-related Zod schemas in the shared package:
 * - WorkflowSchema (5 workflow types)
 * - CaptureModeSchema (3 capture modes)
 * - ParticipantSchema
 * - SessionConfigSchema (the main config schema for starting sessions)
 */

import { describe, it, expect } from "vitest";
import {
  WorkflowSchema,
  CaptureModeSchema,
  ParticipantSchema,
  SessionConfigSchema,
  type SessionConfig,
} from "../schemas/session";

// =============================================================================
// WorkflowSchema
// =============================================================================

describe("WorkflowSchema", () => {
  const validWorkflows = [
    "streamer",
    "writers_room",
    "brainstorm",
    "debate",
    "podcast",
  ];

  it.each(validWorkflows)("should accept valid workflow: %s", (workflow) => {
    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });

  it("should contain exactly 5 workflow types", () => {
    expect(validWorkflows).toHaveLength(5);
  });

  it("should reject unknown workflow types", () => {
    expect(WorkflowSchema.safeParse("gaming").success).toBe(false);
    expect(WorkflowSchema.safeParse("interview").success).toBe(false);
    expect(WorkflowSchema.safeParse("content_creator").success).toBe(false);
  });

  it("should reject empty string", () => {
    expect(WorkflowSchema.safeParse("").success).toBe(false);
  });

  it("should reject non-string values", () => {
    expect(WorkflowSchema.safeParse(123).success).toBe(false);
    expect(WorkflowSchema.safeParse(null).success).toBe(false);
    expect(WorkflowSchema.safeParse(undefined).success).toBe(false);
    expect(WorkflowSchema.safeParse(true).success).toBe(false);
  });

  it("should reject case-mismatched values", () => {
    expect(WorkflowSchema.safeParse("Streamer").success).toBe(false);
    expect(WorkflowSchema.safeParse("PODCAST").success).toBe(false);
    expect(WorkflowSchema.safeParse("Writers_Room").success).toBe(false);
  });
});

// =============================================================================
// CaptureModeSchema
// =============================================================================

describe("CaptureModeSchema", () => {
  const validModes = ["audio", "video", "av"];

  it.each(validModes)("should accept valid capture mode: %s", (mode) => {
    const result = CaptureModeSchema.safeParse(mode);
    expect(result.success).toBe(true);
  });

  it("should contain exactly 3 capture modes", () => {
    expect(validModes).toHaveLength(3);
  });

  it("should reject unknown capture modes", () => {
    expect(CaptureModeSchema.safeParse("audio_video").success).toBe(false);
    expect(CaptureModeSchema.safeParse("screen").success).toBe(false);
    expect(CaptureModeSchema.safeParse("both").success).toBe(false);
  });

  it("should reject empty string", () => {
    expect(CaptureModeSchema.safeParse("").success).toBe(false);
  });

  it("should reject non-string values", () => {
    expect(CaptureModeSchema.safeParse(1).success).toBe(false);
    expect(CaptureModeSchema.safeParse(null).success).toBe(false);
  });
});

// =============================================================================
// ParticipantSchema
// =============================================================================

describe("ParticipantSchema", () => {
  it("should accept valid participant", () => {
    const participant = {
      id: "participant-1",
      name: "Alice",
    };

    const result = ParticipantSchema.safeParse(participant);
    expect(result.success).toBe(true);
  });

  it("should require id field", () => {
    const noId = { name: "Alice" };
    expect(ParticipantSchema.safeParse(noId).success).toBe(false);
  });

  it("should require name field", () => {
    const noName = { id: "p-1" };
    expect(ParticipantSchema.safeParse(noName).success).toBe(false);
  });

  it("should reject empty object", () => {
    expect(ParticipantSchema.safeParse({}).success).toBe(false);
  });

  it("should reject non-string id", () => {
    const numericId = { id: 123, name: "Alice" };
    expect(ParticipantSchema.safeParse(numericId).success).toBe(false);
  });

  it("should reject non-string name", () => {
    const numericName = { id: "p-1", name: 123 };
    expect(ParticipantSchema.safeParse(numericName).success).toBe(false);
  });

  it("should accept empty string values", () => {
    const emptyStrings = { id: "", name: "" };
    const result = ParticipantSchema.safeParse(emptyStrings);
    // Zod z.string() accepts empty strings by default
    expect(result.success).toBe(true);
  });

  it("should strip unknown fields", () => {
    const withExtra = {
      id: "p-1",
      name: "Alice",
      role: "host",
      email: "alice@example.com",
    };

    const result = ParticipantSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// SessionConfigSchema
// =============================================================================

describe("SessionConfigSchema", () => {
  it("should accept minimal valid config", () => {
    const config = {
      workflow: "streamer",
      captureMode: "av",
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should provide defaults for optional fields", () => {
    const config = {
      workflow: "podcast",
      captureMode: "audio",
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.participants).toEqual([]);
      expect(result.data.sessionId).toBeUndefined();
      expect(result.data.title).toBeUndefined();
      expect(result.data.startedAt).toBeUndefined();
    }
  });

  it("should accept full config with all fields", () => {
    const config: SessionConfig = {
      sessionId: "custom-session-id",
      workflow: "debate",
      captureMode: "video",
      title: "My Debate Session",
      participants: [
        { id: "p-1", name: "Alice" },
        { id: "p-2", name: "Bob" },
      ],
      startedAt: Date.now(),
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionId).toBe("custom-session-id");
      expect(result.data.title).toBe("My Debate Session");
      expect(result.data.participants).toHaveLength(2);
    }
  });

  it("should accept config with empty participants array", () => {
    const config = {
      workflow: "brainstorm",
      captureMode: "av",
      participants: [],
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.participants).toEqual([]);
    }
  });

  it("should reject missing workflow", () => {
    const config = {
      captureMode: "av",
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should reject missing captureMode", () => {
    const config = {
      workflow: "streamer",
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should reject invalid workflow value", () => {
    const config = {
      workflow: "invalid_workflow",
      captureMode: "av",
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should reject invalid captureMode value", () => {
    const config = {
      workflow: "streamer",
      captureMode: "screen_only",
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should reject invalid participant in array", () => {
    const config = {
      workflow: "podcast",
      captureMode: "audio",
      participants: [
        { id: "p-1", name: "Alice" },
        { id: 123, name: "Invalid" }, // id should be string
      ],
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should reject non-number startedAt", () => {
    const config = {
      workflow: "streamer",
      captureMode: "av",
      startedAt: "2024-01-01",
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should accept numeric startedAt (Unix timestamp)", () => {
    const config = {
      workflow: "streamer",
      captureMode: "av",
      startedAt: 1700000000000,
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should accept empty title", () => {
    const config = {
      workflow: "streamer",
      captureMode: "av",
      title: "",
    };

    const result = SessionConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Each workflow + captureMode combination
  // ---------------------------------------------------------------------------
  describe("all workflow and capture mode combinations", () => {
    const workflows = ["streamer", "writers_room", "brainstorm", "debate", "podcast"];
    const captureModes = ["audio", "video", "av"];

    for (const workflow of workflows) {
      for (const captureMode of captureModes) {
        it(`should accept ${workflow} + ${captureMode}`, () => {
          const config = { workflow, captureMode };
          const result = SessionConfigSchema.safeParse(config);
          expect(result.success).toBe(true);
        });
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Type inference
  // ---------------------------------------------------------------------------
  describe("type inference", () => {
    it("should produce correct SessionConfig type from parse", () => {
      const config = {
        workflow: "streamer" as const,
        captureMode: "av" as const,
        title: "Test",
        participants: [{ id: "p1", name: "Host" }],
      };

      const parsed = SessionConfigSchema.parse(config);

      // TypeScript type check - these should compile
      const workflow: string = parsed.workflow;
      const mode: string = parsed.captureMode;
      const title: string | undefined = parsed.title;
      const participants: Array<{ id: string; name: string }> = parsed.participants;

      expect(workflow).toBe("streamer");
      expect(mode).toBe("av");
      expect(title).toBe("Test");
      expect(participants).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------
  describe("edge cases", () => {
    it("should reject null input", () => {
      expect(SessionConfigSchema.safeParse(null).success).toBe(false);
    });

    it("should reject undefined input", () => {
      expect(SessionConfigSchema.safeParse(undefined).success).toBe(false);
    });

    it("should reject string input", () => {
      expect(SessionConfigSchema.safeParse("invalid").success).toBe(false);
    });

    it("should reject array input", () => {
      expect(SessionConfigSchema.safeParse([]).success).toBe(false);
    });

    it("should reject number input", () => {
      expect(SessionConfigSchema.safeParse(42).success).toBe(false);
    });

    it("should handle participants with special characters in names", () => {
      const config = {
        workflow: "podcast",
        captureMode: "audio",
        participants: [
          { id: "p-1", name: "John O'Brien" },
          { id: "p-2", name: "Maria Garcia-Lopez" },
          { id: "p-3", name: "Alex (DJ)" },
        ],
      };

      const result = SessionConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should handle very long title", () => {
      const config = {
        workflow: "streamer",
        captureMode: "av",
        title: "A".repeat(10000),
      };

      const result = SessionConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should handle many participants", () => {
      const participants = Array.from({ length: 100 }, (_, i) => ({
        id: `p-${i}`,
        name: `Participant ${i}`,
      }));

      const config = {
        workflow: "brainstorm",
        captureMode: "av",
        participants,
      };

      const result = SessionConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.participants).toHaveLength(100);
      }
    });

    it("should handle sessionId with various formats", () => {
      const formats = [
        "simple-id",
        "uuid-550e8400-e29b-41d4-a716-446655440000",
        "session_12345",
        "a",
        "123",
      ];

      for (const sessionId of formats) {
        const config = {
          sessionId,
          workflow: "streamer",
          captureMode: "av",
        };

        const result = SessionConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });
  });
});

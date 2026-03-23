import { describe, expect, it } from "vitest";
import {
  createTranscriptSegmentEvent,
  isFinalTranscriptEvent,
} from "../event-bridge.js";
import type { STTEvent } from "../types.js";

describe("stt event bridge", () => {
  it("detects final transcript events", () => {
    const finalEvent: STTEvent = {
      type: "transcript",
      segment: {
        speakerId: "speaker_1",
        text: "hello world",
        t0: 12.5,
        t1: 14.1,
        confidence: 0.98,
        isFinal: true,
      },
    };

    const interimEvent: STTEvent = {
      type: "transcript",
      segment: {
        speakerId: null,
        text: "partial",
        t0: 15,
        t1: 15.5,
        confidence: 0.4,
        isFinal: false,
      },
    };

    expect(isFinalTranscriptEvent(finalEvent)).toBe(true);
    expect(isFinalTranscriptEvent(interimEvent)).toBe(false);
    expect(
      isFinalTranscriptEvent({
        type: "status_change",
        status: "connected",
      })
    ).toBe(false);
  });

  it("creates canonical transcript segment events", () => {
    const event = createTranscriptSegmentEvent(
      "session-123",
      {
        speakerId: "speaker_2",
        text: "ship it",
        t0: 21.25,
        t1: 22.75,
      },
      {
        id: "event-123",
        ts: 1234567890,
      }
    );

    expect(event).toEqual({
      id: "event-123",
      sessionId: "session-123",
      ts: 1234567890,
      type: "TRANSCRIPT_SEGMENT",
      payload: {
        speakerId: "speaker_2",
        text: "ship it",
        t0: 21.25,
        t1: 22.75,
      },
    });
  });
});

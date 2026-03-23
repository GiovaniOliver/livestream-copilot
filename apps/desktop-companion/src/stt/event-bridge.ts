import { v4 as uuidv4 } from "uuid";
import type { EventEnvelope } from "@livestream-copilot/shared";
import type { STTEvent, STTTranscriptEvent, TranscriptionSegment } from "./types.js";

export function isFinalTranscriptEvent(event: STTEvent): event is STTTranscriptEvent {
  return event.type === "transcript" && event.segment.isFinal;
}

export function createTranscriptSegmentEvent(
  sessionId: string,
  segment: Pick<TranscriptionSegment, "speakerId" | "text" | "t0" | "t1">,
  options?: {
    id?: string;
    ts?: number;
  }
): EventEnvelope {
  return {
    id: options?.id ?? uuidv4(),
    sessionId,
    ts: options?.ts ?? Date.now(),
    type: "TRANSCRIPT_SEGMENT",
    payload: {
      speakerId: segment.speakerId,
      text: segment.text,
      t0: segment.t0,
      t1: segment.t1,
    },
  };
}

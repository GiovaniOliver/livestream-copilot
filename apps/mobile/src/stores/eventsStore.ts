/**
 * Events Store
 *
 * Manages the event stream with derived collections for outputs, clips, and moments.
 */

import { create } from "zustand";
import type { EventEnvelope } from "@livestream-copilot/shared";

const MAX_EVENTS = 500;

interface EventsState {
  events: EventEnvelope[];

  // Derived collections (computed on add for performance)
  outputs: EventEnvelope[];
  clips: EventEnvelope[];
  moments: EventEnvelope[];
  transcripts: EventEnvelope[];

  // Actions
  addEvent: (event: EventEnvelope) => void;
  addEvents: (events: EventEnvelope[]) => void;
  clearEvents: () => void;
  reset: () => void;
}

const initialState = {
  events: [],
  outputs: [],
  clips: [],
  moments: [],
  transcripts: [],
};

/**
 * Categorize an event into its collection.
 */
function categorizeEvent(event: EventEnvelope): {
  isOutput: boolean;
  isClip: boolean;
  isMoment: boolean;
  isTranscript: boolean;
} {
  return {
    isOutput: event.type === "OUTPUT_CREATED" || event.type === "OUTPUT_VALIDATED",
    isClip: event.type === "ARTIFACT_CLIP_CREATED",
    isMoment: event.type === "MOMENT_MARKER",
    isTranscript: event.type === "TRANSCRIPT_SEGMENT",
  };
}

export const useEventsStore = create<EventsState>((set) => ({
  ...initialState,

  addEvent: (event) =>
    set((state) => {
      const { isOutput, isClip, isMoment, isTranscript } = categorizeEvent(event);
      const newEvents = [event, ...state.events].slice(0, MAX_EVENTS);

      return {
        events: newEvents,
        outputs: isOutput ? [event, ...state.outputs].slice(0, MAX_EVENTS) : state.outputs,
        clips: isClip ? [event, ...state.clips].slice(0, MAX_EVENTS) : state.clips,
        moments: isMoment ? [event, ...state.moments].slice(0, MAX_EVENTS) : state.moments,
        transcripts: isTranscript ? [event, ...state.transcripts].slice(0, MAX_EVENTS) : state.transcripts,
      };
    }),

  addEvents: (events) =>
    set((state) => {
      let newEvents = [...state.events];
      let newOutputs = [...state.outputs];
      let newClips = [...state.clips];
      let newMoments = [...state.moments];
      let newTranscripts = [...state.transcripts];

      for (const event of events) {
        const { isOutput, isClip, isMoment, isTranscript } = categorizeEvent(event);
        newEvents = [event, ...newEvents];
        if (isOutput) newOutputs = [event, ...newOutputs];
        if (isClip) newClips = [event, ...newClips];
        if (isMoment) newMoments = [event, ...newMoments];
        if (isTranscript) newTranscripts = [event, ...newTranscripts];
      }

      return {
        events: newEvents.slice(0, MAX_EVENTS),
        outputs: newOutputs.slice(0, MAX_EVENTS),
        clips: newClips.slice(0, MAX_EVENTS),
        moments: newMoments.slice(0, MAX_EVENTS),
        transcripts: newTranscripts.slice(0, MAX_EVENTS),
      };
    }),

  clearEvents: () => set(initialState),

  reset: () => set(initialState),
}));

/**
 * Selector for getting the latest transcript text.
 */
export const selectLatestTranscript = (state: EventsState): string | null => {
  const latest = state.transcripts[0];
  if (!latest || latest.type !== "TRANSCRIPT_SEGMENT") return null;
  return (latest as any).payload?.text || null;
};

/**
 * Selector for getting outputs by category.
 */
export const selectOutputsByCategory = (state: EventsState, category: string): EventEnvelope[] => {
  return state.outputs.filter((e) => {
    if (e.type !== "OUTPUT_CREATED") return false;
    return (e as any).payload?.category === category;
  });
};

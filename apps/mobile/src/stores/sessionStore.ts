/**
 * Session Store
 *
 * Manages the current session state.
 */

import { create } from "zustand";

export type WorkflowType = "streamer" | "podcast" | "writers_room" | "debate" | "brainstorm";
export type SessionStatus = "idle" | "starting" | "active" | "paused" | "ending" | "ended";

interface SessionState {
  sessionId: string | null;
  workflow: WorkflowType | null;
  status: SessionStatus;
  title: string | null;
  startedAt: number | null;
  participants: string[];
  companionHost: string | null;

  // Actions
  startSession: (params: {
    sessionId: string;
    workflow: WorkflowType;
    title?: string;
    companionHost: string;
  }) => void;
  setStatus: (status: SessionStatus) => void;
  setParticipants: (participants: string[]) => void;
  addParticipant: (participant: string) => void;
  endSession: () => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  workflow: null,
  status: "idle" as SessionStatus,
  title: null,
  startedAt: null,
  participants: [],
  companionHost: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  startSession: ({ sessionId, workflow, title, companionHost }) =>
    set({
      sessionId,
      workflow,
      title: title || null,
      companionHost,
      status: "active",
      startedAt: Date.now(),
    }),

  setStatus: (status) => set({ status }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: state.participants.includes(participant)
        ? state.participants
        : [...state.participants, participant],
    })),

  endSession: () => set({ status: "ended" }),

  reset: () => set(initialState),
}));

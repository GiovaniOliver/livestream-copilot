/**
 * Capture Store
 *
 * Manages video/audio capture state using Zustand.
 */

import { create } from "zustand";

export type CaptureMode = "audio" | "video" | "av";
export type CaptureStatus = "idle" | "preparing" | "recording" | "paused" | "stopping" | "error";

export interface CaptureQuality {
  resolution: "480p" | "720p" | "1080p";
  fps: 24 | 30 | 60;
  audioBitrate: 64 | 128 | 256; // kbps
}

interface CaptureState {
  // State
  mode: CaptureMode;
  status: CaptureStatus;
  quality: CaptureQuality;
  duration: number; // seconds
  error: string | null;
  currentRecordingUri: string | null;

  // Actions
  setMode: (mode: CaptureMode) => void;
  setStatus: (status: CaptureStatus) => void;
  setQuality: (quality: Partial<CaptureQuality>) => void;
  updateDuration: (duration: number) => void;
  setError: (error: string | null) => void;
  setRecordingUri: (uri: string | null) => void;
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  reset: () => void;
}

const defaultQuality: CaptureQuality = {
  resolution: "720p",
  fps: 30,
  audioBitrate: 128,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  mode: "av",
  status: "idle",
  quality: defaultQuality,
  duration: 0,
  error: null,
  currentRecordingUri: null,

  setMode: (mode) => set({ mode }),

  setStatus: (status) => set({ status }),

  setQuality: (quality) =>
    set((state) => ({
      quality: { ...state.quality, ...quality },
    })),

  updateDuration: (duration) => set({ duration }),

  setError: (error) => set({ error, status: error ? "error" : "idle" }),

  setRecordingUri: (uri) => set({ currentRecordingUri: uri }),

  startRecording: () =>
    set({
      status: "recording",
      duration: 0,
      error: null,
    }),

  stopRecording: () =>
    set({
      status: "stopping",
    }),

  pauseRecording: () =>
    set({
      status: "paused",
    }),

  resumeRecording: () =>
    set({
      status: "recording",
    }),

  reset: () =>
    set({
      mode: "av",
      status: "idle",
      quality: defaultQuality,
      duration: 0,
      error: null,
      currentRecordingUri: null,
    }),
}));

// Selectors
export const selectIsRecording = (state: CaptureState) =>
  state.status === "recording" || state.status === "paused";

export const selectCanRecord = (state: CaptureState) =>
  state.status === "idle" || state.status === "error";

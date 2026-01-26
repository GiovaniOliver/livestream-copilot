/**
 * Video Source Store
 *
 * Manages mobile device as a video source for OBS.
 * Supports camera mode and screen share mode.
 */

import { create } from "zustand";

export type VideoSourceMode = "camera" | "screen";
export type CameraFacing = "front" | "back";
export type StreamQuality = "low" | "medium" | "high" | "max";
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "streaming" | "error";

interface VideoSourceState {
  // Connection
  connectionStatus: ConnectionStatus;
  companionHost: string | null;
  streamUrl: string | null;
  error: string | null;

  // Mode
  mode: VideoSourceMode;
  cameraFacing: CameraFacing;
  quality: StreamQuality;

  // Stream settings
  fps: number;
  bitrate: number;
  resolution: { width: number; height: number };

  // Features
  flashEnabled: boolean;
  audioEnabled: boolean;
  stabilizationEnabled: boolean;

  // Stats
  isStreaming: boolean;
  streamDuration: number;
  bytesTransferred: number;
  currentFps: number;

  // Actions
  setCompanionHost: (host: string | null) => void;
  setMode: (mode: VideoSourceMode) => void;
  setCameraFacing: (facing: CameraFacing) => void;
  setQuality: (quality: StreamQuality) => void;
  toggleFlash: () => void;
  toggleAudio: () => void;
  toggleStabilization: () => void;
  startStreaming: () => Promise<boolean>;
  stopStreaming: () => Promise<void>;
  updateStats: (stats: Partial<{ bytesTransferred: number; currentFps: number; streamDuration: number }>) => void;
  reset: () => void;
}

const QUALITY_PRESETS: Record<StreamQuality, { width: number; height: number; fps: number; bitrate: number }> = {
  low: { width: 640, height: 480, fps: 15, bitrate: 500_000 },
  medium: { width: 1280, height: 720, fps: 24, bitrate: 1_500_000 },
  high: { width: 1920, height: 1080, fps: 30, bitrate: 4_000_000 },
  max: { width: 1920, height: 1080, fps: 60, bitrate: 8_000_000 },
};

const initialState = {
  connectionStatus: "disconnected" as ConnectionStatus,
  companionHost: null,
  streamUrl: null,
  error: null,
  mode: "camera" as VideoSourceMode,
  cameraFacing: "back" as CameraFacing,
  quality: "medium" as StreamQuality,
  fps: 24,
  bitrate: 1_500_000,
  resolution: { width: 1280, height: 720 },
  flashEnabled: false,
  audioEnabled: true,
  stabilizationEnabled: true,
  isStreaming: false,
  streamDuration: 0,
  bytesTransferred: 0,
  currentFps: 0,
};

export const useVideoSourceStore = create<VideoSourceState>((set, get) => ({
  ...initialState,

  setCompanionHost: (host) => {
    set({ companionHost: host });
    if (host) {
      // Construct stream endpoint URL
      const streamUrl = `${host}/video-source/stream`;
      set({ streamUrl });
    } else {
      set({ streamUrl: null });
    }
  },

  setMode: (mode) => set({ mode }),

  setCameraFacing: (facing) => set({ cameraFacing: facing }),

  setQuality: (quality) => {
    const preset = QUALITY_PRESETS[quality];
    set({
      quality,
      fps: preset.fps,
      bitrate: preset.bitrate,
      resolution: { width: preset.width, height: preset.height },
    });
  },

  toggleFlash: () => set((s) => ({ flashEnabled: !s.flashEnabled })),
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  toggleStabilization: () => set((s) => ({ stabilizationEnabled: !s.stabilizationEnabled })),

  startStreaming: async () => {
    const { companionHost, mode, quality, audioEnabled } = get();
    if (!companionHost) {
      set({ error: "No companion host configured", connectionStatus: "error" });
      return false;
    }

    set({ connectionStatus: "connecting", error: null });

    try {
      // Register as video source with the companion
      const response = await fetch(`${companionHost}/video-source/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          quality,
          audioEnabled,
          deviceInfo: {
            platform: "mobile",
            type: mode === "camera" ? "camera" : "screen",
          },
        }),
      });

      const data = await response.json();

      if (data.ok) {
        set({
          connectionStatus: "streaming",
          isStreaming: true,
          streamDuration: 0,
          bytesTransferred: 0,
        });
        return true;
      } else {
        set({
          connectionStatus: "error",
          error: data.error || "Failed to start streaming",
        });
        return false;
      }
    } catch (err: any) {
      set({
        connectionStatus: "error",
        error: err?.message || "Connection failed",
      });
      return false;
    }
  },

  stopStreaming: async () => {
    const { companionHost } = get();

    if (companionHost) {
      try {
        await fetch(`${companionHost}/video-source/unregister`, {
          method: "POST",
        });
      } catch {
        // Ignore errors on unregister
      }
    }

    set({
      connectionStatus: "disconnected",
      isStreaming: false,
    });
  },

  updateStats: (stats) => set((s) => ({
    bytesTransferred: stats.bytesTransferred ?? s.bytesTransferred,
    currentFps: stats.currentFps ?? s.currentFps,
    streamDuration: stats.streamDuration ?? s.streamDuration,
  })),

  reset: () => set(initialState),
}));

/**
 * OBS Control Store
 *
 * Manages OBS connection state, scenes, sources, and streaming/recording status.
 * Provides actions for remote control from mobile.
 */

import { create } from "zustand";
import {
  createCompanionClient,
  type OBSScene,
  type OBSSource,
} from "../services/companionApi";

export type OBSConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface OBSState {
  // Connection
  connectionStatus: OBSConnectionStatus;
  error: string | null;
  companionHost: string | null;

  // Status
  streaming: boolean;
  streamTimecode: string | null;
  recording: boolean;
  recordTimecode: string | null;

  // Scenes
  currentScene: string | null;
  scenes: OBSScene[];

  // Sources (for current scene)
  sources: OBSSource[];
  loadingSources: boolean;

  // Loading states
  isRefreshing: boolean;
  isTogglingStream: boolean;
  isTogglingRecord: boolean;
  isSwitchingScene: boolean;

  // Actions
  setCompanionHost: (host: string | null) => void;
  refresh: () => Promise<void>;
  switchScene: (sceneName: string) => Promise<boolean>;
  toggleSource: (sceneItemId: number, enabled?: boolean) => Promise<boolean>;
  toggleStream: () => Promise<boolean>;
  startStream: () => Promise<boolean>;
  stopStream: () => Promise<boolean>;
  toggleRecord: () => Promise<boolean>;
  startRecord: () => Promise<boolean>;
  stopRecord: () => Promise<boolean>;
  saveReplay: () => Promise<string | null>;
  loadSources: (sceneName?: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  connectionStatus: "disconnected" as OBSConnectionStatus,
  error: null,
  companionHost: null,
  streaming: false,
  streamTimecode: null,
  recording: false,
  recordTimecode: null,
  currentScene: null,
  scenes: [],
  sources: [],
  loadingSources: false,
  isRefreshing: false,
  isTogglingStream: false,
  isTogglingRecord: false,
  isSwitchingScene: false,
};

export const useOBSStore = create<OBSState>((set, get) => ({
  ...initialState,

  setCompanionHost: (host) => set({ companionHost: host }),

  refresh: async () => {
    const { companionHost } = get();
    if (!companionHost) {
      set({ connectionStatus: "disconnected", error: "No companion host configured" });
      return;
    }

    set({ isRefreshing: true, connectionStatus: "connecting" });

    try {
      const client = createCompanionClient(companionHost);

      // Fetch status and scenes in parallel
      const [statusRes, scenesRes] = await Promise.all([
        client.obsStatus(),
        client.obsScenes(),
      ]);

      if (!statusRes.ok || !statusRes.connected) {
        set({
          connectionStatus: "error",
          error: statusRes.error || "OBS not connected",
          isRefreshing: false,
        });
        return;
      }

      set({
        connectionStatus: "connected",
        error: null,
        streaming: statusRes.streaming ?? false,
        streamTimecode: statusRes.streamTimecode ?? null,
        recording: statusRes.recording ?? false,
        recordTimecode: statusRes.recordTimecode ?? null,
        currentScene: scenesRes.ok ? scenesRes.currentScene : null,
        scenes: scenesRes.ok ? scenesRes.scenes : [],
        isRefreshing: false,
      });

      // Load sources for current scene
      if (scenesRes.ok && scenesRes.currentScene) {
        get().loadSources(scenesRes.currentScene);
      }
    } catch (err: any) {
      set({
        connectionStatus: "error",
        error: err?.message || "Failed to connect",
        isRefreshing: false,
      });
    }
  },

  loadSources: async (sceneName) => {
    const { companionHost } = get();
    if (!companionHost) return;

    set({ loadingSources: true });

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsSources(sceneName);

      if (res.ok) {
        set({ sources: res.sources, loadingSources: false });
      } else {
        set({ loadingSources: false });
      }
    } catch {
      set({ loadingSources: false });
    }
  },

  switchScene: async (sceneName) => {
    const { companionHost } = get();
    if (!companionHost) return false;

    set({ isSwitchingScene: true });

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsSwitchScene(sceneName);

      if (res.ok) {
        set({ currentScene: sceneName, isSwitchingScene: false });
        // Reload sources for new scene
        get().loadSources(sceneName);
        return true;
      }

      set({ isSwitchingScene: false });
      return false;
    } catch {
      set({ isSwitchingScene: false });
      return false;
    }
  },

  toggleSource: async (sceneItemId, enabled) => {
    const { companionHost, currentScene } = get();
    if (!companionHost) return false;

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsToggleSource({
        sceneItemId,
        sceneName: currentScene || undefined,
        enabled,
      });

      if (res.ok) {
        // Update source in local state
        set((state) => ({
          sources: state.sources.map((s) =>
            s.id === sceneItemId ? { ...s, enabled: res.enabled ?? !s.enabled } : s
          ),
        }));
        return true;
      }

      return false;
    } catch {
      return false;
    }
  },

  toggleStream: async () => {
    const { companionHost } = get();
    if (!companionHost) return false;

    set({ isTogglingStream: true });

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsToggleStream();

      if (res.ok) {
        set({ streaming: res.streaming ?? false, isTogglingStream: false });
        return true;
      }

      set({ isTogglingStream: false });
      return false;
    } catch {
      set({ isTogglingStream: false });
      return false;
    }
  },

  startStream: async () => {
    const { companionHost } = get();
    if (!companionHost) return false;

    set({ isTogglingStream: true });

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsStartStream();

      if (res.ok) {
        set({ streaming: true, isTogglingStream: false });
        return true;
      }

      set({ isTogglingStream: false });
      return false;
    } catch {
      set({ isTogglingStream: false });
      return false;
    }
  },

  stopStream: async () => {
    const { companionHost } = get();
    if (!companionHost) return false;

    set({ isTogglingStream: true });

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsStopStream();

      if (res.ok) {
        set({ streaming: false, isTogglingStream: false });
        return true;
      }

      set({ isTogglingStream: false });
      return false;
    } catch {
      set({ isTogglingStream: false });
      return false;
    }
  },

  toggleRecord: async () => {
    const { companionHost } = get();
    if (!companionHost) return false;

    set({ isTogglingRecord: true });

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsToggleRecord();

      if (res.ok) {
        set({ recording: res.recording ?? false, isTogglingRecord: false });
        return true;
      }

      set({ isTogglingRecord: false });
      return false;
    } catch {
      set({ isTogglingRecord: false });
      return false;
    }
  },

  startRecord: async () => {
    const { companionHost } = get();
    if (!companionHost) return false;

    set({ isTogglingRecord: true });

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsStartRecord();

      if (res.ok) {
        set({ recording: true, isTogglingRecord: false });
        return true;
      }

      set({ isTogglingRecord: false });
      return false;
    } catch {
      set({ isTogglingRecord: false });
      return false;
    }
  },

  stopRecord: async () => {
    const { companionHost } = get();
    if (!companionHost) return false;

    set({ isTogglingRecord: true });

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsStopRecord();

      if (res.ok) {
        set({ recording: false, isTogglingRecord: false });
        return true;
      }

      set({ isTogglingRecord: false });
      return false;
    } catch {
      set({ isTogglingRecord: false });
      return false;
    }
  },

  saveReplay: async () => {
    const { companionHost } = get();
    if (!companionHost) return null;

    try {
      const client = createCompanionClient(companionHost);
      const res = await client.obsSaveReplay();
      return res.ok ? res.path ?? null : null;
    } catch {
      return null;
    }
  },

  reset: () => set(initialState),
}));

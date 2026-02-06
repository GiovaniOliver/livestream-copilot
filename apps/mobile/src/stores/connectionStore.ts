/**
 * Connection Store
 *
 * Manages WebSocket connection state and desktop companion base URL.
 */

import { create } from "zustand";
import * as SecureStore from "../services/secureStorage";
import { storeLogger } from "../services/logger";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

interface ConnectionState {
  status: ConnectionStatus;
  wsUrl: string | null;
  baseUrl: string;
  error: string | null;
  reconnectAttempts: number;
  lastConnectedAt: number | null;

  // Actions
  setBaseUrl: (url: string) => Promise<void>;
  setWsUrl: (url: string | null) => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  markConnected: () => void;
  reset: () => void;
  loadStoredBaseUrl: () => Promise<void>;
}

const DEFAULT_BASE_URL = "http://localhost:3123";

const initialState = {
  status: "disconnected" as ConnectionStatus,
  wsUrl: null,
  baseUrl: DEFAULT_BASE_URL,
  error: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
};

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  ...initialState,

  setBaseUrl: async (url: string) => {
    try {
      // Validate URL format
      const urlObj = new URL(url);
      const cleanUrl = `${urlObj.protocol}//${urlObj.host}`;

      // Save to secure storage
      await SecureStore.setSecureItem("connection.baseUrl", cleanUrl);

      set({ baseUrl: cleanUrl });
    } catch (error) {
      storeLogger.error( Invalid base URL:", error);
      throw new Error("Invalid URL format");
    }
  },

  setWsUrl: (url) => set({ wsUrl: url }),

  setStatus: (status) => set({ status }),

  setError: (error) => set({ error, status: "error" }),

  incrementReconnectAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  markConnected: () =>
    set({
      status: "connected",
      error: null,
      reconnectAttempts: 0,
      lastConnectedAt: Date.now(),
    }),

  reset: () => set(initialState),

  loadStoredBaseUrl: async () => {
    try {
      const storedUrl = await SecureStore.getSecureItem("connection.baseUrl");
      if (storedUrl) {
        set({ baseUrl: storedUrl });
      }
    } catch (error) {
      storeLogger.error( Failed to load base URL:", error);
    }
  },
}));

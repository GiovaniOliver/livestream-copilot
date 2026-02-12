/**
 * OBS Route Types
 *
 * Shared types for the OBS control route module.
 *
 * @module api/obs.types
 */

import type OBSWebSocket from "obs-websocket-js";
import type { WebSocketServer } from "ws";
import type { EventEnvelope } from "@livestream-copilot/shared";

export interface ObsRouteDeps {
  obs: OBSWebSocket;
  getSession: () => { config: { sessionId?: string }; dbId: string } | null;
  setSession: (s: unknown) => void;
  wss: WebSocketServer;
  emitEvent: (wss: WebSocketServer, ev: EventEnvelope) => void;
  config: {
    OBS_WS_URL: string;
    OBS_WS_PASSWORD: string;
    WS_PORT: number;
  };
  ffmpegReady: () => boolean;
  ffmpegStatus: () => Promise<{ ffmpeg: boolean; ffprobe: boolean }>;
  saveReplayBuffer: () => Promise<string | null>;
  startSessionInternal: (body: Record<string, unknown>) => Promise<{
    sessionId: string;
    startedAt: number;
  }>;
  stopSessionInternal: () => Promise<{
    ok: boolean;
    t1: number;
    duration: number;
  }>;
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { getWebSocketManager } from "@/lib/api/websocket";
import { getClipMediaUrl, getClipThumbnailUrl } from "@/lib/api/clips";
import type { Clip } from "@/components/dashboards/streamer/types";

// ============================================================
// Types
// ============================================================

interface ArtifactClipPayload {
  artifactId: string;
  path: string;
  t0: number;
  t1: number;
  thumbnailArtifactId?: string;
}

interface ArtifactFramePayload {
  artifactId: string;
  path: string;
  t: number;
}

interface VideoFrame {
  id: string;
  url: string;
  timestamp: number;
  createdAt: Date;
}

// ============================================================
// useVideoArtifacts Hook
// ============================================================

export function useVideoArtifacts(sessionId?: string) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [frames, setFrames] = useState<VideoFrame[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // ============================================================
  // WebSocket Connection
  // ============================================================

  useEffect(() => {
    const ws = getWebSocketManager();

    // Connect to WebSocket
    ws.connect();

    // Handle connection state
    const unsubscribeState = ws.onStateChange((state) => {
      setIsConnected(state === "connected");
    });

    // Handle clip created events
    const unsubscribeClips = ws.on<{
      id: string;
      sessionId: string;
      ts: number;
      type: "ARTIFACT_CLIP_CREATED";
      payload: ArtifactClipPayload;
    }>("ARTIFACT_CLIP_CREATED", (event) => {
      // Only process clips for the current session
      if (sessionId && event.sessionId !== sessionId) return;

      const { payload } = event;
      const newClip: Clip = {
        id: payload.artifactId,
        title: `Clip ${payload.artifactId.slice(0, 8)}`,
        hookText: "Auto-generated clip from stream",
        thumbnailUrl: payload.thumbnailArtifactId
          ? getClipThumbnailUrl(payload.thumbnailArtifactId)
          : getClipThumbnailUrl(payload.artifactId),
        duration: payload.t1 - payload.t0,
        status: "ready",
        createdAt: new Date(event.ts),
        startTime: payload.t0,
        endTime: payload.t1,
      };

      setClips((prev) => {
        // Check if clip already exists
        if (prev.some((c) => c.id === newClip.id)) return prev;
        return [...prev, newClip];
      });
    });

    // Handle frame created events
    const unsubscribeFrames = ws.on<{
      id: string;
      sessionId: string;
      ts: number;
      type: "ARTIFACT_FRAME_CREATED";
      payload: ArtifactFramePayload;
    }>("ARTIFACT_FRAME_CREATED", (event) => {
      // Only process frames for the current session
      if (sessionId && event.sessionId !== sessionId) return;

      const { payload } = event;
      const newFrame: VideoFrame = {
        id: payload.artifactId,
        url: getClipThumbnailUrl(payload.artifactId),
        timestamp: payload.t,
        createdAt: new Date(event.ts),
      };

      setFrames((prev) => {
        // Check if frame already exists
        if (prev.some((f) => f.id === newFrame.id)) return prev;
        return [...prev, newFrame];
      });
    });

    // Cleanup on unmount
    return () => {
      unsubscribeState();
      unsubscribeClips();
      unsubscribeFrames();
    };
  }, [sessionId]);

  // ============================================================
  // Clip Helpers
  // ============================================================

  const getClipVideoUrl = useCallback((clipId: string) => {
    return getClipMediaUrl(clipId);
  }, []);

  const getClipById = useCallback(
    (clipId: string) => {
      return clips.find((c) => c.id === clipId);
    },
    [clips]
  );

  const removeClip = useCallback((clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
  }, []);

  const updateClip = useCallback((clipId: string, updates: Partial<Clip>) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
    );
  }, []);

  // ============================================================
  // Frame Helpers
  // ============================================================

  const getFrameById = useCallback(
    (frameId: string) => {
      return frames.find((f) => f.id === frameId);
    },
    [frames]
  );

  const getFramesInRange = useCallback(
    (startTime: number, endTime: number) => {
      return frames.filter(
        (f) => f.timestamp >= startTime && f.timestamp <= endTime
      );
    },
    [frames]
  );

  const removeFrame = useCallback((frameId: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== frameId));
  }, []);

  // ============================================================
  // Return
  // ============================================================

  return {
    // State
    clips,
    frames,
    isConnected,

    // Clip methods
    getClipVideoUrl,
    getClipById,
    removeClip,
    updateClip,

    // Frame methods
    getFrameById,
    getFramesInRange,
    removeFrame,
  };
}

export default useVideoArtifacts;

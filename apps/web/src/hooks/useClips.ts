/**
 * Custom hook for managing clips with API integration and real-time updates
 *
 * This hook:
 * - Fetches clips from backend API for a specific session
 * - Listens for WebSocket events for real-time clip updates
 * - Provides loading and error states
 * - Integrates with auth context for authenticated API calls
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSessionClips,
  deleteClip as apiDeleteClip,
  type ClipInfo,
} from "@/lib/api/clips";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { logger } from "@/lib/logger";

/**
 * Clip with formatted display properties
 */
export interface Clip {
  id: string;
  artifactId: string;
  sessionId: string;
  path: string;
  t0: number;
  t1: number;
  duration: number;
  thumbnailId: string | null;
  createdAt: string;
  updatedAt: string;
  // Display-friendly properties
  timestamp: string;
  durationFormatted: string;
}

/**
 * Pagination information for clips
 */
export interface ClipsPagination {
  limit: number;
  offset: number;
  total: number;
}

/**
 * Return type for useClips hook
 */
export interface UseClipsReturn {
  clips: Clip[];
  pagination: ClipsPagination;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions
  refresh: () => Promise<void>;
  deleteClip: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearError: () => void;
}

/**
 * Format seconds to MM:SS or HH:MM:SS format
 */
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format timestamp from t0 seconds to MM:SS
 */
function formatTimestamp(t0Seconds: number): string {
  return formatDuration(t0Seconds);
}

/**
 * Transform API ClipInfo to frontend Clip format
 */
function transformClip(apiClip: ClipInfo): Clip {
  return {
    ...apiClip,
    timestamp: formatTimestamp(apiClip.t0),
    durationFormatted: formatDuration(apiClip.duration),
  };
}

/**
 * Hook for fetching and managing clips for a specific session
 *
 * Features:
 * - Fetches clips from backend API
 * - Real-time WebSocket updates for new clips
 * - Automatic data refresh on clip events
 * - Error handling with user-friendly messages
 * - Authentication via AuthContext
 *
 * @param sessionId - The session ID to fetch clips for
 * @param options - Configuration options
 */
export function useClips(
  sessionId: string,
  options: {
    limit?: number;
    autoRefresh?: boolean;
  } = {}
): UseClipsReturn {
  const { limit = 50, autoRefresh = true } = options;

  const [clips, setClips] = useState<Clip[]>([]);
  const [pagination, setPagination] = useState<ClipsPagination>({
    limit,
    offset: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  // Get auth context for access token
  const { accessToken } = useAuth();

  // WebSocket for real-time updates
  const { isConnected, events } = useWebSocket();

  /**
   * Load clips from the backend API
   */
  const loadClips = useCallback(
    async (offset = 0, append = false) => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      // Prevent concurrent fetches
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      try {
        setError(null);
        if (!append) {
          setIsLoading(true);
        }

        // Fetch clips from the backend API
        const result = await getSessionClips(
          sessionId,
          limit,
          offset,
          accessToken || undefined
        );

        const transformedClips = result.clips.map(transformClip);

        if (append) {
          setClips((prev) => [...prev, ...transformedClips]);
        } else {
          setClips(transformedClips);
        }

        setPagination(result.pagination);
      } catch (err) {
        logger.error("Failed to load clips:", err);
        setError(err instanceof Error ? err.message : "Failed to load clips");
        // Keep existing data on error
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [sessionId, limit, accessToken]
  );

  /**
   * Refresh clips (reload from offset 0)
   */
  const refresh = useCallback(async () => {
    await loadClips(0, false);
  }, [loadClips]);

  /**
   * Load more clips (pagination)
   */
  const loadMore = useCallback(async () => {
    const nextOffset = pagination.offset + pagination.limit;
    if (nextOffset < pagination.total) {
      await loadClips(nextOffset, true);
    }
  }, [loadClips, pagination]);

  /**
   * Delete a clip
   */
  const deleteClip = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await apiDeleteClip(id, accessToken || undefined);

        // Remove from local state
        setClips((prev) => prev.filter((clip) => clip.id !== id && clip.artifactId !== id));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to delete clip";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [accessToken]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initial data load
   */
  useEffect(() => {
    loadClips(0, false);
  }, [loadClips]);

  /**
   * Auto-refresh when WebSocket clip events arrive
   */
  useEffect(() => {
    if (!autoRefresh) return;

    // Check for clip-related events
    const clipEvents = events.filter(
      (event) =>
        event.type === "ARTIFACT_CLIP_CREATED" ||
        event.type === "clip_created" ||
        event.type === "clip_deleted"
    );

    if (clipEvents.length > 0) {
      // Debounced refresh to avoid excessive API calls
      const timer = setTimeout(() => {
        loadClips(0, false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [events, autoRefresh, loadClips]);

  return {
    clips,
    pagination,
    isLoading,
    error,
    isConnected,
    refresh,
    deleteClip,
    loadMore,
    clearError,
  };
}

/**
 * Hook for fetching a single clip by ID
 *
 * @param clipId - The clip ID or artifact ID to fetch
 */
export function useClip(clipId: string): {
  clip: Clip | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [clip, setClip] = useState<Clip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { accessToken } = useAuth();

  const loadClip = useCallback(async () => {
    if (!clipId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Import getClip lazily to avoid circular deps
      const { getClip } = await import("@/lib/api/clips");
      const apiClip = await getClip(clipId, accessToken || undefined);
      setClip(transformClip(apiClip));
    } catch (err) {
      logger.error("Failed to load clip:", err);
      setError(err instanceof Error ? err.message : "Failed to load clip");
      setClip(null);
    } finally {
      setIsLoading(false);
    }
  }, [clipId, accessToken]);

  useEffect(() => {
    loadClip();
  }, [loadClip]);

  return {
    clip,
    isLoading,
    error,
    refresh: loadClip,
  };
}

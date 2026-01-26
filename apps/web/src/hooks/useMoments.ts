/**
 * Custom hook for managing moments (markers/highlights) with API integration and real-time updates
 *
 * This hook:
 * - Fetches moments from backend API for a specific session
 * - Listens for WebSocket events for real-time moment updates (MOMENT_MARKER)
 * - Provides loading and error states
 * - Integrates with auth context for authenticated API calls
 * - Provides createMoment function for adding new moments
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSessionMoments,
  createMoment as apiCreateMoment,
  type MomentInfo,
  type MomentType,
  type PaginationInfo,
} from "@/lib/api/moments";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/lib/contexts/AuthContext";

/**
 * Moment with display-friendly properties
 * Compatible with the Moment type from streamer dashboard types
 */
export interface Moment {
  id: string;
  sessionId: string;
  type: MomentType;
  label: string;
  description?: string;
  timestamp: number; // in seconds from session start
  clipId?: string;
  createdAt: string;
  // Formatted timestamp for display
  formattedTime: string;
}

/**
 * Return type for useMoments hook
 */
export interface UseMomentsReturn {
  moments: Moment[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions
  refresh: () => Promise<void>;
  createMoment: (moment: {
    type?: MomentType;
    label: string;
    description?: string;
    timestamp: number;
    clipId?: string;
  }) => Promise<Moment>;
  loadMore: () => Promise<void>;
  clearError: () => void;

  // Derived data
  momentsByType: Record<MomentType, Moment[]>;
  momentCount: number;
}

/**
 * Format seconds to MM:SS or HH:MM:SS format
 */
function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Transform API moment to frontend format
 */
function transformMoment(apiMoment: MomentInfo): Moment {
  return {
    ...apiMoment,
    formattedTime: formatTimestamp(apiMoment.timestamp),
  };
}

/**
 * Hook for fetching and managing moments for a specific session
 *
 * Features:
 * - Fetches moments from backend API
 * - Real-time WebSocket updates for new moments
 * - Automatic data refresh on moment events
 * - Error handling with user-friendly messages
 * - Authentication via AuthContext
 * - Create moment functionality
 *
 * @param sessionId - The session ID to fetch moments for
 * @param options - Configuration options
 */
export function useMoments(
  sessionId: string,
  options: {
    limit?: number;
    autoRefresh?: boolean;
  } = {}
): UseMomentsReturn {
  const { limit = 100, autoRefresh = true } = options;

  const [moments, setMoments] = useState<Moment[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
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
  const { isConnected, moments: wsMomentEvents } = useWebSocket();

  /**
   * Load moments from the backend API
   */
  const loadMoments = useCallback(
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

        // Fetch moments from the backend API
        const result = await getSessionMoments(
          sessionId,
          { limit, offset },
          accessToken || undefined
        );

        const transformedMoments = result.moments.map(transformMoment);

        if (append) {
          setMoments((prev) => [...prev, ...transformedMoments]);
        } else {
          setMoments(transformedMoments);
        }

        setPagination(result.pagination);
      } catch (err) {
        console.error("Failed to load moments:", err);
        setError(err instanceof Error ? err.message : "Failed to load moments");
        // Keep existing data on error
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [sessionId, limit, accessToken]
  );

  /**
   * Refresh moments (reload from offset 0)
   */
  const refresh = useCallback(async () => {
    await loadMoments(0, false);
  }, [loadMoments]);

  /**
   * Load more moments (pagination)
   */
  const loadMore = useCallback(async () => {
    const nextOffset = pagination.offset + pagination.limit;
    if (nextOffset < pagination.total) {
      await loadMoments(nextOffset, true);
    }
  }, [loadMoments, pagination]);

  /**
   * Create a new moment
   */
  const createMoment = useCallback(
    async (momentData: {
      type?: MomentType;
      label: string;
      description?: string;
      timestamp: number;
      clipId?: string;
    }): Promise<Moment> => {
      try {
        setError(null);
        const created = await apiCreateMoment(
          sessionId,
          momentData,
          accessToken || undefined
        );

        const newMoment = transformMoment(created);

        // Add to local state optimistically (at the correct position by timestamp)
        setMoments((prev) => {
          const updated = [...prev, newMoment];
          return updated.sort((a, b) => a.timestamp - b.timestamp);
        });

        setPagination((prev) => ({
          ...prev,
          total: prev.total + 1,
        }));

        return newMoment;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to create moment";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [sessionId, accessToken]
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
    loadMoments(0, false);
  }, [loadMoments]);

  /**
   * Auto-refresh when WebSocket moment events arrive
   */
  useEffect(() => {
    if (!autoRefresh) return;

    // Check for moment-related events
    if (wsMomentEvents.length > 0) {
      // Debounced refresh to avoid excessive API calls
      const timer = setTimeout(() => {
        loadMoments(0, false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [wsMomentEvents, autoRefresh, loadMoments]);

  /**
   * Compute derived data - moments grouped by type
   */
  const momentsByType = moments.reduce<Record<MomentType, Moment[]>>(
    (acc, moment) => {
      const type = moment.type as MomentType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(moment);
      return acc;
    },
    {
      hype: [],
      qa: [],
      sponsor: [],
      clip: [],
      highlight: [],
      marker: [],
    }
  );

  return {
    moments,
    pagination,
    isLoading,
    error,
    isConnected,
    refresh,
    createMoment,
    loadMore,
    clearError,
    momentsByType,
    momentCount: moments.length,
  };
}

/**
 * Hook for fetching a single moment by ID
 * Currently not needed but included for API completeness
 */
export function useMoment(momentId: string): {
  moment: Moment | null;
  isLoading: boolean;
  error: string | null;
} {
  // For now, return empty as we don't have a single moment endpoint
  // This is a placeholder for future implementation
  return {
    moment: null,
    isLoading: false,
    error: null,
  };
}

/**
 * Custom hook for managing outputs (AI-generated post drafts) with API integration and real-time updates
 *
 * This hook:
 * - Fetches outputs from backend API for a specific session
 * - Listens for WebSocket events for real-time output updates (OUTPUT_CREATED, OUTPUT_VALIDATED)
 * - Provides loading and error states
 * - Integrates with auth context for authenticated API calls
 * - Provides updateOutput and deleteOutput functions
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSessionOutputs,
  updateOutput as apiUpdateOutput,
  updateOutputStatus as apiUpdateOutputStatus,
  deleteOutput as apiDeleteOutput,
  approveAllDrafts as apiApproveAllDrafts,
  type OutputInfo,
  type OutputStatus,
  type PaginationInfo,
} from "@/lib/api/outputs";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/lib/contexts/AuthContext";

/**
 * Output with display-friendly properties
 */
export interface Output extends OutputInfo {
  // Map category to platform for UI compatibility
  platform: "x" | "linkedin" | "instagram" | "youtube" | "general";
  // Formatted timestamp for display
  formattedDate: string;
}

/**
 * Return type for useOutputs hook
 */
export interface UseOutputsReturn {
  outputs: Output[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions
  refresh: () => Promise<void>;
  updateOutput: (id: string, updates: { title?: string; text?: string; status?: OutputStatus }) => Promise<void>;
  updateStatus: (id: string, status: OutputStatus) => Promise<void>;
  deleteOutput: (id: string) => Promise<void>;
  approveAll: () => Promise<number>;
  loadMore: () => Promise<void>;
  clearError: () => void;

  // Derived data
  draftCount: number;
  approvedCount: number;
  publishedCount: number;
  platformCounts: Record<string, number>;
}

/**
 * Map output category to platform type for UI
 */
function categoryToPlatform(category: string): Output["platform"] {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes("twitter") || normalizedCategory.includes("x_post") || normalizedCategory === "x") {
    return "x";
  }
  if (normalizedCategory.includes("linkedin")) {
    return "linkedin";
  }
  if (normalizedCategory.includes("instagram")) {
    return "instagram";
  }
  if (normalizedCategory.includes("youtube")) {
    return "youtube";
  }

  return "general";
}

/**
 * Format date for display
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Transform API output to frontend format
 */
function transformOutput(apiOutput: OutputInfo): Output {
  return {
    ...apiOutput,
    platform: categoryToPlatform(apiOutput.category),
    formattedDate: formatDate(apiOutput.createdAt),
  };
}

/**
 * Hook for fetching and managing outputs for a specific session
 *
 * Features:
 * - Fetches outputs from backend API
 * - Real-time WebSocket updates for new outputs
 * - Automatic data refresh on output events
 * - Error handling with user-friendly messages
 * - Authentication via AuthContext
 * - CRUD operations for outputs
 *
 * @param sessionId - The session ID to fetch outputs for
 * @param options - Configuration options
 */
export function useOutputs(
  sessionId: string,
  options: {
    limit?: number;
    category?: string;
    status?: OutputStatus;
    autoRefresh?: boolean;
  } = {}
): UseOutputsReturn {
  const { limit = 50, category, status, autoRefresh = true } = options;

  const [outputs, setOutputs] = useState<Output[]>([]);
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
  const { isConnected, outputs: wsOutputEvents } = useWebSocket();

  /**
   * Load outputs from the backend API
   */
  const loadOutputs = useCallback(
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

        // Fetch outputs from the backend API
        const result = await getSessionOutputs(
          sessionId,
          { category, status, limit, offset },
          accessToken || undefined
        );

        const transformedOutputs = result.outputs.map(transformOutput);

        if (append) {
          setOutputs((prev) => [...prev, ...transformedOutputs]);
        } else {
          setOutputs(transformedOutputs);
        }

        setPagination(result.pagination);
      } catch (err) {
        logger.error("Failed to load outputs:", err);
        setError(err instanceof Error ? err.message : "Failed to load outputs");
        // Keep existing data on error
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [sessionId, category, status, limit, accessToken]
  );

  /**
   * Refresh outputs (reload from offset 0)
   */
  const refresh = useCallback(async () => {
    await loadOutputs(0, false);
  }, [loadOutputs]);

  /**
   * Load more outputs (pagination)
   */
  const loadMore = useCallback(async () => {
    const nextOffset = pagination.offset + pagination.limit;
    if (nextOffset < pagination.total) {
      await loadOutputs(nextOffset, true);
    }
  }, [loadOutputs, pagination]);

  /**
   * Update an output
   */
  const updateOutput = useCallback(
    async (id: string, updates: { title?: string; text?: string; status?: OutputStatus }) => {
      try {
        setError(null);
        const updated = await apiUpdateOutput(id, updates, accessToken || undefined);

        // Update local state optimistically
        setOutputs((prev) =>
          prev.map((output) =>
            output.id === id ? transformOutput(updated) : output
          )
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to update output";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [accessToken]
  );

  /**
   * Update output status
   */
  const updateStatus = useCallback(
    async (id: string, newStatus: OutputStatus) => {
      try {
        setError(null);
        const updated = await apiUpdateOutputStatus(id, newStatus, accessToken || undefined);

        // Update local state
        setOutputs((prev) =>
          prev.map((output) =>
            output.id === id ? transformOutput(updated) : output
          )
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to update status";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [accessToken]
  );

  /**
   * Delete an output
   */
  const deleteOutput = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await apiDeleteOutput(id, accessToken || undefined);

        // Remove from local state
        setOutputs((prev) => prev.filter((output) => output.id !== id));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to delete output";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [accessToken]
  );

  /**
   * Approve all draft outputs
   */
  const approveAll = useCallback(async () => {
    try {
      setError(null);
      const result = await apiApproveAllDrafts(sessionId, accessToken || undefined);

      // Refresh to get updated statuses
      await refresh();

      return result.count;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to approve all";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [sessionId, accessToken, refresh]);

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
    loadOutputs(0, false);
  }, [loadOutputs]);

  /**
   * Auto-refresh when WebSocket output events arrive
   */
  useEffect(() => {
    if (!autoRefresh) return;

    // Check for output-related events
    if (wsOutputEvents.length > 0) {
      // Debounced refresh to avoid excessive API calls
      const timer = setTimeout(() => {
        loadOutputs(0, false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [wsOutputEvents, autoRefresh, loadOutputs]);

  /**
   * Compute derived data
   */
  const draftCount = outputs.filter((o) => o.status === "draft").length;
  const approvedCount = outputs.filter((o) => o.status === "approved").length;
  const publishedCount = outputs.filter((o) => o.status === "published").length;

  const platformCounts = outputs.reduce<Record<string, number>>(
    (acc, output) => {
      acc[output.platform] = (acc[output.platform] || 0) + 1;
      return acc;
    },
    { x: 0, linkedin: 0, instagram: 0, youtube: 0, general: 0 }
  );

  return {
    outputs,
    pagination,
    isLoading,
    error,
    isConnected,
    refresh,
    updateOutput,
    updateStatus,
    deleteOutput,
    approveAll,
    loadMore,
    clearError,
    draftCount,
    approvedCount,
    publishedCount,
    platformCounts,
  };
}

/**
 * Hook for fetching a single output by ID
 *
 * @param outputId - The output ID to fetch
 */
export function useOutput(outputId: string): {
  output: Output | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateOutput: (updates: { title?: string; text?: string; status?: OutputStatus }) => Promise<void>;
} {
  const [output, setOutput] = useState<Output | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { accessToken } = useAuth();

  const loadOutput = useCallback(async () => {
    if (!outputId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Import getOutput lazily to avoid circular deps
      const { getOutput } = await import("@/lib/api/outputs");
import { logger } from "@/lib/logger";
      const apiOutput = await getOutput(outputId, accessToken || undefined);
      setOutput(transformOutput(apiOutput));
    } catch (err) {
      logger.error("Failed to load output:", err);
      setError(err instanceof Error ? err.message : "Failed to load output");
      setOutput(null);
    } finally {
      setIsLoading(false);
    }
  }, [outputId, accessToken]);

  const updateOutput = useCallback(
    async (updates: { title?: string; text?: string; status?: OutputStatus }) => {
      if (!outputId) return;

      try {
        setError(null);
        const updated = await apiUpdateOutput(outputId, updates, accessToken || undefined);
        setOutput(transformOutput(updated));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to update output";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [outputId, accessToken]
  );

  useEffect(() => {
    loadOutput();
  }, [loadOutput]);

  return {
    output,
    isLoading,
    error,
    refresh: loadOutput,
    updateOutput,
  };
}

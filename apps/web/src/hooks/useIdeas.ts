/**
 * Custom hook for managing brainstorm ideas with API integration and real-time updates
 *
 * This hook:
 * - Fetches ideas (outputs with category IDEA_NODE) from backend API
 * - Listens for WebSocket events for real-time idea updates
 * - Provides loading and error states
 * - Transforms API outputs into the Idea interface used by the brainstorm dashboard
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSessionOutputs,
  type OutputInfo,
  type PaginationInfo,
} from "@/lib/api/outputs";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/lib/contexts/AuthContext";

/**
 * Idea interface matching the brainstorm dashboard's expected format
 */
export interface Idea {
  id: string;
  text: string;
  speaker: string;
  timestamp: Date;
  isStarred: boolean;
  isAddedToMap: boolean;
  tags: string[];
  // Extended properties from API
  title?: string;
  description?: string;
  category?: string;
  confidence?: number;
  buildsOn?: string;
}

/**
 * Action item interface for brainstorm sessions
 */
export interface ActionItem {
  id: string;
  text: string;
  owner: string | null;
  dueDate: Date | null;
  isComplete: boolean;
  column: "all" | "shortlist" | "action";
  priority: "low" | "medium" | "high";
  createdAt: Date;
  forIdea?: string;
}

/**
 * Return type for useIdeas hook
 */
export interface UseIdeasReturn {
  ideas: Idea[];
  actionItems: ActionItem[];
  quotes: Array<{ id: string; text: string; speaker?: string; significance?: string }>;
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions
  refresh: () => Promise<void>;
  starIdea: (id: string) => void;
  addToMap: (id: string) => void;
  loadMore: () => Promise<void>;
  clearError: () => void;

  // Stats
  totalIdeas: number;
  categories: string[];
}

/**
 * Transform API output to Idea format
 */
function transformOutputToIdea(output: OutputInfo): Idea {
  const meta = output.meta as Record<string, unknown> | null;

  return {
    id: output.id,
    text: output.text,
    title: output.title || undefined,
    speaker: (meta?.author as string) || "Unknown",
    timestamp: new Date(output.createdAt),
    isStarred: false, // Local UI state
    isAddedToMap: false, // Local UI state
    tags: meta?.ideaCategory ? [meta.ideaCategory as string] : [],
    category: meta?.ideaCategory as string | undefined,
    confidence: meta?.confidence as number | undefined,
    buildsOn: meta?.buildsOn as string | undefined,
  };
}

/**
 * Transform API output to ActionItem format
 */
function transformOutputToActionItem(output: OutputInfo): ActionItem {
  const meta = output.meta as Record<string, unknown> | null;

  return {
    id: output.id,
    text: output.text,
    owner: null,
    dueDate: null,
    isComplete: output.status === "published",
    column: (meta?.priority === "high" ? "action" : "all") as "all" | "shortlist" | "action",
    priority: (meta?.priority as "low" | "medium" | "high") || "medium",
    createdAt: new Date(output.createdAt),
    forIdea: meta?.forIdea as string | undefined,
  };
}

/**
 * Hook for fetching and managing brainstorm ideas for a specific session
 *
 * @param sessionId - The session ID to fetch ideas for
 * @param options - Configuration options
 */
export function useIdeas(
  sessionId: string,
  options: {
    limit?: number;
    autoRefresh?: boolean;
  } = {}
): UseIdeasReturn {
  const { limit = 100, autoRefresh = true } = options;

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [quotes, setQuotes] = useState<Array<{ id: string; text: string; speaker?: string; significance?: string }>>([]);
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
   * Load all brainstorm outputs (ideas, action items, quotes) from the backend
   */
  const loadIdeas = useCallback(
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

        // Fetch all brainstorm-related outputs in parallel
        const [ideasResult, actionsResult, quotesResult] = await Promise.all([
          getSessionOutputs(sessionId, { category: "IDEA_NODE", limit, offset }, accessToken || undefined),
          getSessionOutputs(sessionId, { category: "ACTION_ITEM", limit: 50 }, accessToken || undefined),
          getSessionOutputs(sessionId, { category: "QUOTE", limit: 20 }, accessToken || undefined),
        ]);

        // Transform ideas
        const transformedIdeas = ideasResult.outputs.map(transformOutputToIdea);
        if (append) {
          setIdeas((prev) => [...prev, ...transformedIdeas]);
        } else {
          setIdeas(transformedIdeas);
        }

        // Transform action items
        setActionItems(actionsResult.outputs.map(transformOutputToActionItem));

        // Transform quotes
        setQuotes(
          quotesResult.outputs.map((o) => ({
            id: o.id,
            text: o.text,
            speaker: (o.meta as Record<string, unknown>)?.speaker as string | undefined,
            significance: (o.meta as Record<string, unknown>)?.significance as string | undefined,
          }))
        );

        setPagination(ideasResult.pagination);
      } catch (err) {
        console.error("Failed to load ideas:", err);
        setError(err instanceof Error ? err.message : "Failed to load ideas");
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [sessionId, limit, accessToken]
  );

  /**
   * Refresh ideas (reload from offset 0)
   */
  const refresh = useCallback(async () => {
    await loadIdeas(0, false);
  }, [loadIdeas]);

  /**
   * Load more ideas (pagination)
   */
  const loadMore = useCallback(async () => {
    const nextOffset = pagination.offset + pagination.limit;
    if (nextOffset < pagination.total) {
      await loadIdeas(nextOffset, true);
    }
  }, [loadIdeas, pagination]);

  /**
   * Star an idea (local state only)
   */
  const starIdea = useCallback((id: string) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === id ? { ...idea, isStarred: !idea.isStarred } : idea
      )
    );
  }, []);

  /**
   * Add idea to mind map (local state only)
   */
  const addToMap = useCallback((id: string) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === id ? { ...idea, isAddedToMap: true } : idea
      )
    );
  }, []);

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
    loadIdeas(0, false);
  }, [loadIdeas]);

  /**
   * Auto-refresh when WebSocket output events arrive
   */
  useEffect(() => {
    if (!autoRefresh) return;

    // Check for brainstorm-related output events
    const brainstormEvents = wsOutputEvents.filter(
      (event) =>
        event.type === "OUTPUT_CREATED" &&
        ["IDEA_NODE", "ACTION_ITEM", "QUOTE"].includes(
          (event.payload as { category?: string })?.category || ""
        )
    );

    if (brainstormEvents.length > 0) {
      // Debounced refresh
      const timer = setTimeout(() => {
        loadIdeas(0, false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [wsOutputEvents, autoRefresh, loadIdeas]);

  /**
   * Compute derived stats
   */
  const categories = [...new Set(ideas.map((i) => i.category).filter(Boolean))] as string[];

  return {
    ideas,
    actionItems,
    quotes,
    pagination,
    isLoading,
    error,
    isConnected,
    refresh,
    starIdea,
    addToMap,
    loadMore,
    clearError,
    totalIdeas: pagination.total,
    categories,
  };
}

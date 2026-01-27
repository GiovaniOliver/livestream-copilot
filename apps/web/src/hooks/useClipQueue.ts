"use client";

import { useState, useEffect, useCallback } from "react";
import type { ClipQueueItem } from "@/components/clip-queue";

interface ClipQueueStats {
  total: number;
  pending: number;
  recording: number;
  processing: number;
  completed: number;
  failed: number;
}

interface UseClipQueueResult {
  items: ClipQueueItem[];
  stats: ClipQueueStats;
  isLoading: boolean;
  error: string | null;
  activeRecording: ClipQueueItem | null;
  refetch: () => Promise<void>;
  retryItem: (itemId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  updateItemTitle: (itemId: string, title: string) => Promise<void>;
}

const DEFAULT_STATS: ClipQueueStats = {
  total: 0,
  pending: 0,
  recording: 0,
  processing: 0,
  completed: 0,
  failed: 0,
};

export function useClipQueue(sessionId: string | null): UseClipQueueResult {
  const [items, setItems] = useState<ClipQueueItem[]>([]);
  const [stats, setStats] = useState<ClipQueueStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_DESKTOP_API_URL || "http://localhost:3001";
  // WebSocket runs on a separate port (default: 3002 for dev, configured via NEXT_PUBLIC_DESKTOP_WS_URL)
  const wsBase = process.env.NEXT_PUBLIC_DESKTOP_WS_URL || "ws://localhost:3002";

  // Fetch queue items
  const refetch = useCallback(async () => {
    if (!sessionId) {
      setItems([]);
      setStats(DEFAULT_STATS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/sessions/${sessionId}/clip-queue`);
      if (!response.ok) throw new Error("Failed to fetch clip queue");

      const data = await response.json();
      setItems(data.items || []);
      setStats(data.stats || DEFAULT_STATS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, apiBase]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!sessionId) return;

    refetch();

    const ws = new WebSocket(wsBase);

    ws.onopen = () => {
      console.log("[useClipQueue] WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "CLIP_QUEUE_UPDATED" && data.sessionId === sessionId) {
          const payload = data.payload;

          setItems((prevItems) => {
            const existingIndex = prevItems.findIndex(
              (item) => item.id === payload.queueItemId
            );

            const updatedItem: ClipQueueItem = {
              id: payload.queueItemId,
              sessionId,
              status: payload.status,
              triggerType: payload.triggerType,
              triggerSource: payload.triggerSource,
              t0: payload.t0,
              t1: payload.t1,
              clipId: payload.clipId,
              thumbnailPath: payload.thumbnailPath,
              title: payload.title,
              errorMessage: payload.errorMessage,
              createdAt: new Date().toISOString(),
            };

            if (existingIndex >= 0) {
              const newItems = [...prevItems];
              newItems[existingIndex] = updatedItem;
              return newItems;
            }

            return [updatedItem, ...prevItems];
          });

          // Refetch stats
          refetch();
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      console.error("[useClipQueue] WebSocket error");
    };

    ws.onclose = () => {
      console.log("[useClipQueue] WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, [sessionId, wsBase, refetch]);

  // Retry a failed item
  const retryItem = useCallback(
    async (itemId: string) => {
      try {
        const response = await fetch(`${apiBase}/api/clip-queue/${itemId}/retry`, {
          method: "POST",
        });
        if (!response.ok) throw new Error("Failed to retry");
        await refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to retry");
        throw err;
      }
    },
    [apiBase, refetch]
  );

  // Delete an item
  const deleteItem = useCallback(
    async (itemId: string) => {
      try {
        const response = await fetch(`${apiBase}/api/clip-queue/${itemId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete");
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
        throw err;
      }
    },
    [apiBase]
  );

  // Update item title
  const updateItemTitle = useCallback(
    async (itemId: string, title: string) => {
      try {
        const response = await fetch(`${apiBase}/api/clip-queue/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!response.ok) throw new Error("Failed to update");
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, title } : item))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
        throw err;
      }
    },
    [apiBase]
  );

  // Find active recording
  const activeRecording = items.find((item) => item.status === "recording") || null;

  return {
    items,
    stats,
    isLoading,
    error,
    activeRecording,
    refetch,
    retryItem,
    deleteItem,
    updateItemTitle,
  };
}

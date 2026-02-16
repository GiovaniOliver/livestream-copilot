"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { ClipQueueItemCard, type ClipQueueItem } from "./ClipQueueItemCard";
import { logger } from "@/lib/logger";
import { API_CONFIG } from "@/lib/config";
import { getHealth } from "@/lib/api/health";

interface ClipQueueDashboardProps {
  sessionId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Whether OBS is actively streaming. Clip queue only activates when true. */
  isStreaming?: boolean;
}

type FilterStatus = "all" | "pending" | "recording" | "processing" | "completed" | "failed";

interface ClipQueueStats {
  total: number;
  pending: number;
  recording: number;
  processing: number;
  completed: number;
  failed: number;
}

interface ReplayBufferState {
  active: boolean;
  lastSavedAt?: number | null;
  lastSavedPath?: string | null;
  lastSaveRequestedAt?: number | null;
  lastError?: string | null;
  outputDir?: string | null;
}

export function ClipQueueDashboard({
  sessionId,
  isCollapsed = false,
  onToggleCollapse,
  isStreaming = false,
}: ClipQueueDashboardProps) {
  const [items, setItems] = useState<ClipQueueItem[]>([]);
  const [stats, setStats] = useState<ClipQueueStats>({
    total: 0,
    pending: 0,
    recording: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayBuffer, setReplayBuffer] = useState<ReplayBufferState | null>(null);
  const [isSavingReplay, setIsSavingReplay] = useState(false);

  const apiBase = API_CONFIG.desktopApiUrl;
  const wsBase = API_CONFIG.desktopWsUrl;

  const formatReplayTimestamp = (ts?: number | null) => {
    if (!ts) return "Never";
    return new Date(ts).toLocaleTimeString();
  };

  const computeStats = useCallback((queueItems: ClipQueueItem[]): ClipQueueStats => {
    return queueItems.reduce<ClipQueueStats>(
      (acc, item) => {
        acc.total += 1;
        acc[item.status as keyof ClipQueueStats] += 1;
        return acc;
      },
      { total: 0, pending: 0, recording: 0, processing: 0, completed: 0, failed: 0 }
    );
  }, []);

  // Fetch queue items
  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/sessions/${sessionId}/clip-queue`);
      if (!response.ok) throw new Error("Failed to fetch clip queue");

      const data = await response.json();
      const nextItems = data.items || [];
      setItems(nextItems);
      setStats(data.stats || computeStats(nextItems));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, apiBase, computeStats]);

  // Fetch replay buffer status
  const fetchReplayStatus = useCallback(async () => {
    try {
      const health = await getHealth();
      setReplayBuffer(health.components?.replayBuffer ?? null);
    } catch {
      setReplayBuffer(null);
    }
  }, []);

  // Subscribe to WebSocket updates (keep connection stable regardless of streaming state)
  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    fetchItems();

    // Connect to WebSocket for real-time updates
    const ws = new WebSocket(wsBase);

    ws.onopen = () => {
      logger.debug("[clip-queue] WebSocket connected");
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

            let newItems: ClipQueueItem[];
            if (existingIndex >= 0) {
              newItems = [...prevItems];
              newItems[existingIndex] = updatedItem;
            } else {
              newItems = [updatedItem, ...prevItems];
            }

            setStats(computeStats(newItems));
            return newItems;
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      logger.error("[clip-queue] WebSocket error");
    };

    ws.onclose = () => {
      logger.debug("[clip-queue] WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, [sessionId, wsBase, fetchItems, computeStats]);

  // Poll replay buffer status
  useEffect(() => {
    fetchReplayStatus();
    const interval = setInterval(fetchReplayStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchReplayStatus]);

  // Handle item actions
  const handleRetry = async (itemId: string) => {
    try {
      const response = await fetch(`${apiBase}/api/clip-queue/${itemId}/retry`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to retry");
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry");
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const response = await fetch(`${apiBase}/api/clip-queue/${itemId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleUpdateTitle = async (itemId: string, title: string) => {
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
    }
  };

  const handleSaveReplay = async () => {
    if (isSavingReplay) return;
    try {
      setIsSavingReplay(true);
      const response = await fetch(`${apiBase}/api/obs/replay/save`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to save replay buffer");
      await fetchReplayStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save replay buffer");
    } finally {
      setIsSavingReplay(false);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  // Check for active recording
  const activeRecording = items.find(
    (item) => item.status === "recording"
  );

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 px-3 py-4 bg-surface border border-stroke rounded-l-lg shadow-lg hover:bg-surface-hover transition-colors"
          title="Expand Clip Queue"
        >
          <svg
            className="h-5 w-5 text-text"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {stats.total > 0 && (
            <Badge variant="teal" className="text-xs">
              {stats.total}
            </Badge>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-bg-0 border-l border-stroke shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stroke bg-surface">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-text">Clip Queue</h3>
          <Badge variant="default" className="text-xs">
            {stats.total}
          </Badge>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-stroke rounded transition-colors"
          title="Collapse"
        >
          <svg
            className="h-5 w-5 text-text-dim"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Replay Buffer Status */}
      {replayBuffer && (
        <div className="mx-4 mt-3 p-3 rounded-lg border border-stroke bg-bg-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={replayBuffer.active ? "success" : "default"} className="text-xs">
                Replay {replayBuffer.active ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-text-dim">
                Last save: {formatReplayTimestamp(replayBuffer.lastSavedAt)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveReplay}
              disabled={isSavingReplay}
            >
              {isSavingReplay ? "Saving..." : "Save"}
            </Button>
          </div>
          {replayBuffer.lastError && (
            <p className="mt-2 text-xs text-error">Error: {replayBuffer.lastError}</p>
          )}
          {!replayBuffer.active && (
            <p className="mt-2 text-xs text-warning">
              Replay buffer is inactive. Enable it in OBS to capture clips.
            </p>
          )}
        </div>
      )}

      {/* Active Recording Banner */}
      {activeRecording && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-error/10 border border-error/30 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-error animate-pulse" />
            <span className="text-sm font-medium text-error">Recording</span>
          </div>
          <p className="text-xs text-error/80 mt-1">
            {activeRecording.title || activeRecording.triggerSource}
          </p>
          <p className="text-xs text-text-dim mt-1">
            Started at {activeRecording.t0.toFixed(1)}s
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 p-2 border-b border-stroke overflow-x-auto">
        {(["all", "pending", "processing", "completed", "failed"] as FilterStatus[]).map(
          (status) => {
            const count =
              status === "all" ? stats.total : stats[status as keyof ClipQueueStats];
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors
                  ${
                    filter === status
                      ? "bg-teal text-white"
                      : "bg-surface text-text-muted hover:bg-surface-hover"
                  }
                `}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {count > 0 && (
                  <span className="ml-1 opacity-70">({count})</span>
                )}
              </button>
            );
          }
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-2 p-2 rounded bg-error/10 border border-error/30">
          <p className="text-xs text-error">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-error/70 hover:text-error underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!isStreaming && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg
              className="h-12 w-12 text-text-dim mb-3 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
            <p className="text-sm font-medium text-text-dim">
              Waiting for stream
            </p>
            <p className="text-xs text-text-dim mt-1">
              Start streaming in OBS to enable clip capture
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-text-muted">Loading...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg
              className="h-12 w-12 text-text-dim mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-text-dim">
              {filter === "all"
                ? "No clips in queue"
                : `No ${filter} clips`}
            </p>
            <p className="text-xs text-text-dim mt-1">
              Clips will appear here when triggered
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <ClipQueueItemCard
              key={item.id}
              item={item}
              onRetry={() => handleRetry(item.id)}
              onDelete={() => handleDelete(item.id)}
              onUpdateTitle={(title) => handleUpdateTitle(item.id, title)}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-stroke bg-surface">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold text-text">{stats.pending}</p>
            <p className="text-xs text-text-dim">Pending</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-warning">{stats.processing}</p>
            <p className="text-xs text-text-dim">Processing</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-success">{stats.completed}</p>
            <p className="text-xs text-text-dim">Done</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-error">{stats.failed}</p>
            <p className="text-xs text-text-dim">Failed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

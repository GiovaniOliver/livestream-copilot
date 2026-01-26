"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatTimestamp, type ActionItemResult } from "./types";

export interface ActionItemsPanelProps {
  actionItems: ActionItemResult[];
  onItemsChange?: (items: ActionItemResult[]) => void;
  onTimestampClick?: (timestamp: number) => void;
  isExtracting?: boolean;
  className?: string;
}

export function ActionItemsPanel({
  actionItems: initialItems,
  onItemsChange,
  onTimestampClick,
  isExtracting = false,
  className,
}: ActionItemsPanelProps) {
  const [items, setItems] = useState<ActionItemResult[]>(initialItems);
  const [filterCompleted, setFilterCompleted] = useState<"all" | "pending" | "completed">("all");

  const updateItems = useCallback(
    (newItems: ActionItemResult[]) => {
      setItems(newItems);
      onItemsChange?.(newItems);
    },
    [onItemsChange]
  );

  const handleToggleComplete = useCallback(
    (id: string) => {
      const updated = items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      updateItems(updated);
    },
    [items, updateItems]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const updated = items.filter((item) => item.id !== id);
      updateItems(updated);
    },
    [items, updateItems]
  );

  const filteredItems = useMemo(() => {
    switch (filterCompleted) {
      case "pending":
        return items.filter((item) => !item.completed);
      case "completed":
        return items.filter((item) => item.completed);
      default:
        return items;
    }
  }, [items, filterCompleted]);

  const stats = useMemo(() => ({
    total: items.length,
    completed: items.filter((i) => i.completed).length,
    pending: items.filter((i) => !i.completed).length,
    aiGenerated: items.filter((i) => i.isAiGenerated).length,
  }), [items]);

  const priorityColors = {
    high: "bg-error/10 text-error border-error/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    low: "bg-success/10 text-success border-success/20",
  };

  return (
    <div className={cn("rounded-2xl border border-stroke bg-bg-1 p-6", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
            <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text">Action Items</h3>
            <p className="text-xs text-text-muted">
              {stats.pending} pending | {stats.completed} completed
            </p>
          </div>
        </div>

        {isExtracting && (
          <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Extracting...
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex rounded-lg border border-stroke bg-bg-0 p-1">
          {(["all", "pending", "completed"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterCompleted(filter)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-all",
                filterCompleted === filter
                  ? "bg-warning/20 text-warning"
                  : "text-text-muted hover:text-text"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {stats.aiGenerated > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-purple/10 px-2 py-1 text-[10px] font-medium text-purple">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            {stats.aiGenerated} AI-detected
          </span>
        )}
      </div>

      {/* Items list */}
      <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group flex items-start gap-3 rounded-xl border border-stroke bg-bg-0 p-3 transition-all",
                item.completed && "opacity-60"
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggleComplete(item.id)}
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all",
                  item.completed
                    ? "border-success bg-success text-white"
                    : "border-stroke hover:border-success"
                )}
              >
                {item.completed && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm text-text",
                  item.completed && "line-through text-text-muted"
                )}>
                  {item.text}
                </p>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {/* Timestamp */}
                  <button
                    onClick={() => onTimestampClick?.(item.timestamp)}
                    className="flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[10px] text-text-muted transition-colors hover:bg-teal/10 hover:text-teal"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTimestamp(item.timestamp)}
                  </button>

                  {/* Priority badge */}
                  {item.priority && (
                    <span className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                      priorityColors[item.priority]
                    )}>
                      {item.priority}
                    </span>
                  )}

                  {/* AI badge */}
                  {item.isAiGenerated && (
                    <span className="flex items-center gap-0.5 text-[10px] text-purple">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      AI
                    </span>
                  )}

                  {/* Assignee */}
                  {item.assignee && (
                    <span className="text-[10px] text-text-dim">
                      @ {item.assignee}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(item.id)}
                className="flex-shrink-0 rounded p-1 text-text-dim opacity-0 transition-all group-hover:opacity-100 hover:bg-error/10 hover:text-error"
                title="Delete item"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface">
              <svg className="h-6 w-6 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-sm text-text-muted">
              {filterCompleted === "all"
                ? "No action items yet"
                : `No ${filterCompleted} items`
              }
            </p>
            <p className="mt-1 text-xs text-text-dim">
              Action items will be extracted from the transcript
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="mt-4 pt-4 border-t border-stroke">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>Progress</span>
            <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-success to-teal transition-all duration-300"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

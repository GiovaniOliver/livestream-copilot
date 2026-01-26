"use client";

import { forwardRef, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import type { ActionItemData } from "./types";

export interface ActionItemProps {
  item: ActionItemData;
  onComplete?: (itemId: string) => void;
  onEdit?: (itemId: string) => void;
  onDragStart?: (e: DragEvent, itemId: string) => void;
  onDragEnd?: (e: DragEvent) => void;
  isDragging?: boolean;
  className?: string;
}

function formatDueDate(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDueDateColor(date: Date | null, isComplete: boolean): string {
  if (isComplete) return "text-text-dim";
  if (!date) return "text-text-muted";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "text-error";
  if (diffDays <= 1) return "text-warning";
  if (diffDays <= 3) return "text-warning/70";
  return "text-text-muted";
}

const priorityStyles = {
  high: "border-l-error",
  medium: "border-l-warning",
  low: "border-l-teal",
};

const priorityBadgeStyles = {
  high: "bg-error/20 text-error",
  medium: "bg-warning/20 text-warning",
  low: "bg-teal/20 text-teal",
};

const ActionItem = forwardRef<HTMLDivElement, ActionItemProps>(
  (
    {
      item,
      onComplete,
      onEdit,
      onDragStart,
      onDragEnd,
      isDragging = false,
      className,
    },
    ref
  ) => {
    const handleDragStart = (e: DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.id);
      onDragStart?.(e, item.id);
    };

    return (
      <div
        ref={ref}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        className={cn(
          "group relative cursor-grab rounded-xl border border-stroke bg-bg-1 p-3",
          "border-l-4 transition-all duration-200",
          priorityStyles[item.priority],
          "hover:bg-bg-2 hover:shadow-elevated",
          isDragging && "cursor-grabbing opacity-50 scale-105",
          item.isComplete && "opacity-60",
          className
        )}
      >
        {/* Checkbox and text */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => onComplete?.(item.id)}
            className={cn(
              "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors",
              item.isComplete
                ? "border-success bg-success/20"
                : "border-stroke hover:border-teal hover:bg-teal/10"
            )}
          >
            {item.isComplete && (
              <svg
                className="h-3 w-3 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm text-text leading-relaxed",
                item.isComplete && "line-through text-text-dim"
              )}
            >
              {item.text}
            </p>

            {/* Meta info */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Priority badge */}
              {item.column === "action" && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    priorityBadgeStyles[item.priority]
                  )}
                >
                  {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                </span>
              )}

              {/* Owner */}
              {item.owner && (
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {item.owner}
                </span>
              )}

              {/* Due date */}
              {item.dueDate && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    getDueDateColor(item.dueDate, item.isComplete)
                  )}
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDueDate(item.dueDate)}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={() => onEdit?.(item.id)}
            className={cn(
              "flex-shrink-0 rounded-lg p-1.5 text-text-dim transition-colors",
              "opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-text"
            )}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </div>

        {/* Drag handle indicator */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-50">
          <span className="block h-0.5 w-1.5 rounded-full bg-text-dim" />
          <span className="block h-0.5 w-1.5 rounded-full bg-text-dim" />
          <span className="block h-0.5 w-1.5 rounded-full bg-text-dim" />
        </div>
      </div>
    );
  }
);

ActionItem.displayName = "ActionItem";

export { ActionItem };

"use client";

import { type FC } from "react";
import { cn } from "@/lib/utils";
import type { BeatCardProps } from "./types";
import { ACT_COLORS } from "./types";

// ============================================================================
// Beat Card Component
// Individual story beat card for the BeatBoard kanban
// ============================================================================

const BeatCard: FC<BeatCardProps> = ({
  beat,
  isDragging = false,
  onEdit,
  onDelete,
}) => {
  const actColors = ACT_COLORS[beat.act];

  const getStatusIndicator = () => {
    switch (beat.status) {
      case "complete":
        return (
          <div className="w-2 h-2 rounded-full bg-success" title="Complete" />
        );
      case "in-progress":
        return (
          <div
            className="w-2 h-2 rounded-full bg-warning animate-pulse"
            title="In Progress"
          />
        );
      case "cut":
        return (
          <div className="w-2 h-2 rounded-full bg-error" title="Cut" />
        );
      default:
        return (
          <div className="w-2 h-2 rounded-full bg-text-dim" title="Draft" />
        );
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-3",
        "bg-bg-1 border-stroke",
        "transition-all duration-200",
        "hover:border-stroke hover:bg-bg-2",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 scale-105 shadow-elevated rotate-2",
        beat.status === "cut" && "opacity-50"
      )}
    >
      {/* Act indicator bar */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
          actColors.bg
        )}
        style={{
          backgroundColor:
            beat.act === 1
              ? "rgba(139, 92, 246, 0.6)"
              : beat.act === 2
                ? "rgba(0, 212, 199, 0.6)"
                : "rgba(251, 191, 36, 0.6)",
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getStatusIndicator()}
          <h4 className="text-sm font-medium text-text truncate">
            {beat.title}
          </h4>
        </div>

        {/* Scene number badge */}
        {beat.sceneNumber && (
          <span
            className={cn(
              "shrink-0 px-1.5 py-0.5 text-xs font-mono rounded",
              actColors.bg,
              actColors.text
            )}
          >
            Sc. {beat.sceneNumber}
          </span>
        )}
      </div>

      {/* Summary */}
      <p className="text-xs text-text-muted line-clamp-2 mb-2 pl-4">
        {beat.summary}
      </p>

      {/* Notes indicator */}
      {beat.notes && (
        <div className="flex items-center gap-1 pl-4 mb-2">
          <svg
            className="w-3 h-3 text-warning"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs text-warning truncate">{beat.notes}</span>
        </div>
      )}

      {/* Tags */}
      {beat.tags && beat.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-4 mb-2">
          {beat.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] rounded bg-surface text-text-muted"
            >
              {tag}
            </span>
          ))}
          {beat.tags.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-surface text-text-dim">
              +{beat.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer actions - visible on hover */}
      <div
        className={cn(
          "flex items-center justify-end gap-1 mt-2 pt-2 border-t border-stroke-subtle",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        )}
      >
        <button
          onClick={() => onEdit?.(beat)}
          className={cn(
            "p-1.5 rounded-md",
            "text-text-muted hover:text-teal hover:bg-teal/10",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-teal/50"
          )}
          title="Edit beat"
        >
          <svg
            className="w-3.5 h-3.5"
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
        <button
          onClick={() => onDelete?.(beat.id)}
          className={cn(
            "p-1.5 rounded-md",
            "text-text-muted hover:text-error hover:bg-error/10",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-error/50"
          )}
          title="Delete beat"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Drag handle indicator */}
      <div
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2",
          "opacity-0 group-hover:opacity-30 transition-opacity duration-150"
        )}
      >
        <svg
          className="w-4 h-4 text-text-dim"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </div>
    </div>
  );
};

export { BeatCard };

"use client";

import { type FC, useState } from "react";
import { cn } from "@/lib/utils";
import type { NoteCardProps } from "./types";
import { PRIORITY_COLORS, CATEGORY_LABELS } from "./types";

// ============================================================================
// Note Card Component
// Collapsible note card for the NotesStack
// ============================================================================

const NoteCard: FC<NoteCardProps> = ({
  note,
  contributor,
  isExpanded: controlledExpanded,
  onToggleExpand,
  onResolve,
  onEdit,
  onDelete,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);

  // Support both controlled and uncontrolled modes
  const isExpanded = controlledExpanded ?? internalExpanded;
  const toggleExpand = onToggleExpand ?? (() => setInternalExpanded(!internalExpanded));

  const priorityColors = PRIORITY_COLORS[note.priority];
  const categoryLabel = CATEGORY_LABELS[note.category];

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getCategoryIcon = () => {
    switch (note.category) {
      case "open-loop":
        return (
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        );
      case "character":
        return (
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
      case "attribution":
        return (
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        );
      default:
        return (
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
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        "bg-bg-1 border-stroke",
        "transition-all duration-200",
        note.isResolved && "opacity-60"
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={toggleExpand}
        className={cn(
          "w-full flex items-center gap-3 p-3",
          "hover:bg-bg-2 transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal/50"
        )}
      >
        {/* Expand/Collapse indicator */}
        <svg
          className={cn(
            "w-4 h-4 text-text-muted shrink-0 transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>

        {/* Priority indicator */}
        <div
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            priorityColors.bg
          )}
          style={{
            backgroundColor:
              note.priority === "urgent"
                ? "#EF4444"
                : note.priority === "high"
                  ? "#FBBF24"
                  : note.priority === "medium"
                    ? "#00D4C7"
                    : "#6B6B7B",
          }}
        />

        {/* Title */}
        <span
          className={cn(
            "flex-1 text-sm font-medium text-left truncate",
            note.isResolved ? "text-text-muted line-through" : "text-text"
          )}
        >
          {note.title}
        </span>

        {/* Category badge */}
        <span
          className={cn(
            "shrink-0 flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full",
            "border",
            note.category === "open-loop" &&
              "bg-warning/10 border-warning/30 text-warning",
            note.category === "character" &&
              "bg-purple/10 border-purple/30 text-purple",
            note.category === "attribution" &&
              "bg-teal/10 border-teal/30 text-teal",
            note.category === "general" &&
              "bg-surface border-stroke text-text-muted"
          )}
        >
          {getCategoryIcon()}
          <span className="hidden sm:inline">{categoryLabel}</span>
        </span>
      </button>

      {/* Expandable content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-96" : "max-h-0"
        )}
      >
        <div className="px-3 pb-3 pt-1 border-t border-stroke-subtle">
          {/* Content */}
          <p className="text-sm text-text-muted mb-3 leading-relaxed">
            {note.content}
          </p>

          {/* Attribution */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: contributor?.color || "#8B5CF6" }}
            />
            <span className="text-xs text-text-muted">
              {contributor?.name || "Unknown"} - {formatDate(note.createdAt)}
            </span>
            {note.assignedTo && (
              <span className="text-xs text-text-dim">
                (assigned to {note.assignedTo})
              </span>
            )}
          </div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-surface text-text-muted"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Related links */}
          {(note.relatedBeatId || note.relatedSceneId) && (
            <div className="flex items-center gap-2 mb-3 text-xs text-text-dim">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <span>
                {note.relatedBeatId && `Beat: ${note.relatedBeatId}`}
                {note.relatedBeatId && note.relatedSceneId && " | "}
                {note.relatedSceneId && `Scene: ${note.relatedSceneId}`}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-stroke-subtle">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit?.(note)}
                className={cn(
                  "p-1.5 rounded-md",
                  "text-text-muted hover:text-teal hover:bg-teal/10",
                  "transition-colors duration-150"
                )}
                title="Edit note"
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
                onClick={() => onDelete?.(note.id)}
                className={cn(
                  "p-1.5 rounded-md",
                  "text-text-muted hover:text-error hover:bg-error/10",
                  "transition-colors duration-150"
                )}
                title="Delete note"
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

            {!note.isResolved && (
              <button
                onClick={() => onResolve?.(note.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg",
                  "border border-success/30 text-success",
                  "bg-transparent hover:bg-success/10",
                  "transition-colors duration-150"
                )}
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Mark Resolved
              </button>
            )}

            {note.isResolved && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-success">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Resolved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { NoteCard };

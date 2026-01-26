"use client";

import { type FC } from "react";
import { cn } from "@/lib/utils";
import type { ScriptInsertProps, ScriptElement } from "./types";

// ============================================================================
// Script Insert Component
// Displays AI or collaborator suggested script insertions with accept/reject
// ============================================================================

const ScriptInsert: FC<ScriptInsertProps> = ({
  insert,
  contributor,
  onAccept,
  onReject,
}) => {
  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const renderElement = (element: ScriptElement): React.ReactNode => {
    const baseClasses = "font-mono text-sm";

    switch (element.type) {
      case "scene-heading":
        return (
          <div className={cn(baseClasses, "text-text font-bold uppercase")}>
            {element.content}
          </div>
        );
      case "action":
        return (
          <div className={cn(baseClasses, "text-text-muted")}>
            {element.content}
          </div>
        );
      case "character":
        return (
          <div className={cn(baseClasses, "text-teal uppercase text-center mt-2")}>
            {element.content}
          </div>
        );
      case "parenthetical":
        return (
          <div className={cn(baseClasses, "text-text-muted italic text-center")}>
            {element.content}
          </div>
        );
      case "dialogue":
        return (
          <div className={cn(baseClasses, "text-text text-center max-w-[60%] mx-auto")}>
            {element.content}
          </div>
        );
      case "transition":
        return (
          <div className={cn(baseClasses, "text-text-muted uppercase text-right")}>
            {element.content}
          </div>
        );
      default:
        return (
          <div className={cn(baseClasses, "text-text")}>
            {element.content}
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed p-4 my-2",
        "border-purple/40 bg-purple/5",
        "transition-all duration-200",
        "hover:border-purple/60 hover:bg-purple/10"
      )}
    >
      {/* Insert Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-stroke-subtle">
        <div className="flex items-center gap-2">
          {/* Contributor indicator */}
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: contributor?.color || "#8B5CF6" }}
          />
          <span className="text-xs text-text-muted">
            Suggested by{" "}
            <span className="text-text font-medium">
              {contributor?.name || "Unknown"}
            </span>
          </span>
          {insert.proposedAt && (
            <span className="text-xs text-text-dim">
              {formatTimestamp(insert.proposedAt)}
            </span>
          )}
        </div>

        {/* Status badge */}
        {insert.status === "pending" && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-warning/10 text-warning border border-warning/30">
            Pending Review
          </span>
        )}
      </div>

      {/* Suggested Content */}
      <div className="space-y-1 mb-4">
        {insert.elements.map((element) => (
          <div key={element.id}>{renderElement(element)}</div>
        ))}
      </div>

      {/* Reason (if provided) */}
      {insert.reason && (
        <div className="mb-4 p-2 rounded bg-bg-1 border border-stroke-subtle">
          <p className="text-xs text-text-muted italic">
            <span className="text-purple">Reason:</span> {insert.reason}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {insert.status === "pending" && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onReject(insert.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg",
              "border border-error/30 text-error",
              "bg-transparent hover:bg-error/10",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-error/50"
            )}
          >
            <span className="flex items-center gap-1.5">
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Reject
            </span>
          </button>
          <button
            onClick={() => onAccept(insert.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg",
              "border border-success/30 text-success",
              "bg-success/10 hover:bg-success/20",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-success/50"
            )}
          >
            <span className="flex items-center gap-1.5">
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
              Accept
            </span>
          </button>
        </div>
      )}

      {/* Decorative corner accent */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-purple/60 rounded-tl-lg -translate-x-px -translate-y-px" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-purple/60 rounded-br-lg translate-x-px translate-y-px" />
    </div>
  );
};

export { ScriptInsert };

"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { Idea } from "./types";
import { speakerColors } from "./mockData";

export interface IdeaCardProps {
  idea: Idea;
  onStar?: (ideaId: string) => void;
  onAddToMap?: (ideaId: string) => void;
  className?: string;
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}

const IdeaCard = forwardRef<HTMLDivElement, IdeaCardProps>(
  ({ idea, onStar, onAddToMap, className }, ref) => {
    const speakerColor = speakerColors[idea.speaker] || "text-text";

    return (
      <div
        ref={ref}
        className={cn(
          "group relative rounded-xl border border-stroke bg-bg-1 p-3",
          "transition-all duration-200 hover:bg-bg-2 hover:border-stroke-subtle",
          idea.isStarred && "border-warning/30 bg-warning/5",
          className
        )}
      >
        {/* Header: Speaker and timestamp */}
        <div className="mb-2 flex items-center justify-between">
          <span className={cn("text-sm font-medium", speakerColor)}>
            {idea.speaker}
          </span>
          <span className="text-xs text-text-dim">
            {formatTimestamp(idea.timestamp)}
          </span>
        </div>

        {/* Idea text */}
        <p className="mb-3 text-sm text-text leading-relaxed">{idea.text}</p>

        {/* Tags */}
        {idea.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {idea.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          {/* Star button */}
          <button
            onClick={() => onStar?.(idea.id)}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors",
              idea.isStarred
                ? "text-warning"
                : "text-text-dim hover:text-warning hover:bg-warning/10"
            )}
          >
            <svg
              className="h-4 w-4"
              fill={idea.isStarred ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <span className="text-xs">
              {idea.isStarred ? "Starred" : "Star"}
            </span>
          </button>

          {/* Add to map button */}
          <button
            onClick={() => onAddToMap?.(idea.id)}
            disabled={idea.isAddedToMap}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors",
              idea.isAddedToMap
                ? "text-success cursor-default"
                : "text-text-dim hover:text-teal hover:bg-teal/10"
            )}
          >
            {idea.isAddedToMap ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-xs">Added</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-xs">Add to Map</span>
              </>
            )}
          </button>
        </div>

        {/* Added indicator */}
        {idea.isAddedToMap && (
          <div className="absolute top-3 right-3">
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
          </div>
        )}
      </div>
    );
  }
);

IdeaCard.displayName = "IdeaCard";

export { IdeaCard };

"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Idea } from "./types";
import { IdeaCard } from "./IdeaCard";

export interface IdeaIntakeProps {
  ideas: Idea[];
  onIdeasChange?: (ideas: Idea[]) => void;
  className?: string;
}

type FilterMode = "all" | "starred" | "not-added";

function IdeaIntake({ ideas, onIdeasChange, className }: IdeaIntakeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // Filter and search ideas
  const filteredIdeas = useMemo(() => {
    let result = ideas;

    // Apply filter mode
    if (filterMode === "starred") {
      result = result.filter((idea) => idea.isStarred);
    } else if (filterMode === "not-added") {
      result = result.filter((idea) => !idea.isAddedToMap);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (idea) =>
          idea.text.toLowerCase().includes(query) ||
          idea.speaker.toLowerCase().includes(query) ||
          idea.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [ideas, filterMode, searchQuery]);

  // Toggle star
  const handleStar = (ideaId: string) => {
    const updatedIdeas = ideas.map((idea) =>
      idea.id === ideaId ? { ...idea, isStarred: !idea.isStarred } : idea
    );
    onIdeasChange?.(updatedIdeas);
  };

  // Add to map
  const handleAddToMap = (ideaId: string) => {
    const updatedIdeas = ideas.map((idea) =>
      idea.id === ideaId ? { ...idea, isAddedToMap: true } : idea
    );
    onIdeasChange?.(updatedIdeas);
  };

  // Stats
  const starredCount = ideas.filter((i) => i.isStarred).length;
  const notAddedCount = ideas.filter((i) => !i.isAddedToMap).length;

  return (
    <div className={cn("flex h-full flex-col bg-bg-1 rounded-2xl border border-stroke", className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-stroke p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text">Idea Stream</h3>
          <span className="text-sm text-text-muted">{ideas.length} ideas</span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search ideas, speakers, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full rounded-xl border border-stroke bg-bg-0 py-2 pl-10 pr-4 text-sm text-text",
              "placeholder:text-text-dim",
              "focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            )}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              filterMode === "all"
                ? "bg-teal/20 text-teal"
                : "text-text-muted hover:bg-surface hover:text-text"
            )}
          >
            All ({ideas.length})
          </button>
          <button
            onClick={() => setFilterMode("starred")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              filterMode === "starred"
                ? "bg-warning/20 text-warning"
                : "text-text-muted hover:bg-surface hover:text-text"
            )}
          >
            Starred ({starredCount})
          </button>
          <button
            onClick={() => setFilterMode("not-added")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              filterMode === "not-added"
                ? "bg-purple/20 text-purple"
                : "text-text-muted hover:bg-surface hover:text-text"
            )}
          >
            Not Added ({notAddedCount})
          </button>
        </div>
      </div>

      {/* Ideas list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredIdeas.length > 0 ? (
            filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onStar={handleStar}
                onAddToMap={handleAddToMap}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg
                className="mb-3 h-12 w-12 text-text-dim"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <p className="text-sm text-text-muted">No ideas found</p>
              {searchQuery && (
                <p className="mt-1 text-xs text-text-dim">
                  Try a different search term
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex-shrink-0 border-t border-stroke p-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs text-text-muted">Live - Ideas streaming in real-time</span>
        </div>
      </div>
    </div>
  );
}

export { IdeaIntake };

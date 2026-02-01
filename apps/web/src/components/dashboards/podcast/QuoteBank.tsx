"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { QuoteCard } from "./QuoteCard";
import type { Quote } from "./types";
import { logger } from "@/lib/logger";

export interface QuoteBankProps {
  quotes: Quote[];
  onQuotesChange?: (quotes: Quote[]) => void;
  onTimestampClick?: (timestamp: number) => void;
  className?: string;
}

type FilterType = "all" | "favorites";
type SortType = "timestamp" | "speaker";

export function QuoteBank({
  quotes: initialQuotes,
  onQuotesChange,
  onTimestampClick,
  className,
}: QuoteBankProps) {
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("timestamp");

  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const updateQuotes = useCallback(
    (newQuotes: Quote[]) => {
      setQuotes(newQuotes);
      onQuotesChange?.(newQuotes);
    },
    [onQuotesChange]
  );

  const handleToggleFavorite = useCallback(
    (id: string) => {
      const updated = quotes.map((q) =>
        q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
      );
      updateQuotes(updated);
    },
    [quotes, updateQuotes]
  );

  const handleCopy = useCallback((text: string) => {
    logger.debug("Copied:", text);
  }, []);

  const filteredAndSortedQuotes = useMemo(() => {
    let result = [...quotes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.text.toLowerCase().includes(query) ||
          q.speaker.toLowerCase().includes(query)
      );
    }

    // Apply favorites filter
    if (filter === "favorites") {
      result = result.filter((q) => q.isFavorite);
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === "timestamp") {
        return a.timestamp - b.timestamp;
      }
      return a.speaker.localeCompare(b.speaker);
    });

    return result;
  }, [quotes, searchQuery, filter, sortBy]);

  const favoritesCount = useMemo(
    () => quotes.filter((q) => q.isFavorite).length,
    [quotes]
  );

  return (
    <div className={cn("rounded-2xl border border-stroke bg-bg-1 p-6", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Quote Bank</h2>
          <p className="text-sm text-text-muted">
            {quotes.length} quotes | {favoritesCount} favorited
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search quotes or speakers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stroke bg-bg-0 py-2.5 pl-10 pr-4 text-sm text-text placeholder-text-dim outline-none transition-colors focus:border-teal"
          />
        </div>

        {/* Filter and sort controls */}
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex rounded-lg border border-stroke bg-bg-0 p-1">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                filter === "all"
                  ? "bg-teal/20 text-teal"
                  : "text-text-muted hover:text-text"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter("favorites")}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all",
                filter === "favorites"
                  ? "bg-warning/20 text-warning"
                  : "text-text-muted hover:text-text"
              )}
            >
              <svg
                className="h-3 w-3"
                fill={filter === "favorites" ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
              Favorites
            </button>
          </div>

          {/* Sort dropdown */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-text-dim">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="rounded-lg border border-stroke bg-bg-0 px-2 py-1 text-xs text-text outline-none focus:border-teal"
            >
              <option value="timestamp">Timestamp</option>
              <option value="speaker">Speaker</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quote list */}
      <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
        {filteredAndSortedQuotes.length > 0 ? (
          filteredAndSortedQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onToggleFavorite={handleToggleFavorite}
              onCopy={handleCopy}
              onTimestampClick={onTimestampClick}
              formatTime={formatTime}
            />
          ))
        ) : (
          <div className="py-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-text-dim"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="mt-2 text-sm text-text-muted">
              {searchQuery || filter === "favorites"
                ? "No quotes match your filters"
                : "No quotes available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

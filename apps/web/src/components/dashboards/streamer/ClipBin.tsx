"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ClipCard } from "./ClipCard";
import type { ClipBinProps, ClipStatus } from "./types";

// ============================================================
// Filter Configuration
// ============================================================

type FilterOption = ClipStatus | "all";

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All Clips" },
  { value: "ready", label: "Ready" },
  { value: "processing", label: "Processing" },
  { value: "error", label: "Error" },
];

// ============================================================
// Icons
// ============================================================

function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

// ============================================================
// ClipBin Component
// ============================================================

export function ClipBin({
  clips,
  onClipSelect,
  onClipEdit,
  onClipExport,
  selectedClipId,
}: ClipBinProps) {
  const [filter, setFilter] = useState<FilterOption>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter clips based on selected filter
  const filteredClips =
    filter === "all" ? clips : clips.filter((clip) => clip.status === filter);

  // Count clips by status
  const clipCounts = {
    all: clips.length,
    ready: clips.filter((c) => c.status === "ready").length,
    processing: clips.filter((c) => c.status === "processing").length,
    error: clips.filter((c) => c.status === "error").length,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-2">
          <VideoIcon className="h-5 w-5 text-teal" />
          <h2 className="text-lg font-semibold text-text">Clip Bin</h2>
          <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted">
            {clipCounts.all}
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-stroke bg-bg-0 p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "grid"
                ? "bg-surface text-text"
                : "text-text-muted hover:text-text"
            )}
            aria-label="Grid view"
          >
            <GridIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "list"
                ? "bg-surface text-text"
                : "text-text-muted hover:text-text"
            )}
            aria-label="List view"
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-stroke px-4 py-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              filter === option.value
                ? "bg-teal/10 text-teal"
                : "text-text-muted hover:bg-surface hover:text-text"
            )}
          >
            {option.label}
            <span className="ml-1 opacity-60">
              ({clipCounts[option.value]})
            </span>
          </button>
        ))}
      </div>

      {/* Clips Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredClips.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-muted">
            <VideoIcon className="mb-3 h-12 w-12 opacity-50" />
            <p className="text-sm">No clips found</p>
            <p className="mt-1 text-xs text-text-dim">
              {filter !== "all"
                ? `No ${filter} clips available`
                : "Create clips during your stream"}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
                : "flex flex-col gap-3"
            )}
          >
            {filteredClips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                onClick={onClipSelect}
                onEdit={onClipEdit}
                onExport={onClipExport}
                isSelected={clip.id === selectedClipId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-stroke px-4 py-2">
        <div className="flex items-center justify-between text-xs text-text-dim">
          <span>
            {clipCounts.ready} ready | {clipCounts.processing} processing
          </span>
          <span>
            {Math.round(
              clips.reduce((acc, c) => acc + c.duration, 0) / 60
            )}{" "}
            min total
          </span>
        </div>
      </div>
    </div>
  );
}

export default ClipBin;

"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChapterMarker } from "./ChapterMarker";
import type { Chapter } from "./types";

export interface ChapterTimelineProps {
  chapters: Chapter[];
  totalDuration: number;
  onChaptersChange?: (chapters: Chapter[]) => void;
  className?: string;
}

export function ChapterTimeline({
  chapters: initialChapters,
  totalDuration,
  onChaptersChange,
  className,
}: ChapterTimelineProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const updateChapters = useCallback(
    (newChapters: Chapter[]) => {
      setChapters(newChapters);
      onChaptersChange?.(newChapters);
    },
    [onChaptersChange]
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedChapterId((prev) => (prev === id ? null : id));
  }, []);

  const handleDrag = useCallback(
    (id: string, newStartTime: number) => {
      setChapters((prev) => {
        const chapterIndex = prev.findIndex((c) => c.id === id);
        if (chapterIndex === -1) return prev;

        const chapter = prev[chapterIndex];
        const duration = chapter.endTime - chapter.startTime;
        const newEndTime = newStartTime + duration;

        // Check bounds
        if (newStartTime < 0 || newEndTime > totalDuration) return prev;

        // Check overlap with other chapters
        const wouldOverlap = prev.some((c, i) => {
          if (i === chapterIndex) return false;
          return !(newEndTime <= c.startTime || newStartTime >= c.endTime);
        });

        if (wouldOverlap) return prev;

        const updated = [...prev];
        updated[chapterIndex] = {
          ...chapter,
          startTime: newStartTime,
          endTime: newEndTime,
        };

        // Sort by start time
        updated.sort((a, b) => a.startTime - b.startTime);

        return updated;
      });
    },
    [totalDuration]
  );

  const handleTitleChange = useCallback(
    (id: string, newTitle: string) => {
      const updated = chapters.map((c) =>
        c.id === id ? { ...c, title: newTitle } : c
      );
      updateChapters(updated);
    },
    [chapters, updateChapters]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const updated = chapters.filter((c) => c.id !== id);
      updateChapters(updated);
      setSelectedChapterId(null);
    },
    [chapters, updateChapters]
  );

  const handleAddChapter = useCallback(() => {
    // Find the first gap or add at the end
    const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);
    let newStartTime = 0;
    let newEndTime = 60;

    // Look for gaps
    for (let i = 0; i < sortedChapters.length; i++) {
      const current = sortedChapters[i];
      const next = sortedChapters[i + 1];

      if (next && current.endTime < next.startTime) {
        // Found a gap
        const gapDuration = next.startTime - current.endTime;
        if (gapDuration >= 30) {
          newStartTime = current.endTime;
          newEndTime = Math.min(current.endTime + 60, next.startTime);
          break;
        }
      } else if (!next && current.endTime < totalDuration) {
        // Add after last chapter
        newStartTime = current.endTime;
        newEndTime = Math.min(current.endTime + 60, totalDuration);
        break;
      }
    }

    // If no chapters, start from beginning
    if (sortedChapters.length === 0) {
      newStartTime = 0;
      newEndTime = Math.min(60, totalDuration);
    }

    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      title: "New Chapter",
      startTime: newStartTime,
      endTime: newEndTime,
      color: Math.random() > 0.5 ? "#00D4C7" : "#8B5CF6",
    };

    const updated = [...chapters, newChapter].sort((a, b) => a.startTime - b.startTime);
    updateChapters(updated);
    setSelectedChapterId(newChapter.id);
  }, [chapters, totalDuration, updateChapters]);

  // Generate time markers
  const timeMarkers = [];
  const markerInterval = totalDuration > 3600 ? 600 : totalDuration > 600 ? 120 : 60;
  for (let t = 0; t <= totalDuration; t += markerInterval) {
    timeMarkers.push(t);
  }

  return (
    <div className={cn("rounded-2xl border border-stroke bg-bg-1 p-6", className)}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Chapter Timeline</h2>
          <p className="text-sm text-text-muted">
            {chapters.length} chapters | Total: {formatTime(totalDuration)}
          </p>
        </div>
        <button
          onClick={handleAddChapter}
          className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 px-4 py-2 text-sm font-medium text-teal transition-all hover:bg-teal/20"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Chapter
        </button>
      </div>

      {/* Timeline container */}
      <div className="relative">
        {/* Time markers */}
        <div className="flex justify-between px-1 text-[10px] text-text-dim mb-2">
          {timeMarkers.map((time) => (
            <span key={time} style={{ width: "40px", textAlign: "center" }}>
              {formatTime(time)}
            </span>
          ))}
        </div>

        {/* Timeline track */}
        <div className="relative h-20 rounded-lg bg-bg-0 border border-stroke-subtle">
          {/* Background grid */}
          <div className="absolute inset-0 flex">
            {timeMarkers.slice(0, -1).map((time, i) => (
              <div
                key={time}
                className={cn(
                  "flex-1 border-r border-stroke-subtle",
                  i % 2 === 0 ? "bg-transparent" : "bg-surface/30"
                )}
              />
            ))}
          </div>

          {/* Chapter markers */}
          {chapters.map((chapter) => (
            <ChapterMarker
              key={chapter.id}
              chapter={chapter}
              totalDuration={totalDuration}
              isSelected={selectedChapterId === chapter.id}
              onSelect={handleSelect}
              onDrag={handleDrag}
              onTitleChange={handleTitleChange}
              onDelete={handleDelete}
              formatTime={formatTime}
            />
          ))}
        </div>

        {/* Duration between chapters info */}
        <div className="mt-4 flex flex-wrap gap-2">
          {chapters
            .sort((a, b) => a.startTime - b.startTime)
            .map((chapter, index) => (
              <div
                key={chapter.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs",
                  selectedChapterId === chapter.id
                    ? "border-teal bg-teal/10 text-teal"
                    : "border-stroke bg-bg-0 text-text-muted"
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: chapter.color || "#00D4C7" }}
                />
                <span className="font-medium text-text truncate max-w-[120px]">
                  {chapter.title}
                </span>
                <span className="text-text-dim">
                  {formatTime(chapter.endTime - chapter.startTime)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Instructions */}
      <p className="mt-4 text-xs text-text-dim">
        Double-click to edit title | Drag to reposition | Click to select
      </p>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Chapter } from "./types";

export interface ChapterMarkerProps {
  chapter: Chapter;
  totalDuration: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDrag?: (id: string, newStartTime: number) => void;
  onTitleChange?: (id: string, newTitle: string) => void;
  onDelete?: (id: string) => void;
  formatTime: (seconds: number) => string;
}

export function ChapterMarker({
  chapter,
  totalDuration,
  isSelected = false,
  onSelect,
  onDrag,
  onTitleChange,
  onDelete,
  formatTime,
}: ChapterMarkerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chapter.title);
  const [isDragging, setIsDragging] = useState(false);
  const markerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const leftPosition = (chapter.startTime / totalDuration) * 100;
  const width = ((chapter.endTime - chapter.startTime) / totalDuration) * 100;
  const duration = chapter.endTime - chapter.startTime;

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(chapter.title);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== chapter.title) {
      onTitleChange?.(chapter.id, editValue.trim());
    } else {
      setEditValue(chapter.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(chapter.title);
      setIsEditing(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.preventDefault();
    setIsDragging(true);
    onSelect?.(chapter.id);

    const startX = e.clientX;
    const startTime = chapter.startTime;
    const container = markerRef.current?.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const pixelsPerSecond = containerRect.width / totalDuration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStartTime = Math.max(0, Math.min(totalDuration - duration, startTime + deltaTime));
      onDrag?.(chapter.id, Math.round(newStartTime));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={markerRef}
      className={cn(
        "absolute top-0 h-full cursor-grab select-none transition-all duration-150",
        isDragging && "cursor-grabbing z-20",
        isSelected && "z-10"
      )}
      style={{
        left: `${leftPosition}%`,
        width: `${width}%`,
        minWidth: "60px",
      }}
      onClick={() => onSelect?.(chapter.id)}
      onMouseDown={handleMouseDown}
    >
      {/* Chapter segment */}
      <div
        className={cn(
          "h-full rounded-lg border transition-all duration-200",
          isSelected
            ? "border-teal shadow-glow"
            : "border-stroke hover:border-teal/50",
          isDragging && "opacity-80"
        )}
        style={{
          backgroundColor: chapter.color
            ? `${chapter.color}20`
            : "rgba(0, 212, 199, 0.1)",
          borderColor: isSelected ? chapter.color || "#00D4C7" : undefined,
        }}
      >
        {/* Chapter content */}
        <div className="flex h-full flex-col justify-between p-2 overflow-hidden">
          {/* Title */}
          <div className="flex items-start justify-between gap-1">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full rounded bg-bg-0 px-1.5 py-0.5 text-xs font-medium text-text outline-none ring-1 ring-teal"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="truncate text-xs font-medium text-text"
                onDoubleClick={handleDoubleClick}
                title={chapter.title}
              >
                {chapter.title}
              </span>
            )}
            {isSelected && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chapter.id);
                }}
                className="flex-shrink-0 rounded p-0.5 text-text-muted hover:bg-error/20 hover:text-error transition-colors"
                title="Delete chapter"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Time info */}
          <div className="flex items-center justify-between text-[10px] text-text-muted">
            <span>{formatTime(chapter.startTime)}</span>
            <span className="text-text-dim">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Drag handle indicator */}
      <div
        className={cn(
          "absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full transition-opacity",
          isSelected ? "bg-teal/50" : "bg-transparent"
        )}
      />
    </div>
  );
}

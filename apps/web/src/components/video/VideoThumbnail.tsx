"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

export interface VideoThumbnailProps {
  src: string;
  alt?: string;
  duration?: number;
  timestamp?: number;
  className?: string;
  onClick?: () => void;
  showPlayIcon?: boolean;
  showDuration?: boolean;
  showTimestamp?: boolean;
  aspectRatio?: "video" | "square" | "wide";
  loading?: "lazy" | "eager";
}

// ============================================================
// Icons
// ============================================================

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function ImageErrorIcon({ className }: { className?: string }) {
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

// ============================================================
// VideoThumbnail Component
// ============================================================

export function VideoThumbnail({
  src,
  alt = "Video thumbnail",
  duration,
  timestamp,
  className,
  onClick,
  showPlayIcon = true,
  showDuration = true,
  showTimestamp = false,
  aspectRatio = "video",
  loading = "lazy",
}: VideoThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const aspectRatioClass = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[21/9]",
  }[aspectRatio];

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-bg-1",
        aspectRatioClass,
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={alt}
    >
      {/* Loading State */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-0">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-bg-2" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-bg-1 to-bg-2">
          <ImageErrorIcon className="h-12 w-12 text-text-dim" />
          <p className="mt-2 text-xs text-text-muted">Failed to load thumbnail</p>
        </div>
      )}

      {/* Thumbnail Image */}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          className={cn(
            "h-full w-full object-cover transition-transform duration-300",
            onClick && "group-hover:scale-105",
            isLoading && "opacity-0"
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Play Icon Overlay */}
      {showPlayIcon && !hasError && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-bg-0/40 transition-all duration-300",
            onClick
              ? "opacity-0 group-hover:opacity-100 group-hover:backdrop-blur-sm"
              : "opacity-50"
          )}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/90 shadow-lg transition-transform duration-300 group-hover:scale-110">
            <PlayIcon className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Duration Badge */}
      {showDuration && duration !== undefined && (
        <div className="absolute bottom-2 right-2 rounded bg-bg-0/90 px-2 py-1 text-xs font-medium text-text backdrop-blur-sm">
          {formatTime(duration)}
        </div>
      )}

      {/* Timestamp Badge */}
      {showTimestamp && timestamp !== undefined && (
        <div className="absolute left-2 top-2 rounded bg-bg-0/90 px-2 py-1 text-xs font-medium text-text backdrop-blur-sm">
          {formatTime(timestamp)}
        </div>
      )}

      {/* Hover Border Effect */}
      {onClick && (
        <div className="absolute inset-0 border-2 border-transparent transition-colors duration-300 group-hover:border-teal" />
      )}
    </div>
  );
}

export default VideoThumbnail;

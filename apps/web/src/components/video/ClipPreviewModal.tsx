"use client";

import { useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VideoPlayer } from "./VideoPlayer";
import type { Clip } from "@/components/dashboards/streamer/types";

// ============================================================
// Types
// ============================================================

export interface ClipPreviewModalProps {
  clip: Clip | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (clip: Clip) => void;
  onExport?: (clip: Clip) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  videoSrc?: string;
}

// ============================================================
// Icons
// ============================================================

function CloseIcon({ className }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function ExportIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
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
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ============================================================
// ClipPreviewModal Component
// ============================================================

export function ClipPreviewModal({
  clip,
  isOpen,
  onClose,
  onEdit,
  onExport,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  videoSrc,
}: ClipPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // Close on Escape Key
  // ============================================================

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // ============================================================
  // Navigation with Arrow Keys
  // ============================================================

  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrevious) {
        e.preventDefault();
        onPrevious?.();
      } else if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNext?.();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleArrowKeys);
    }

    return () => {
      window.removeEventListener("keydown", handleArrowKeys);
    };
  }, [isOpen, hasNext, hasPrevious, onNext, onPrevious]);

  // ============================================================
  // Click Outside to Close
  // ============================================================

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // ============================================================
  // Action Handlers
  // ============================================================

  const handleEdit = useCallback(() => {
    if (clip) {
      onEdit?.(clip);
    }
  }, [clip, onEdit]);

  const handleExport = useCallback(() => {
    if (clip) {
      onExport?.(clip);
    }
  }, [clip, onExport]);

  // ============================================================
  // Render
  // ============================================================

  if (!isOpen || !clip) {
    return null;
  }

  // Construct video URL from clip data or use provided videoSrc
  const videoUrl = videoSrc || clip.thumbnailUrl.replace("/thumbnail", "/media");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/95 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="clip-preview-title"
    >
      <div
        ref={modalRef}
        className="relative mx-4 flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-stroke bg-bg-1 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke bg-bg-0/50 px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h2
                id="clip-preview-title"
                className="text-lg font-semibold text-text"
              >
                {clip.title}
              </h2>
              <div className="mt-1 flex items-center gap-3 text-sm text-text-muted">
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>{formatTime(clip.duration)}</span>
                </div>
                <span className="text-text-dim">•</span>
                <span>
                  {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                </span>
                <span className="text-text-dim">•</span>
                <Badge
                  variant={
                    clip.status === "ready"
                      ? "teal"
                      : clip.status === "processing"
                      ? "warning"
                      : "error"
                  }
                >
                  {clip.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Button */}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="gap-2"
              >
                <EditIcon className="h-4 w-4" />
                Edit
              </Button>
            )}

            {/* Export Button */}
            {onExport && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleExport}
                className="gap-2"
              >
                <ExportIcon className="h-4 w-4" />
                Export
              </Button>
            )}

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close"
            >
              <CloseIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative flex flex-1 items-center justify-center bg-bg-0 p-6">
          <div className="w-full max-w-5xl">
            <VideoPlayer
              src={videoUrl}
              autoPlay
              className="w-full"
              onError={(error) => {
                console.error("Video playback error:", error);
              }}
            />
          </div>

          {/* Previous Button */}
          {hasPrevious && (
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-bg-0/80 text-text backdrop-blur-sm transition-all hover:bg-teal hover:text-white"
              aria-label="Previous clip"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )}

          {/* Next Button */}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-bg-0/80 text-text backdrop-blur-sm transition-all hover:bg-teal hover:text-white"
              aria-label="Next clip"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Footer with Metadata */}
        <div className="border-t border-stroke bg-bg-0/50 px-6 py-4">
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-text">Hook Text</h3>
              <p className="mt-1 text-sm text-text-muted">{clip.hookText}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-dim">
              <span>
                Created {new Date(clip.createdAt).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>ID: {clip.id}</span>
            </div>
          </div>
        </div>

        {/* Navigation Hints */}
        {(hasNext || hasPrevious) && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full bg-bg-0/80 px-4 py-2 text-xs text-text-muted backdrop-blur-sm">
              {hasPrevious && <span>← Previous</span>}
              {hasPrevious && hasNext && <span>•</span>}
              {hasNext && <span>Next →</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClipPreviewModal;

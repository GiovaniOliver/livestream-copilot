"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VideoThumbnail } from "@/components/video";
import { ExportModal, ExportButton, type ExportContent } from "@/components/export";
import { useExport } from "@/hooks/useExport";
import type { ClipCardProps, ClipStatus } from "./types";
import { getClipVideoUrl } from "./types";
import { logger } from "@/lib/logger";

// ============================================================
// Status Configuration
// ============================================================

const STATUS_CONFIG: Record<
  ClipStatus,
  { label: string; variant: "teal" | "warning" | "error" }
> = {
  ready: { label: "Ready", variant: "teal" },
  processing: { label: "Processing", variant: "warning" },
  exported: { label: "Exported", variant: "teal" },
  error: { label: "Error", variant: "error" },
};

// ============================================================
// Icons
// ============================================================

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

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================
// ClipCardWithExport Component
// Enhanced ClipCard with integrated export functionality
// ============================================================

export function ClipCardWithExport({
  clip,
  onEdit,
  onExport,
  onClick,
  isSelected = false,
}: ClipCardProps) {
  const statusConfig = STATUS_CONFIG[clip.status];
  const isProcessing = clip.status === "processing";
  const hasError = clip.status === "error";

  // Export functionality
  const {
    isModalOpen,
    currentContent,
    openExport,
    closeExport,
    handleExport,
    generateHashtagSuggestions,
  } = useExport({
    onSuccess: (result) => {
      logger.debug("Export successful:", result);
      onExport?.(clip);
    },
    onError: (error) => {
      logger.error("Export failed:", error);
    },
  });

  const handleClick = () => {
    if (!isProcessing && !hasError) {
      onClick?.(clip);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(clip);
  };

  const handleExportClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    // Generate video URL from artifact ID
    const videoUrl = getClipVideoUrl(clip.artifactId);

    // Convert clip to ExportContent
    const exportContent: ExportContent = {
      id: clip.id,
      type: "clip",
      title: clip.title,
      caption: clip.hookText,
      videoUrl, // Use generated video URL from artifact ID
      thumbnailUrl: clip.thumbnailUrl,
      duration: clip.duration,
      createdAt: clip.createdAt,
    };

    openExport(exportContent);
  };

  const hashtagSuggestions = currentContent
    ? generateHashtagSuggestions(currentContent)
    : [];

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border transition-all duration-200",
          "bg-bg-1 hover:bg-bg-2",
          isSelected
            ? "border-teal shadow-glow"
            : "border-stroke hover:border-stroke-subtle",
          !isProcessing && !hasError && "cursor-pointer",
          isProcessing && "opacity-80"
        )}
        onClick={handleClick}
        role={!isProcessing && !hasError ? "button" : undefined}
        tabIndex={!isProcessing && !hasError ? 0 : undefined}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isProcessing && !hasError) {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`Clip: ${clip.title}`}
      >
        {/* Thumbnail Container */}
        <div className="relative aspect-video w-full overflow-hidden">
          {isProcessing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bg-1 to-bg-2">
              <LoadingSpinner className="h-10 w-10 text-warning" />
            </div>
          ) : hasError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bg-1 to-bg-2">
              <span className="text-4xl text-error">!</span>
            </div>
          ) : (
            <VideoThumbnail
              src={clip.thumbnailUrl}
              alt={clip.title}
              duration={clip.duration}
              showPlayIcon={false}
              showDuration={false}
              onClick={() => !isProcessing && !hasError && onClick?.(clip)}
            />
          )}

          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 rounded bg-bg-0/80 px-1.5 py-0.5 text-xs font-medium text-text backdrop-blur-sm">
            {formatTime(clip.duration)}
          </div>

          {/* Status Indicator */}
          <div className="absolute left-2 top-2">
            <Badge variant={statusConfig.variant} className="text-[10px] px-2 py-0.5">
              {isProcessing && (
                <LoadingSpinner className="mr-1 h-3 w-3" />
              )}
              {statusConfig.label}
            </Badge>
          </div>

          {/* Hover Overlay with Actions */}
          {!isProcessing && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-bg-0/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full bg-bg-1/80 p-0 hover:bg-teal hover:text-bg-0"
                onClick={handleEdit}
                aria-label="Edit clip"
              >
                <EditIcon className="h-4 w-4" />
              </Button>
              <ExportButton
                onClick={handleExportClick}
                variant="icon"
                size="md"
                showIcon
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h4 className="truncate text-sm font-semibold text-text">
            {clip.title}
          </h4>
          <p className="mt-1 line-clamp-2 text-xs text-text-muted">
            {clip.hookText}
          </p>
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-teal" />
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isModalOpen}
        onClose={closeExport}
        content={currentContent}
        onExport={handleExport}
        hashtagSuggestions={hashtagSuggestions}
      />
    </>
  );
}

export default ClipCardWithExport;

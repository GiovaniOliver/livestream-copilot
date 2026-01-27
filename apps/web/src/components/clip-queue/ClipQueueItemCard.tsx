"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";

export interface ClipQueueItem {
  id: string;
  sessionId: string;
  status: "pending" | "recording" | "processing" | "completed" | "failed";
  triggerType: "audio" | "visual" | "manual";
  triggerSource?: string;
  triggerConfidence?: number;
  t0: number;
  t1?: number;
  clipId?: string;
  thumbnailPath?: string;
  title?: string;
  errorMessage?: string;
  createdAt: string;
}

interface ClipQueueItemCardProps {
  item: ClipQueueItem;
  onRetry?: () => void;
  onDelete?: () => void;
  onUpdateTitle?: (title: string) => void;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    variant: "default" as const,
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  recording: {
    label: "Recording",
    variant: "error" as const,
    icon: (
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-error" />
      </span>
    ),
  },
  processing: {
    label: "Processing",
    variant: "warning" as const,
    icon: (
      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  completed: {
    label: "Completed",
    variant: "success" as const,
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  failed: {
    label: "Failed",
    variant: "error" as const,
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

const TRIGGER_TYPE_CONFIG = {
  audio: {
    label: "Audio",
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  visual: {
    label: "Visual",
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  manual: {
    label: "Manual",
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
  },
};

export function ClipQueueItemCard({
  item,
  onRetry,
  onDelete,
  onUpdateTitle,
}: ClipQueueItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title || "");
  const [showActions, setShowActions] = useState(false);

  const statusConfig = STATUS_CONFIG[item.status];
  const triggerConfig = TRIGGER_TYPE_CONFIG[item.triggerType];

  const duration = item.t1 ? item.t1 - item.t0 : null;

  const handleSaveTitle = () => {
    if (onUpdateTitle && editTitle !== item.title) {
      onUpdateTitle(editTitle);
    }
    setIsEditing(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`
        relative rounded-lg border transition-all
        ${item.status === "recording" ? "border-error bg-error/5" : "border-stroke bg-surface hover:bg-surface-hover"}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-t-lg overflow-hidden bg-bg-0">
        {item.thumbnailPath ? (
          <img
            src={item.thumbnailPath}
            alt={item.title || "Clip thumbnail"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-text-dim"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Status Badge Overlay */}
        <div className="absolute top-2 left-2">
          <Badge variant={statusConfig.variant} className="text-xs flex items-center gap-1">
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        </div>

        {/* Trigger Type Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="default" className="text-xs flex items-center gap-1 bg-black/50 border-none">
            {triggerConfig.icon}
            {triggerConfig.label}
          </Badge>
        </div>

        {/* Processing Progress */}
        {item.status === "processing" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-stroke">
            <div className="h-full bg-warning animate-pulse" style={{ width: "60%" }} />
          </div>
        )}

        {/* Recording Indicator */}
        {item.status === "recording" && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded bg-error text-white text-xs">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            REC
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        {isEditing ? (
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 px-2 py-1 text-sm rounded border border-stroke bg-bg-0 text-text focus:border-teal focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <button
              onClick={handleSaveTitle}
              className="p-1 text-success hover:bg-success/10 rounded"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 text-text-dim hover:bg-stroke rounded"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <h4
            className="text-sm font-medium text-text mb-1 truncate cursor-pointer hover:text-teal"
            onClick={() => setIsEditing(true)}
            title="Click to edit"
          >
            {item.title || item.triggerSource || "Untitled clip"}
          </h4>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-3 text-xs text-text-dim">
          <span>t0: {formatTime(item.t0)}</span>
          {item.t1 && <span>t1: {formatTime(item.t1)}</span>}
          {duration && <span>({duration.toFixed(0)}s)</span>}
        </div>

        {/* Trigger Source */}
        {item.triggerSource && item.triggerType === "audio" && (
          <p className="text-xs text-text-dim mt-1 italic">
            &quot;{item.triggerSource}&quot;
            {item.triggerConfidence && (
              <span className="ml-1">({(item.triggerConfidence * 100).toFixed(0)}%)</span>
            )}
          </p>
        )}

        {/* Error Message */}
        {item.status === "failed" && item.errorMessage && (
          <p className="text-xs text-error mt-2 p-2 bg-error/10 rounded">
            {item.errorMessage}
          </p>
        )}
      </div>

      {/* Actions Overlay */}
      {showActions && (item.status === "completed" || item.status === "failed") && (
        <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center gap-2 transition-opacity">
          {item.status === "completed" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Play
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </Button>
            </>
          )}
          {item.status === "failed" && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
              onClick={onRetry}
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="bg-error/50 hover:bg-error/70 text-white"
              onClick={onDelete}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface AutoCaptureIndicatorProps {
  isEnabled: boolean;
  isCapturing: boolean;
  captureCount: number;
  lastCaptureTime?: Date;
  onToggle: () => void;
  className?: string;
}

function AutoCaptureIndicator({
  isEnabled,
  isCapturing,
  captureCount,
  lastCaptureTime,
  onToggle,
  className,
}: AutoCaptureIndicatorProps) {
  const [showPulse, setShowPulse] = useState(false);

  // Show pulse animation when a new idea is captured
  useEffect(() => {
    if (isCapturing) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCapturing, captureCount]);

  // Format the last capture time
  const formatLastCapture = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-all duration-300",
        isEnabled
          ? "border-teal/30 bg-teal/5"
          : "border-stroke bg-bg-1",
        showPulse && "ring-2 ring-teal/50 ring-offset-2 ring-offset-bg-0",
        className
      )}
    >
      {/* AI Icon with animation */}
      <div className="relative">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            isEnabled ? "bg-teal/20" : "bg-surface"
          )}
        >
          {/* Brain/AI icon */}
          <svg
            className={cn(
              "h-5 w-5 transition-colors",
              isEnabled ? "text-teal" : "text-text-muted"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>

        {/* Animated rings when capturing */}
        {isEnabled && isCapturing && (
          <>
            <span className="absolute inset-0 animate-ping rounded-lg bg-teal/30" />
            <span className="absolute -inset-1 animate-pulse rounded-xl border-2 border-teal/40" />
          </>
        )}

        {/* Status dot */}
        {isEnabled && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75",
                isCapturing ? "animate-ping bg-teal" : "bg-success"
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-3 w-3 rounded-full",
                isCapturing ? "bg-teal" : "bg-success"
              )}
            />
          </span>
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              isEnabled ? "text-teal" : "text-text-muted"
            )}
          >
            {isEnabled ? "Auto-Capture Active" : "Auto-Capture Disabled"}
          </span>
          {isCapturing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-medium text-teal animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Capturing
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{captureCount} ideas captured</span>
          {lastCaptureTime && (
            <>
              <span className="h-1 w-1 rounded-full bg-text-dim" />
              <span>Last: {formatLastCapture(lastCaptureTime)}</span>
            </>
          )}
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors duration-300",
          isEnabled ? "bg-teal" : "bg-stroke"
        )}
        aria-label={isEnabled ? "Disable auto-capture" : "Enable auto-capture"}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-text shadow-sm transition-transform duration-300",
            isEnabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

// Compact version for header/footer placement
export interface AutoCaptureIndicatorCompactProps {
  isEnabled: boolean;
  isCapturing: boolean;
  captureCount: number;
  onToggle: () => void;
  className?: string;
}

function AutoCaptureIndicatorCompact({
  isEnabled,
  isCapturing,
  captureCount,
  onToggle,
  className,
}: AutoCaptureIndicatorCompactProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-200",
        isEnabled
          ? "bg-teal/10 border border-teal/30 hover:bg-teal/20"
          : "bg-surface border border-stroke hover:bg-bg-2",
        className
      )}
    >
      {/* Icon */}
      <div className="relative">
        <svg
          className={cn(
            "h-4 w-4 transition-colors",
            isEnabled ? "text-teal" : "text-text-muted"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        {isCapturing && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
          </span>
        )}
      </div>

      {/* Text */}
      <span
        className={cn(
          "text-xs font-medium",
          isEnabled ? "text-teal" : "text-text-muted"
        )}
      >
        {isCapturing ? "Capturing..." : isEnabled ? `Auto (${captureCount})` : "Auto Off"}
      </span>

      {/* Toggle indicator */}
      <div
        className={cn(
          "h-4 w-7 rounded-full transition-colors",
          isEnabled ? "bg-teal/30" : "bg-stroke"
        )}
      >
        <div
          className={cn(
            "h-3 w-3 mt-0.5 rounded-full bg-text shadow-sm transition-transform",
            isEnabled ? "translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </div>
    </button>
  );
}

export { AutoCaptureIndicator, AutoCaptureIndicatorCompact };

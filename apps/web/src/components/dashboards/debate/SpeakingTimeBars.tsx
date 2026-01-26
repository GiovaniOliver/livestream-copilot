"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Speaker } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface SideSpeakingTime {
  side: "pro" | "con";
  label: string;
  color: string;
  speakers: {
    speaker: Speaker;
    totalSeconds: number;
    allocatedSeconds: number;
  }[];
  totalSeconds: number;
  allocatedSeconds: number;
}

export interface SpeakingTimeBarsProps {
  sides: SideSpeakingTime[];
  showSpeakerBreakdown?: boolean;
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);

// =============================================================================
// Helper Functions
// =============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getTimeStatus(used: number, allocated: number): "normal" | "warning" | "critical" {
  const percentage = (used / allocated) * 100;
  if (percentage >= 100) return "critical";
  if (percentage >= 80) return "warning";
  return "normal";
}

// =============================================================================
// Component
// =============================================================================

export function SpeakingTimeBars({
  sides,
  showSpeakerBreakdown = true,
  className,
}: SpeakingTimeBarsProps) {
  // Calculate total time across all sides
  const totals = useMemo(() => {
    const totalUsed = sides.reduce((sum, side) => sum + side.totalSeconds, 0);
    const totalAllocated = sides.reduce((sum, side) => sum + side.allocatedSeconds, 0);
    return { used: totalUsed, allocated: totalAllocated };
  }, [sides]);

  // Calculate time balance between sides
  const timeBalance = useMemo(() => {
    if (sides.length !== 2) return null;
    const diff = sides[0].totalSeconds - sides[1].totalSeconds;
    const diffAbs = Math.abs(diff);
    const leading = diff > 0 ? sides[0].side : sides[1].side;
    return { diff: diffAbs, leading };
  }, [sides]);

  if (sides.length === 0) {
    return (
      <div className={cn("rounded-xl border border-stroke bg-bg-1 p-4", className)}>
        <div className="flex items-center gap-3 text-text-muted">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
            <ClockIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-text">Speaking Time</p>
            <p className="text-xs text-text-dim">Time tracking will appear when debate starts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-stroke bg-bg-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <ClockIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Speaking Time</h3>
            <p className="text-xs text-text-muted">
              {formatTime(totals.used)} / {formatTime(totals.allocated)} total
            </p>
          </div>
        </div>

        {/* Time balance indicator */}
        {timeBalance && timeBalance.diff > 30 && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
              timeBalance.diff > 120 ? "bg-error/10" : "bg-warning/10"
            )}
          >
            <WarningIcon />
            <span
              className={cn(
                "text-xs font-medium",
                timeBalance.diff > 120 ? "text-error" : "text-warning"
              )}
            >
              {timeBalance.leading.toUpperCase()} leads by {formatTime(timeBalance.diff)}
            </span>
          </div>
        )}
      </div>

      {/* Side-by-side comparison */}
      <div className="p-4">
        {/* Main comparison bars */}
        <div className="mb-4 flex items-center gap-4">
          {sides.map((side, index) => {
            const percentage = Math.min((side.totalSeconds / side.allocatedSeconds) * 100, 100);
            const overflowPercentage = Math.max(
              ((side.totalSeconds - side.allocatedSeconds) / side.allocatedSeconds) * 100,
              0
            );
            const status = getTimeStatus(side.totalSeconds, side.allocatedSeconds);

            return (
              <div key={side.side} className="flex-1">
                {/* Side header */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: side.color }}
                    />
                    <span className="text-sm font-semibold text-text">{side.label}</span>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-mono font-medium",
                      status === "critical"
                        ? "text-error"
                        : status === "warning"
                        ? "text-warning"
                        : "text-text"
                    )}
                  >
                    {formatTime(side.totalSeconds)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="relative h-4 overflow-hidden rounded-full bg-surface">
                  {/* Main progress */}
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-300"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: side.color,
                      opacity: status === "critical" ? 0.6 : 1,
                    }}
                  />
                  {/* Overflow indicator */}
                  {overflowPercentage > 0 && (
                    <div
                      className="absolute inset-y-0 right-0 bg-error/60 transition-all duration-300"
                      style={{ width: `${Math.min(overflowPercentage, 100)}%` }}
                    />
                  )}
                  {/* 80% warning line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-warning/50"
                    style={{ left: "80%" }}
                  />
                </div>

                {/* Time labels */}
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-text-dim">0:00</span>
                  <span
                    className={cn(
                      status === "critical"
                        ? "text-error"
                        : status === "warning"
                        ? "text-warning"
                        : "text-text-muted"
                    )}
                  >
                    {status === "critical"
                      ? `Over by ${formatTime(side.totalSeconds - side.allocatedSeconds)}`
                      : `${formatTime(side.allocatedSeconds - side.totalSeconds)} remaining`}
                  </span>
                  <span className="text-text-dim">{formatTime(side.allocatedSeconds)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Balance visualization */}
        {sides.length === 2 && (
          <div className="mb-4">
            <p className="mb-2 text-center text-xs text-text-dim">Time Balance</p>
            <div className="relative h-3 overflow-hidden rounded-full bg-surface">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-text-dim" />

              {/* Balance bars */}
              {sides.map((side, index) => {
                const totalTime = sides.reduce((sum, s) => sum + s.totalSeconds, 0);
                const percentage = totalTime > 0 ? (side.totalSeconds / totalTime) * 100 : 50;

                return (
                  <div
                    key={side.side}
                    className="absolute top-0 bottom-0 transition-all duration-500"
                    style={{
                      backgroundColor: side.color,
                      left: index === 0 ? 0 : "50%",
                      width: index === 0 ? `${percentage}%` : `${100 - percentage}%`,
                      transformOrigin: index === 0 ? "right" : "left",
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-text-dim">
              <span>{sides[0]?.label}</span>
              <span>50/50</span>
              <span>{sides[1]?.label}</span>
            </div>
          </div>
        )}

        {/* Speaker breakdown */}
        {showSpeakerBreakdown && (
          <div className="border-t border-stroke/50 pt-4">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-dim">
              Individual Speakers
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {sides.map((side) => (
                <div key={side.side} className="space-y-2">
                  {side.speakers.map((speakerData) => {
                    const percentage = Math.min(
                      (speakerData.totalSeconds / speakerData.allocatedSeconds) * 100,
                      100
                    );
                    const status = getTimeStatus(
                      speakerData.totalSeconds,
                      speakerData.allocatedSeconds
                    );

                    return (
                      <div
                        key={speakerData.speaker.id}
                        className="rounded-lg bg-surface/50 p-2"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: speakerData.speaker.color }}
                            />
                            <span className="text-xs font-medium text-text">
                              {speakerData.speaker.name}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-xs font-mono",
                              status === "critical"
                                ? "text-error"
                                : status === "warning"
                                ? "text-warning"
                                : "text-text-muted"
                            )}
                          >
                            {formatTime(speakerData.totalSeconds)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-bg-0">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              status === "critical"
                                ? "bg-error"
                                : status === "warning"
                                ? "bg-warning"
                                : "bg-teal"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

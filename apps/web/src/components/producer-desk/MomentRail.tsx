"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from "@/components/ui";

export type MomentType = "highlight" | "sponsor" | "qa" | "clip" | "chapter" | "custom" | "hype" | "marker";

export interface Moment {
  id: string;
  label: string;
  type: MomentType;
  timestamp: number; // Unix timestamp or seconds from start
  displayTime: string;
  duration?: number; // For range-based moments
  metadata?: Record<string, unknown>;
}

interface MomentRailProps {
  moments: Moment[];
  sessionStartTime: number;
  currentTime?: number;
  onMomentClick: (moment: Moment) => void;
  onMomentDelete: (momentId: string) => void;
  onAddMoment: (timestamp: number) => void;
  isConnected: boolean;
  isLive?: boolean;
  isLoading?: boolean;
}

const MOMENT_TYPE_CONFIG: Record<MomentType, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  highlight: {
    label: "Highlight",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400",
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  hype: {
    label: "Hype",
    color: "text-amber-400",
    bgColor: "bg-amber-400",
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  sponsor: {
    label: "Sponsor",
    color: "text-green-400",
    bgColor: "bg-green-400",
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
      </svg>
    ),
  },
  qa: {
    label: "Q&A",
    color: "text-blue-400",
    bgColor: "bg-blue-400",
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
      </svg>
    ),
  },
  clip: {
    label: "Clip",
    color: "text-purple-400",
    bgColor: "bg-purple-400",
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
      </svg>
    ),
  },
  chapter: {
    label: "Chapter",
    color: "text-teal-400",
    bgColor: "bg-teal-400",
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
      </svg>
    ),
  },
  custom: {
    label: "Marker",
    color: "text-orange-400",
    bgColor: "bg-orange-400",
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    ),
  },
  marker: {
    label: "Marker",
    color: "text-orange-400",
    bgColor: "bg-orange-400",
    icon: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    ),
  },
};

function formatTimeFromStart(timestampMs: number, startMs: number): string {
  const diffSeconds = Math.floor((timestampMs - startMs) / 1000);
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MomentRail({
  moments,
  sessionStartTime,
  currentTime,
  onMomentClick,
  onMomentDelete,
  onAddMoment,
  isConnected,
  isLive = false,
  isLoading = false,
}: MomentRailProps) {
  const [selectedType, setSelectedType] = useState<MomentType | "all">("all");
  const [hoveredMoment, setHoveredMoment] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const filteredMoments = useMemo(() => {
    const sorted = [...moments].sort((a, b) => a.timestamp - b.timestamp);
    if (selectedType === "all") return sorted;
    return sorted.filter((m) => m.type === selectedType);
  }, [moments, selectedType]);

  const typeCounts = useMemo(() => {
    const counts: Record<MomentType | "all", number> = {
      all: moments.length,
      highlight: 0,
      hype: 0,
      sponsor: 0,
      qa: 0,
      clip: 0,
      chapter: 0,
      custom: 0,
      marker: 0,
    };
    moments.forEach((m) => {
      if (m.type in counts) {
        counts[m.type]++;
      }
    });
    return counts;
  }, [moments]);

  // Calculate position on rail (0-100%)
  const getMomentPosition = (timestamp: number): number => {
    const now = currentTime || Date.now();
    const elapsed = now - sessionStartTime;
    if (elapsed <= 0) return 0;
    const position = ((timestamp - sessionStartTime) / elapsed) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Handle click on rail to add moment
  const handleRailClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!railRef.current) return;
    const rect = railRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const now = currentTime || Date.now();
    const elapsed = now - sessionStartTime;
    const timestamp = sessionStartTime + elapsed * percentage;
    onAddMoment(timestamp);
  };

  return (
    <Card variant="elevated" className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Moment Rail
              <Badge variant="success">{moments.length}</Badge>
              {isLive && (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                  LIVE
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Key moments and highlights timeline
            </CardDescription>
          </div>
        </div>

        {/* Type filter chips */}
        <div className="mt-3 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedType("all")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors ${
              selectedType === "all"
                ? "bg-teal/20 text-teal"
                : "bg-surface-elevated text-text-muted hover:bg-surface-hover"
            }`}
          >
            All
            <span className="rounded-full bg-surface px-1.5 text-[10px]">
              {typeCounts.all}
            </span>
          </button>
          {(Object.keys(MOMENT_TYPE_CONFIG) as MomentType[]).map((type) => {
            const config = MOMENT_TYPE_CONFIG[type];
            const count = typeCounts[type];
            if (count === 0) return null;

            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                  selectedType === type
                    ? `${config.bgColor}/20 ${config.color}`
                    : "bg-surface-elevated text-text-muted hover:bg-surface-hover"
                }`}
              >
                {config.icon}
                {config.label}
                <span className="rounded-full bg-surface px-1.5 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="animate-spin text-teal">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            <p className="mt-3 text-sm text-text-muted">Loading moments...</p>
          </div>
        )}

        {!isLoading && !isConnected && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="animate-pulse text-text-muted">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-3 text-sm text-text-muted">Connecting to live stream...</p>
          </div>
        )}

        {!isLoading && isConnected && moments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm text-text-muted">No moments marked yet</p>
            <p className="mt-1 text-xs text-text-muted">
              Moments will appear here as they're detected or marked
            </p>
          </div>
        )}

        {!isLoading && isConnected && moments.length > 0 && (
          <>
            {/* Visual Timeline Rail */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
                <span>Start</span>
                <span>{isLive ? "Now" : "End"}</span>
              </div>
              <div
                ref={railRef}
                className="relative h-12 cursor-crosshair rounded-lg bg-surface-elevated"
                onClick={handleRailClick}
              >
                {/* Progress indicator */}
                {isLive && (
                  <div className="absolute right-0 top-0 h-full w-1 animate-pulse bg-red-400/50" />
                )}

                {/* Moment markers */}
                {filteredMoments.map((moment) => {
                  const position = getMomentPosition(moment.timestamp);
                  const config = MOMENT_TYPE_CONFIG[moment.type] || MOMENT_TYPE_CONFIG.custom;
                  const isHovered = hoveredMoment === moment.id;

                  return (
                    <div
                      key={moment.id}
                      className="absolute top-0 -translate-x-1/2 transform"
                      style={{ left: `${position}%` }}
                      onMouseEnter={() => setHoveredMoment(moment.id)}
                      onMouseLeave={() => setHoveredMoment(null)}
                    >
                      {/* Marker line */}
                      <div className={`h-12 w-0.5 ${config.bgColor}`} />

                      {/* Marker dot */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMomentClick(moment);
                        }}
                        className={`absolute -top-1.5 left-1/2 -translate-x-1/2 transform rounded-full p-1 transition-transform ${config.bgColor} ${
                          isHovered ? "scale-125" : ""
                        }`}
                      >
                        {config.icon}
                      </button>

                      {/* Tooltip on hover */}
                      {isHovered && (
                        <div className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-surface-elevated px-2 py-1 text-xs shadow-lg">
                          <p className="font-medium">{moment.label}</p>
                          <p className="text-text-muted">{moment.displayTime}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 text-center text-[10px] text-text-muted">
                Click on the timeline to add a marker
              </p>
            </div>

            {/* Moment list */}
            <div className="space-y-2">
              {filteredMoments.map((moment) => {
                const config = MOMENT_TYPE_CONFIG[moment.type] || MOMENT_TYPE_CONFIG.custom;

                return (
                  <div
                    key={moment.id}
                    className="group flex items-center justify-between rounded-lg border border-stroke bg-surface p-2 transition-colors hover:border-teal/30"
                  >
                    <button
                      type="button"
                      onClick={() => onMomentClick(moment)}
                      className="flex items-center gap-3 text-left"
                    >
                      <div className={`rounded p-1.5 ${config.bgColor}/20`}>
                        <span className={config.color}>{config.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text">{moment.label}</p>
                        <p className="text-xs text-text-muted">
                          {moment.displayTime} - {config.label}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-muted">
                        {formatTimeFromStart(moment.timestamp, sessionStartTime)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300"
                        onClick={() => onMomentDelete(moment.id)}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default MomentRail;

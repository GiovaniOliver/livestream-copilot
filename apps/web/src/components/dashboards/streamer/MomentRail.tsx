"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { MomentMarker } from "./MomentMarker";
import type { MomentRailProps, MomentType, Moment } from "./types";
import { MOMENT_TYPE_CONFIG } from "./types";

// ============================================================
// Icons
// ============================================================

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

// ============================================================
// Timeline Tick Generation
// ============================================================

function generateTimelineTicks(totalDuration: number): number[] {
  const ticks: number[] = [];
  // Generate ticks every 10 minutes (600 seconds)
  const tickInterval = 600;
  for (let i = 0; i <= totalDuration; i += tickInterval) {
    ticks.push(i);
  }
  return ticks;
}

// ============================================================
// MomentRail Component
// ============================================================

export function MomentRail({
  moments,
  totalDuration,
  onMomentClick,
  onMomentHover,
  currentTime = 0,
}: MomentRailProps) {
  const [hoveredMoment, setHoveredMoment] = useState<Moment | null>(null);
  const [activeFilter, setActiveFilter] = useState<MomentType | "all">("all");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const ticks = generateTimelineTicks(totalDuration);

  // Filter moments based on selected type
  const filteredMoments =
    activeFilter === "all"
      ? moments
      : moments.filter((m) => m.type === activeFilter);

  // Count moments by type
  const momentCounts = {
    all: moments.length,
    hype: moments.filter((m) => m.type === "hype").length,
    qa: moments.filter((m) => m.type === "qa").length,
    sponsor: moments.filter((m) => m.type === "sponsor").length,
    clip: moments.filter((m) => m.type === "clip").length,
  };

  // Check scroll position
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", updateScrollButtons);
      window.addEventListener("resize", updateScrollButtons);
      return () => {
        container.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.5;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleMomentHover = (moment: Moment | null) => {
    setHoveredMoment(moment);
    onMomentHover?.(moment);
  };

  // Calculate current time position percentage
  const currentTimePosition = (currentTime / totalDuration) * 100;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-teal" />
          <h2 className="text-lg font-semibold text-text">Moment Rail</h2>
          <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted">
            {moments.length}
          </span>
        </div>
        <span className="text-xs text-text-muted">
          {formatTime(totalDuration)} total
        </span>
      </div>

      {/* Moment Type Filters */}
      <div className="flex flex-wrap gap-2 border-b border-stroke px-4 py-2">
        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            activeFilter === "all"
              ? "bg-teal/10 text-teal"
              : "text-text-muted hover:bg-surface hover:text-text"
          )}
        >
          All ({momentCounts.all})
        </button>

        {(Object.keys(MOMENT_TYPE_CONFIG) as MomentType[]).map((type) => {
          const config = MOMENT_TYPE_CONFIG[type];
          return (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === type
                  ? config.bgColor
                  : "text-text-muted hover:bg-surface hover:text-text"
              )}
              style={{
                color: activeFilter === type ? config.color : undefined,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {config.name} ({momentCounts[type]})
            </button>
          );
        })}
      </div>

      {/* Timeline Container */}
      <div className="relative flex-1 px-4 py-6">
        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-stroke bg-bg-1 p-2 shadow-elevated hover:bg-bg-2"
            aria-label="Scroll left"
          >
            <ChevronLeftIcon className="h-4 w-4 text-text" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-stroke bg-bg-1 p-2 shadow-elevated hover:bg-bg-2"
            aria-label="Scroll right"
          >
            <ChevronRightIcon className="h-4 w-4 text-text" />
          </button>
        )}

        {/* Scrollable Timeline */}
        <div
          ref={scrollContainerRef}
          className="h-full overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-track-bg-0 scrollbar-thumb-stroke"
        >
          <div
            className="relative h-full"
            style={{ minWidth: `${Math.max(800, totalDuration / 6)}px` }}
          >
            {/* Timeline Track */}
            <div className="absolute left-0 right-0 top-16 h-1 rounded-full bg-stroke">
              {/* Progress indicator */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-teal/50"
                style={{ width: `${currentTimePosition}%` }}
              />

              {/* Current Time Marker */}
              <div
                className="absolute top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${currentTimePosition}%` }}
              >
                <div className="flex flex-col items-center">
                  <div className="h-6 w-1 rounded-full bg-teal shadow-glow" />
                  <div className="mt-1 rounded bg-teal px-1.5 py-0.5 text-[10px] font-medium text-bg-0">
                    {formatTime(currentTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Time Ticks */}
            {ticks.map((tick) => {
              const position = (tick / totalDuration) * 100;
              return (
                <div
                  key={tick}
                  className="absolute top-16 -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  <div className="h-3 w-px bg-stroke-subtle" />
                  <div className="mt-1 text-[10px] text-text-dim">
                    {formatTime(tick)}
                  </div>
                </div>
              );
            })}

            {/* Moment Markers */}
            {filteredMoments.map((moment) => {
              const position = (moment.timestamp / totalDuration) * 100;
              return (
                <MomentMarker
                  key={moment.id}
                  moment={moment}
                  position={position}
                  onClick={onMomentClick}
                  onHover={handleMomentHover}
                  isActive={hoveredMoment?.id === moment.id}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 border-t border-stroke px-4 py-2">
        {(Object.keys(MOMENT_TYPE_CONFIG) as MomentType[]).map((type) => {
          const config = MOMENT_TYPE_CONFIG[type];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs text-text-dim">{config.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MomentRail;

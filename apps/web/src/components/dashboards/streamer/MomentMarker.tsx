"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import type { MomentMarkerProps } from "./types";
import { MOMENT_TYPE_CONFIG } from "./types";

// ============================================================
// Moment Type Icons
// ============================================================

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

function HypeIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function QAIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SponsorIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ClipIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

const MOMENT_ICONS = {
  hype: HypeIcon,
  qa: QAIcon,
  sponsor: SponsorIcon,
  clip: ClipIcon,
};

// ============================================================
// MomentMarker Component
// ============================================================

export function MomentMarker({
  moment,
  onClick,
  onHover,
  isActive = false,
  position,
}: MomentMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = MOMENT_TYPE_CONFIG[moment.type];
  const Icon = MOMENT_ICONS[moment.type];

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(moment);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(null);
  };

  const handleClick = () => {
    onClick?.(moment);
  };

  return (
    <div
      className="absolute top-0 z-10 -translate-x-1/2 cursor-pointer"
      style={{ left: `${position}%` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${config.name}: ${moment.label} at ${formatTime(moment.timestamp)}`}
    >
      {/* Marker Pin */}
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
          config.bgColor,
          config.borderColor,
          isActive || isHovered
            ? "scale-125 shadow-lg"
            : "hover:scale-110"
        )}
        style={{
          boxShadow:
            isActive || isHovered
              ? `0 0 12px ${config.color}40`
              : undefined,
        }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: config.color }}
        />
      </div>

      {/* Vertical Line to Timeline */}
      <div
        className={cn(
          "mx-auto h-4 w-0.5 transition-all duration-200",
          isActive || isHovered ? "opacity-100" : "opacity-60"
        )}
        style={{ backgroundColor: config.color }}
      />

      {/* Tooltip on Hover */}
      {isHovered && (
        <div
          className={cn(
            "absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap",
            "rounded-lg border border-stroke bg-bg-1 px-3 py-2 shadow-elevated",
            "animate-fade-in z-20"
          )}
        >
          {/* Arrow */}
          <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-stroke bg-bg-1" />

          {/* Content */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs font-medium text-text">
                {moment.label}
              </span>
            </div>
            <div className="mt-1 text-xs text-text-muted">
              {formatTime(moment.timestamp)}
            </div>
            {moment.description && (
              <div className="mt-1 max-w-48 text-xs text-text-dim">
                {moment.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MomentMarker;

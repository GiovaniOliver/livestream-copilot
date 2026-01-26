"use client";

import { type FC, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ScriptFormatType } from "./types";

// ============================================================================
// Script Formatting Toolbar
// Quick action buttons for common screenplay formatting operations
// ============================================================================

export interface ScriptFormattingToolbarProps {
  formatType?: ScriptFormatType;
  onInsertSlugline?: () => void;
  onInsertActionLine?: () => void;
  onInsertTransition?: () => void;
  onInsertCharacter?: () => void;
  onInsertDialogue?: () => void;
  onInsertParenthetical?: () => void;
  onInsertStageDirection?: () => void;
  onFormatCheck?: () => void;
  disabled?: boolean;
  className?: string;
}

interface ToolbarButton {
  id: string;
  label: string;
  shortLabel: string;
  icon: FC<{ className?: string }>;
  action: keyof ScriptFormattingToolbarProps;
  tooltip: string;
  variant?: "default" | "primary" | "theater";
}

// Icons for toolbar buttons
const SluglineIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ActionLineIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

const TransitionIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const CharacterIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const DialogueIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ParentheticalIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const StageDirectionIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const FormatCheckIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  {
    id: "slugline",
    label: "Insert Slugline",
    shortLabel: "Slugline",
    icon: SluglineIcon,
    action: "onInsertSlugline",
    tooltip: "INT./EXT. LOCATION - TIME",
    variant: "primary",
  },
  {
    id: "action",
    label: "Insert Action Line",
    shortLabel: "Action",
    icon: ActionLineIcon,
    action: "onInsertActionLine",
    tooltip: "Visual description of action",
  },
  {
    id: "transition",
    label: "Insert Transition",
    shortLabel: "Transition",
    icon: TransitionIcon,
    action: "onInsertTransition",
    tooltip: "CUT TO, FADE, DISSOLVE",
  },
  {
    id: "character",
    label: "Insert Character",
    shortLabel: "Character",
    icon: CharacterIcon,
    action: "onInsertCharacter",
    tooltip: "Character name (centered)",
  },
  {
    id: "dialogue",
    label: "Insert Dialogue",
    shortLabel: "Dialogue",
    icon: DialogueIcon,
    action: "onInsertDialogue",
    tooltip: "Character dialogue",
  },
  {
    id: "parenthetical",
    label: "Insert Parenthetical",
    shortLabel: "Wrylies",
    icon: ParentheticalIcon,
    action: "onInsertParenthetical",
    tooltip: "Acting direction (beat)",
  },
];

const THEATER_BUTTONS: ToolbarButton[] = [
  {
    id: "stage-direction",
    label: "Stage Direction",
    shortLabel: "Stage",
    icon: StageDirectionIcon,
    action: "onInsertStageDirection",
    tooltip: "Blocking and movement notes",
    variant: "theater",
  },
];

const ScriptFormattingToolbar: FC<ScriptFormattingToolbarProps> = ({
  formatType = "film",
  onInsertSlugline,
  onInsertActionLine,
  onInsertTransition,
  onInsertCharacter,
  onInsertDialogue,
  onInsertParenthetical,
  onInsertStageDirection,
  onFormatCheck,
  disabled = false,
  className,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const isTheater = formatType === "theater_3act" || formatType === "theater_5act";

  const handlers: Record<string, (() => void) | undefined> = {
    onInsertSlugline,
    onInsertActionLine,
    onInsertTransition,
    onInsertCharacter,
    onInsertDialogue,
    onInsertParenthetical,
    onInsertStageDirection,
    onFormatCheck,
  };

  const handleButtonClick = useCallback(
    (action: keyof ScriptFormattingToolbarProps) => {
      const handler = handlers[action];
      if (handler) {
        handler();
      }
    },
    [handlers]
  );

  const allButtons = isTheater
    ? [...TOOLBAR_BUTTONS, ...THEATER_BUTTONS]
    : TOOLBAR_BUTTONS;

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-3 py-2",
        "bg-bg-1 border-b border-stroke",
        className
      )}
    >
      {/* Primary actions group */}
      <div className="flex items-center gap-1">
        {allButtons.slice(0, 3).map((button) => {
          const IconComponent = button.icon;
          const isPrimary = button.variant === "primary";
          const isTheaterButton = button.variant === "theater";

          return (
            <div key={button.id} className="relative">
              <button
                onClick={() => handleButtonClick(button.action)}
                onMouseEnter={() => setActiveTooltip(button.id)}
                onMouseLeave={() => setActiveTooltip(null)}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                  "text-xs font-medium transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-teal/50",
                  isPrimary
                    ? "bg-teal/10 text-teal border border-teal/30 hover:bg-teal/20"
                    : isTheaterButton
                      ? "bg-purple/10 text-purple border border-purple/30 hover:bg-purple/20"
                      : "bg-surface text-text-muted border border-transparent hover:text-text hover:bg-surface-hover",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{button.shortLabel}</span>
              </button>

              {/* Tooltip */}
              {activeTooltip === button.id && (
                <div
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50",
                    "px-2 py-1 rounded-md bg-bg-2 border border-stroke shadow-elevated",
                    "text-xs text-text-muted whitespace-nowrap"
                  )}
                >
                  {button.tooltip}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rotate-45 bg-bg-2 border-l border-t border-stroke" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-stroke mx-1" />

      {/* Secondary actions */}
      <div className="flex items-center gap-1">
        {allButtons.slice(3).map((button) => {
          const IconComponent = button.icon;
          const isTheaterButton = button.variant === "theater";

          return (
            <div key={button.id} className="relative">
              <button
                onClick={() => handleButtonClick(button.action)}
                onMouseEnter={() => setActiveTooltip(button.id)}
                onMouseLeave={() => setActiveTooltip(null)}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                  "text-xs font-medium transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-teal/50",
                  isTheaterButton
                    ? "bg-purple/10 text-purple border border-purple/30 hover:bg-purple/20"
                    : "bg-surface text-text-muted border border-transparent hover:text-text hover:bg-surface-hover",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden md:inline">{button.shortLabel}</span>
              </button>

              {/* Tooltip */}
              {activeTooltip === button.id && (
                <div
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50",
                    "px-2 py-1 rounded-md bg-bg-2 border border-stroke shadow-elevated",
                    "text-xs text-text-muted whitespace-nowrap"
                  )}
                >
                  {button.tooltip}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rotate-45 bg-bg-2 border-l border-t border-stroke" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Format check button */}
      <div className="relative">
        <button
          onClick={() => onFormatCheck?.()}
          onMouseEnter={() => setActiveTooltip("format-check")}
          onMouseLeave={() => setActiveTooltip(null)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
            "text-xs font-medium transition-all duration-150",
            "bg-surface text-text-muted border border-transparent",
            "hover:text-success hover:bg-success/10 hover:border-success/30",
            "focus:outline-none focus:ring-2 focus:ring-success/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <FormatCheckIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Check Format</span>
        </button>

        {/* Tooltip */}
        {activeTooltip === "format-check" && (
          <div
            className={cn(
              "absolute right-0 top-full mt-2 z-50",
              "px-2 py-1 rounded-md bg-bg-2 border border-stroke shadow-elevated",
              "text-xs text-text-muted whitespace-nowrap"
            )}
          >
            Verify industry format compliance
          </div>
        )}
      </div>

      {/* Format type indicator */}
      <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-stroke ml-2">
        <span className="text-[10px] text-text-dim uppercase tracking-wide">Format</span>
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-medium",
            isTheater ? "bg-purple/10 text-purple" : "bg-teal/10 text-teal"
          )}
        >
          {formatType === "film" && "Feature Film"}
          {formatType === "tv_hour" && "TV (1hr)"}
          {formatType === "tv_half" && "TV (30m)"}
          {formatType === "theater_3act" && "Theater (3-Act)"}
          {formatType === "theater_5act" && "Theater (5-Act)"}
        </span>
      </div>
    </div>
  );
};

export { ScriptFormattingToolbar };

"use client";

import { useState } from "react";
import type { AgentAction, ActionStatus, TokenEstimate } from "./types";
import { TOKEN_ESTIMATE_RANGES } from "./types";
import { cn } from "@/lib/utils";

// ============================================================
// Icons
// ============================================================

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

function HashtagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function ListBulletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
    </svg>
  );
}

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function DocumentTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ListChecksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ============================================================
// Icon Mapping
// ============================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: SparklesIcon,
  film: FilmIcon,
  share: ShareIcon,
  hash: HashtagIcon,
  star: StarIcon,
  zap: BoltIcon,
  "trending-up": TrendingUpIcon,
  list: ListBulletIcon,
  megaphone: MegaphoneIcon,
  image: PhotoIcon,
  "file-text": DocumentTextIcon,
  "list-checks": ListChecksIcon,
  bookmark: BookmarkIcon,
};

// ============================================================
// Props
// ============================================================

interface ActionButtonProps {
  action: AgentAction;
  status?: ActionStatus | null;
  progress?: number;
  isOnCooldown?: boolean;
  cooldownRemaining?: number;
  isAutoTriggerEnabled?: boolean;
  onExecute: () => void;
  onToggleAutoTrigger?: () => void;
  variant?: "default" | "compact" | "inline";
  showTokenEstimate?: boolean;
  disabled?: boolean;
}

// ============================================================
// Token Estimate Badge
// ============================================================

function TokenEstimateBadge({ estimate }: { estimate: TokenEstimate }) {
  const colors: Record<TokenEstimate, string> = {
    low: "bg-success/10 text-success border-success/30",
    medium: "bg-warning/10 text-warning border-warning/30",
    high: "bg-error/10 text-error border-error/30",
  };

  return (
    <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", colors[estimate])}>
      {TOKEN_ESTIMATE_RANGES[estimate].label}
    </span>
  );
}

// ============================================================
// ActionButton Component
// ============================================================

export function ActionButton({
  action,
  status,
  progress,
  isOnCooldown,
  cooldownRemaining,
  isAutoTriggerEnabled,
  onExecute,
  onToggleAutoTrigger,
  variant = "default",
  showTokenEstimate = true,
  disabled = false,
}: ActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = ICON_MAP[action.icon] || SparklesIcon;

  const isProcessing = status === "processing";
  const isDisabled = disabled || isProcessing || isOnCooldown;

  const formatCooldown = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  // Compact variant for inline display
  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onExecute}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all",
          "border border-stroke bg-surface",
          isDisabled
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-surface-hover hover:border-teal/30"
        )}
        title={action.description}
      >
        {isProcessing ? (
          <LoadingSpinner className="h-3 w-3" />
        ) : (
          <IconComponent className="h-3 w-3" />
        )}
        <span className="hidden sm:inline">{action.label}</span>
      </button>
    );
  }

  // Inline variant for action result areas
  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onExecute}
        disabled={isDisabled}
        className={cn(
          "flex items-center gap-1 text-xs font-medium transition-colors",
          isDisabled
            ? "cursor-not-allowed text-text-dim"
            : "text-teal hover:text-teal-400"
        )}
        title={action.description}
      >
        {isProcessing ? (
          <LoadingSpinner className="h-3 w-3" />
        ) : (
          <IconComponent className="h-3 w-3" />
        )}
        {action.label}
      </button>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-all",
        isDisabled
          ? "border-stroke bg-surface/50"
          : "border-stroke bg-surface hover:border-teal/30 hover:bg-surface-hover"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onExecute}
        disabled={isDisabled}
        className="flex w-full items-start gap-3 p-3"
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
            isDisabled ? "bg-bg-2" : "bg-teal/10"
          )}
        >
          {isProcessing ? (
            <LoadingSpinner className="h-4 w-4 text-teal" />
          ) : (
            <IconComponent className={cn("h-4 w-4", isDisabled ? "text-text-dim" : "text-teal")} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <h4 className={cn("text-sm font-medium", isDisabled ? "text-text-muted" : "text-text")}>
              {action.label}
            </h4>
            {showTokenEstimate && <TokenEstimateBadge estimate={action.estimatedTokens} />}
            {action.triggerType !== "manual" && (
              <span className="rounded-full bg-purple/10 px-1.5 py-0.5 text-[10px] font-medium text-purple border border-purple/30">
                Auto
              </span>
            )}
          </div>
          <p className={cn("mt-0.5 text-xs line-clamp-2", isDisabled ? "text-text-dim" : "text-text-muted")}>
            {action.description}
          </p>

          {/* Progress bar */}
          {isProcessing && progress !== undefined && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-bg-2">
              <div
                className="h-full bg-teal transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Cooldown indicator */}
          {isOnCooldown && cooldownRemaining && (
            <p className="mt-1 text-xs text-warning">
              Cooldown: {formatCooldown(cooldownRemaining)}
            </p>
          )}
        </div>
      </button>

      {/* Auto-trigger toggle */}
      {action.triggerType !== "manual" && onToggleAutoTrigger && (
        <div
          className={cn(
            "absolute right-2 top-2 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAutoTrigger();
            }}
            className={cn(
              "rounded-lg px-2 py-1 text-[10px] font-medium transition-colors",
              isAutoTriggerEnabled
                ? "bg-purple/20 text-purple hover:bg-purple/30"
                : "bg-bg-2 text-text-dim hover:bg-surface hover:text-text-muted"
            )}
          >
            {isAutoTriggerEnabled ? "Auto ON" : "Auto OFF"}
          </button>
        </div>
      )}
    </div>
  );
}

export default ActionButton;

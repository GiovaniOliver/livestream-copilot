"use client";

import { useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  PODCAST_ACTIONS,
  type AgentAction,
  type ActionStatus,
  type ActionResult,
} from "./types";

// Icons for different action types
const ActionIcons: Record<string, ReactNode> = {
  chapters: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  quote: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  notes: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  description: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  ),
  soundbite: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  sponsor: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  action: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  timestamps: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  summary: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
    </svg>
  ),
  promo: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
};

const StatusIndicator = ({ status }: { status: ActionStatus }) => {
  const statusStyles: Record<ActionStatus, { bg: string; text: string; label: string }> = {
    idle: { bg: "bg-text-dim/10", text: "text-text-dim", label: "Idle" },
    queued: { bg: "bg-warning/10", text: "text-warning", label: "Queued" },
    processing: { bg: "bg-teal/10", text: "text-teal", label: "Processing" },
    success: { bg: "bg-success/10", text: "text-success", label: "Success" },
    failed: { bg: "bg-error/10", text: "text-error", label: "Failed" },
    cancelled: { bg: "bg-text-muted/10", text: "text-text-muted", label: "Cancelled" },
    reviewing: { bg: "bg-purple/10", text: "text-purple", label: "Reviewing" },
  };

  const style = statusStyles[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium", style.bg, style.text)}>
      {status === "processing" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {style.label}
    </span>
  );
};

export interface ActionPanelProps {
  actions?: AgentAction[];
  onTriggerAction?: (actionId: string) => void;
  actionStatuses?: Record<string, ActionStatus>;
  actionResults?: ActionResult[];
  autoTriggerEnabled?: Record<string, boolean>;
  onToggleAutoTrigger?: (actionId: string, enabled: boolean) => void;
  hasTranscript?: boolean;
  transcriptLength?: number;
  className?: string;
}

export function ActionPanel({
  actions = PODCAST_ACTIONS,
  onTriggerAction,
  actionStatuses = {},
  actionResults = [],
  autoTriggerEnabled = {},
  onToggleAutoTrigger,
  hasTranscript = false,
  transcriptLength = 0,
  className,
}: ActionPanelProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>("manual");

  const manualActions = actions.filter((a) => a.triggerType === "manual");
  const autoActions = actions.filter((a) => a.triggerType === "auto" || a.triggerType === "both");

  const handleTrigger = useCallback(
    (action: AgentAction) => {
      if (action.requiresTranscript && !hasTranscript) return;
      if (action.minTranscriptLength && transcriptLength < action.minTranscriptLength) return;
      onTriggerAction?.(action.actionId);
    },
    [onTriggerAction, hasTranscript, transcriptLength]
  );

  const isActionDisabled = useCallback(
    (action: AgentAction): boolean => {
      if (action.requiresTranscript && !hasTranscript) return true;
      if (action.minTranscriptLength && transcriptLength < action.minTranscriptLength) return true;
      const status = actionStatuses[action.actionId];
      return status === "processing" || status === "queued";
    },
    [actionStatuses, hasTranscript, transcriptLength]
  );

  const getTokenBadgeColor = (tokens: string): string => {
    switch (tokens) {
      case "low":
        return "text-success bg-success/10";
      case "medium":
        return "text-warning bg-warning/10";
      case "high":
        return "text-error bg-error/10";
      default:
        return "text-text-muted bg-surface";
    }
  };

  const renderActionItem = (action: AgentAction) => {
    const status = actionStatuses[action.actionId] || "idle";
    const isDisabled = isActionDisabled(action);
    const isAuto = action.triggerType === "auto" || action.triggerType === "both";
    const autoEnabled = autoTriggerEnabled[action.actionId] ?? true;

    return (
      <div
        key={action.actionId}
        className={cn(
          "group rounded-xl border border-stroke bg-bg-0 p-3 transition-all",
          isDisabled ? "opacity-50" : "hover:border-teal/30"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-text-muted">
              {ActionIcons[action.icon] || ActionIcons.notes}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text truncate">
                  {action.label}
                </span>
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase", getTokenBadgeColor(action.estimatedTokens))}>
                  {action.estimatedTokens}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-muted line-clamp-1">
                {action.description}
              </p>
              {isAuto && action.autoTriggerCondition && (
                <p className="mt-1 text-[10px] text-text-dim italic">
                  Auto: {action.autoTriggerCondition}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusIndicator status={status} />

            <div className="flex items-center gap-2">
              {isAuto && onToggleAutoTrigger && (
                <button
                  onClick={() => onToggleAutoTrigger(action.actionId, !autoEnabled)}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    autoEnabled ? "bg-teal" : "bg-stroke"
                  )}
                  title={autoEnabled ? "Auto-trigger enabled" : "Auto-trigger disabled"}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                      autoEnabled ? "left-4.5 left-[18px]" : "left-0.5"
                    )}
                  />
                </button>
              )}

              {(action.triggerType === "manual" || action.triggerType === "both") && (
                <button
                  onClick={() => handleTrigger(action)}
                  disabled={isDisabled}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    isDisabled
                      ? "bg-surface text-text-dim cursor-not-allowed"
                      : "bg-teal/10 text-teal hover:bg-teal/20"
                  )}
                >
                  {status === "processing" ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Running
                    </span>
                  ) : (
                    "Run"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("rounded-2xl border border-stroke bg-bg-1 p-4", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-text">AI Actions</h3>
          <p className="text-xs text-text-muted">
            {actions.length} available actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasTranscript && (
            <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-medium text-warning">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              No transcript
            </span>
          )}
        </div>
      </div>

      {/* Manual Actions */}
      <div className="mb-4">
        <button
          onClick={() => setExpandedCategory(expandedCategory === "manual" ? null : "manual")}
          className="flex w-full items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Manual Actions
          </span>
          <svg
            className={cn("h-4 w-4 text-text-muted transition-transform", expandedCategory === "manual" && "rotate-180")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedCategory === "manual" && (
          <div className="mt-2 space-y-2">
            {manualActions.map(renderActionItem)}
          </div>
        )}
      </div>

      {/* Auto Actions */}
      <div>
        <button
          onClick={() => setExpandedCategory(expandedCategory === "auto" ? null : "auto")}
          className="flex w-full items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Auto-Trigger Actions
          </span>
          <svg
            className={cn("h-4 w-4 text-text-muted transition-transform", expandedCategory === "auto" && "rotate-180")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedCategory === "auto" && (
          <div className="mt-2 space-y-2">
            {autoActions.map(renderActionItem)}
          </div>
        )}
      </div>

      {/* Recent Results */}
      {actionResults.length > 0 && (
        <div className="mt-4 border-t border-stroke pt-4">
          <h4 className="mb-2 text-xs font-medium text-text-muted uppercase tracking-wide">
            Recent Results
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {actionResults.slice(0, 5).map((result, index) => (
              <div
                key={`${result.actionId}-${index}`}
                className="flex items-center justify-between rounded-lg bg-surface px-2 py-1.5 text-xs"
              >
                <span className="text-text-muted truncate">
                  {actions.find((a) => a.actionId === result.actionId)?.label || result.actionId}
                </span>
                <StatusIndicator status={result.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

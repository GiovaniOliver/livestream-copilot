"use client";

import { type FC, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type {
  ActionPanelProps,
  AgentAction,
  WritersCornerActionId,
  ActionStatus,
} from "./types";

// ============================================================================
// Writers Corner Action Panel
// AI action triggers for novelist workflow
// ============================================================================

// Action definitions for Writers Corner
export const WRITERS_CORNER_ACTIONS: AgentAction[] = [
  {
    actionId: "writers_corner.summarize_chapter",
    label: "Summarize Chapter",
    description: "Create a summary of the current chapter",
    triggerType: "both",
    inputs: [
      { name: "chapter_transcript", type: "transcript", required: true, description: "Chapter content" },
      { name: "context", type: "context", required: false, description: "Story context" },
    ],
    outputs: ["BEAT"],
    estimatedTokens: "medium",
    icon: "document",
    cooldownMs: 30000,
    requiresTranscript: true,
  },
  {
    actionId: "writers_corner.capture_character_note",
    label: "Capture Character Note",
    description: "Record character development details",
    triggerType: "both",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Relevant passage" },
      { name: "character", type: "user_input", required: true, description: "Character name" },
    ],
    outputs: ["CHARACTER_NOTE", "QUOTE"],
    estimatedTokens: "low",
    icon: "user",
  },
  {
    actionId: "writers_corner.track_plot_thread",
    label: "Track Plot Thread",
    description: "Identify and log plot threads",
    triggerType: "auto",
    autoTriggerCondition: "When plot-related discussion detected",
    inputs: [
      { name: "transcript", type: "transcript", required: true, description: "Story content" },
      { name: "existing_threads", type: "artifact", required: false, description: "Known plot threads" },
    ],
    outputs: ["PLOT_THREAD", "BEAT"],
    estimatedTokens: "medium",
    icon: "thread",
    cooldownMs: 60000,
  },
  {
    actionId: "writers_corner.capture_worldbuilding",
    label: "Capture Worldbuilding",
    description: "Record world/setting details",
    triggerType: "both",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Setting description" },
    ],
    outputs: ["WORLDBUILDING_DETAIL", "BEAT"],
    estimatedTokens: "low",
    icon: "globe",
  },
  {
    actionId: "writers_corner.attribute_dialogue",
    label: "Attribute Dialogue",
    description: "Assign dialogue to characters",
    triggerType: "auto",
    autoTriggerCondition: "When dialogue is being drafted",
    inputs: [
      { name: "dialogue_text", type: "selection", required: true, description: "Dialogue passage" },
      { name: "characters", type: "artifact", required: false, description: "Available characters" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "low",
    icon: "chat",
  },
  {
    actionId: "writers_corner.identify_theme",
    label: "Identify Theme",
    description: "Recognize thematic elements",
    triggerType: "both",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Story content" },
      { name: "context", type: "context", required: false, description: "Story context" },
    ],
    outputs: ["THEME", "BEAT"],
    estimatedTokens: "medium",
    icon: "sparkles",
  },
  {
    actionId: "writers_corner.check_continuity",
    label: "Check Continuity",
    description: "Flag potential continuity issues",
    triggerType: "manual",
    inputs: [
      { name: "current_content", type: "transcript", required: true, description: "Current chapter" },
      { name: "story_bible", type: "artifact", required: true, description: "Story reference" },
    ],
    outputs: ["CONTINUITY_WARNING", "ACTION_ITEM"],
    estimatedTokens: "high",
    icon: "shield",
    cooldownMs: 120000,
  },
  {
    actionId: "writers_corner.generate_character_sheet",
    label: "Generate Character Sheet",
    description: "Create a character profile",
    triggerType: "manual",
    inputs: [
      { name: "character_notes", type: "artifact", required: true, description: "Character notes" },
      { name: "appearances", type: "artifact", required: false, description: "Chapter appearances" },
    ],
    outputs: ["BEAT"],
    estimatedTokens: "medium",
    icon: "user-circle",
  },
  {
    actionId: "writers_corner.track_timeline",
    label: "Track Timeline",
    description: "Monitor story chronology",
    triggerType: "both",
    inputs: [
      { name: "events_list", type: "artifact", required: true, description: "Story events" },
      { name: "dates", type: "context", required: false, description: "Date references" },
    ],
    outputs: ["TIMELINE_EVENT", "BEAT"],
    estimatedTokens: "medium",
    icon: "clock",
  },
  {
    actionId: "writers_corner.suggest_foreshadowing",
    label: "Suggest Foreshadowing",
    description: "Propose foreshadowing opportunities",
    triggerType: "manual",
    inputs: [
      { name: "plot_threads", type: "artifact", required: true, description: "Active plot threads" },
      { name: "current_position", type: "context", required: true, description: "Current chapter" },
    ],
    outputs: ["FORESHADOWING_SUGGESTION", "SCRIPT_INSERT"],
    estimatedTokens: "medium",
    icon: "eye",
  },
  {
    actionId: "writers_corner.log_open_loop",
    label: "Log Open Loop",
    description: "Capture unresolved story elements",
    triggerType: "auto",
    autoTriggerCondition: 'When "need to resolve" or similar phrases detected',
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Story content" },
    ],
    outputs: ["OPEN_LOOP", "ACTION_ITEM"],
    estimatedTokens: "low",
    icon: "loop",
  },
];

// Icon components
const ActionIcons: Record<string, FC<{ className?: string }>> = {
  document: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  user: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  thread: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  globe: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  chat: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
  sparkles: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  shield: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  "user-circle": ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  clock: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  eye: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  loop: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
};

// Status indicator component
const StatusIndicator: FC<{ status: ActionStatus }> = ({ status }) => {
  const statusConfig: Record<ActionStatus, { color: string; label: string; animate?: boolean }> = {
    idle: { color: "bg-text-dim", label: "Ready" },
    queued: { color: "bg-warning", label: "Queued", animate: true },
    processing: { color: "bg-teal", label: "Processing", animate: true },
    success: { color: "bg-success", label: "Complete" },
    failed: { color: "bg-error", label: "Failed" },
    cancelled: { color: "bg-text-muted", label: "Cancelled" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          config.color,
          config.animate && "animate-pulse"
        )}
      />
      <span className="text-[10px] text-text-dim uppercase tracking-wide">
        {config.label}
      </span>
    </div>
  );
};

// Token estimate badge
const TokenBadge: FC<{ level: "low" | "medium" | "high" }> = ({ level }) => {
  const config = {
    low: { label: "~200 tokens", color: "text-success" },
    medium: { label: "~500 tokens", color: "text-warning" },
    high: { label: "~1500 tokens", color: "text-error" },
  };

  return (
    <span className={cn("text-[10px] font-mono", config[level].color)}>
      {config[level].label}
    </span>
  );
};

// Action button component
const ActionButton: FC<{
  action: AgentAction;
  status?: ActionStatus;
  onTrigger: () => void;
  onCancel: () => void;
  disabled?: boolean;
}> = ({ action, status = "idle", onTrigger, onCancel, disabled }) => {
  const IconComponent = ActionIcons[action.icon] || ActionIcons.document;
  const isProcessing = status === "processing" || status === "queued";
  const canTrigger = !isProcessing && !disabled;

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-3",
        "bg-bg-1 border-stroke",
        "transition-all duration-200",
        canTrigger && "hover:border-teal/50 hover:bg-bg-2 cursor-pointer",
        isProcessing && "border-teal/30 bg-teal/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => canTrigger && onTrigger()}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "shrink-0 flex items-center justify-center w-8 h-8 rounded-lg",
            "transition-colors duration-200",
            isProcessing ? "bg-teal/20 text-teal" : "bg-surface text-text-muted group-hover:text-teal group-hover:bg-teal/10"
          )}
        >
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-text truncate">
              {action.label}
            </h4>
            <StatusIndicator status={status} />
          </div>
          <p className="text-xs text-text-muted line-clamp-2 mb-2">
            {action.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Trigger type badge */}
              <span
                className={cn(
                  "px-1.5 py-0.5 text-[10px] rounded",
                  action.triggerType === "auto"
                    ? "bg-purple/10 text-purple"
                    : action.triggerType === "both"
                      ? "bg-teal/10 text-teal"
                      : "bg-surface text-text-muted"
                )}
              >
                {action.triggerType === "auto" ? "Auto" : action.triggerType === "both" ? "Auto/Manual" : "Manual"}
              </span>
              <TokenBadge level={action.estimatedTokens} />
            </div>

            {/* Cancel button for processing actions */}
            {isProcessing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                className={cn(
                  "px-2 py-1 text-[10px] rounded-md",
                  "bg-error/10 text-error border border-error/30",
                  "hover:bg-error/20 transition-colors"
                )}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal/20">
            <div className="h-full bg-teal animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}
    </div>
  );
};

// Main ActionPanel component
const ActionPanel: FC<ActionPanelProps> = ({
  actions = WRITERS_CORNER_ACTIONS,
  actionStates = {},
  onTriggerAction,
  onCancelAction,
  isTranscriptAvailable = false,
}) => {
  const [filter, setFilter] = useState<"all" | "manual" | "auto">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredActions = useMemo(() => {
    let result = [...actions];

    // Filter by trigger type
    if (filter !== "all") {
      result = result.filter((a) => a.triggerType === filter || a.triggerType === "both");
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.label.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [actions, filter, searchQuery]);

  const processingCount = Object.values(actionStates).filter(
    (s) => s.status === "processing" || s.status === "queued"
  ).length;

  return (
    <div className="h-full flex flex-col bg-bg-0">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-stroke">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface transition-colors"
            >
              <svg
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isExpanded && "rotate-90"
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <svg
              className="w-4 h-4 text-teal"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="text-sm font-semibold text-text">AI Actions</h3>
          </div>
          <div className="flex items-center gap-2">
            {processingCount > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-teal/10 text-teal border border-teal/30">
                {processingCount} running
              </span>
            )}
            {!isTranscriptAvailable && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-warning/10 text-warning border border-warning/30">
                No transcript
              </span>
            )}
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search actions..."
                className={cn(
                  "w-full px-3 py-2 pl-9 text-sm rounded-lg",
                  "bg-surface border border-stroke text-text",
                  "placeholder:text-text-dim",
                  "focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal"
                )}
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2">
              {(["all", "manual", "auto"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md transition-colors duration-150",
                    filter === f
                      ? "bg-teal/10 text-teal border border-teal/30"
                      : "bg-surface text-text-muted hover:text-text hover:bg-surface-hover"
                  )}
                >
                  {f === "all" ? "All" : f === "manual" ? "Manual" : "Auto"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions list */}
      {isExpanded && (
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {filteredActions.map((action) => (
            <ActionButton
              key={action.actionId}
              action={action}
              status={actionStates[action.actionId]?.status}
              onTrigger={() => onTriggerAction(action.actionId)}
              onCancel={() => onCancelAction(action.actionId)}
              disabled={action.requiresTranscript && !isTranscriptAvailable}
            />
          ))}

          {filteredActions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8">
              <svg
                className="w-12 h-12 text-text-dim mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <p className="text-sm text-text-muted">No actions match your filter</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 px-4 py-2 border-t border-stroke bg-bg-1">
        <div className="flex items-center justify-between text-xs text-text-dim">
          <span>{filteredActions.length} actions</span>
          <span>Tokens: ~{filteredActions.reduce((acc, a) => acc + (a.estimatedTokens === "low" ? 200 : a.estimatedTokens === "medium" ? 500 : 1500), 0)}</span>
        </div>
      </div>
    </div>
  );
};

export { ActionPanel };

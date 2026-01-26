"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

// =============================================================================
// Types
// =============================================================================

export type AIActionId =
  | "extract_claim"
  | "link_evidence"
  | "detect_rebuttal"
  | "analyze_argument_strength"
  | "detect_fallacy"
  | "generate_counter_argument"
  | "track_speaking_time"
  | "generate_closing_summary"
  | "score_round";

export type AIActionStatus = "idle" | "queued" | "processing" | "success" | "failed";

export interface AIAction {
  id: AIActionId;
  label: string;
  description: string;
  icon: React.ReactNode;
  triggerType: "manual" | "auto" | "both";
  category: "analysis" | "generation" | "tracking" | "scoring";
  estimatedTokens: "low" | "medium" | "high";
  cooldownMs?: number;
  status?: AIActionStatus;
  lastRunAt?: string;
}

export interface AIActionPanelProps {
  onTriggerAction: (actionId: AIActionId) => void;
  actionStatuses?: Partial<Record<AIActionId, AIActionStatus>>;
  autoTriggerEnabled?: boolean;
  onToggleAutoTrigger?: (enabled: boolean) => void;
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const ExtractClaimIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const LinkEvidenceIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const DetectRebuttalIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

const AnalyzeStrengthIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const DetectFallacyIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const GenerateCounterIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const TrackTimeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const GenerateSummaryIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
  </svg>
);

const ScoreRoundIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

// =============================================================================
// Action Definitions
// =============================================================================

const AI_ACTIONS: AIAction[] = [
  {
    id: "extract_claim",
    label: "Extract Claim",
    description: "Pull assertions from current speech",
    icon: <ExtractClaimIcon />,
    triggerType: "auto",
    category: "analysis",
    estimatedTokens: "low",
    cooldownMs: 15000,
  },
  {
    id: "link_evidence",
    label: "Link Evidence",
    description: "Connect evidence to claims",
    icon: <LinkEvidenceIcon />,
    triggerType: "manual",
    category: "analysis",
    estimatedTokens: "medium",
  },
  {
    id: "detect_rebuttal",
    label: "Detect Rebuttal",
    description: "Identify counter-arguments",
    icon: <DetectRebuttalIcon />,
    triggerType: "auto",
    category: "analysis",
    estimatedTokens: "medium",
    cooldownMs: 30000,
  },
  {
    id: "analyze_argument_strength",
    label: "Analyze Strength",
    description: "Rate argument quality",
    icon: <AnalyzeStrengthIcon />,
    triggerType: "both",
    category: "scoring",
    estimatedTokens: "medium",
  },
  {
    id: "detect_fallacy",
    label: "Detect Fallacy",
    description: "Flag logical fallacies",
    icon: <DetectFallacyIcon />,
    triggerType: "auto",
    category: "analysis",
    estimatedTokens: "medium",
    cooldownMs: 30000,
  },
  {
    id: "generate_counter_argument",
    label: "Generate Counter",
    description: "Suggest rebuttals",
    icon: <GenerateCounterIcon />,
    triggerType: "manual",
    category: "generation",
    estimatedTokens: "high",
  },
  {
    id: "track_speaking_time",
    label: "Track Time",
    description: "Monitor time per side",
    icon: <TrackTimeIcon />,
    triggerType: "auto",
    category: "tracking",
    estimatedTokens: "low",
    cooldownMs: 5000,
  },
  {
    id: "generate_closing_summary",
    label: "Closing Summary",
    description: "Create debate summary",
    icon: <GenerateSummaryIcon />,
    triggerType: "manual",
    category: "generation",
    estimatedTokens: "high",
  },
  {
    id: "score_round",
    label: "Score Round",
    description: "Evaluate round performance",
    icon: <ScoreRoundIcon />,
    triggerType: "manual",
    category: "scoring",
    estimatedTokens: "high",
  },
];

// =============================================================================
// Status Indicator Component
// =============================================================================

function StatusIndicator({ status }: { status: AIActionStatus }) {
  if (status === "idle") return null;

  const statusConfig = {
    queued: { color: "bg-warning", label: "Queued" },
    processing: { color: "bg-teal animate-pulse", label: "Running" },
    success: { color: "bg-success", label: "Done" },
    failed: { color: "bg-error", label: "Failed" },
  };

  const config = statusConfig[status];

  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-1.5 w-1.5 rounded-full", config.color)} />
      <span className="text-[10px] text-text-dim">{config.label}</span>
    </span>
  );
}

// =============================================================================
// Token Badge Component
// =============================================================================

function TokenBadge({ level }: { level: "low" | "medium" | "high" }) {
  const colors = {
    low: "bg-success/10 text-success",
    medium: "bg-warning/10 text-warning",
    high: "bg-error/10 text-error",
  };

  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium uppercase", colors[level])}>
      {level}
    </span>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AIActionPanel({
  onTriggerAction,
  actionStatuses = {},
  autoTriggerEnabled = true,
  onToggleAutoTrigger,
  className,
}: AIActionPanelProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | AIAction["category"]>("all");
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter actions by category
  const filteredActions = useMemo(() => {
    if (activeCategory === "all") return AI_ACTIONS;
    return AI_ACTIONS.filter((action) => action.category === activeCategory);
  }, [activeCategory]);

  // Group actions by category for display
  const groupedActions = useMemo(() => {
    const groups: Record<string, AIAction[]> = {};
    filteredActions.forEach((action) => {
      if (!groups[action.category]) {
        groups[action.category] = [];
      }
      groups[action.category].push(action);
    });
    return groups;
  }, [filteredActions]);

  const handleTriggerAction = useCallback(
    (actionId: AIActionId) => {
      onTriggerAction(actionId);
    },
    [onTriggerAction]
  );

  const categories: { id: "all" | AIAction["category"]; label: string }[] = [
    { id: "all", label: "All" },
    { id: "analysis", label: "Analysis" },
    { id: "generation", label: "Generate" },
    { id: "scoring", label: "Scoring" },
    { id: "tracking", label: "Tracking" },
  ];

  const categoryLabels: Record<AIAction["category"], string> = {
    analysis: "Analysis Actions",
    generation: "Generation Actions",
    scoring: "Scoring Actions",
    tracking: "Tracking Actions",
  };

  return (
    <div className={cn("flex flex-col rounded-xl border border-stroke bg-bg-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
            <SparklesIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">AI Actions</h3>
            <p className="text-xs text-text-muted">Debate analysis tools</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-trigger toggle */}
          <button
            onClick={() => onToggleAutoTrigger?.(!autoTriggerEnabled)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
              autoTriggerEnabled
                ? "bg-teal/10 text-teal"
                : "bg-surface text-text-muted hover:bg-surface-hover"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                autoTriggerEnabled ? "bg-teal animate-pulse" : "bg-text-dim"
              )}
            />
            Auto
          </button>
          {/* Collapse/Expand toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              className={cn("h-4 w-4 transition-transform", !isExpanded && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Category Filter */}
          <div className="flex gap-1 border-b border-stroke/50 px-4 py-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  activeCategory === category.id
                    ? "bg-teal/20 text-teal"
                    : "text-text-muted hover:bg-surface hover:text-text"
                )}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Actions Grid */}
          <div className="max-h-[400px] overflow-auto p-4">
            {activeCategory === "all" ? (
              // Show grouped by category
              <div className="space-y-4">
                {Object.entries(groupedActions).map(([category, actions]) => (
                  <div key={category}>
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-dim">
                      {categoryLabels[category as AIAction["category"]]}
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {actions.map((action) => (
                        <ActionButton
                          key={action.id}
                          action={action}
                          status={actionStatuses[action.id] || "idle"}
                          onTrigger={handleTriggerAction}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Show flat list
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filteredActions.map((action) => (
                  <ActionButton
                    key={action.id}
                    action={action}
                    status={actionStatuses[action.id] || "idle"}
                    onTrigger={handleTriggerAction}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Action Button Component
// =============================================================================

interface ActionButtonProps {
  action: AIAction;
  status: AIActionStatus;
  onTrigger: (actionId: AIActionId) => void;
}

function ActionButton({ action, status, onTrigger }: ActionButtonProps) {
  const isProcessing = status === "processing" || status === "queued";

  return (
    <button
      onClick={() => onTrigger(action.id)}
      disabled={isProcessing}
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-stroke bg-surface p-3 text-left transition-all",
        "hover:border-teal/30 hover:bg-surface-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0",
        "disabled:pointer-events-none disabled:opacity-60",
        isProcessing && "border-teal/30 bg-teal/5"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
          "bg-bg-2 text-text-muted group-hover:bg-teal/10 group-hover:text-teal",
          isProcessing && "bg-teal/10 text-teal"
        )}
      >
        {isProcessing ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          action.icon
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-text">{action.label}</span>
          <TokenBadge level={action.estimatedTokens} />
        </div>
        <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{action.description}</p>
        <div className="mt-1 flex items-center gap-2">
          {action.triggerType === "auto" && (
            <span className="rounded bg-purple/10 px-1.5 py-0.5 text-[9px] font-medium text-purple">
              AUTO
            </span>
          )}
          {action.triggerType === "both" && (
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">
              BOTH
            </span>
          )}
          <StatusIndicator status={status} />
        </div>
      </div>
    </button>
  );
}

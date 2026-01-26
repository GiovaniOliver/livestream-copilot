"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

// =============================================================================
// Types
// =============================================================================

export type FallacyType =
  | "ad_hominem"
  | "straw_man"
  | "false_dilemma"
  | "slippery_slope"
  | "appeal_to_authority"
  | "appeal_to_emotion"
  | "circular_reasoning"
  | "hasty_generalization"
  | "red_herring"
  | "tu_quoque"
  | "false_cause"
  | "bandwagon";

export interface DetectedFallacy {
  id: string;
  type: FallacyType;
  claimId: string;
  speakerName: string;
  speakerColor: string;
  excerpt: string;
  explanation: string;
  confidence: number;
  timestamp: string;
  dismissed?: boolean;
}

export interface FallacyIndicatorProps {
  fallacies: DetectedFallacy[];
  onDismiss?: (fallacyId: string) => void;
  onViewClaim?: (claimId: string) => void;
  className?: string;
}

// =============================================================================
// Fallacy Definitions
// =============================================================================

const fallacyInfo: Record<FallacyType, { label: string; shortDesc: string; color: string }> = {
  ad_hominem: {
    label: "Ad Hominem",
    shortDesc: "Attack on the person rather than their argument",
    color: "text-error",
  },
  straw_man: {
    label: "Straw Man",
    shortDesc: "Misrepresenting someone's argument to make it easier to attack",
    color: "text-error",
  },
  false_dilemma: {
    label: "False Dilemma",
    shortDesc: "Presenting only two options when more exist",
    color: "text-warning",
  },
  slippery_slope: {
    label: "Slippery Slope",
    shortDesc: "Claiming one event will lead to extreme consequences",
    color: "text-warning",
  },
  appeal_to_authority: {
    label: "Appeal to Authority",
    shortDesc: "Using an authority figure as evidence without proper justification",
    color: "text-purple",
  },
  appeal_to_emotion: {
    label: "Appeal to Emotion",
    shortDesc: "Using emotional manipulation instead of logic",
    color: "text-warning",
  },
  circular_reasoning: {
    label: "Circular Reasoning",
    shortDesc: "The conclusion is used as a premise",
    color: "text-error",
  },
  hasty_generalization: {
    label: "Hasty Generalization",
    shortDesc: "Drawing broad conclusions from limited examples",
    color: "text-warning",
  },
  red_herring: {
    label: "Red Herring",
    shortDesc: "Introducing irrelevant information to distract",
    color: "text-purple",
  },
  tu_quoque: {
    label: "Tu Quoque",
    shortDesc: "'You too' - deflecting criticism by pointing to others",
    color: "text-warning",
  },
  false_cause: {
    label: "False Cause",
    shortDesc: "Incorrectly attributing causation",
    color: "text-error",
  },
  bandwagon: {
    label: "Bandwagon",
    shortDesc: "Arguing something is true because many believe it",
    color: "text-purple",
  },
};

// =============================================================================
// Icons
// =============================================================================

const WarningIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

const DismissIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

export function FallacyIndicator({
  fallacies,
  onDismiss,
  onViewClaim,
  className,
}: FallacyIndicatorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium">("all");

  // Filter out dismissed and apply confidence filter
  const activeFallacies = useMemo(() => {
    return fallacies
      .filter((f) => !f.dismissed)
      .filter((f) => {
        if (filter === "all") return true;
        if (filter === "high") return f.confidence >= 0.8;
        if (filter === "medium") return f.confidence >= 0.6 && f.confidence < 0.8;
        return true;
      })
      .sort((a, b) => b.confidence - a.confidence);
  }, [fallacies, filter]);

  // Count by severity
  const counts = useMemo(() => {
    const active = fallacies.filter((f) => !f.dismissed);
    return {
      total: active.length,
      high: active.filter((f) => f.confidence >= 0.8).length,
      medium: active.filter((f) => f.confidence >= 0.6 && f.confidence < 0.8).length,
    };
  }, [fallacies]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (fallacies.length === 0) {
    return (
      <div className={cn("rounded-xl border border-stroke bg-bg-1 p-4", className)}>
        <div className="flex items-center gap-3 text-text-muted">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
            <WarningIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-text">No Fallacies Detected</p>
            <p className="text-xs text-text-dim">Arguments are logically sound so far</p>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10 text-error">
            <WarningIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Fallacy Detection</h3>
            <p className="text-xs text-text-muted">{counts.total} issues found</p>
          </div>
        </div>

        {/* Severity badges */}
        <div className="flex items-center gap-2">
          {counts.high > 0 && (
            <Badge variant="error" className="text-[10px]">
              {counts.high} High
            </Badge>
          )}
          {counts.medium > 0 && (
            <Badge variant="warning" className="text-[10px]">
              {counts.medium} Medium
            </Badge>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 border-b border-stroke/50 px-4 py-2">
        {[
          { id: "all" as const, label: "All" },
          { id: "high" as const, label: "High Confidence" },
          { id: "medium" as const, label: "Medium" },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              filter === option.id
                ? "bg-error/20 text-error"
                : "text-text-muted hover:bg-surface hover:text-text"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Fallacy List */}
      <div className="max-h-[350px] overflow-auto p-3">
        <div className="space-y-2">
          {activeFallacies.map((fallacy) => {
            const info = fallacyInfo[fallacy.type];
            const isExpanded = expandedId === fallacy.id;
            const confidencePercent = Math.round(fallacy.confidence * 100);

            return (
              <div
                key={fallacy.id}
                className={cn(
                  "rounded-xl border transition-all",
                  fallacy.confidence >= 0.8
                    ? "border-error/30 bg-error/5"
                    : "border-warning/30 bg-warning/5"
                )}
              >
                {/* Collapsed View */}
                <button
                  onClick={() => toggleExpand(fallacy.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  {/* Confidence indicator */}
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      fallacy.confidence >= 0.8
                        ? "bg-error/20 text-error"
                        : "bg-warning/20 text-warning"
                    )}
                  >
                    {confidencePercent}%
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", info.color)}>{info.label}</span>
                      <span className="text-xs text-text-dim">by</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: fallacy.speakerColor }}
                        />
                        <span className="text-xs text-text-muted">{fallacy.speakerName}</span>
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted line-clamp-1">
                      "{fallacy.excerpt}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-dim">{fallacy.timestamp}</span>
                    <ChevronDownIcon />
                  </div>
                </button>

                {/* Expanded View */}
                {isExpanded && (
                  <div className="border-t border-stroke/30 px-3 pb-3 pt-2">
                    {/* Explanation */}
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-medium text-text-muted">What is this?</p>
                      <p className="text-xs text-text-dim">{info.shortDesc}</p>
                    </div>

                    {/* AI Explanation */}
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-medium text-text-muted">Why it was flagged</p>
                      <p className="text-xs leading-relaxed text-text">{fallacy.explanation}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewClaim?.(fallacy.claimId)}
                        className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                      >
                        <EyeIcon />
                        View Claim
                      </button>
                      <button
                        onClick={() => onDismiss?.(fallacy.id)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-dim transition-colors hover:bg-error/10 hover:text-error"
                      >
                        <DismissIcon />
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {activeFallacies.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-text-muted">No fallacies match the current filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

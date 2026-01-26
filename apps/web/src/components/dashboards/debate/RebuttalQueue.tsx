"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Speaker } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface QueuedRebuttal {
  id: string;
  targetClaimId: string;
  targetClaimExcerpt: string;
  targetSpeaker: Speaker;
  suggestedBy: "ai" | "manual";
  content: string;
  strengthEstimate: number;
  priority: "high" | "medium" | "low";
  status: "pending" | "delivered" | "dismissed";
  suggestedAt: string;
  relatedEvidence?: string[];
}

export interface RebuttalQueueProps {
  rebuttals: QueuedRebuttal[];
  onDeliver?: (rebuttalId: string) => void;
  onDismiss?: (rebuttalId: string) => void;
  onViewClaim?: (claimId: string) => void;
  onGenerateCounter?: (claimId: string) => void;
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const RebuttalIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XMarkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
// Helper Functions
// =============================================================================

function getPriorityColor(priority: QueuedRebuttal["priority"]): {
  bg: string;
  text: string;
  border: string;
} {
  switch (priority) {
    case "high":
      return { bg: "bg-error/10", text: "text-error", border: "border-error/30" };
    case "medium":
      return { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" };
    case "low":
      return { bg: "bg-purple/10", text: "text-purple", border: "border-purple/30" };
  }
}

function getStrengthLabel(strength: number): { label: string; color: string } {
  if (strength >= 80) return { label: "Strong", color: "text-success" };
  if (strength >= 60) return { label: "Good", color: "text-teal" };
  if (strength >= 40) return { label: "Moderate", color: "text-warning" };
  return { label: "Weak", color: "text-error" };
}

// =============================================================================
// Component
// =============================================================================

export function RebuttalQueue({
  rebuttals,
  onDeliver,
  onDismiss,
  onViewClaim,
  onGenerateCounter,
  className,
}: RebuttalQueueProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "ai">("pending");

  // Filter rebuttals
  const filteredRebuttals = useMemo(() => {
    return rebuttals
      .filter((r) => {
        if (filter === "pending") return r.status === "pending";
        if (filter === "ai") return r.suggestedBy === "ai" && r.status === "pending";
        return true;
      })
      .sort((a, b) => {
        // Sort by priority then by time
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.suggestedAt).getTime() - new Date(a.suggestedAt).getTime();
      });
  }, [rebuttals, filter]);

  // Count pending
  const pendingCount = useMemo(() => {
    return rebuttals.filter((r) => r.status === "pending").length;
  }, [rebuttals]);

  const aiCount = useMemo(() => {
    return rebuttals.filter((r) => r.suggestedBy === "ai" && r.status === "pending").length;
  }, [rebuttals]);

  if (rebuttals.length === 0) {
    return (
      <div className={cn("rounded-xl border border-stroke bg-bg-1 p-6", className)}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-text-muted">
            <RebuttalIcon />
          </div>
          <p className="text-sm font-medium text-text">No Rebuttals Queued</p>
          <p className="mt-1 text-xs text-text-dim">
            Counter-arguments will appear here as they are suggested
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-4 gap-1.5"
            onClick={() => onGenerateCounter?.("")}
          >
            <SparklesIcon />
            Generate Counter-Argument
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-stroke bg-bg-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple/10 text-purple">
            <RebuttalIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Rebuttal Queue</h3>
            <p className="text-xs text-text-muted">{pendingCount} pending responses</p>
          </div>
        </div>

        {aiCount > 0 && (
          <Badge variant="purple" className="gap-1 text-[10px]">
            <SparklesIcon />
            {aiCount} AI
          </Badge>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1 border-b border-stroke/50 px-4 py-2">
        {[
          { id: "pending" as const, label: `Pending (${pendingCount})` },
          { id: "ai" as const, label: `AI Suggested (${aiCount})` },
          { id: "all" as const, label: "All" },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              filter === option.id
                ? "bg-purple/20 text-purple"
                : "text-text-muted hover:bg-surface hover:text-text"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Queue List */}
      <div className="max-h-[400px] overflow-auto p-3">
        <div className="space-y-2">
          {filteredRebuttals.map((rebuttal) => {
            const priorityColors = getPriorityColor(rebuttal.priority);
            const strengthInfo = getStrengthLabel(rebuttal.strengthEstimate);

            return (
              <div
                key={rebuttal.id}
                className={cn(
                  "rounded-xl border p-3 transition-all",
                  rebuttal.status === "pending"
                    ? priorityColors.border
                    : "border-stroke/30 opacity-60",
                  rebuttal.status === "pending" ? priorityColors.bg : "bg-surface/30"
                )}
              >
                {/* Header */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        rebuttal.priority === "high"
                          ? "error"
                          : rebuttal.priority === "medium"
                          ? "warning"
                          : "purple"
                      }
                      className="text-[10px]"
                    >
                      {rebuttal.priority.toUpperCase()}
                    </Badge>
                    {rebuttal.suggestedBy === "ai" && (
                      <span className="flex items-center gap-1 rounded-full bg-gradient-brand px-2 py-0.5 text-[10px] font-medium text-text">
                        <SparklesIcon />
                        AI
                      </span>
                    )}
                    {rebuttal.status !== "pending" && (
                      <Badge variant={rebuttal.status === "delivered" ? "success" : "default"}>
                        {rebuttal.status}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-text-dim">{rebuttal.suggestedAt}</span>
                </div>

                {/* Target Claim */}
                <div className="mb-2 rounded-lg bg-bg-0/50 p-2">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-[10px] text-text-dim">Responding to:</span>
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: rebuttal.targetSpeaker.color }}
                    />
                    <span className="text-[10px] text-text-muted">
                      {rebuttal.targetSpeaker.name}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-2">
                    "{rebuttal.targetClaimExcerpt}"
                  </p>
                </div>

                {/* Suggested Rebuttal */}
                <div className="mb-3">
                  <p className="text-sm leading-relaxed text-text">{rebuttal.content}</p>
                </div>

                {/* Strength Estimate */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-xs text-text-dim">Estimated Strength:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          rebuttal.strengthEstimate >= 80
                            ? "bg-success"
                            : rebuttal.strengthEstimate >= 60
                            ? "bg-teal"
                            : rebuttal.strengthEstimate >= 40
                            ? "bg-warning"
                            : "bg-error"
                        )}
                        style={{ width: `${rebuttal.strengthEstimate}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-medium", strengthInfo.color)}>
                      {rebuttal.strengthEstimate}% - {strengthInfo.label}
                    </span>
                  </div>
                </div>

                {/* Related Evidence */}
                {rebuttal.relatedEvidence && rebuttal.relatedEvidence.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[10px] text-text-dim">
                      {rebuttal.relatedEvidence.length} related evidence sources
                    </span>
                  </div>
                )}

                {/* Actions */}
                {rebuttal.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeliver?.(rebuttal.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20"
                    >
                      <CheckIcon />
                      Delivered
                    </button>
                    <button
                      onClick={() => onViewClaim?.(rebuttal.targetClaimId)}
                      className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                    >
                      <EyeIcon />
                      View Claim
                    </button>
                    <button
                      onClick={() => onDismiss?.(rebuttal.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-dim transition-colors hover:bg-error/10 hover:text-error"
                    >
                      <XMarkIcon />
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredRebuttals.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-text-muted">No rebuttals match the current filter</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-stroke/50 px-4 py-3">
        <Button size="sm" variant="ghost" className="w-full gap-1.5" onClick={() => onGenerateCounter?.("")}>
          <PlusIcon />
          Generate New Counter-Argument
        </Button>
      </div>
    </div>
  );
}

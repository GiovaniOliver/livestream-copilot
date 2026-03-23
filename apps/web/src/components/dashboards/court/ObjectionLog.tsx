"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { Objection, ObjectionRuling, ObjectionType } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface ObjectionLogProps {
  objections: Objection[];
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const HandRaisedIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15m.002 0h-.002"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

// =============================================================================
// Constants
// =============================================================================

const RULING_STYLES: Record<ObjectionRuling, { variant: "success" | "error" | "warning"; label: string }> = {
  sustained: { variant: "success", label: "Sustained" },
  overruled: { variant: "error", label: "Overruled" },
  pending: { variant: "warning", label: "Pending" },
};

const OBJECTION_TYPE_LABELS: Record<ObjectionType, string> = {
  hearsay: "Hearsay",
  relevance: "Relevance",
  leading: "Leading",
  speculation: "Speculation",
  argumentative: "Argumentative",
  compound: "Compound",
  asked_and_answered: "Asked & Answered",
  assumes_facts: "Assumes Facts",
  character: "Character",
  foundation: "Foundation",
  other: "Other",
};

// =============================================================================
// Component
// =============================================================================

export function ObjectionLog({ objections, className }: ObjectionLogProps) {
  const [filterRuling, setFilterRuling] = useState<ObjectionRuling | "all">("all");

  const stats = useMemo(() => ({
    total: objections.length,
    sustained: objections.filter((o) => o.ruling === "sustained").length,
    overruled: objections.filter((o) => o.ruling === "overruled").length,
    pending: objections.filter((o) => o.ruling === "pending").length,
    prosecutionCount: objections.filter((o) => o.party === "prosecution").length,
    defenseCount: objections.filter((o) => o.party === "defense").length,
  }), [objections]);

  const filteredObjections = useMemo(() => {
    const filtered = filterRuling === "all"
      ? objections
      : objections.filter((o) => o.ruling === filterRuling);
    return [...filtered].sort((a, b) => b.sessionTimestamp - a.sessionTimestamp);
  }, [objections, filterRuling]);

  if (objections.length === 0) {
    return (
      <div className={cn("rounded-xl border border-stroke bg-bg-1", className)}>
        <div className="flex items-center gap-3 border-b border-stroke px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10 text-error">
            <HandRaisedIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Objection Log</h3>
            <p className="text-xs text-text-muted">Notable moments and interruptions</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
            <HandRaisedIcon />
          </div>
          <p className="text-sm text-text-muted">No objections recorded</p>
          <p className="mt-1 text-xs text-text-dim">
            Objections will appear here as they are detected in the proceedings
          </p>
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
            <HandRaisedIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Objection Log</h3>
            <p className="text-xs text-text-muted">{stats.total} objections recorded</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-success">{stats.sustained}S</span>
          <span className="text-text-dim">/</span>
          <span className="text-error">{stats.overruled}O</span>
          <span className="text-text-dim">/</span>
          <span className="text-warning">{stats.pending}P</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 border-b border-stroke/50 px-4 py-2">
        {(["all", "sustained", "overruled", "pending"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilterRuling(option)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              filterRuling === option
                ? "bg-error/20 text-error"
                : "text-text-muted hover:bg-surface hover:text-text"
            )}
          >
            {option === "all" ? `All (${stats.total})` : `${option.charAt(0).toUpperCase() + option.slice(1)} (${stats[option]})`}
          </button>
        ))}
      </div>

      {/* Objection list */}
      <div className="max-h-[360px] overflow-auto p-3">
        <div className="space-y-2">
          {filteredObjections.map((objection) => {
            const ruling = RULING_STYLES[objection.ruling];
            const typeLabel = OBJECTION_TYPE_LABELS[objection.type];
            const isFromProsecution = objection.party === "prosecution";

            return (
              <div
                key={objection.id}
                className={cn(
                  "rounded-xl border p-3 transition-all duration-200",
                  isFromProsecution
                    ? "border-error/20 bg-error/5"
                    : "border-teal/20 bg-teal/5"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isFromProsecution ? "error" : "teal"}
                      className="text-[10px] px-2 py-0.5"
                    >
                      {isFromProsecution ? "Prosecution" : "Defense"}
                    </Badge>
                    <span className="rounded bg-bg-2 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                      {typeLabel}
                    </span>
                    {objection.isAiGenerated && (
                      <span className="flex items-center gap-0.5 text-purple">
                        <SparklesIcon />
                      </span>
                    )}
                  </div>
                  <Badge variant={ruling.variant} className="text-[10px] px-2 py-0.5">
                    {ruling.label}
                  </Badge>
                </div>

                <p className="text-sm text-text">{objection.context}</p>

                {objection.rulingReason && (
                  <p className="mt-2 text-xs italic text-text-muted">
                    Reason: {objection.rulingReason}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-1 text-[10px] text-text-dim">
                  <span className="font-mono">{objection.timestamp}</span>
                </div>
              </div>
            );
          })}

          {filteredObjections.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm text-text-muted">No objections match the current filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

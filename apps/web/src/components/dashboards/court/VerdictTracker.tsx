"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { VerdictProgress, VerdictFactor, TrialPhase } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface VerdictTrackerProps {
  verdictProgress: VerdictProgress;
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const ScaleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// =============================================================================
// Constants
// =============================================================================

const PHASE_LABELS: Record<TrialPhase, string> = {
  opening: "Opening Statements",
  "prosecution-case": "Prosecution's Case",
  "defense-case": "Defense's Case",
  rebuttal: "Rebuttal",
  closing: "Closing Arguments",
  deliberation: "Deliberation",
  verdict: "Verdict",
};

const PHASE_ORDER: TrialPhase[] = [
  "opening",
  "prosecution-case",
  "defense-case",
  "rebuttal",
  "closing",
  "deliberation",
  "verdict",
];

// =============================================================================
// Component
// =============================================================================

export function VerdictTracker({ verdictProgress, className }: VerdictTrackerProps) {
  const completedCount = verdictProgress.completedPhases.length;
  const totalPhases = PHASE_ORDER.length;
  const progressPercentage = Math.round((completedCount / totalPhases) * 100);

  // Calculate balance between prosecution and defense
  const balance = useMemo(() => {
    const total = verdictProgress.prosecutionStrength + verdictProgress.defenseStrength;
    if (total === 0) return { prosecution: 50, defense: 50, leading: "even" as const };

    const prosecutionPct = Math.round((verdictProgress.prosecutionStrength / total) * 100);
    const defensePct = 100 - prosecutionPct;
    const leading =
      prosecutionPct > defensePct ? ("prosecution" as const) :
      defensePct > prosecutionPct ? ("defense" as const) :
      ("even" as const);

    return { prosecution: prosecutionPct, defense: defensePct, leading };
  }, [verdictProgress.prosecutionStrength, verdictProgress.defenseStrength]);

  // Separate factors by type
  const supportingFactors = verdictProgress.factors.filter((f) => f.type === "supporting");
  const opposingFactors = verdictProgress.factors.filter((f) => f.type === "opposing");

  return (
    <div className={cn("rounded-xl border border-stroke bg-bg-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <ScaleIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Verdict Tracker</h3>
            <p className="text-xs text-text-muted">Scales of justice balance</p>
          </div>
        </div>
        <Badge variant="teal">{progressPercentage}%</Badge>
      </div>

      <div className="p-4 space-y-5">
        {/* Scales of Justice Visualization */}
        <div>
          <p className="mb-2 text-center text-xs text-text-dim">Argument Balance</p>

          {/* Scale beam */}
          <div className="relative mx-auto" style={{ maxWidth: "280px" }}>
            {/* Fulcrum */}
            <div className="mx-auto flex flex-col items-center">
              {/* Balance bar */}
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="absolute inset-y-0 left-0 bg-error/70 transition-all duration-500"
                  style={{ width: `${balance.prosecution}%` }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-teal/70 transition-all duration-500"
                  style={{ width: `${balance.defense}%` }}
                />
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-text-dim" />
              </div>

              {/* Labels */}
              <div className="mt-2 flex w-full items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-error" />
                  <span className={cn(
                    "font-medium",
                    balance.leading === "prosecution" ? "text-error" : "text-text-muted"
                  )}>
                    Prosecution
                  </span>
                  <span className="font-mono text-[10px] text-text-dim">
                    {verdictProgress.prosecutionStrength}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-text-dim">
                    {verdictProgress.defenseStrength}
                  </span>
                  <span className={cn(
                    "font-medium",
                    balance.leading === "defense" ? "text-teal" : "text-text-muted"
                  )}>
                    Defense
                  </span>
                  <div className="h-2 w-2 rounded-full bg-teal" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase Progress */}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-text-muted">Trial Progress</span>
            <span className="font-medium text-text">{completedCount}/{totalPhases}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-2">
            <div
              className="h-full bg-teal transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {PHASE_ORDER.map((phase, index) => {
              const isCompleted = verdictProgress.completedPhases.includes(phase);
              const isCurrent = verdictProgress.currentPhase === phase;

              return (
                <div
                  key={phase}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors",
                    isCurrent && "bg-teal/10 border border-teal/20",
                    isCompleted && !isCurrent && "bg-success/5",
                    !isCompleted && !isCurrent && "bg-bg-2/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                      isCompleted
                        ? "bg-success text-bg-0"
                        : isCurrent
                          ? "bg-teal text-bg-0"
                          : "bg-surface text-text-muted"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon />
                    ) : (
                      <span className="font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      isCurrent
                        ? "font-medium text-teal"
                        : isCompleted
                          ? "text-success"
                          : "text-text-muted"
                    )}
                  >
                    {PHASE_LABELS[phase]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verdict Factors */}
        {verdictProgress.factors.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-dim">
              Key Factors
            </h4>
            <div className="space-y-2">
              {verdictProgress.factors.slice(0, 6).map((factor) => (
                <FactorRow key={factor.id} factor={factor} />
              ))}
              {verdictProgress.factors.length > 6 && (
                <p className="text-center text-[10px] text-text-dim">
                  +{verdictProgress.factors.length - 6} more factors
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {verdictProgress.notes.length > 0 && (
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="mb-1.5 text-xs font-medium text-warning">Key Notes</p>
            <ul className="space-y-1 text-xs text-text-muted">
              {verdictProgress.notes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-warning" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function FactorRow({ factor }: { factor: VerdictFactor }) {
  const typeConfig = {
    supporting: { color: "text-success", bg: "bg-success/10", icon: "+" },
    opposing: { color: "text-error", bg: "bg-error/10", icon: "-" },
    neutral: { color: "text-text-muted", bg: "bg-surface", icon: "~" },
  };
  const config = typeConfig[factor.type];

  return (
    <div className="flex items-start gap-2 rounded-lg bg-surface/50 p-2">
      <div className={cn("flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-xs font-bold", config.bg, config.color)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text leading-relaxed">{factor.description}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1 w-16 overflow-hidden rounded-full bg-bg-2">
            <div
              className={cn("h-full rounded-full", config.color === "text-success" ? "bg-success" : config.color === "text-error" ? "bg-error" : "bg-text-muted")}
              style={{ width: `${factor.weight}%` }}
            />
          </div>
          <span className="text-[10px] text-text-dim">Weight: {factor.weight}</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Speaker } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface ArgumentScore {
  id: string;
  speakerId: string;
  speaker: Speaker;
  overallScore: number;
  breakdown: {
    evidence: number;
    logic: number;
    clarity: number;
    relevance: number;
  };
  trend: "improving" | "declining" | "stable";
  lastUpdated: string;
}

export interface ArgumentStrengthMeterProps {
  scores: ArgumentScore[];
  showBreakdown?: boolean;
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const TrendUpIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const TrendDownIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
  </svg>
);

const TrendStableIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

// =============================================================================
// Helper Functions
// =============================================================================

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-teal";
  if (score >= 40) return "text-warning";
  return "text-error";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-teal";
  if (score >= 40) return "bg-warning";
  return "bg-error";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Weak";
}

// =============================================================================
// Sub-components
// =============================================================================

function TrendIndicator({ trend }: { trend: ArgumentScore["trend"] }) {
  const config = {
    improving: { icon: <TrendUpIcon />, color: "text-success", label: "Improving" },
    declining: { icon: <TrendDownIcon />, color: "text-error", label: "Declining" },
    stable: { icon: <TrendStableIcon />, color: "text-text-muted", label: "Stable" },
  };

  const { icon, color, label } = config[trend];

  return (
    <div className={cn("flex items-center gap-1", color)}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

function BreakdownBar({
  label,
  score,
  color
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-text-dim">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium text-text-muted">{score}</span>
    </div>
  );
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className={cn("transition-all duration-500", getScoreColor(score))}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-xl font-bold", getScoreColor(score))}>{score}</span>
        <span className="text-[10px] text-text-dim">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ArgumentStrengthMeter({
  scores,
  showBreakdown = true,
  className,
}: ArgumentStrengthMeterProps) {
  // Calculate overall debate health
  const overallHealth = useMemo(() => {
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length);
  }, [scores]);

  // Get the leading speaker
  const leadingSpeaker = useMemo(() => {
    if (scores.length === 0) return null;
    return scores.reduce((prev, current) =>
      prev.overallScore > current.overallScore ? prev : current
    );
  }, [scores]);

  if (scores.length === 0) {
    return (
      <div className={cn("rounded-xl border border-stroke bg-bg-1 p-4", className)}>
        <div className="flex items-center gap-3 text-text-muted">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
            <ChartBarIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-text">Argument Strength</p>
            <p className="text-xs text-text-dim">Scores will appear as arguments are made</p>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10 text-teal">
            <ChartBarIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Argument Strength</h3>
            <p className="text-xs text-text-muted">Real-time scoring</p>
          </div>
        </div>

        {/* Overall debate score */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-dim">Debate Quality:</span>
          <span className={cn("text-lg font-bold", getScoreColor(overallHealth))}>
            {overallHealth}%
          </span>
        </div>
      </div>

      {/* Scores Grid */}
      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {scores.map((scoreData) => (
            <div
              key={scoreData.id}
              className={cn(
                "rounded-xl border p-4 transition-all",
                leadingSpeaker?.id === scoreData.id
                  ? "border-teal/30 bg-teal/5"
                  : "border-stroke/50 bg-surface/30"
              )}
            >
              {/* Speaker header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: scoreData.speaker.color }}
                  />
                  <span className="text-sm font-medium text-text">{scoreData.speaker.name}</span>
                  {leadingSpeaker?.id === scoreData.id && (
                    <span className="rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-medium text-teal">
                      LEADING
                    </span>
                  )}
                </div>
                <TrendIndicator trend={scoreData.trend} />
              </div>

              {/* Score display */}
              <div className="flex items-center gap-4">
                <ScoreRing score={scoreData.overallScore} size={70} />

                {showBreakdown && (
                  <div className="flex-1 space-y-2">
                    <BreakdownBar
                      label="Evidence"
                      score={scoreData.breakdown.evidence}
                      color={getScoreBgColor(scoreData.breakdown.evidence)}
                    />
                    <BreakdownBar
                      label="Logic"
                      score={scoreData.breakdown.logic}
                      color={getScoreBgColor(scoreData.breakdown.logic)}
                    />
                    <BreakdownBar
                      label="Clarity"
                      score={scoreData.breakdown.clarity}
                      color={getScoreBgColor(scoreData.breakdown.clarity)}
                    />
                    <BreakdownBar
                      label="Relevance"
                      score={scoreData.breakdown.relevance}
                      color={getScoreBgColor(scoreData.breakdown.relevance)}
                    />
                  </div>
                )}
              </div>

              {/* Last updated */}
              <div className="mt-3 flex items-center justify-end">
                <span className="text-[10px] text-text-dim">
                  Updated {scoreData.lastUpdated}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

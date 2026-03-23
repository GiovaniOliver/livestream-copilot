"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { LegalClaim, LegalEvidence, Objection } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface RulingSummaryPanelProps {
  claims: LegalClaim[];
  evidence: LegalEvidence[];
  objections: Objection[];
  prosecutionStrength: number;
  defenseStrength: number;
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const DocumentMagnifyingGlassIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

export function RulingSummaryPanel({
  claims,
  evidence,
  objections,
  prosecutionStrength,
  defenseStrength,
  className,
}: RulingSummaryPanelProps) {
  const summary = useMemo(() => {
    const prosecutionClaims = claims.filter((c) => c.party === "prosecution");
    const defenseClaims = claims.filter((c) => c.party === "defense");
    const admittedEvidence = evidence.filter((e) => e.status === "admitted");
    const objectedEvidence = evidence.filter((e) => e.status === "objected");
    const sustainedObjections = objections.filter((o) => o.ruling === "sustained");
    const overruledObjections = objections.filter((o) => o.ruling === "overruled");

    // Get strongest claims from each side (top 3 by strength)
    const topProsecutionClaims = [...prosecutionClaims]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3);
    const topDefenseClaims = [...defenseClaims]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3);

    // Count contested claims
    const contestedCount = claims.filter((c) => c.isContested).length;

    return {
      prosecutionClaims: prosecutionClaims.length,
      defenseClaims: defenseClaims.length,
      admittedEvidence: admittedEvidence.length,
      objectedEvidence: objectedEvidence.length,
      sustainedObjections: sustainedObjections.length,
      overruledObjections: overruledObjections.length,
      topProsecutionClaims,
      topDefenseClaims,
      contestedCount,
      totalClaims: claims.length,
      totalEvidence: evidence.length,
    };
  }, [claims, evidence, objections]);

  const hasSufficientData = claims.length > 0 || evidence.length > 0;

  return (
    <div className={cn("rounded-xl border border-stroke bg-bg-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple/10 text-purple">
            <DocumentMagnifyingGlassIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Ruling Summary</h3>
            <p className="text-xs text-text-muted">AI-generated case analysis</p>
          </div>
        </div>
        <Badge variant="purple" className="gap-1">
          <SparklesIcon />
          AI
        </Badge>
      </div>

      <div className="p-4 space-y-4">
        {!hasSufficientData ? (
          <div className="rounded-lg bg-bg-2 p-4 text-center">
            <p className="text-xs text-text-muted">
              Case summary will be generated as evidence, testimony, and arguments
              are recorded during the session.
            </p>
          </div>
        ) : (
          <>
            {/* Quick stats comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-error/20 bg-error/5 p-3">
                <p className="text-xs text-error">Prosecution</p>
                <p className="mt-1 text-lg font-bold text-text">{summary.prosecutionClaims}</p>
                <p className="text-[10px] text-text-dim">
                  claims | strength: {prosecutionStrength}
                </p>
              </div>
              <div className="rounded-lg border border-teal/20 bg-teal/5 p-3">
                <p className="text-xs text-teal">Defense</p>
                <p className="mt-1 text-lg font-bold text-text">{summary.defenseClaims}</p>
                <p className="text-[10px] text-text-dim">
                  claims | strength: {defenseStrength}
                </p>
              </div>
            </div>

            {/* Evidence summary */}
            <div className="rounded-lg bg-surface/50 p-3">
              <h4 className="mb-2 text-xs font-medium text-text">Evidence Summary</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-text">{summary.totalEvidence}</p>
                  <p className="text-[10px] text-text-dim">Total</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-success">{summary.admittedEvidence}</p>
                  <p className="text-[10px] text-text-dim">Admitted</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-error">{summary.objectedEvidence}</p>
                  <p className="text-[10px] text-text-dim">Objected</p>
                </div>
              </div>
            </div>

            {/* Top prosecution claims */}
            {summary.topProsecutionClaims.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium text-error">
                  Top Prosecution Arguments
                </h4>
                <div className="space-y-1.5">
                  {summary.topProsecutionClaims.map((claim) => (
                    <ClaimSummaryRow key={claim.id} claim={claim} variant="prosecution" />
                  ))}
                </div>
              </div>
            )}

            {/* Top defense claims */}
            {summary.topDefenseClaims.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium text-teal">
                  Top Defense Arguments
                </h4>
                <div className="space-y-1.5">
                  {summary.topDefenseClaims.map((claim) => (
                    <ClaimSummaryRow key={claim.id} claim={claim} variant="defense" />
                  ))}
                </div>
              </div>
            )}

            {/* Objection analysis */}
            {objections.length > 0 && (
              <div className="rounded-lg bg-surface/50 p-3">
                <h4 className="mb-2 text-xs font-medium text-text">Objection Analysis</h4>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-text-muted">
                      {summary.sustainedObjections} sustained
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-error" />
                    <span className="text-text-muted">
                      {summary.overruledObjections} overruled
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Contested claims warning */}
            {summary.contestedCount > 0 && (
              <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                <p className="text-xs text-warning">
                  {summary.contestedCount} of {summary.totalClaims} claims are contested
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ClaimSummaryRow({
  claim,
  variant,
}: {
  claim: LegalClaim;
  variant: "prosecution" | "defense";
}) {
  const borderColor = variant === "prosecution" ? "border-error/10" : "border-teal/10";
  const strengthColor =
    claim.strength >= 70 ? "text-success" :
    claim.strength >= 40 ? "text-warning" :
    "text-error";

  return (
    <div className={cn("rounded-lg border bg-bg-2/50 p-2", borderColor)}>
      <p className="text-xs text-text line-clamp-2">{claim.text}</p>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-text-dim">
          {claim.evidenceIds.length} evidence
        </span>
        <span className={cn("text-[10px] font-medium", strengthColor)}>
          Strength: {claim.strength}
        </span>
      </div>
    </div>
  );
}

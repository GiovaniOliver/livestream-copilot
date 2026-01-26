"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EvidenceCard } from "./EvidenceCard";
import type { Evidence, Claim } from "./types";

export interface EvidenceDossierProps {
  evidence: Evidence[];
  selectedClaim?: Claim | null;
  onAddEvidence?: () => void;
  className?: string;
}

export function EvidenceDossier({
  evidence,
  selectedClaim,
  onAddEvidence,
  className,
}: EvidenceDossierProps) {
  // Filter evidence for selected claim
  const relevantEvidence = useMemo(() => {
    if (!selectedClaim) return [];
    return evidence.filter((e) => e.claimId === selectedClaim.id);
  }, [evidence, selectedClaim]);

  // Calculate average credibility
  const averageCredibility = useMemo(() => {
    if (relevantEvidence.length === 0) return 0;
    const sum = relevantEvidence.reduce((acc, e) => acc + e.credibilityScore, 0);
    return Math.round(sum / relevantEvidence.length);
  }, [relevantEvidence]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Evidence Dossier</h2>
          <p className="text-xs text-text-muted">
            {selectedClaim
              ? `${relevantEvidence.length} sources for selected claim`
              : "Select a claim to view evidence"}
          </p>
        </div>
        {selectedClaim && (
          <Button size="sm" variant="ghost" onClick={onAddEvidence}>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Evidence
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {selectedClaim ? (
          <>
            {/* Selected claim preview */}
            <div className="mb-4 rounded-xl border border-stroke/50 bg-surface/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: selectedClaim.speaker.color }}
                />
                <span className="text-xs font-medium text-text-muted">
                  {selectedClaim.speaker.name}
                </span>
                <span className="text-xs text-text-dim">
                  {selectedClaim.timestamp}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-text line-clamp-3">
                {selectedClaim.text}
              </p>
            </div>

            {/* Evidence stats */}
            {relevantEvidence.length > 0 && (
              <div className="mb-4 flex gap-3">
                <div className="flex-1 rounded-lg bg-surface/50 p-3 text-center">
                  <p className="text-2xl font-semibold text-teal">
                    {relevantEvidence.length}
                  </p>
                  <p className="text-xs text-text-muted">Sources</p>
                </div>
                <div className="flex-1 rounded-lg bg-surface/50 p-3 text-center">
                  <p className="text-2xl font-semibold text-purple">
                    {averageCredibility}%
                  </p>
                  <p className="text-xs text-text-muted">Avg. Credibility</p>
                </div>
              </div>
            )}

            {/* Evidence cards */}
            {relevantEvidence.length > 0 ? (
              <div className="space-y-3">
                {relevantEvidence.map((item) => (
                  <EvidenceCard key={item.id} evidence={item} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg
                  className="mb-3 h-10 w-10 text-text-dim"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm text-text-muted">
                  No evidence found for this claim
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3"
                  onClick={onAddEvidence}
                >
                  Add Evidence
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <svg
              className="mb-3 h-12 w-12 text-text-dim"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
            <p className="text-sm text-text-muted">
              Click on a claim to view supporting evidence
            </p>
            <p className="mt-1 text-xs text-text-dim">
              Evidence sources and credibility scores will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

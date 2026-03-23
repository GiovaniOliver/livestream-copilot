"use client";

import { useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { LegalClaim, LegalParty } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface ArgumentTimelineProps {
  claims: LegalClaim[];
  autoScroll?: boolean;
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const ChatBubbleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
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

const PARTY_STYLES: Record<LegalParty, { color: string; bg: string; border: string; label: string }> = {
  prosecution: {
    color: "text-error",
    bg: "bg-error/10",
    border: "border-error/30",
    label: "Prosecution",
  },
  defense: {
    color: "text-teal",
    bg: "bg-teal/10",
    border: "border-teal/30",
    label: "Defense",
  },
  court: {
    color: "text-purple",
    bg: "bg-purple/10",
    border: "border-purple/30",
    label: "Court",
  },
  neutral: {
    color: "text-text-muted",
    bg: "bg-surface",
    border: "border-stroke",
    label: "Neutral",
  },
};

const TYPE_BADGES: Record<LegalClaim["type"], { variant: "default" | "error" | "teal" | "warning" | "purple"; label: string }> = {
  claim: { variant: "default", label: "Claim" },
  allegation: { variant: "error", label: "Allegation" },
  defense: { variant: "teal", label: "Defense" },
  rebuttal: { variant: "warning", label: "Rebuttal" },
};

// =============================================================================
// Component
// =============================================================================

export function ArgumentTimeline({
  claims,
  autoScroll = true,
  className,
}: ArgumentTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedClaims = useMemo(
    () => [...claims].sort((a, b) => a.sessionTimestamp - b.sessionTimestamp),
    [claims]
  );

  // Auto-scroll to bottom when new claims arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sortedClaims.length, autoScroll]);

  if (claims.length === 0) {
    return (
      <div className={cn("rounded-xl border border-stroke bg-bg-1", className)}>
        <div className="flex items-center gap-3 border-b border-stroke px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <ChatBubbleIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Argument Timeline</h3>
            <p className="text-xs text-text-muted">Chronological claims and rebuttals</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
            <ChatBubbleIcon />
          </div>
          <p className="text-sm text-text-muted">No arguments recorded yet</p>
          <p className="mt-1 text-xs text-text-dim">
            Claims and rebuttals will appear chronologically as they are extracted
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <ChatBubbleIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Argument Timeline</h3>
            <p className="text-xs text-text-muted">{sortedClaims.length} arguments recorded</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="error">
            {claims.filter((c) => c.party === "prosecution").length} Pros
          </Badge>
          <Badge variant="teal">
            {claims.filter((c) => c.party === "defense").length} Def
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="max-h-[500px] overflow-auto p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-stroke" />

          <div className="space-y-3">
            {sortedClaims.map((claim) => {
              const partyStyle = PARTY_STYLES[claim.party];
              const typeBadge = TYPE_BADGES[claim.type];
              const isRebuttal = claim.type === "rebuttal";

              return (
                <div key={claim.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 border-bg-1",
                      claim.party === "prosecution" && "bg-error",
                      claim.party === "defense" && "bg-teal",
                      claim.party === "court" && "bg-purple",
                      claim.party === "neutral" && "bg-text-muted"
                    )}
                  />

                  {/* Claim card */}
                  <div
                    className={cn(
                      "rounded-xl border p-3 transition-all duration-200 hover:border-teal/30",
                      partyStyle.border,
                      isRebuttal ? "ml-4 border-dashed" : ""
                    )}
                  >
                    {/* Header */}
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={typeBadge.variant} className="text-[10px] px-2 py-0.5">
                          {typeBadge.label}
                        </Badge>
                        <span className={cn("text-xs font-medium", partyStyle.color)}>
                          {partyStyle.label}
                        </span>
                        {claim.isAiGenerated && (
                          <span className="flex items-center gap-0.5 text-purple">
                            <SparklesIcon />
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-text-dim">
                        {claim.timestamp}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-relaxed text-text">{claim.text}</p>

                    {/* Footer */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {claim.evidenceIds.length > 0 && (
                          <span className="text-[10px] text-text-dim">
                            {claim.evidenceIds.length} evidence linked
                          </span>
                        )}
                        {claim.isContested && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                            Contested
                          </Badge>
                        )}
                      </div>
                      <StrengthIndicator strength={claim.strength} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function StrengthIndicator({ strength }: { strength: number }) {
  const color = strength >= 70 ? "bg-success" : strength >= 40 ? "bg-warning" : "bg-error";
  const label = strength >= 70 ? "Strong" : strength >= 40 ? "Moderate" : "Weak";

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-12 overflow-hidden rounded-full bg-surface">
        <div
          className={cn("h-full rounded-full transition-all duration-300", color)}
          style={{ width: `${strength}%` }}
        />
      </div>
      <span className="text-[10px] text-text-dim">{label}</span>
    </div>
  );
}

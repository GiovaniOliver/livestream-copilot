"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { Claim, ClaimType, VerificationStatus } from "./types";

export interface ClaimCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  claim: Claim;
  isSelected?: boolean;
  onSelect?: (claim: Claim) => void;
  compact?: boolean;
}

const typeColors: Record<ClaimType, { bg: string; border: string; label: string }> = {
  claim: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    label: "Claim",
  },
  support: {
    bg: "bg-success/10",
    border: "border-success/30",
    label: "Support",
  },
  rebuttal: {
    bg: "bg-error/10",
    border: "border-error/30",
    label: "Rebuttal",
  },
};

const verificationBadges: Record<
  VerificationStatus,
  { variant: "default" | "success" | "warning" | "error"; label: string }
> = {
  unverified: { variant: "default", label: "Unverified" },
  verified: { variant: "success", label: "Verified" },
  disputed: { variant: "error", label: "Disputed" },
};

const ClaimCard = forwardRef<HTMLDivElement, ClaimCardProps>(
  ({ claim, isSelected = false, onSelect, compact = false, className, ...props }, ref) => {
    const typeStyle = typeColors[claim.type];
    const verificationBadge = verificationBadges[claim.verificationStatus];

    const handleClick = () => {
      onSelect?.(claim);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect?.(claim);
      }
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative cursor-pointer rounded-xl border transition-all duration-200",
          "bg-bg-1 hover:bg-bg-2",
          typeStyle.border,
          isSelected && "ring-2 ring-teal ring-offset-2 ring-offset-bg-0",
          compact ? "p-3" : "p-4",
          className
        )}
        {...props}
      >
        {/* Type indicator strip */}
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-1 rounded-l-xl",
            claim.type === "claim" && "bg-blue-500",
            claim.type === "support" && "bg-success",
            claim.type === "rebuttal" && "bg-error"
          )}
        />

        <div className="pl-3">
          {/* Header: Speaker, Timestamp, Type */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Speaker avatar/indicator */}
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: claim.speaker.color }}
              />
              <span className="text-xs font-medium text-text-muted">
                {claim.speaker.name}
              </span>
              <span className="text-xs text-text-dim">{claim.timestamp}</span>
            </div>

            <Badge
              variant={verificationBadge.variant}
              className="text-[10px] px-2 py-0.5"
            >
              {verificationBadge.label}
            </Badge>
          </div>

          {/* Claim text */}
          <p
            className={cn(
              "text-text leading-relaxed",
              compact ? "text-sm line-clamp-2" : "text-sm"
            )}
          >
            {claim.text}
          </p>

          {/* Footer: Evidence count & Related claims */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Evidence count */}
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>{claim.evidenceCount} evidence</span>
              </div>

              {/* Related claims count */}
              {claim.relatedClaimIds.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  <span>{claim.relatedClaimIds.length} linked</span>
                </div>
              )}
            </div>

            {/* Type badge */}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                typeStyle.bg,
                claim.type === "claim" && "text-blue-400",
                claim.type === "support" && "text-success",
                claim.type === "rebuttal" && "text-error"
              )}
            >
              {typeStyle.label}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

ClaimCard.displayName = "ClaimCard";

export { ClaimCard };

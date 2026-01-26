"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { Evidence } from "./types";

export interface EvidenceCardProps extends HTMLAttributes<HTMLDivElement> {
  evidence: Evidence;
  showNeutralSummary?: boolean;
}

const sourceTypeIcons: Record<Evidence["source"]["type"], React.ReactNode> = {
  article: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  study: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  video: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  government: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  news: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
    </svg>
  ),
};

const getCredibilityColor = (score: number): string => {
  if (score >= 90) return "text-success";
  if (score >= 70) return "text-teal";
  if (score >= 50) return "text-warning";
  return "text-error";
};

const getCredibilityBg = (score: number): string => {
  if (score >= 90) return "bg-success/10";
  if (score >= 70) return "bg-teal/10";
  if (score >= 50) return "bg-warning/10";
  return "bg-error/10";
};

const EvidenceCard = forwardRef<HTMLDivElement, EvidenceCardProps>(
  ({ evidence, showNeutralSummary = true, className, ...props }, ref) => {
    const credibilityColor = getCredibilityColor(evidence.credibilityScore);
    const credibilityBg = getCredibilityBg(evidence.credibilityScore);

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-stroke bg-bg-1 p-4 transition-all duration-200 hover:border-stroke/80",
          className
        )}
        {...props}
      >
        {/* Header: Source type icon and name */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-text-muted">
              {sourceTypeIcons[evidence.source.type]}
            </div>
            <div>
              <h4 className="text-sm font-medium text-text">{evidence.source.name}</h4>
              <span className="text-xs capitalize text-text-dim">
                {evidence.source.type}
              </span>
            </div>
          </div>

          {/* Credibility score */}
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1",
              credibilityBg
            )}
          >
            <svg
              className={cn("h-3.5 w-3.5", credibilityColor)}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className={cn("text-xs font-medium", credibilityColor)}>
              {evidence.credibilityScore}%
            </span>
          </div>
        </div>

        {/* Summary */}
        <p className="mb-3 text-sm leading-relaxed text-text">{evidence.summary}</p>

        {/* Neutral summary */}
        {showNeutralSummary && evidence.neutralSummary && (
          <div className="mb-3 rounded-lg bg-surface/50 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-purple"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
              <span className="text-xs font-medium text-purple">Neutral Summary</span>
            </div>
            <p className="text-xs leading-relaxed text-text-muted">
              {evidence.neutralSummary}
            </p>
          </div>
        )}

        {/* Source link */}
        <a
          href={evidence.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-teal transition-colors hover:text-teal-300"
        >
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
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          View Source
        </a>
      </div>
    );
  }
);

EvidenceCard.displayName = "EvidenceCard";

export { EvidenceCard };

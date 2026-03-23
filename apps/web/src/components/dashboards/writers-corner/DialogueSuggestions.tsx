"use client";

import { type FC, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DialogueSuggestion } from "@/hooks/useWritersCorner";

// ============================================================================
// Dialogue Suggestions Component
// AI-generated dialogue alternatives with accept/reject controls
// ============================================================================

interface DialogueSuggestionsProps {
  readonly suggestions: readonly DialogueSuggestion[];
  readonly onAccept: (id: string) => void;
  readonly onReject: (id: string) => void;
}

type FilterMode = "all" | "pending" | "accepted" | "rejected";

// Icons
const CheckIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XMarkIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
    />
  </svg>
);

const ArrowRightIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const STATUS_STYLES: Record<DialogueSuggestion["status"], {
  border: string;
  badge: string;
  badgeText: string;
  label: string;
}> = {
  pending: {
    border: "border-stroke",
    badge: "bg-warning/10 text-warning border-warning/30",
    badgeText: "text-warning",
    label: "Pending",
  },
  accepted: {
    border: "border-success/30",
    badge: "bg-success/10 text-success border-success/30",
    badgeText: "text-success",
    label: "Accepted",
  },
  rejected: {
    border: "border-error/30 opacity-60",
    badge: "bg-error/10 text-error border-error/30",
    badgeText: "text-error",
    label: "Rejected",
  },
};

const SuggestionCard: FC<{
  suggestion: DialogueSuggestion;
  onAccept: () => void;
  onReject: () => void;
}> = ({ suggestion, onAccept, onReject }) => {
  const styles = STATUS_STYLES[suggestion.status];
  const isPending = suggestion.status === "pending";

  return (
    <div
      className={cn(
        "rounded-xl border bg-bg-2 p-3 transition-all duration-200",
        styles.border,
        isPending && "hover:border-teal/30"
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-teal">{suggestion.character}</span>
        <span
          className={cn(
            "px-2 py-0.5 text-[10px] font-medium rounded-full border",
            styles.badge
          )}
        >
          {styles.label}
        </span>
      </div>

      {/* Dialogue comparison */}
      {suggestion.originalLine && (
        <div className="mb-2 space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-[10px] font-medium uppercase text-text-dim mt-0.5">
              Original
            </span>
            <p className="text-xs text-text-muted line-through">{suggestion.originalLine}</p>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRightIcon className="h-3 w-3 text-text-dim rotate-90" />
          </div>
        </div>
      )}

      {/* Suggested line */}
      <div className="mb-2 flex items-start gap-2">
        <SparklesIcon className="h-3.5 w-3.5 shrink-0 text-purple mt-0.5" />
        <p className="text-sm text-text leading-relaxed">{suggestion.suggestedLine}</p>
      </div>

      {/* Context */}
      {suggestion.context && (
        <p className="mb-3 text-xs text-text-dim italic">{suggestion.context}</p>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAccept}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
              "bg-success/10 text-success border border-success/30",
              "hover:bg-success/20 transition-colors"
            )}
            aria-label={`Accept suggestion for ${suggestion.character}`}
          >
            <CheckIcon className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            type="button"
            onClick={onReject}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
              "bg-error/10 text-error border border-error/30",
              "hover:bg-error/20 transition-colors"
            )}
            aria-label={`Reject suggestion for ${suggestion.character}`}
          >
            <XMarkIcon className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

const DialogueSuggestionsPanel: FC<DialogueSuggestionsProps> = ({
  suggestions,
  onAccept,
  onReject,
}) => {
  const [filter, setFilter] = useState<FilterMode>("all");

  const filteredSuggestions = useMemo(() => {
    if (filter === "all") return suggestions;
    return suggestions.filter((s) => s.status === filter);
  }, [suggestions, filter]);

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const acceptedCount = suggestions.filter((s) => s.status === "accepted").length;
  const rejectedCount = suggestions.filter((s) => s.status === "rejected").length;

  return (
    <div>
      {/* Filter tabs */}
      {suggestions.length > 0 && (
        <div className="mb-3 flex items-center gap-1.5 flex-wrap">
          {(
            [
              { key: "all" as const, label: "All", count: suggestions.length },
              { key: "pending" as const, label: "Pending", count: pendingCount },
              { key: "accepted" as const, label: "Accepted", count: acceptedCount },
              { key: "rejected" as const, label: "Rejected", count: rejectedCount },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-md transition-colors",
                filter === key
                  ? "bg-teal/10 text-teal border border-teal/30"
                  : "bg-surface text-text-muted hover:text-text"
              )}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Suggestions list */}
      <div className="space-y-3">
        {filteredSuggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-8">
            <SparklesIcon className="h-10 w-10 text-text-dim mb-3" />
            <p className="text-sm text-text-muted">
              {suggestions.length === 0
                ? "No dialogue suggestions yet"
                : "No suggestions match this filter"}
            </p>
            <p className="text-xs text-text-dim mt-1">
              {suggestions.length === 0
                ? "AI will suggest alternatives as dialogue is detected"
                : "Try a different filter"}
            </p>
          </div>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={() => onAccept(suggestion.id)}
              onReject={() => onReject(suggestion.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export { DialogueSuggestionsPanel };

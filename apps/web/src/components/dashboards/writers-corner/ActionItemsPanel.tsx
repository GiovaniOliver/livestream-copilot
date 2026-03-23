"use client";

import { type FC, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/hooks/useWritersCorner";

// ============================================================================
// Action Items Panel Component
// Tasks extracted from the session with completion toggles
// ============================================================================

interface ActionItemsPanelProps {
  readonly actionItems: readonly ActionItem[];
  readonly onToggle: (id: string) => void;
}

// Icons
const CheckCircleIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CircleIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const ClipboardDocumentListIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
    />
  </svg>
);

const PRIORITY_STYLES: Record<ActionItem["priority"], {
  dot: string;
  label: string;
  badge: string;
}> = {
  high: {
    dot: "bg-error",
    label: "High",
    badge: "bg-error/10 text-error border-error/30",
  },
  medium: {
    dot: "bg-warning",
    label: "Medium",
    badge: "bg-warning/10 text-warning border-warning/30",
  },
  low: {
    dot: "bg-text-muted",
    label: "Low",
    badge: "bg-surface text-text-muted border-stroke",
  },
};

const ActionItemRow: FC<{
  item: ActionItem;
  onToggle: () => void;
}> = ({ item, onToggle }) => {
  const priority = PRIORITY_STYLES[item.priority];

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border p-3 transition-all duration-200",
        item.isComplete
          ? "border-stroke/50 bg-surface/50"
          : "border-stroke bg-bg-2 hover:border-teal/30"
      )}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "shrink-0 mt-0.5 transition-colors",
          item.isComplete
            ? "text-success"
            : "text-text-dim hover:text-teal"
        )}
        aria-label={item.isComplete ? "Mark as incomplete" : "Mark as complete"}
      >
        {item.isComplete ? (
          <CheckCircleIcon className="h-5 w-5" />
        ) : (
          <CircleIcon className="h-5 w-5" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-relaxed transition-colors",
            item.isComplete
              ? "text-text-muted line-through"
              : "text-text"
          )}
        >
          {item.text}
        </p>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {/* Priority badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border",
              priority.badge
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} />
            {priority.label}
          </span>

          {/* Assignee */}
          {item.assignee && (
            <span className="text-[10px] text-text-dim">
              @{item.assignee}
            </span>
          )}

          {/* Time */}
          <span className="text-[10px] text-text-dim">
            {new Date(item.createdAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

const ActionItemsPanel: FC<ActionItemsPanelProps> = ({ actionItems, onToggle }) => {
  const { incomplete, complete } = useMemo(() => {
    const incomplete = actionItems.filter((i) => !i.isComplete);
    const complete = actionItems.filter((i) => i.isComplete);
    return { incomplete, complete };
  }, [actionItems]);

  // Sort incomplete by priority: high > medium > low
  const priorityOrder: Record<ActionItem["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  const sortedIncomplete = [...incomplete].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  if (actionItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-8">
        <ClipboardDocumentListIcon className="h-10 w-10 text-text-dim mb-3" />
        <p className="text-sm text-text-muted">No action items yet</p>
        <p className="text-xs text-text-dim mt-1">
          Tasks will be extracted from the session automatically
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-text-muted">
          {incomplete.length} remaining
        </span>
        {complete.length > 0 && (
          <span className="text-success">
            {complete.length} completed
          </span>
        )}
      </div>

      {/* Incomplete items */}
      {sortedIncomplete.length > 0 && (
        <div className="space-y-2">
          {sortedIncomplete.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              onToggle={() => onToggle(item.id)}
            />
          ))}
        </div>
      )}

      {/* Completed items */}
      {complete.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-dim">
            Completed ({complete.length})
          </p>
          {complete.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              onToggle={() => onToggle(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { ActionItemsPanel };

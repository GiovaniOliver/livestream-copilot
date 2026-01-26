"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "./types";

export interface PublishingChecklistProps {
  checklist: ChecklistItem[];
  onChecklistChange?: (checklist: ChecklistItem[]) => void;
  onExport?: () => void;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  content: "Content Preparation",
  review: "Review & Approval",
  publish: "Publishing",
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  content: { bg: "bg-teal/10", text: "text-teal", border: "border-teal/30" },
  review: { bg: "bg-purple/10", text: "text-purple", border: "border-purple/30" },
  publish: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
};

export function PublishingChecklist({
  checklist: initialChecklist,
  onChecklistChange,
  onExport,
  className,
}: PublishingChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);

  const updateChecklist = useCallback(
    (newChecklist: ChecklistItem[]) => {
      setChecklist(newChecklist);
      onChecklistChange?.(newChecklist);
    },
    [onChecklistChange]
  );

  const handleToggle = useCallback(
    (id: string) => {
      const updated = checklist.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      );
      updateChecklist(updated);
    },
    [checklist, updateChecklist]
  );

  const progress = useMemo(() => {
    const completed = checklist.filter((item) => item.isCompleted).length;
    return {
      completed,
      total: checklist.length,
      percentage: Math.round((completed / checklist.length) * 100),
    };
  }, [checklist]);

  const groupedChecklist = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {
      content: [],
      review: [],
      publish: [],
    };

    checklist.forEach((item) => {
      if (groups[item.category]) {
        groups[item.category].push(item);
      }
    });

    return groups;
  }, [checklist]);

  const isReadyToPublish = progress.percentage === 100;

  return (
    <div className={cn("rounded-2xl border border-stroke bg-bg-1 p-6", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Publishing Checklist</h2>
          <p className="text-sm text-text-muted">
            {progress.completed} of {progress.total} tasks completed
          </p>
        </div>

        {/* Export button */}
        <button
          onClick={onExport}
          disabled={!isReadyToPublish}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
            isReadyToPublish
              ? "border-success/30 bg-success/10 text-success hover:bg-success/20"
              : "border-stroke bg-bg-0 text-text-dim cursor-not-allowed"
          )}
        >
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Export
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-text">Progress</span>
          <span
            className={cn(
              "font-bold",
              progress.percentage === 100
                ? "text-success"
                : progress.percentage >= 50
                  ? "text-teal"
                  : "text-text-muted"
            )}
          >
            {progress.percentage}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-0">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress.percentage === 100
                ? "bg-success"
                : "bg-gradient-to-r from-purple to-teal"
            )}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist groups */}
      <div className="space-y-4">
        {Object.entries(groupedChecklist).map(([category, items]) => {
          if (items.length === 0) return null;

          const colors = categoryColors[category];
          const completedInCategory = items.filter((i) => i.isCompleted).length;

          return (
            <div key={category}>
              {/* Category header */}
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-medium",
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                >
                  {categoryLabels[category]}
                </span>
                <span className="text-xs text-text-dim">
                  {completedInCategory}/{items.length}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                      item.isCompleted
                        ? "border-success/20 bg-success/5"
                        : "border-stroke bg-bg-0 hover:border-teal/30"
                    )}
                  >
                    {/* Custom checkbox */}
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => handleToggle(item.id)}
                        className="peer sr-only"
                      />
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                          item.isCompleted
                            ? "border-success bg-success"
                            : "border-text-dim group-hover:border-teal"
                        )}
                      >
                        {item.isCompleted && (
                          <svg
                            className="h-3 w-3 text-bg-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        "text-sm transition-all",
                        item.isCompleted
                          ? "text-text-muted line-through"
                          : "text-text"
                      )}
                    >
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ready to publish message */}
      {isReadyToPublish && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
            <svg
              className="h-5 w-5 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-success">Ready to Publish!</p>
            <p className="text-xs text-success/70">
              All tasks completed. Click Export to finalize.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

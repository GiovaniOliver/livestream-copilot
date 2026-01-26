"use client";

import { type FC, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  ChapterOutlinePanelProps,
  Chapter,
  ChapterStatus,
} from "./types";
import { CHAPTER_STATUS_COLORS } from "./types";

// ============================================================================
// Chapter Outline Panel
// Displays manuscript chapter structure with AI-generated summaries
// ============================================================================

// Icons
const ChevronIcon: FC<{ className?: string; expanded?: boolean }> = ({ className, expanded }) => (
  <svg
    className={cn(className, "transition-transform duration-200", expanded && "rotate-90")}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const SparklesIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const PlusIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const PencilIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
  </svg>
);

const DocumentIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

// Status badge component
const StatusBadge: FC<{ status: ChapterStatus }> = ({ status }) => {
  const colors = CHAPTER_STATUS_COLORS[status];
  const labels: Record<ChapterStatus, string> = {
    outline: "Outline",
    draft: "Draft",
    revision: "Revision",
    complete: "Complete",
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 text-[10px] font-medium rounded-full border",
        colors.bg,
        colors.border,
        colors.text
      )}
    >
      {labels[status]}
    </span>
  );
};

// Chapter card component
const ChapterCard: FC<{
  chapter: Chapter;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onSummarize?: () => void;
}> = ({ chapter, isExpanded, onToggle, onEdit, onSummarize }) => {
  const hasSummary = !!chapter.summary;

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        isExpanded
          ? "bg-bg-1 border-teal/30"
          : "bg-surface border-stroke hover:border-stroke-hover"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggle}
      >
        <button
          className="shrink-0 p-1 rounded-md text-text-muted hover:text-text hover:bg-surface transition-colors"
        >
          <ChevronIcon className="w-4 h-4" expanded={isExpanded} />
        </button>

        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-teal/10 text-teal font-semibold text-sm">
          {chapter.number}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text truncate">
            {chapter.title || `Chapter ${chapter.number}`}
          </h4>
          <p className="text-xs text-text-muted">
            {chapter.wordCount.toLocaleString()} words
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <StatusBadge status={chapter.status} />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-11 space-y-3">
            {/* Summary section */}
            <div className="rounded-lg bg-bg-0 p-3 border border-stroke-subtle">
              {hasSummary ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <DocumentIcon className="w-3.5 h-3.5 text-teal" />
                      <span className="text-xs font-medium text-teal">Summary</span>
                      {chapter.summary?.aiGenerated && (
                        <SparklesIcon className="w-3 h-3 text-purple" />
                      )}
                    </div>
                    <span className="text-[10px] text-text-dim">
                      {chapter.summary?.generatedAt && new Date(chapter.summary.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {chapter.summary?.content}
                  </p>

                  {/* Key events */}
                  {chapter.summary?.keyEvents && chapter.summary.keyEvents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stroke-subtle">
                      <span className="text-xs font-medium text-text-muted">Key Events:</span>
                      <ul className="mt-1 space-y-1">
                        {chapter.summary.keyEvents.map((event, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-text-dim">
                            <span className="shrink-0 w-1 h-1 rounded-full bg-teal mt-1.5" />
                            {event}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Characters */}
                  {chapter.summary?.charactersInvolved && chapter.summary.charactersInvolved.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-text-dim">Characters:</span>
                      {chapter.summary.charactersInvolved.map((char, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-purple/10 text-purple"
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <DocumentIcon className="w-8 h-8 text-text-dim mb-2" />
                  <p className="text-xs text-text-muted mb-2">No summary yet</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSummarize?.();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg",
                      "bg-teal/10 text-teal border border-teal/30",
                      "hover:bg-teal/20 transition-colors"
                    )}
                  >
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Generate Summary
                  </button>
                </div>
              )}
            </div>

            {/* Notes */}
            {chapter.notes && (
              <div className="rounded-lg bg-warning/5 p-3 border border-warning/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <PencilIcon className="w-3.5 h-3.5 text-warning" />
                  <span className="text-xs font-medium text-warning">Notes</span>
                </div>
                <p className="text-xs text-text-muted">{chapter.notes}</p>
              </div>
            )}

            {/* Plot threads */}
            {chapter.plotThreadIds && chapter.plotThreadIds.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-text-dim">Plot threads:</span>
                {chapter.plotThreadIds.map((threadId) => (
                  <span
                    key={threadId}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-surface text-text-muted"
                  >
                    #{threadId}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {hasSummary && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSummarize?.();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-md",
                    "bg-surface text-text-muted",
                    "hover:bg-surface-hover hover:text-text transition-colors"
                  )}
                >
                  <SparklesIcon className="w-3 h-3" />
                  Regenerate Summary
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-md",
                  "bg-surface text-text-muted",
                  "hover:bg-surface-hover hover:text-text transition-colors"
                )}
              >
                <PencilIcon className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main component
const ChapterOutlinePanel: FC<ChapterOutlinePanelProps> = ({
  chapters,
  onChapterUpdate,
  onChapterAdd,
  onChapterDelete,
  onSummarizeChapter,
}) => {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

  const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);
  const completedCount = chapters.filter((c) => c.status === "complete").length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-stroke">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text">Chapter Outline</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {chapters.length} chapters / {totalWords.toLocaleString()} words
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg bg-surface p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-bg-1 text-text"
                    : "text-text-muted hover:text-text"
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-bg-1 text-text"
                    : "text-text-muted hover:text-text"
                )}
              >
                Grid
              </button>
            </div>
            <button
              onClick={() => onChapterAdd?.({
                number: chapters.length + 1,
                title: "",
                status: "outline",
                wordCount: 0,
                plotThreadIds: [],
                timelineEventIds: [],
              })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg",
                "bg-teal/10 text-teal border border-teal/30",
                "hover:bg-teal/20 transition-colors"
              )}
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add Chapter
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-muted">Progress</span>
            <span className="text-teal font-medium">
              {completedCount}/{chapters.length} complete
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal to-teal/50 rounded-full transition-all duration-300"
              style={{ width: `${chapters.length > 0 ? (completedCount / chapters.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chapters list */}
      <div className="flex-1 overflow-auto p-4">
        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <DocumentIcon className="w-12 h-12 text-text-dim mb-3" />
            <p className="text-sm text-text-muted mb-1">No chapters yet</p>
            <p className="text-xs text-text-dim mb-4">Start building your manuscript</p>
            <button
              onClick={() => onChapterAdd?.({
                number: 1,
                title: "Chapter 1",
                status: "outline",
                wordCount: 0,
                plotThreadIds: [],
                timelineEventIds: [],
              })}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg",
                "bg-teal text-bg-0 font-medium",
                "hover:bg-teal/90 transition-colors"
              )}
            >
              <PlusIcon className="w-4 h-4" />
              Add First Chapter
            </button>
          </div>
        ) : (
          <div className={cn(
            viewMode === "grid"
              ? "grid grid-cols-2 gap-3"
              : "space-y-2"
          )}>
            {sortedChapters.map((chapter) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                isExpanded={expandedChapters.has(chapter.id)}
                onToggle={() => toggleChapter(chapter.id)}
                onEdit={() => {
                  // Edit action
                }}
                onSummarize={() => onSummarizeChapter?.(chapter.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="shrink-0 px-4 py-2 border-t border-stroke bg-bg-1">
        <div className="flex items-center justify-between text-[10px] text-text-dim">
          <div className="flex items-center gap-4">
            {Object.entries(
              chapters.reduce((acc, c) => {
                acc[c.status] = (acc[c.status] || 0) + 1;
                return acc;
              }, {} as Record<ChapterStatus, number>)
            ).map(([status, count]) => (
              <span key={status} className="flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full", CHAPTER_STATUS_COLORS[status as ChapterStatus].bg)} />
                {count} {status}
              </span>
            ))}
          </div>
          <span>Avg: {chapters.length > 0 ? Math.round(totalWords / chapters.length).toLocaleString() : 0} words/chapter</span>
        </div>
      </div>
    </div>
  );
};

export { ChapterOutlinePanel };

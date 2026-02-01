"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PromoDraft } from "./types";
import { logger } from "@/lib/logger";

export interface PromoDraftsProps {
  promoDrafts: PromoDraft[];
  onDraftsChange?: (drafts: PromoDraft[]) => void;
  className?: string;
}

type DraftCategory = "title" | "description" | "social" | "newsletter";

const categoryLabels: Record<DraftCategory, string> = {
  title: "Episode Titles",
  description: "Episode Descriptions",
  social: "Social Media Posts",
  newsletter: "Newsletter Blurbs",
};

const categoryIcons: Record<DraftCategory, ReactNode> = {
  title: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  ),
  description: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  social: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  ),
  newsletter: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};

export function PromoDrafts({
  promoDrafts: initialDrafts,
  onDraftsChange,
  className,
}: PromoDraftsProps) {
  const [drafts, setDrafts] = useState<PromoDraft[]>(initialDrafts);
  const [activeCategory, setActiveCategory] = useState<DraftCategory>("title");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories: DraftCategory[] = ["title", "description", "social", "newsletter"];

  const updateDrafts = useCallback(
    (newDrafts: PromoDraft[]) => {
      setDrafts(newDrafts);
      onDraftsChange?.(newDrafts);
    },
    [onDraftsChange]
  );

  const filteredDrafts = useMemo(
    () => drafts.filter((d) => d.type === activeCategory),
    [drafts, activeCategory]
  );

  const handleEdit = useCallback((draft: PromoDraft) => {
    setEditingId(draft.id);
    setEditValue(draft.content);
  }, []);

  const handleSave = useCallback(() => {
    if (editingId && editValue.trim()) {
      const updated = drafts.map((d) =>
        d.id === editingId ? { ...d, content: editValue.trim() } : d
      );
      updateDrafts(updated);
    }
    setEditingId(null);
    setEditValue("");
  }, [editingId, editValue, drafts, updateDrafts]);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setEditValue("");
  }, []);

  const handleCopy = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      logger.error("Failed to copy:", err);
    }
  }, []);

  const handleRegenerate = useCallback((id: string) => {
    // In a real app, this would trigger an AI regeneration
    logger.debug("Regenerating draft:", id);
    // For now, just show a visual feedback
    const updated = drafts.map((d) =>
      d.id === id
        ? { ...d, content: d.content + " [Regenerated]" }
        : d
    );
    updateDrafts(updated);
  }, [drafts, updateDrafts]);

  return (
    <div className={cn("rounded-2xl border border-stroke bg-bg-1 p-6", className)}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text">Promo Drafts</h2>
        <p className="text-sm text-text-muted">
          {drafts.length} drafts across {categories.length} categories
        </p>
      </div>

      {/* Category tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((category) => {
          const count = drafts.filter((d) => d.type === category).length;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                activeCategory === category
                  ? "border-purple bg-purple/10 text-purple"
                  : "border-stroke bg-bg-0 text-text-muted hover:border-purple/30 hover:text-text"
              )}
            >
              {categoryIcons[category]}
              <span>{categoryLabels[category]}</span>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-xs">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Drafts list */}
      <div className="max-h-[350px] space-y-3 overflow-y-auto pr-1">
        {filteredDrafts.map((draft, index) => (
          <div
            key={draft.id}
            className="group rounded-xl border border-stroke bg-bg-0 p-4 transition-all hover:border-purple/30"
          >
            {/* Variant label */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-purple">
                Variant {index + 1}
              </span>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {/* Copy button */}
                <button
                  onClick={() => handleCopy(draft.id, draft.content)}
                  className={cn(
                    "rounded-lg p-1.5 transition-all",
                    copiedId === draft.id
                      ? "bg-success/20 text-success"
                      : "text-text-muted hover:bg-surface hover:text-text"
                  )}
                  title={copiedId === draft.id ? "Copied!" : "Copy"}
                >
                  {copiedId === draft.id ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>

                {/* Edit button */}
                <button
                  onClick={() => handleEdit(draft)}
                  className="rounded-lg p-1.5 text-text-muted transition-all hover:bg-surface hover:text-text"
                  title="Edit"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* Regenerate button */}
                <button
                  onClick={() => handleRegenerate(draft.id)}
                  className="rounded-lg p-1.5 text-text-muted transition-all hover:bg-teal/10 hover:text-teal"
                  title="Regenerate"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            {editingId === draft.id ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-bg-1 p-3 text-sm text-text outline-none focus:border-purple resize-none"
                  rows={draft.type === "title" ? 2 : 4}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancel}
                    className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="rounded-lg bg-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-text whitespace-pre-wrap">
                {draft.content}
              </p>
            )}
          </div>
        ))}

        {filteredDrafts.length === 0 && (
          <div className="py-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-text-dim"
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
            <p className="mt-2 text-sm text-text-muted">
              No drafts in this category
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

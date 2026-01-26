"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ShowNotesResult } from "./types";

export interface ShowNotesPanelProps {
  showNotes?: ShowNotesResult | null;
  isGenerating?: boolean;
  onGenerate?: () => void;
  onRegenerate?: () => void;
  onExport?: (format: "markdown" | "html" | "text") => void;
  className?: string;
}

export function ShowNotesPanel({
  showNotes,
  isGenerating = false,
  onGenerate,
  onRegenerate,
  onExport,
  className,
}: ShowNotesPanelProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [editedNotes, setEditedNotes] = useState(showNotes?.summary || "");

  const handleCopy = useCallback(async (content: string, section: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Empty state - no show notes yet
  if (!showNotes && !isGenerating) {
    return (
      <div className={cn("rounded-2xl border border-stroke bg-bg-1 p-6", className)}>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple/20 to-teal/20">
            <svg className="h-8 w-8 text-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-text">Show Notes</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-text-muted">
            Generate comprehensive show notes from your episode transcript including key points, topics, and resources.
          </p>
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple to-teal px-6 py-3 font-medium text-white shadow-glow transition-all hover:opacity-90 hover:shadow-lg"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            Generate Show Notes
          </button>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className={cn("rounded-2xl border border-stroke bg-bg-1 p-6", className)}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative mb-6">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple/20 border-t-purple" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="h-6 w-6 text-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-text">Generating Show Notes</h3>
          <p className="text-sm text-text-muted">
            Analyzing transcript and extracting key information...
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-text-dim">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This may take 15-30 seconds
          </div>
        </div>
      </div>
    );
  }

  // Show notes display
  return (
    <div className={cn("rounded-2xl border border-stroke bg-bg-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-text">Show Notes</h3>
          <p className="text-xs text-text-muted">
            Generated {formatDate(showNotes!.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab toggle */}
          <div className="flex rounded-lg border border-stroke bg-bg-0 p-1">
            <button
              onClick={() => setActiveTab("preview")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                activeTab === "preview"
                  ? "bg-teal/20 text-teal"
                  : "text-text-muted hover:text-text"
              )}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab("edit")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                activeTab === "edit"
                  ? "bg-teal/20 text-teal"
                  : "text-text-muted hover:text-text"
              )}
            >
              Edit
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={onRegenerate}
            className="rounded-lg border border-stroke bg-bg-0 p-2 text-text-muted transition-colors hover:bg-surface hover:text-text"
            title="Regenerate"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => onExport?.("markdown")}
              className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-xs font-medium text-teal transition-colors hover:bg-teal/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto p-6">
        {activeTab === "preview" ? (
          <div className="space-y-6">
            {/* Summary */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-text uppercase tracking-wide">
                  Episode Summary
                </h4>
                <button
                  onClick={() => handleCopy(showNotes!.summary, "summary")}
                  className={cn(
                    "rounded p-1.5 transition-colors",
                    copiedSection === "summary"
                      ? "bg-success/20 text-success"
                      : "text-text-muted hover:bg-surface hover:text-text"
                  )}
                  title="Copy summary"
                >
                  {copiedSection === "summary" ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-text-muted">
                {showNotes!.summary}
              </p>
            </section>

            {/* Key Points */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-text uppercase tracking-wide">
                  Key Points
                </h4>
                <button
                  onClick={() => handleCopy(showNotes!.keyPoints.join("\n"), "keyPoints")}
                  className={cn(
                    "rounded p-1.5 transition-colors",
                    copiedSection === "keyPoints"
                      ? "bg-success/20 text-success"
                      : "text-text-muted hover:bg-surface hover:text-text"
                  )}
                  title="Copy key points"
                >
                  {copiedSection === "keyPoints" ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <ul className="space-y-2">
                {showNotes!.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-text-muted">
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal/10 text-[10px] font-bold text-teal">
                      {index + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            {/* Topics */}
            <section>
              <h4 className="mb-2 text-sm font-semibold text-text uppercase tracking-wide">
                Topics Covered
              </h4>
              <div className="flex flex-wrap gap-2">
                {showNotes!.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-purple/10 px-3 py-1 text-xs font-medium text-purple"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </section>

            {/* Guests */}
            {showNotes!.guests && showNotes!.guests.length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-semibold text-text uppercase tracking-wide">
                  Guests
                </h4>
                <div className="space-y-2">
                  {showNotes!.guests.map((guest, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-stroke bg-surface p-3"
                    >
                      <p className="font-medium text-text">{guest.name}</p>
                      {guest.bio && (
                        <p className="mt-1 text-xs text-text-muted">{guest.bio}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Resources */}
            {showNotes!.resources && showNotes!.resources.length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-semibold text-text uppercase tracking-wide">
                  Resources & Links
                </h4>
                <ul className="space-y-1">
                  {showNotes!.resources.map((resource, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4 flex-shrink-0 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {resource.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal hover:underline"
                        >
                          {resource.title}
                        </a>
                      ) : (
                        <span className="text-text-muted">{resource.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          // Edit mode
          <div>
            <textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              className="min-h-[400px] w-full rounded-lg border border-stroke bg-bg-0 p-4 text-sm text-text outline-none focus:border-teal font-mono"
              placeholder="Edit your show notes here..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditedNotes(showNotes!.summary)}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface"
              >
                Reset
              </button>
              <button
                className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

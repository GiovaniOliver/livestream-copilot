"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "./useMindMapActions";
import { Button } from "@/components/ui/Button";

export interface SessionSummaryModalProps {
  summary: SessionSummary | null;
  isOpen: boolean;
  isGenerating: boolean;
  onClose: () => void;
  onExport: (summary: SessionSummary) => void;
  className?: string;
}

function SessionSummaryModal({
  summary,
  isOpen,
  isGenerating,
  onClose,
  onExport,
  className,
}: SessionSummaryModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center", className)}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-0/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-stroke bg-bg-1 shadow-modal">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple/30 to-teal/20 border border-purple/30">
              <svg className="h-5 w-5 text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">Session Summary</h2>
              <p className="text-sm text-text-muted">
                {summary ? `Generated ${summary.generatedAt.toLocaleTimeString()}` : "Generating..."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-text transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 max-h-[calc(90vh-140px)]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-4">
                <div className="h-16 w-16 rounded-full border-4 border-stroke" />
                <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-t-teal animate-spin" />
              </div>
              <p className="text-text font-medium">Generating Summary...</p>
              <p className="text-sm text-text-muted mt-1">Analyzing your brainstorming session</p>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  label="Ideas"
                  value={summary.totalIdeas}
                  color="text-teal"
                  bgColor="bg-teal/10"
                />
                <StatCard
                  label="Nodes"
                  value={summary.totalNodes}
                  color="text-purple"
                  bgColor="bg-purple/10"
                />
                <StatCard
                  label="Connections"
                  value={summary.totalConnections}
                  color="text-warning"
                  bgColor="bg-warning/10"
                />
                <StatCard
                  label="Actions"
                  value={summary.totalActionItems}
                  color="text-success"
                  bgColor="bg-success/10"
                />
              </div>

              {/* Eureka Moments */}
              {summary.eurekaCount > 0 && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-5 w-5 text-warning" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="font-semibold text-warning">
                      {summary.eurekaCount} Eureka Moment{summary.eurekaCount > 1 ? "s" : ""}!
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    Breakthrough ideas were detected during this session
                  </p>
                </div>
              )}

              {/* Key Themes */}
              <div>
                <h3 className="text-sm font-semibold text-text mb-3">Key Themes</h3>
                <div className="flex flex-wrap gap-2">
                  {summary.keyThemes.map((theme) => (
                    <span
                      key={theme}
                      className="inline-flex items-center rounded-full border border-purple/30 bg-purple/10 px-3 py-1.5 text-sm text-purple"
                    >
                      #{theme}
                    </span>
                  ))}
                </div>
              </div>

              {/* Top Ideas */}
              {summary.topIdeas.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text mb-3">Top Ideas</h3>
                  <div className="space-y-2">
                    {summary.topIdeas.map((idea, index) => (
                      <div
                        key={idea.id}
                        className="flex items-start gap-3 rounded-xl border border-stroke bg-bg-0 p-3"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-bold text-teal">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-text">{idea.text}</p>
                          <p className="text-xs text-text-muted mt-1">{idea.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clusters */}
              {summary.clusters.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text mb-3">Idea Clusters</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {summary.clusters.map((cluster) => (
                      <div
                        key={cluster.name}
                        className="rounded-xl border border-stroke bg-bg-0 p-3 text-center"
                      >
                        <p className="text-2xl font-bold text-teal">{cluster.ideaCount}</p>
                        <p className="text-xs text-text-muted">{cluster.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div>
                <h3 className="text-sm font-semibold text-text mb-3">Recommended Next Steps</h3>
                <div className="space-y-2">
                  {summary.nextSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-xl border border-stroke bg-bg-0 p-3"
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 border-success/50 text-success">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm text-text">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="h-12 w-12 text-text-dim mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-text-muted">No summary available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {summary && !isGenerating && (
          <div className="flex items-center justify-between border-t border-stroke px-6 py-4">
            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  // Copy to clipboard
                  const text = generateSummaryText(summary);
                  navigator.clipboard.writeText(text);
                }}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => onExport(summary)}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat card component
interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

function StatCard({ label, value, color, bgColor }: StatCardProps) {
  return (
    <div className={cn("rounded-xl p-4 text-center", bgColor)}>
      <p className={cn("text-3xl font-bold", color)}>{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}

// Helper to generate plain text summary
function generateSummaryText(summary: SessionSummary): string {
  const lines = [
    `BRAINSTORM SESSION SUMMARY`,
    `Generated: ${summary.generatedAt.toLocaleString()}`,
    ``,
    `STATISTICS`,
    `- Ideas: ${summary.totalIdeas}`,
    `- Nodes: ${summary.totalNodes}`,
    `- Connections: ${summary.totalConnections}`,
    `- Action Items: ${summary.totalActionItems}`,
    `- Eureka Moments: ${summary.eurekaCount}`,
    ``,
    `KEY THEMES`,
    summary.keyThemes.map((t) => `- ${t}`).join("\n"),
    ``,
    `TOP IDEAS`,
    summary.topIdeas.map((i, idx) => `${idx + 1}. ${i.text}`).join("\n"),
    ``,
    `IDEA CLUSTERS`,
    summary.clusters.map((c) => `- ${c.name}: ${c.ideaCount} ideas`).join("\n"),
    ``,
    `NEXT STEPS`,
    summary.nextSteps.map((s, idx) => `${idx + 1}. ${s}`).join("\n"),
  ];

  return lines.join("\n");
}

export { SessionSummaryModal };

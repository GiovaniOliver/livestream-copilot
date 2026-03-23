"use client";

import { type FC, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Quick Export Component
// Export button for current script/session state
// ============================================================================

interface QuickExportProps {
  readonly onExport: () => string;
  readonly sessionName?: string;
}

// Icons
const ArrowDownTrayIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const ClipboardDocumentIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H6m10.5-2.25a48.38 48.38 0 00-1.35-.045 1.125 1.125 0 00-1.15.992v.006c0 .413.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664M6.375 7.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5"
    />
  </svg>
);

const CheckIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const QuickExport: FC<QuickExportProps> = ({ onExport, sessionName }) => {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleDownload = useCallback(() => {
    const content = onExport();
    const fileName = sessionName
      ? `writers-corner-${sessionName.toLowerCase().replace(/\s+/g, "-")}.md`
      : `writers-corner-export-${new Date().toISOString().slice(0, 10)}.md`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [onExport, sessionName]);

  const handleCopy = useCallback(async () => {
    try {
      const content = onExport();
      await navigator.clipboard.writeText(content);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Clipboard API may not be available in all contexts
    }
  }, [onExport]);

  return (
    <div className="flex items-center gap-2">
      {/* Copy to clipboard */}
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
          copyFeedback
            ? "bg-success/10 text-success border border-success/30"
            : "bg-surface text-text-muted border border-stroke hover:text-text hover:bg-surface-hover"
        )}
        aria-label="Copy script to clipboard"
      >
        {copyFeedback ? (
          <>
            <CheckIcon className="h-4 w-4" />
            Copied
          </>
        ) : (
          <>
            <ClipboardDocumentIcon className="h-4 w-4" />
            Copy
          </>
        )}
      </button>

      {/* Download as file */}
      <button
        type="button"
        onClick={handleDownload}
        className={cn(
          "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
          "border border-teal/40 bg-gradient-brand text-text shadow-card",
          "hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0"
        )}
        aria-label="Download script as markdown"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        Export
      </button>
    </div>
  );
};

export { QuickExport };

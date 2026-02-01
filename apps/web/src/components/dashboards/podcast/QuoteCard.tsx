"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Quote } from "./types";
import { logger } from "@/lib/logger";

export interface QuoteCardProps {
  quote: Quote;
  onToggleFavorite?: (id: string) => void;
  onCopy?: (text: string) => void;
  onTimestampClick?: (timestamp: number) => void;
  formatTime: (seconds: number) => string;
}

export function QuoteCard({
  quote,
  onToggleFavorite,
  onCopy,
  onTimestampClick,
  formatTime,
}: QuoteCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(quote.text);
      setCopied(true);
      onCopy?.(quote.text);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className={cn(
        "group rounded-xl border border-stroke bg-bg-1 p-4 transition-all duration-200",
        "hover:border-teal/30 hover:shadow-elevated",
        quote.isFavorite && "border-purple/30 bg-purple/5"
      )}
    >
      {/* Quote text */}
      <blockquote className="mb-3 text-sm leading-relaxed text-text">
        <span className="text-teal">&ldquo;</span>
        {quote.text}
        <span className="text-teal">&rdquo;</span>
      </blockquote>

      {/* Meta and actions */}
      <div className="flex items-center justify-between">
        {/* Speaker and timestamp */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-purple">{quote.speaker}</span>
          <button
            onClick={() => onTimestampClick?.(quote.timestamp)}
            className="flex items-center gap-1 rounded-md bg-bg-0 px-2 py-1 text-xs text-text-muted transition-colors hover:bg-teal/10 hover:text-teal"
            title="Jump to timestamp"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {formatTime(quote.timestamp)}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={cn(
              "rounded-lg p-2 text-text-muted transition-all",
              copied
                ? "bg-success/20 text-success"
                : "hover:bg-surface hover:text-text"
            )}
            title={copied ? "Copied!" : "Copy quote"}
          >
            {copied ? (
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>

          {/* Favorite button */}
          <button
            onClick={() => onToggleFavorite?.(quote.id)}
            className={cn(
              "rounded-lg p-2 transition-all",
              quote.isFavorite
                ? "text-warning"
                : "text-text-muted hover:bg-surface hover:text-warning"
            )}
            title={quote.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg
              className="h-4 w-4"
              fill={quote.isFavorite ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

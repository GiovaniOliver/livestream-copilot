"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

// ============================================================
// Icons
// ============================================================

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ============================================================
// CopyToClipboard Component
// ============================================================

export interface CopyToClipboardProps {
  text: string;
  variant?: "button" | "inline" | "textarea";
  size?: "sm" | "md" | "lg";
  showPreview?: boolean;
  successDuration?: number;
  onCopy?: () => void;
  className?: string;
  disabled?: boolean;
}

export function CopyToClipboard({
  text,
  variant = "button",
  size = "md",
  showPreview = false,
  successDuration = 2000,
  onCopy,
  className,
  disabled = false,
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (disabled) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, successDuration);
    } catch (err) {
      logger.error("Failed to copy to clipboard:", err);
    }
  };

  const sizeStyles = {
    sm: {
      button: "h-8 px-3 text-xs gap-1.5",
      icon: "h-3.5 w-3.5",
      preview: "text-xs",
    },
    md: {
      button: "h-10 px-4 text-sm gap-2",
      icon: "h-4 w-4",
      preview: "text-sm",
    },
    lg: {
      button: "h-12 px-6 text-base gap-2.5",
      icon: "h-5 w-5",
      preview: "text-base",
    },
  };

  const styles = sizeStyles[size];

  // Button Variant
  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-200",
          styles.button,
          copied
            ? "border-teal/40 bg-teal/10 text-teal"
            : "border-stroke bg-surface text-text hover:bg-surface-hover hover:border-stroke-subtle",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
      >
        {copied ? (
          <>
            <CheckIcon className={styles.icon} />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <CopyIcon className={styles.icon} />
            <span>Copy</span>
          </>
        )}
      </button>
    );
  }

  // Inline Variant
  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1 transition-colors duration-200",
          copied
            ? "text-teal"
            : "text-text-muted hover:text-text",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
      >
        {copied ? (
          <>
            <CheckIcon className={styles.icon} />
            <span className={styles.preview}>Copied!</span>
          </>
        ) : (
          <>
            <CopyIcon className={styles.icon} />
            <span className={styles.preview}>Copy</span>
          </>
        )}
      </button>
    );
  }

  // Textarea Variant
  return (
    <div className={cn("space-y-2", className)}>
      {showPreview && (
        <label className="block text-sm font-medium text-text">
          Preview
        </label>
      )}
      <div className="relative">
        <textarea
          value={text}
          readOnly
          className={cn(
            "w-full rounded-lg border border-stroke bg-surface p-3 pr-12 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-teal",
            styles.preview,
            "text-text-muted"
          )}
          rows={4}
        />
        <button
          type="button"
          onClick={handleCopy}
          disabled={disabled}
          className={cn(
            "absolute right-2 top-2 flex items-center justify-center rounded-lg border p-2 transition-all duration-200",
            copied
              ? "border-teal/40 bg-teal/10 text-teal"
              : "border-stroke bg-bg-1 text-text-muted hover:bg-surface hover:text-text",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
        >
          {copied ? (
            <CheckIcon className={styles.icon} />
          ) : (
            <CopyIcon className={styles.icon} />
          )}
        </button>
      </div>
      {copied && (
        <div className="flex items-center gap-1.5 text-teal">
          <CheckIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}

export default CopyToClipboard;

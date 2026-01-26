"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================
// Icons
// ============================================================

function DownloadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================
// DownloadButton Component
// ============================================================

export interface DownloadButtonProps {
  url?: string;
  filename?: string;
  onDownload?: () => Promise<void> | void;
  variant?: "primary" | "default" | "ghost";
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DownloadButton({
  url,
  filename = "download",
  onDownload,
  variant = "primary",
  size = "md",
  showProgress = true,
  disabled = false,
  className,
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const handleDownload = async () => {
    if (disabled || isDownloading) return;

    setIsDownloading(true);
    setProgress(0);
    setIsComplete(false);

    try {
      // If custom onDownload handler is provided, use it
      if (onDownload) {
        await onDownload();

        // Simulate progress for better UX
        if (showProgress) {
          for (let i = 0; i <= 100; i += 10) {
            setProgress(i);
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
      // Otherwise, download from URL
      else if (url) {
        // Simulate progress if not tracking real progress
        if (showProgress) {
          const progressInterval = setInterval(() => {
            setProgress(prev => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 10;
            });
          }, 200);
        }

        // Create a temporary link and trigger download
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        if (showProgress) {
          setProgress(100);
        }
      }

      // Show success state
      setIsComplete(true);
      setTimeout(() => {
        setIsDownloading(false);
        setIsComplete(false);
        setProgress(0);
      }, 2000);
    } catch (error) {
      console.error("Download failed:", error);
      setIsDownloading(false);
      setProgress(0);
      // TODO: Show error toast
    }
  };

  const sizeStyles = {
    sm: {
      button: "h-8 px-3 text-xs gap-1.5",
      icon: "h-3.5 w-3.5",
    },
    md: {
      button: "h-10 px-4 text-sm gap-2",
      icon: "h-4 w-4",
    },
    lg: {
      button: "h-12 px-6 text-base gap-2.5",
      icon: "h-5 w-5",
    },
  };

  const variantStyles = {
    primary:
      "border border-teal/40 bg-gradient-brand text-text shadow-card hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0",
    default:
      "border border-stroke bg-surface text-text shadow-card hover:-translate-y-0.5 hover:bg-surface-hover active:translate-y-0",
    ghost:
      "border-transparent bg-transparent text-text-muted shadow-none hover:bg-surface hover:text-text",
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={disabled || isDownloading}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0",
          styles.button,
          isComplete
            ? "border-success/40 bg-success/10 text-success"
            : variantStyles[variant],
          (disabled || isDownloading) && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
        aria-label={
          isComplete
            ? "Download complete"
            : isDownloading
            ? "Downloading..."
            : "Download file"
        }
      >
        {/* Progress Background */}
        {isDownloading && showProgress && !isComplete && (
          <div
            className="absolute inset-0 bg-teal/20 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}

        {/* Button Content */}
        <div className="relative flex items-center gap-2">
          {isComplete ? (
            <>
              <CheckCircleIcon className={styles.icon} />
              <span>Downloaded!</span>
            </>
          ) : isDownloading ? (
            <>
              <LoadingSpinner className={styles.icon} />
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <DownloadIcon className={styles.icon} />
              <span>Download</span>
            </>
          )}
        </div>
      </button>

      {/* Progress Bar */}
      {isDownloading && showProgress && !isComplete && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Downloading...</span>
            <span className="font-medium text-text">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-2">
            <div
              className="h-full bg-gradient-to-r from-teal to-purple transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DownloadButton;

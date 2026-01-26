"use client";

import { cn } from "@/lib/utils";

// ============================================================
// Icons
// ============================================================

function ExportIcon({ className }: { className?: string }) {
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
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

// ============================================================
// ExportButton Component
// ============================================================

export interface ExportButtonProps {
  onClick: (e?: React.MouseEvent) => void;
  variant?: "default" | "primary" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  label?: string;
  showIcon?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  onClick,
  variant = "default",
  size = "md",
  label = "Export",
  showIcon = true,
  disabled = false,
  className,
}: ExportButtonProps) {
  const sizeStyles = {
    sm: {
      button: showIcon && label ? "h-8 px-3 text-xs gap-1.5" : "h-8 w-8",
      icon: "h-3.5 w-3.5",
    },
    md: {
      button: showIcon && label ? "h-10 px-4 text-sm gap-2" : "h-10 w-10",
      icon: "h-4 w-4",
    },
    lg: {
      button: showIcon && label ? "h-12 px-6 text-base gap-2.5" : "h-12 w-12",
      icon: "h-5 w-5",
    },
  };

  const variantStyles = {
    default:
      "border border-stroke bg-surface text-text shadow-card hover:-translate-y-0.5 hover:bg-surface-hover active:translate-y-0",
    primary:
      "border border-purple/40 bg-gradient-to-r from-purple/20 to-teal/20 text-text shadow-card hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0",
    ghost:
      "border-transparent bg-transparent text-text-muted shadow-none hover:bg-surface hover:text-text",
    icon: "rounded-full bg-bg-1/80 p-0 hover:bg-purple hover:text-white border-transparent",
  };

  const styles = sizeStyles[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0",
        styles.button,
        variantStyles[variant],
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      aria-label={label}
    >
      {showIcon && <ExportIcon className={styles.icon} />}
      {label && variant !== "icon" && <span>{label}</span>}
    </button>
  );
}

export default ExportButton;

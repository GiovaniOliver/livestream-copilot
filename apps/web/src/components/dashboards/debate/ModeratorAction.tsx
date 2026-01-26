"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { ModeratorActionConfig } from "./types";

export interface ModeratorActionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  action: ModeratorActionConfig;
  showDescription?: boolean;
  size?: "sm" | "md";
}

const actionIcons: Record<ModeratorActionConfig["icon"], React.ReactNode> = {
  clarify: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  factcheck: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  ),
  time: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  next: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 5l7 7-7 7M5 5l7 7-7 7"
      />
    </svg>
  ),
  pause: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  resume: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  ),
};

const variantStyles: Record<ModeratorActionConfig["variant"], string> = {
  default:
    "border-stroke bg-bg-1 text-text hover:bg-bg-2 hover:border-stroke/80",
  warning:
    "border-warning/30 bg-warning/10 text-warning hover:bg-warning/20",
  primary:
    "border-teal/30 bg-teal/10 text-teal hover:bg-teal/20",
};

const ModeratorAction = forwardRef<HTMLButtonElement, ModeratorActionProps>(
  ({ action, showDescription = false, size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex items-center gap-2 rounded-lg border transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[action.variant],
          size === "sm" ? "px-3 py-2" : "px-4 py-2.5",
          showDescription ? "flex-col items-start" : "flex-row",
          className
        )}
        title={action.description}
        {...props}
      >
        <div className="flex items-center gap-2">
          {actionIcons[action.icon]}
          <span className={cn("font-medium", size === "sm" ? "text-xs" : "text-sm")}>
            {action.label}
          </span>
        </div>
        {showDescription && action.description && (
          <span className="text-xs text-text-muted">{action.description}</span>
        )}
      </button>
    );
  }
);

ModeratorAction.displayName = "ModeratorAction";

export { ModeratorAction };

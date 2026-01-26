import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "teal" | "purple" | "success" | "warning" | "error";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default:
        "border-stroke bg-surface text-text-muted",
      teal: "border-teal/30 bg-teal/10 text-teal",
      purple: "border-purple/30 bg-purple/10 text-purple",
      success: "border-success/30 bg-success/10 text-success",
      warning: "border-warning/30 bg-warning/10 text-warning",
      error: "border-error/30 bg-error/10 text-error",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };

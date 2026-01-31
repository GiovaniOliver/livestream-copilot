"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SessionInfo {
  id: string;
  name: string;
  status: "live" | "paused" | "ended" | "active";
  duration?: string;
  workflow?: string;
}

interface DashboardHeaderProps {
  session?: SessionInfo;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Whether there's an actual live stream (overrides session.status for Live indicator) */
  isStreaming?: boolean;
}

const ChevronRightIcon = () => (
  <svg
    className="h-4 w-4 text-text-dim"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const LiveIndicator = () => (
  <span className="relative flex h-2 w-2">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
  </span>
);

export function DashboardHeader({
  session,
  title,
  subtitle,
  actions,
  isStreaming,
}: DashboardHeaderProps) {
  const getStatusBadge = (status: SessionInfo["status"], actuallyStreaming?: boolean) => {
    // If isStreaming is explicitly provided, use that for "Live" display
    if (actuallyStreaming === true) {
      return (
        <Badge variant="error" className="gap-1.5">
          <LiveIndicator />
          Live
        </Badge>
      );
    }

    // If isStreaming is explicitly false but session is active, show "Active" not "Live"
    if (actuallyStreaming === false && (status === "live" || status === "active")) {
      return <Badge variant="default">Active</Badge>;
    }

    switch (status) {
      case "live":
        return (
          <Badge variant="error" className="gap-1.5">
            <LiveIndicator />
            Live
          </Badge>
        );
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "paused":
        return <Badge variant="warning">Paused</Badge>;
      case "ended":
        return <Badge variant="default">Ended</Badge>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-stroke bg-bg-0/80 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: Breadcrumb and Title */}
        <div className="flex items-center gap-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/dashboard"
              className="text-text-muted transition-colors hover:text-text"
            >
              Dashboard
            </Link>
            {session && (
              <>
                <ChevronRightIcon />
                <Link
                  href={`/dashboard/session/${session.id}`}
                  className={cn(
                    "transition-colors",
                    title
                      ? "text-text-muted hover:text-text"
                      : "font-medium text-text"
                  )}
                >
                  {session.name}
                </Link>
                {title && (
                  <>
                    <ChevronRightIcon />
                    <span className="font-medium text-text">{title}</span>
                  </>
                )}
              </>
            )}
            {!session && title && (
              <>
                <ChevronRightIcon />
                <span className="font-medium text-text">{title}</span>
              </>
            )}
          </nav>
        </div>

        {/* Center: Session Status (if available) */}
        {session && (
          <div className="flex items-center gap-4">
            {getStatusBadge(session.status, isStreaming)}
            {session.duration && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-muted">Duration:</span>
                <span className="font-mono font-medium text-text">
                  {session.duration}
                </span>
              </div>
            )}
            {session.workflow && (
              <Badge variant="teal">{session.workflow}</Badge>
            )}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {actions}
          {/* Default actions */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text"
            aria-label="Settings"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text"
            aria-label="Notifications"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Optional subtitle */}
      {subtitle && (
        <div className="border-t border-stroke-subtle px-6 py-2">
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
      )}
    </header>
  );
}

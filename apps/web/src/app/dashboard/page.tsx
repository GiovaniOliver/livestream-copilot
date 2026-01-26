"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard";
import { NewSessionModal } from "@/components/dashboard/NewSessionModal";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
} from "@/components/ui";
import {
  getWorkflowLabel,
  getWorkflowPath,
  type Session,
} from "@/lib/stores/sessions";
import { useSessions } from "@/hooks/useSessions";

const PlusIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const FilmIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

const ArrowRightIcon = () => (
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
      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
    />
  </svg>
);

const StopIcon = () => (
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
      d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
    />
  </svg>
);

const TrashIcon = () => (
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
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const LiveIndicator = () => (
  <span className="relative flex h-2 w-2">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
  </span>
);

function getStatusBadge(status: Session["status"]) {
  switch (status) {
    case "live":
      return (
        <Badge variant="error" className="gap-1.5">
          <LiveIndicator />
          Live
        </Badge>
      );
    case "paused":
      return <Badge variant="warning">Paused</Badge>;
    case "ended":
      return <Badge variant="default">Ended</Badge>;
  }
}

function getWorkflowBadge(workflow: string) {
  const label = getWorkflowLabel(workflow as any);
  return <Badge variant="teal">{label}</Badge>;
}

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use the useSessions hook for data fetching and real-time updates
  const {
    sessions,
    activeSession,
    isLoading,
    error,
    isConnected,
    endSession: endSessionApi,
    deleteSession: deleteSessionApi,
    refreshSessions,
    clearError,
  } = useSessions();

  const handleEndSession = useCallback(async (id: string) => {
    try {
      await endSessionApi(id);
    } catch (err) {
      // Error is already set in the hook
      console.error("Failed to end session:", err);
    }
  }, [endSessionApi]);

  const handleDeleteSession = useCallback(async (id: string) => {
    if (confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      try {
        await deleteSessionApi(id);
      } catch (err) {
        // Error is already set in the hook
        console.error("Failed to delete session:", err);
      }
    }
  }, [deleteSessionApi]);

  // Calculate stats
  const activeSessions = sessions.filter((s) => s.status === "live" || s.status === "paused").length;
  const totalClips = sessions.reduce((sum, s) => sum + s.clipCount, 0);
  const totalOutputs = sessions.reduce((sum, s) => sum + s.outputCount, 0);

  // Calculate total runtime
  const totalRuntimeMs = sessions.reduce((sum, session) => {
    const parts = session.duration.split(":").map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return sum + (hours * 3600 + minutes * 60 + seconds) * 1000;
  }, 0);
  const totalHours = Math.floor(totalRuntimeMs / 3600000);
  const totalMinutes = Math.floor((totalRuntimeMs % 3600000) / 60000);
  const totalRuntime = `${totalHours}h ${totalMinutes.toString().padStart(2, "0")}m`;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader title="Sessions" />

      <div className="flex-1 p-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-error/50 bg-error/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium text-error">Connection Error</p>
                  <p className="text-sm text-error/80">{error}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-error hover:bg-error/10"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && !isLoading && (
          <div className="mb-6 rounded-lg border border-warning/50 bg-warning/10 p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-warning" />
              </span>
              <p className="text-sm text-warning">
                Not connected to live updates. Events may not appear in real-time.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <ClockIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Active Sessions</p>
                <p className="text-2xl font-bold text-text">{activeSessions}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <FilmIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Total Clips</p>
                <p className="text-2xl font-bold text-text">{totalClips}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <DocumentIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Outputs Generated</p>
                <p className="text-2xl font-bold text-text">{totalOutputs}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <ClockIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Total Runtime</p>
                <p className="text-2xl font-bold text-text">{totalRuntime}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text">Your Sessions</h2>
            <p className="text-sm text-text-muted">
              Manage and view all your FluxBoard sessions
            </p>
          </div>
          <Button
            variant="primary"
            className="gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusIcon />
            New Session
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <svg className="h-8 w-8 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* Sessions Grid */}
        {!isLoading && sessions.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sessions.map((session) => (
              <Card key={session.id} variant="elevated" className="group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{session.name}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(session.status)}
                        {getWorkflowBadge(session.workflow)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <ClockIcon />
                      <span className="text-text-muted">Duration:</span>
                      <span className="font-mono font-medium text-text">
                        {session.duration}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FilmIcon />
                      <span className="text-text-muted">Clips:</span>
                      <span className="font-medium text-text">
                        {session.clipCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DocumentIcon />
                      <span className="text-text-muted">Outputs:</span>
                      <span className="font-medium text-text">
                        {session.outputCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <div className="flex gap-2">
                    {session.status === "live" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-error hover:bg-error/10"
                        onClick={() => handleEndSession(session.id)}
                      >
                        <StopIcon />
                        End
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-text-muted hover:text-error"
                      onClick={() => handleDeleteSession(session.id)}
                    >
                      <TrashIcon />
                      Delete
                    </Button>
                  </div>
                  <Link href={`/dashboard/session/${session.id}/${getWorkflowPath(session.workflow as any)}`}>
                    <Button variant="ghost" size="sm" className="gap-2">
                      View Session
                      <ArrowRightIcon />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sessions.length === 0 && (
          <Card className="py-16 text-center">
            <CardContent>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
                <ClockIcon />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-text">
                No sessions yet
              </h3>
              <p className="mb-6 text-text-muted">
                Start your first session to begin capturing and creating.
              </p>
              <Button
                variant="primary"
                className="gap-2"
                onClick={() => setIsModalOpen(true)}
              >
                <PlusIcon />
                Create Session
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Session Modal */}
      <NewSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSessionCreated={refreshSessions}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "@/components/ui";
import { useSession } from "@/hooks/useSessions";
import { WORKFLOW_META, type WorkflowType } from "@/lib/constants";

type ConnectionStatus = "idle" | "waiting" | "connected" | "recording";

const PlayIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
    />
  </svg>
);

const PauseIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 5.25v13.5m-7.5-13.5v13.5"
    />
  </svg>
);

const StopIcon = () => (
  <svg
    className="h-5 w-5"
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

const ArrowRightIcon = () => (
  <svg
    className="h-5 w-5"
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

function RecordingDot({ isRecording }: { isRecording: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 rounded-full ${
        isRecording
          ? "animate-pulse bg-error shadow-[0_0_12px_rgba(239,68,68,0.6)]"
          : "bg-text-muted"
      }`}
    />
  );
}

function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  const statusConfig: Record<
    ConnectionStatus,
    { label: string; className: string }
  > = {
    idle: {
      label: "Ready",
      className: "bg-text-muted/20 text-text-muted",
    },
    waiting: {
      label: "Waiting for OBS...",
      className: "bg-warning/20 text-warning animate-pulse",
    },
    connected: {
      label: "Connected to OBS",
      className: "bg-success/20 text-success",
    },
    recording: {
      label: "Recording",
      className: "bg-error/20 text-error",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge className={`px-3 py-1 text-sm font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

export default function SessionPage() {
  const params = useParams();
  const id = params.id as string;

  const { session, isLoading } = useSession(id);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");

  const handleStartRecording = () => {
    if (connectionStatus === "idle") {
      setConnectionStatus("waiting");
      // Simulate connection to OBS
      setTimeout(() => {
        setConnectionStatus("connected");
        setTimeout(() => {
          setConnectionStatus("recording");
        }, 500);
      }, 1500);
    }
  };

  const handleStopRecording = () => {
    setConnectionStatus("idle");
  };

  const isRecording = connectionStatus === "recording";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-text-muted">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="text-xl text-text">Session not found</div>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const workflowMeta = WORKFLOW_META[session.workflow as WorkflowType];
  const dashboardPath = `/dashboard/session/${id}/${workflowMeta?.path || "content-creator"}`;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={{
          id: session.id,
          name: session.name,
          status: session.status,
          duration: session.duration,
        }}
        actions={
          <div className="flex items-center gap-2">
            {session.status === "live" ? (
              <Button variant="outline" size="sm" className="gap-2">
                <PauseIcon />
                Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="gap-2">
                <PlayIcon />
                Resume
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2 text-error">
              <StopIcon />
              End Session
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6">
        {/* Session Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{session.name}</CardTitle>
            <CardDescription>
              Workflow: {workflowMeta?.label || session.workflow}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-text-muted">Status</p>
                <p className="font-medium capitalize text-text">
                  {session.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Duration</p>
                <p className="font-mono font-medium text-text">
                  {session.duration}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Clips</p>
                <p className="font-medium text-text">{session.clipCount}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Outputs</p>
                <p className="font-medium text-text">{session.outputCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recording Control Section */}
        <div className="mb-8 flex flex-col items-center justify-center gap-6 rounded-2xl border border-bg2 bg-bg1 p-12">
          <ConnectionStatusBadge status={connectionStatus} />

          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`group flex h-32 w-32 items-center justify-center rounded-full border-4 transition-all duration-300 ${
              isRecording
                ? "border-error bg-error/10 hover:bg-error/20"
                : "border-text-muted bg-bg2 hover:border-teal hover:bg-teal/10"
            }`}
          >
            <RecordingDot isRecording={isRecording} />
          </button>

          <div className="text-center">
            <p className="text-lg font-semibold text-text">
              {isRecording ? "Recording in Progress" : "Ready to Record"}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {isRecording
                ? "Click to stop recording"
                : "Click to start recording from OBS"}
            </p>
          </div>

          <Button
            size="lg"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`min-w-[200px] gap-3 text-lg ${
              isRecording
                ? "bg-error hover:bg-error/90"
                : "bg-teal hover:bg-teal/90"
            }`}
          >
            {isRecording ? (
              <>
                <StopIcon />
                Stop Recording
              </>
            ) : (
              <>
                <RecordingDot isRecording={false} />
                Start Recording
              </>
            )}
          </Button>
        </div>

        {/* Assigned Workflow Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Assigned Workflow</CardTitle>
            <CardDescription>
              This session is configured to use the{" "}
              {workflowMeta?.label || session.workflow} workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text">
                  {workflowMeta?.label || session.workflow}
                </h3>
                <p className="text-sm text-text-muted">
                  {workflowMeta?.description || "Custom workflow configuration"}
                </p>
              </div>
              <Link href={dashboardPath}>
                <Button size="lg" className="gap-2 bg-teal hover:bg-teal/90">
                  Go to Dashboard
                  <ArrowRightIcon />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

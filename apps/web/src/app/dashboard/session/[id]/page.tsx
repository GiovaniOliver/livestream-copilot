"use client";

import { useState } from "react";
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
import { useLiveStream } from "@/hooks/useLiveStream";
import { WORKFLOW_META, type WorkflowType } from "@/lib/constants";

type ConnectionStatus = "idle" | "waiting" | "connected" | "streaming";

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
    streaming: {
      label: "Streaming",
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

  // Use real stream status from backend
  const { status: videoStatus, isLoading: videoLoading, startServer, isActionPending } = useLiveStream();

  // Derive connection status from actual stream state
  const getConnectionStatus = (): ConnectionStatus => {
    if (!videoStatus) return "idle";
    if (videoStatus.isStreaming) return "streaming";
    if (videoStatus.isRunning) return "connected";
    return "idle";
  };

  const connectionStatus = getConnectionStatus();
  const isStreaming = connectionStatus === "streaming";

  const handleStartServer = async () => {
    try {
      await startServer();
    } catch (error) {
      // Error is already handled in hook
    }
  };

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
        isStreaming={isStreaming}
        actions={
          <div className="flex items-center gap-2">
            {isStreaming ? (
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

        {/* Stream Status Section */}
        <div className="mb-8 flex flex-col items-center justify-center gap-6 rounded-2xl border border-bg2 bg-bg1 p-12">
          <ConnectionStatusBadge status={connectionStatus} />

          <div
            className={`group flex h-32 w-32 items-center justify-center rounded-full border-4 transition-all duration-300 ${
              isStreaming
                ? "border-error bg-error/10"
                : connectionStatus === "connected"
                  ? "border-success bg-success/10"
                  : "border-text-muted bg-bg2"
            }`}
          >
            <RecordingDot isRecording={isStreaming} />
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-text">
              {isStreaming
                ? "Stream Active"
                : connectionStatus === "connected"
                  ? "MediaMTX Server Running"
                  : "Waiting for Stream"}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {isStreaming
                ? "OBS is actively streaming"
                : connectionStatus === "connected"
                  ? "Ready to receive OBS stream"
                  : "Start MediaMTX server or connect OBS to begin streaming"}
            </p>
            {videoStatus && (
              <p className="mt-2 text-xs text-text-dim font-mono">
                RTMP URL: {videoStatus.rtmpUrl}
              </p>
            )}
          </div>

          {connectionStatus === "idle" && (
            <Button
              size="lg"
              onClick={handleStartServer}
              disabled={isActionPending || videoLoading}
              className="min-w-[200px] gap-3 text-lg bg-teal hover:bg-teal/90"
            >
              {isActionPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayIcon />
                  Start Video Server
                </>
              )}
            </Button>
          )}
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

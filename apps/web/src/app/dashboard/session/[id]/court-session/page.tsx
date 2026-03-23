"use client";

import type * as React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardHeader } from "@/components/dashboard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "@/components/ui";
import { type Session } from "@/lib/stores/sessions";
import { useSession } from "@/hooks/useSessions";
import { useParams } from "next/navigation";
import { LivePreview, useLiveStream } from "@/components/video";
import { useCourtSession } from "@/hooks/useCourtSession";
import {
  CaseOverviewPanel,
  EvidenceBoard,
  ArgumentTimeline,
  ObjectionLog,
  VerdictTracker,
  RulingSummaryPanel,
  ActionPanel,
} from "@/components/dashboards/court";
import type { LegalEvidence } from "@/components/dashboards/court/types";

// =============================================================================
// Icons
// =============================================================================

const ScaleIcon = () => (
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
      d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
    />
  </svg>
);

const DocumentIcon = () => (
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
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

const ChatBubbleIcon = () => (
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
      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
    />
  </svg>
);

const HandRaisedIcon = () => (
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
      d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15m.002 0h-.002"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// =============================================================================
// Page Component
// =============================================================================

export default function CourtSessionPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Live stream status
  const { status: videoStatus } = useLiveStream();

  // Load session from API
  const { session: apiSession, isLoading: sessionLoading } = useSession(id);
  useEffect(() => {
    if (apiSession) {
      setSession(apiSession);
    }
    if (!sessionLoading) {
      setIsLoading(false);
    }
  }, [apiSession, sessionLoading]);

  // Court Session WebSocket-driven state
  const {
    evidence,
    claims,
    objections,
    timeline,
    participants,
    verdictProgress,
    evidenceCount,
    claimCount,
    objectionCount,
    prosecutionClaimCount,
    defenseClaimCount,
    isConnected,
    selectedEvidenceId,
    selectEvidence,
  } = useCourtSession(id);

  // Compute derived stats
  const progressPercentage = useMemo(() => {
    const completed = verdictProgress.completedPhases.length;
    const total = 7; // Total trial phases
    return Math.round((completed / total) * 100);
  }, [verdictProgress.completedPhases.length]);

  // Handlers
  const handleSelectEvidence = useCallback(
    (ev: LegalEvidence) => {
      selectEvidence(ev.id === selectedEvidenceId ? null : ev.id);
    },
    [selectEvidence, selectedEvidenceId]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-0">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
          <span className="text-sm text-text-muted">Loading court session...</span>
        </div>
      </div>
    );
  }

  const sessionInfo = session
    ? {
        id: session.id,
        name: session.name,
        status: session.status,
        duration: session.duration,
        workflow: "Court Session",
      }
    : {
        id,
        name: "Court Session",
        status: "active" as const,
        duration: "0:00:00",
        workflow: "Court Session",
      };

  return (
    <div className="flex min-h-screen flex-col bg-bg-0">
      <DashboardHeader
        session={sessionInfo}
        isStreaming={videoStatus?.isStreaming}
        title="Court Session"
        subtitle="Track evidence, arguments, objections, and verdict progress in real-time"
      />

      <div className="flex-1 p-6">
        {/* Connection status indicator */}
        {!isConnected && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-xs text-warning">
              WebSocket disconnected. Real-time updates paused.
            </span>
          </div>
        )}

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<DocumentIcon />}
            iconBg="bg-teal/10"
            label="Evidence Items"
            value={evidenceCount}
          />
          <StatCard
            icon={<ChatBubbleIcon />}
            iconBg="bg-purple/10"
            label="Legal Claims"
            value={claimCount}
          />
          <StatCard
            icon={<HandRaisedIcon />}
            iconBg="bg-warning/10"
            label="Objections"
            value={objectionCount}
          />
          <StatCard
            icon={<ScaleIcon />}
            iconBg="bg-success/10"
            label="Verdict Progress"
            value={`${progressPercentage}%`}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Main Content Area */}
          <div className="space-y-6 xl:col-span-2">
            {/* Evidence Board */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DocumentIcon />
                  Evidence Board
                </CardTitle>
                <CardDescription>
                  Exhibits and evidence items submitted to the court
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EvidenceBoard
                  evidence={evidence}
                  selectedEvidenceId={selectedEvidenceId}
                  onSelectEvidence={handleSelectEvidence}
                />
              </CardContent>
            </Card>

            {/* Argument Timeline */}
            <ArgumentTimeline claims={claims} autoScroll />

            {/* Objection Log */}
            <ObjectionLog objections={objections} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Live Preview */}
            <Card variant="elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <LivePreview
                  captureMode={session?.captureMode}
                  webrtcUrl={videoStatus?.webrtcUrl}
                  hlsUrl={videoStatus?.hlsUrl}
                  isStreamActive={videoStatus?.isStreaming}
                  size="sm"
                />
              </CardContent>
            </Card>

            {/* Case Overview */}
            <CaseOverviewPanel
              caseTitle={session?.name || "Court Session"}
              participants={participants}
              currentPhase={verdictProgress.currentPhase}
              duration={session?.duration || "0:00:00"}
              evidenceCount={evidenceCount}
              claimCount={claimCount}
              objectionCount={objectionCount}
            />

            {/* Verdict Tracker */}
            <VerdictTracker verdictProgress={verdictProgress} />

            {/* Ruling Summary */}
            <RulingSummaryPanel
              claims={claims}
              evidence={evidence}
              objections={objections}
              prosecutionStrength={verdictProgress.prosecutionStrength}
              defenseStrength={verdictProgress.defenseStrength}
            />

            {/* AI Actions Panel */}
            <Card variant="elevated">
              <CardContent>
                <ActionPanel isSessionActive={isConnected} />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Court Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-between">
                    Export Transcript
                    <ChevronRightIcon />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    Generate Case Brief
                    <ChevronRightIcon />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    Review Evidence
                    <ChevronRightIcon />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    Call Recess
                    <ChevronRightIcon />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
}

function StatCard({ icon, iconBg, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-2xl font-bold text-text">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

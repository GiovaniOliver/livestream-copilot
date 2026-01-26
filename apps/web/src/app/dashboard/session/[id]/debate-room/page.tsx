"use client";

import { useEffect, useState } from "react";
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
import { use } from "react";

// =============================================================================
// Types
// =============================================================================

interface Claim {
  id: string;
  speaker: string;
  side: "pro" | "con";
  content: string;
  timestamp: string;
  parentClaimId?: string;
  rebuttals: string[];
  sources: string[];
  strength: number;
}

interface Rebuttal {
  id: string;
  claimId: string;
  speaker: string;
  side: "pro" | "con";
  content: string;
  timestamp: string;
  status: "pending" | "addressed" | "dismissed";
}

interface Source {
  id: string;
  claimId: string;
  title: string;
  type: "study" | "statistic" | "expert" | "anecdote" | "document";
  url?: string;
  excerpt?: string;
  credibility: "high" | "medium" | "low" | "unverified";
}

interface Participant {
  id: string;
  name: string;
  side: "pro" | "con" | "moderator";
  speakingTimeSeconds: number;
  claimCount: number;
  rebuttalCount: number;
}

interface DebateEvent {
  id: string;
  type: "claim" | "rebuttal" | "source" | "turn_change" | "topic_shift";
  timestamp: string;
  participantId: string;
  description: string;
}

interface DebateRoomPageProps {
  params: Promise<{ id: string }>;
}

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

const ArrowPathIcon = () => (
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
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const DocumentTextIcon = () => (
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

const ClockIcon = () => (
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
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ChatBubbleLeftRightIcon = () => (
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
      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
    />
  </svg>
);

const PlusIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const LinkIcon = () => (
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
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
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

const ExclamationTriangleIcon = () => (
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
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

const CheckCircleIcon = () => (
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
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const XCircleIcon = () => (
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
      d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// =============================================================================
// Helper Functions
// =============================================================================

function formatSpeakingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getCredibilityColor(credibility: Source["credibility"]): string {
  switch (credibility) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    case "low":
      return "error";
    case "unverified":
    default:
      return "default";
  }
}

function getSourceTypeLabel(type: Source["type"]): string {
  const labels: Record<Source["type"], string> = {
    study: "Study",
    statistic: "Statistic",
    expert: "Expert Opinion",
    anecdote: "Anecdote",
    document: "Document",
  };
  return labels[type];
}

// =============================================================================
// Component
// =============================================================================

export default function DebateRoomPage({ params }: DebateRoomPageProps) {
  const { id } = use(params);

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Empty state arrays - no mock data
  const [claims] = useState<Claim[]>([]);
  const [rebuttals] = useState<Rebuttal[]>([]);
  const [sources] = useState<Source[]>([]);
  const [participants] = useState<Participant[]>([]);
  const [debateEvents] = useState<DebateEvent[]>([]);

  // Derived stats
  const totalClaims = claims.length;
  const totalRebuttals = rebuttals.length;
  const totalSources = sources.length;
  const totalSpeakingTime = participants.reduce(
    (acc, p) => acc + p.speakingTimeSeconds,
    0
  );

  const proClaims = claims.filter((c) => c.side === "pro");
  const conClaims = claims.filter((c) => c.side === "con");
  const pendingRebuttals = rebuttals.filter((r) => r.status === "pending");

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  const sessionInfo = session
    ? {
        id: session.id,
        name: session.name,
        status: session.status,
        duration: session.duration,
        workflow: "Debate Room",
      }
    : {
        id,
        name: "Debate Session",
        status: "live" as const,
        duration: "0:00:00",
        workflow: "Debate Room",
      };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={sessionInfo}
        title="Debate Room"
        subtitle="Structured debate analysis with argument tracking and evidence management"
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <ScaleIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Claims</p>
                <p className="text-2xl font-bold text-text">{totalClaims}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <ArrowPathIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Rebuttals</p>
                <p className="text-2xl font-bold text-text">{totalRebuttals}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <DocumentTextIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Sources</p>
                <p className="text-2xl font-bold text-text">{totalSources}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <ClockIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Speaking Time</p>
                <p className="text-2xl font-bold text-text">
                  {formatSpeakingTime(totalSpeakingTime)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Main Content Area */}
          <div className="space-y-6 xl:col-span-2">
            {/* Claims Graph */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Claims Graph</CardTitle>
                    <CardDescription>
                      Argument structure and relationships
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm" className="gap-1">
                    <PlusIcon />
                    Add Claim
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-bg-2">
                  {claims.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                        <ScaleIcon />
                      </div>
                      <p className="text-sm font-medium text-text">
                        No claims recorded yet
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        Claims will appear here as they are made during the
                        debate
                      </p>
                    </div>
                  ) : (
                    <div className="absolute inset-0 p-4">
                      {/* Graph visualization would go here */}
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-text-muted">
                          Graph visualization
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Argument Threads - Pro vs Con */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Argument Threads</CardTitle>
                <CardDescription>
                  Pro and con positions side by side
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Pro Side */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-teal" />
                      <span className="text-sm font-semibold text-text">
                        Pro ({proClaims.length})
                      </span>
                    </div>
                    <div className="space-y-3">
                      {proClaims.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-stroke bg-bg-2 p-6 text-center">
                          <p className="text-sm text-text-muted">
                            No pro arguments yet
                          </p>
                        </div>
                      ) : (
                        proClaims.map((claim) => (
                          <div
                            key={claim.id}
                            className="rounded-xl border border-teal/30 bg-teal/5 p-4"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <Badge variant="teal">{claim.speaker}</Badge>
                              <span className="font-mono text-xs text-text-muted">
                                {claim.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-text">{claim.content}</p>
                            <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
                              <span className="flex items-center gap-1">
                                <ArrowPathIcon />
                                {claim.rebuttals.length} rebuttals
                              </span>
                              <span className="flex items-center gap-1">
                                <LinkIcon />
                                {claim.sources.length} sources
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Con Side */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-error" />
                      <span className="text-sm font-semibold text-text">
                        Con ({conClaims.length})
                      </span>
                    </div>
                    <div className="space-y-3">
                      {conClaims.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-stroke bg-bg-2 p-6 text-center">
                          <p className="text-sm text-text-muted">
                            No con arguments yet
                          </p>
                        </div>
                      ) : (
                        conClaims.map((claim) => (
                          <div
                            key={claim.id}
                            className="rounded-xl border border-error/30 bg-error/5 p-4"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <Badge variant="error">{claim.speaker}</Badge>
                              <span className="font-mono text-xs text-text-muted">
                                {claim.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-text">{claim.content}</p>
                            <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
                              <span className="flex items-center gap-1">
                                <ArrowPathIcon />
                                {claim.rebuttals.length} rebuttals
                              </span>
                              <span className="flex items-center gap-1">
                                <LinkIcon />
                                {claim.sources.length} sources
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Source/Evidence Cards */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sources & Evidence</CardTitle>
                    <CardDescription>
                      Referenced materials and citations
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1">
                    <PlusIcon />
                    Add Source
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sources.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stroke bg-bg-2 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                      <DocumentTextIcon />
                    </div>
                    <p className="text-sm font-medium text-text">
                      No sources added yet
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Sources and evidence will be tracked here as they are
                      cited
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {sources.map((source) => (
                      <div
                        key={source.id}
                        className="rounded-xl border border-stroke bg-surface p-4"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex-1">
                            <span className="text-xs text-text-muted">
                              {getSourceTypeLabel(source.type)}
                            </span>
                            <h4 className="mt-0.5 font-medium text-text">
                              {source.title}
                            </h4>
                          </div>
                          <Badge
                            variant={
                              getCredibilityColor(source.credibility) as
                                | "success"
                                | "warning"
                                | "error"
                                | "default"
                            }
                          >
                            {source.credibility}
                          </Badge>
                        </div>
                        {source.excerpt && (
                          <p className="mb-3 text-sm text-text-muted">
                            "{source.excerpt}"
                          </p>
                        )}
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-teal transition-colors hover:text-teal-400"
                          >
                            <LinkIcon />
                            View Source
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Debate Flow Timeline */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Debate Flow Timeline</CardTitle>
                <CardDescription>
                  Chronological view of debate events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {debateEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stroke bg-bg-2 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                      <ChatBubbleLeftRightIcon />
                    </div>
                    <p className="text-sm font-medium text-text">
                      No debate events yet
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      The timeline will populate as the debate progresses
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-stroke" />
                    <div className="space-y-4">
                      {debateEvents.map((event) => (
                        <div key={event.id} className="relative pl-10">
                          <div className="absolute left-2 top-1.5 h-4 w-4 rounded-full border-2 border-stroke bg-surface" />
                          <div className="rounded-lg bg-surface p-3">
                            <div className="mb-1 flex items-center gap-2">
                              <Badge variant="default">{event.type}</Badge>
                              <span className="font-mono text-xs text-text-muted">
                                {event.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-text">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rebuttal Queue */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Rebuttal Queue</CardTitle>
                    <CardDescription>
                      Pending responses ({pendingRebuttals.length})
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pendingRebuttals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stroke bg-bg-2 p-6 text-center">
                    <p className="text-sm text-text-muted">
                      No pending rebuttals
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRebuttals.map((rebuttal) => (
                      <div
                        key={rebuttal.id}
                        className="rounded-xl border border-stroke bg-surface p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <Badge
                            variant={
                              rebuttal.side === "pro" ? "teal" : "error"
                            }
                          >
                            {rebuttal.speaker}
                          </Badge>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="rounded p-1 text-success transition-colors hover:bg-success/10"
                              aria-label="Mark as addressed"
                            >
                              <CheckCircleIcon />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1 text-error transition-colors hover:bg-error/10"
                              aria-label="Dismiss"
                            >
                              <XCircleIcon />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-text">{rebuttal.content}</p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-text-muted">
                          <ExclamationTriangleIcon />
                          <span>Pending response</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Speaking Time Tracker */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Speaking Time</CardTitle>
                <CardDescription>Per participant breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stroke bg-bg-2 p-6 text-center">
                    <p className="text-sm text-text-muted">
                      No participants yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {participants.map((participant) => {
                      const percentage =
                        totalSpeakingTime > 0
                          ? (participant.speakingTimeSeconds /
                              totalSpeakingTime) *
                            100
                          : 0;
                      const barColor =
                        participant.side === "pro"
                          ? "bg-teal"
                          : participant.side === "con"
                            ? "bg-error"
                            : "bg-purple";

                      return (
                        <div key={participant.id}>
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${barColor}`}
                              />
                              <span className="text-sm font-medium text-text">
                                {participant.name}
                              </span>
                              <Badge
                                variant={
                                  participant.side === "pro"
                                    ? "teal"
                                    : participant.side === "con"
                                      ? "error"
                                      : "purple"
                                }
                              >
                                {participant.side}
                              </Badge>
                            </div>
                            <span className="font-mono text-sm text-text">
                              {formatSpeakingTime(participant.speakingTimeSeconds)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-bg-2">
                            <div
                              className={`h-full transition-all ${barColor}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-text-muted">
                            <span>{participant.claimCount} claims</span>
                            <span>{participant.rebuttalCount} rebuttals</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-between">
                    Export Debate Summary
                    <ChevronRightIcon />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    Generate Fact-Check Report
                    <ChevronRightIcon />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    Download Transcript
                    <ChevronRightIcon />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    View Argument Map
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

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
import { useParams } from "next/navigation";
import { LivePreview, useLiveStream } from "@/components/video";

// Types for Court Session data
interface Exhibit {
  id: string;
  label: string;
  type: "document" | "photo" | "video" | "audio" | "physical";
  description: string;
  timestamp: string;
  status: "admitted" | "objected" | "pending";
  submittedBy: "prosecution" | "defense";
}

interface Witness {
  id: string;
  name: string;
  role: "prosecution" | "defense" | "expert" | "character";
  status: "scheduled" | "testifying" | "cross-examined" | "completed";
  timestamp: string;
  keyPoints: string[];
}

interface Argument {
  id: string;
  side: "prosecution" | "defense";
  type: "opening" | "direct" | "cross" | "redirect" | "closing" | "objection" | "rebuttal";
  content: string;
  timestamp: string;
  sustained?: boolean;
}

interface VerdictProgress {
  phase: "opening" | "prosecution-case" | "defense-case" | "closing" | "deliberation" | "verdict";
  completedPhases: string[];
  currentPhase: string;
  notes: string[];
}

// Icons
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

const UserIcon = () => (
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
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
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

const CheckCircleIcon = () => (
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
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const GavelIcon = () => (
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
      d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
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

// Status styles
const exhibitStatusStyles: Record<string, { badge: "success" | "warning" | "error" | "default"; label: string }> = {
  admitted: { badge: "success", label: "Admitted" },
  objected: { badge: "error", label: "Objected" },
  pending: { badge: "warning", label: "Pending" },
};

const witnessStatusStyles: Record<string, { badge: "success" | "warning" | "error" | "default" | "teal"; label: string }> = {
  scheduled: { badge: "default", label: "Scheduled" },
  testifying: { badge: "teal", label: "Testifying" },
  "cross-examined": { badge: "warning", label: "Cross-Examined" },
  completed: { badge: "success", label: "Completed" },
};

const exhibitTypeIcons: Record<string, string> = {
  document: "Document",
  photo: "Photo",
  video: "Video",
  audio: "Audio",
  physical: "Physical",
};

const phaseLabels: Record<string, string> = {
  opening: "Opening Statements",
  "prosecution-case": "Prosecution's Case",
  "defense-case": "Defense's Case",
  closing: "Closing Arguments",
  deliberation: "Deliberation",
  verdict: "Verdict",
};

export default function CourtSessionPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Empty state - no mock data
  const [exhibits] = useState<Exhibit[]>([]);
  const [witnesses] = useState<Witness[]>([]);
  const [arguments_] = useState<Argument[]>([]);
  const [verdictProgress] = useState<VerdictProgress>({
    phase: "opening",
    completedPhases: [],
    currentPhase: "opening",
    notes: [],
  });

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

  // Calculate stats
  const prosecutionArguments = arguments_.filter((a) => a.side === "prosecution");
  const defenseArguments = arguments_.filter((a) => a.side === "defense");
  const completedPhaseCount = verdictProgress.completedPhases.length;
  const totalPhases = Object.keys(phaseLabels).length;
  const progressPercentage = Math.round((completedPhaseCount / totalPhases) * 100);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-text-muted">Loading court session...</div>
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
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={sessionInfo}
        isStreaming={videoStatus?.isStreaming}
        title="Court Session"
        subtitle="Track evidence, witnesses, arguments, and verdict progress in real-time"
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <DocumentIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Evidence Items</p>
                <p className="text-2xl font-bold text-text">{exhibits.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <UserIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Witnesses</p>
                <p className="text-2xl font-bold text-text">{witnesses.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <ChatBubbleIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Arguments</p>
                <p className="text-2xl font-bold text-text">{arguments_.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <ScaleIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Verdict Progress</p>
                <p className="text-2xl font-bold text-text">{progressPercentage}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Evidence Board */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GavelIcon />
                      Evidence Board
                    </CardTitle>
                    <CardDescription>
                      Exhibits submitted to the court
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Filter
                    </Button>
                    <Button variant="primary" size="sm" className="gap-1">
                      <PlusIcon />
                      Add Exhibit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {exhibits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                      <DocumentIcon />
                    </div>
                    <p className="text-sm text-text-muted">No exhibits have been submitted yet</p>
                    <p className="mt-1 text-xs text-text-dim">
                      Add evidence items as they are presented in the session
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {exhibits.map((exhibit) => {
                      const status = exhibitStatusStyles[exhibit.status];
                      return (
                        <div
                          key={exhibit.id}
                          className="rounded-xl border border-stroke bg-surface p-4"
                        >
                          <div className="mb-3 flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <Badge
                                  variant={exhibit.submittedBy === "prosecution" ? "error" : "teal"}
                                >
                                  {exhibit.submittedBy === "prosecution" ? "Prosecution" : "Defense"}
                                </Badge>
                                <span className="rounded bg-bg-2 px-2 py-0.5 text-xs font-medium text-text-muted">
                                  {exhibit.label}
                                </span>
                                <span className="text-xs text-text-dim">
                                  {exhibitTypeIcons[exhibit.type]}
                                </span>
                              </div>
                              <p className="text-sm text-text">{exhibit.description}</p>
                            </div>
                            <Badge variant={status.badge}>{status.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <ClockIcon />
                            <span>{exhibit.timestamp}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Witness Timeline */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon />
                      Witness Timeline
                    </CardTitle>
                    <CardDescription>
                      Track witness testimony and cross-examination
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm" className="gap-1">
                    <PlusIcon />
                    Add Witness
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {witnesses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                      <UserIcon />
                    </div>
                    <p className="text-sm text-text-muted">No witnesses have been called yet</p>
                    <p className="mt-1 text-xs text-text-dim">
                      Add witnesses as they take the stand
                    </p>
                  </div>
                ) : (
                  <div className="relative space-y-4">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-stroke" />
                    {witnesses.map((witness, index) => {
                      const status = witnessStatusStyles[witness.status];
                      return (
                        <div
                          key={witness.id}
                          className="relative ml-10 rounded-xl border border-stroke bg-surface p-4"
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute -left-[26px] top-4 h-3 w-3 rounded-full border-2 border-bg-0 ${
                              witness.status === "completed"
                                ? "bg-success"
                                : witness.status === "testifying"
                                  ? "bg-teal"
                                  : "bg-text-muted"
                            }`}
                          />
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text">{witness.name}</span>
                              <Badge
                                variant={witness.role === "prosecution" ? "error" : witness.role === "defense" ? "teal" : "default"}
                              >
                                {witness.role.charAt(0).toUpperCase() + witness.role.slice(1)}
                              </Badge>
                            </div>
                            <Badge variant={status.badge}>{status.label}</Badge>
                          </div>
                          <div className="mb-2 flex items-center gap-2 text-xs text-text-muted">
                            <ClockIcon />
                            <span>{witness.timestamp}</span>
                          </div>
                          {witness.keyPoints.length > 0 && (
                            <div className="mt-3 border-t border-stroke-subtle pt-3">
                              <p className="mb-2 text-xs font-medium text-text-muted">Key Points:</p>
                              <ul className="space-y-1 text-xs text-text-dim">
                                {witness.keyPoints.map((point, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="mt-1.5 h-1 w-1 rounded-full bg-text-muted" />
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Argument Tracker */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ChatBubbleIcon />
                      Argument Tracker
                    </CardTitle>
                    <CardDescription>
                      Prosecution vs Defense arguments
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm" className="gap-1">
                    <PlusIcon />
                    Log Argument
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {arguments_.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                      <ChatBubbleIcon />
                    </div>
                    <p className="text-sm text-text-muted">No arguments have been logged yet</p>
                    <p className="mt-1 text-xs text-text-dim">
                      Track key arguments from both sides as they are presented
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Prosecution Column */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-error" />
                        <span className="text-sm font-medium text-text">
                          Prosecution ({prosecutionArguments.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {prosecutionArguments.map((arg) => (
                          <div
                            key={arg.id}
                            className="rounded-lg border border-error/20 bg-error/5 p-3"
                          >
                            <div className="mb-1 flex items-center gap-2 text-xs">
                              <Badge variant="error">{arg.type}</Badge>
                              <span className="text-text-muted">{arg.timestamp}</span>
                            </div>
                            <p className="text-sm text-text">{arg.content}</p>
                            {arg.type === "objection" && arg.sustained !== undefined && (
                              <Badge
                                variant={arg.sustained ? "success" : "error"}
                                className="mt-2"
                              >
                                {arg.sustained ? "Sustained" : "Overruled"}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Defense Column */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-teal" />
                        <span className="text-sm font-medium text-text">
                          Defense ({defenseArguments.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {defenseArguments.map((arg) => (
                          <div
                            key={arg.id}
                            className="rounded-lg border border-teal/20 bg-teal/5 p-3"
                          >
                            <div className="mb-1 flex items-center gap-2 text-xs">
                              <Badge variant="teal">{arg.type}</Badge>
                              <span className="text-text-muted">{arg.timestamp}</span>
                            </div>
                            <p className="text-sm text-text">{arg.content}</p>
                            {arg.type === "objection" && arg.sustained !== undefined && (
                              <Badge
                                variant={arg.sustained ? "success" : "error"}
                                className="mt-2"
                              >
                                {arg.sustained ? "Sustained" : "Overruled"}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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

            {/* Verdict Progress */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScaleIcon />
                  Verdict Progress
                </CardTitle>
                <CardDescription>Trial phase tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress bar */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-text-muted">Overall Progress</span>
                      <span className="font-medium text-text">{progressPercentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-2">
                      <div
                        className="h-full bg-teal transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Phase list */}
                  <div className="space-y-2">
                    {Object.entries(phaseLabels).map(([phase, label]) => {
                      const isCompleted = verdictProgress.completedPhases.includes(phase);
                      const isCurrent = verdictProgress.currentPhase === phase;
                      return (
                        <div
                          key={phase}
                          className={`flex items-center gap-3 rounded-lg p-2 ${
                            isCurrent
                              ? "bg-teal/10 border border-teal/20"
                              : isCompleted
                                ? "bg-success/5"
                                : "bg-bg-2"
                          }`}
                        >
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full ${
                              isCompleted
                                ? "bg-success text-bg-0"
                                : isCurrent
                                  ? "bg-teal text-bg-0"
                                  : "bg-surface text-text-muted"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircleIcon />
                            ) : (
                              <span className="text-xs font-medium">
                                {Object.keys(phaseLabels).indexOf(phase) + 1}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-sm ${
                              isCurrent
                                ? "font-medium text-teal"
                                : isCompleted
                                  ? "text-success"
                                  : "text-text-muted"
                            }`}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Case Summary */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GavelIcon />
                  Case Summary
                </CardTitle>
                <CardDescription>AI-generated analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-text-muted">
                  <div className="rounded-lg bg-bg-2 p-3">
                    <p className="text-xs">
                      Case summary will be generated as evidence, testimony, and arguments are recorded during the session.
                    </p>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-error/20 bg-error/5 p-3">
                      <p className="text-xs text-error">Prosecution</p>
                      <p className="mt-1 text-lg font-bold text-text">
                        {prosecutionArguments.length}
                      </p>
                      <p className="text-xs text-text-dim">arguments</p>
                    </div>
                    <div className="rounded-lg border border-teal/20 bg-teal/5 p-3">
                      <p className="text-xs text-teal">Defense</p>
                      <p className="mt-1 text-lg font-bold text-text">
                        {defenseArguments.length}
                      </p>
                      <p className="text-xs text-text-dim">arguments</p>
                    </div>
                  </div>

                  {verdictProgress.notes.length > 0 && (
                    <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                      <p className="mb-2 text-xs font-medium text-warning">Key Notes</p>
                      <ul className="space-y-1 text-xs">
                        {verdictProgress.notes.map((note, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-warning" />
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Court Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    Export Transcript
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Generate Case Brief
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Review Evidence
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Call Recess
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

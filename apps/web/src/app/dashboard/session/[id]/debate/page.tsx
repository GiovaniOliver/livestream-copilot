import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Claims & Evidence Board",
  description: "Debate analysis with claim tracking and argument mapping",
};

interface DebatePageProps {
  params: Promise<{ id: string }>;
}

// Mock data for claims
const mockClaims = [
  {
    id: "claim-1",
    speaker: "Speaker A",
    claim: "AI will create more jobs than it displaces in the next decade",
    timestamp: "00:15:32",
    evidenceCount: 3,
    status: "supported",
    strength: 78,
  },
  {
    id: "claim-2",
    speaker: "Speaker B",
    claim: "Current regulations are insufficient to address AI safety concerns",
    timestamp: "00:23:45",
    evidenceCount: 2,
    status: "contested",
    strength: 65,
  },
  {
    id: "claim-3",
    speaker: "Speaker A",
    claim: "Open-source AI models lead to faster innovation",
    timestamp: "00:34:12",
    evidenceCount: 4,
    status: "supported",
    strength: 85,
  },
  {
    id: "claim-4",
    speaker: "Speaker B",
    claim: "Privacy concerns outweigh the benefits of personalized AI",
    timestamp: "00:42:30",
    evidenceCount: 1,
    status: "needs_evidence",
    strength: 45,
  },
];

// Mock evidence
const mockEvidence = [
  {
    id: "ev-1",
    claimId: "claim-1",
    type: "statistic",
    content: "World Economic Forum: 97 million new jobs by 2025",
    source: "WEF Future of Jobs Report 2020",
  },
  {
    id: "ev-2",
    claimId: "claim-1",
    type: "example",
    content: "New roles: AI trainers, prompt engineers, AI ethicists",
    source: "Industry observation",
  },
  {
    id: "ev-3",
    claimId: "claim-3",
    type: "study",
    content: "Open models show 40% faster improvement in benchmarks",
    source: "Stanford HAI Report 2024",
  },
];

// Mock speakers
const mockSpeakers = [
  { name: "Speaker A", claimCount: 8, avgStrength: 76, color: "teal" },
  { name: "Speaker B", claimCount: 6, avgStrength: 62, color: "purple" },
];

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

const DocumentCheckIcon = () => (
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
      d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"
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

const ChartBarIcon = () => (
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
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
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

const statusStyles: Record<string, { badge: string; label: string }> = {
  supported: { badge: "success", label: "Supported" },
  contested: { badge: "warning", label: "Contested" },
  refuted: { badge: "error", label: "Refuted" },
  needs_evidence: { badge: "default", label: "Needs Evidence" },
};

const evidenceTypeStyles: Record<string, string> = {
  statistic: "bg-teal/10 text-teal",
  study: "bg-purple/10 text-purple",
  example: "bg-warning/10 text-warning",
  quote: "bg-success/10 text-success",
};

export default async function DebatePage({ params }: DebatePageProps) {
  const { id } = await params;

  const session = {
    id,
    name: "AI Ethics Debate Panel",
    status: "live" as const,
    duration: "0:52:18",
    workflow: "Claims & Evidence",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={session}
        title="Claims & Evidence Board"
        subtitle="Track claims, evidence, and argument strength in real-time"
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-error/10">
                <ScaleIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Total Claims</p>
                <p className="text-2xl font-bold text-text">
                  {mockClaims.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <DocumentCheckIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Evidence Pieces</p>
                <p className="text-2xl font-bold text-text">
                  {mockEvidence.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <ChatBubbleLeftRightIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Speakers</p>
                <p className="text-2xl font-bold text-text">
                  {mockSpeakers.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <ChartBarIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Avg. Strength</p>
                <p className="text-2xl font-bold text-text">68%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content - Claims Board */}
          <div className="lg:col-span-2">
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Claims Tracker</CardTitle>
                    <CardDescription>
                      Real-time claim detection and analysis
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Filter
                    </Button>
                    <Button variant="primary" size="sm" className="gap-1">
                      <PlusIcon />
                      Add Claim
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockClaims.map((claim) => {
                    const status = statusStyles[claim.status];
                    return (
                      <div
                        key={claim.id}
                        className="rounded-xl border border-stroke bg-surface p-4"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <Badge variant="teal">{claim.speaker}</Badge>
                              <span className="font-mono text-xs text-text-muted">
                                {claim.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-text">{claim.claim}</p>
                          </div>
                          <Badge
                            variant={
                              status.badge as
                                | "success"
                                | "warning"
                                | "error"
                                | "default"
                            }
                          >
                            {status.label}
                          </Badge>
                        </div>

                        {/* Strength meter */}
                        <div className="mb-3">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-text-muted">
                              Argument Strength
                            </span>
                            <span className="font-medium text-text">
                              {claim.strength}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-bg-2">
                            <div
                              className={`h-full transition-all ${
                                claim.strength >= 70
                                  ? "bg-success"
                                  : claim.strength >= 50
                                    ? "bg-warning"
                                    : "bg-error"
                              }`}
                              style={{ width: `${claim.strength}%` }}
                            />
                          </div>
                        </div>

                        {/* Evidence count and actions */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-text-muted">
                            <DocumentCheckIcon />
                            {claim.evidenceCount} evidence piece
                            {claim.evidenceCount !== 1 ? "s" : ""}
                          </span>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-teal transition-colors hover:text-teal-400"
                          >
                            <LinkIcon />
                            Add Evidence
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Evidence Panel */}
            <Card variant="elevated" className="mt-6">
              <CardHeader>
                <CardTitle>Evidence Library</CardTitle>
                <CardDescription>
                  Collected evidence supporting or refuting claims
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockEvidence.map((ev) => {
                    const linkedClaim = mockClaims.find(
                      (c) => c.id === ev.claimId
                    );
                    return (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-stroke bg-bg-2 p-3"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${evidenceTypeStyles[ev.type]}`}
                          >
                            {ev.type}
                          </span>
                          {linkedClaim && (
                            <span className="text-xs text-text-dim">
                              Linked to: {linkedClaim.speaker}
                            </span>
                          )}
                        </div>
                        <p className="mb-1 text-sm text-text">{ev.content}</p>
                        <p className="text-xs text-text-muted">
                          Source: {ev.source}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Speaker Comparison */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Speaker Analysis</CardTitle>
                <CardDescription>Performance comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockSpeakers.map((speaker) => (
                    <div key={speaker.name}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-3 w-3 rounded-full bg-${speaker.color}`}
                          />
                          <span className="text-sm font-medium text-text">
                            {speaker.name}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted">
                          {speaker.claimCount} claims
                        </span>
                      </div>
                      <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                        <span>Avg. Strength</span>
                        <span className="font-medium text-text">
                          {speaker.avgStrength}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-2">
                        <div
                          className={`h-full bg-${speaker.color}`}
                          style={{ width: `${speaker.avgStrength}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Debate Summary */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Debate Summary</CardTitle>
                <CardDescription>AI-generated analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-text-muted">
                  <p>
                    The debate centers on AI's societal impact, with Speaker A
                    taking a more optimistic stance while Speaker B raises
                    concerns about regulation and privacy.
                  </p>
                  <div className="rounded-lg bg-teal/5 border border-teal/20 p-3">
                    <p className="text-xs font-medium text-teal">Key Insight</p>
                    <p className="mt-1 text-xs">
                      Both speakers agree that some form of regulation is needed,
                      but differ on the approach.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    Export Transcript
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Generate Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Fact-Check Claims
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

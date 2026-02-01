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
import { LivePreview, useLiveStream } from "@/components/video";

interface WritersCornerPageProps {
  params: Promise<{ id: string }>;
}

// Types for writing elements
interface Idea {
  id: string;
  content: string;
  timestamp: string;
  category?: string;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  status: "draft" | "in_progress" | "complete";
  wordCount: number;
}

interface Quote {
  id: string;
  text: string;
  source?: string;
  page?: string;
}

interface Attribution {
  id: string;
  source: string;
  type: "book" | "article" | "website" | "interview" | "other";
  notes?: string;
  dateAdded: string;
}

interface TimelineEntry {
  id: string;
  date: string;
  milestone: string;
  wordsWritten: number;
}

// Icons
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

const LightBulbIcon = () => (
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
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  </svg>
);

const BookOpenIcon = () => (
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
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const ClipboardDocumentListIcon = () => (
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
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
    />
  </svg>
);

const QuoteIcon = () => (
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
      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
    />
  </svg>
);

const LinkIcon = () => (
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
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
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
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const statusStyles: Record<string, { badge: "success" | "warning" | "default"; text: string }> = {
  draft: {
    badge: "default",
    text: "Draft",
  },
  in_progress: {
    badge: "warning",
    text: "In Progress",
  },
  complete: {
    badge: "success",
    text: "Complete",
  },
};

export default function WritersCornerPage({ params }: WritersCornerPageProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Empty states for all writing elements
  const [ideas] = useState<Idea[]>([]);
  const [chapters] = useState<Chapter[]>([]);
  const [quotes] = useState<Quote[]>([]);
  const [attributions] = useState<Attribution[]>([]);
  const [timeline] = useState<TimelineEntry[]>([]);

  // Stats derived from empty data
  const wordCount = 0;
  const chapterCount = chapters.length;
  const ideasCaptured = ideas.length;
  const notesCount = attributions.length;

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setSessionId(resolvedParams.id);
    }
    loadParams();
  }, [params]);

  // Load session from API (pass empty string when sessionId is null - hook handles this gracefully)
  const { session: apiSession } = useSession(sessionId ?? "");
  useEffect(() => {
    if (apiSession) {
      setSession(apiSession);
    }
  }, [apiSession]);

  // Get live stream status
  const { status: videoStatus } = useLiveStream();

  const sessionInfo = session
    ? {
        id: session.id,
        name: session.name,
        status: session.status,
        duration: session.duration,
        workflow: "Writers Corner",
      }
    : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={sessionInfo}
        title="Writers Corner"
        subtitle="Your creative writing space for capturing ideas, organizing chapters, and tracking progress"
        isStreaming={videoStatus?.isStreaming}
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <DocumentTextIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Word Count</p>
                <p className="text-2xl font-bold text-text">{wordCount.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <BookOpenIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Chapters</p>
                <p className="text-2xl font-bold text-text">{chapterCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <LightBulbIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Ideas Captured</p>
                <p className="text-2xl font-bold text-text">{ideasCaptured}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <ClipboardDocumentListIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Notes</p>
                <p className="text-2xl font-bold text-text">{notesCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Idea Ledger */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Idea Ledger</CardTitle>
                    <CardDescription>
                      Capture and organize your creative ideas with timestamps
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm">
                    <PlusIcon />
                    <span className="ml-1">Add Idea</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ideas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-12">
                    <LightBulbIcon />
                    <p className="mt-3 text-sm text-text-muted">No ideas captured yet</p>
                    <p className="text-xs text-text-dim">
                      Click &quot;Add Idea&quot; to start capturing your thoughts
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ideas.map((idea) => (
                      <div
                        key={idea.id}
                        className="rounded-xl border border-stroke bg-surface p-4"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-text">{idea.content}</p>
                          {idea.category && (
                            <Badge variant="teal" className="ml-2 text-xs">
                              {idea.category}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-text-dim">{idea.timestamp}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chapter Outline */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Chapter Outline</CardTitle>
                    <CardDescription>
                      Organize your manuscript structure
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm">
                    <PlusIcon />
                    <span className="ml-1">Add Chapter</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {chapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-12">
                    <BookOpenIcon />
                    <p className="mt-3 text-sm text-text-muted">No chapters yet</p>
                    <p className="text-xs text-text-dim">
                      Start building your manuscript structure
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chapters.map((chapter) => {
                      const styles = statusStyles[chapter.status];
                      return (
                        <div
                          key={chapter.id}
                          className="flex items-center justify-between rounded-xl border border-stroke bg-surface p-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-2 text-sm font-medium text-text">
                              {chapter.number}
                            </span>
                            <div>
                              <h4 className="font-medium text-text">{chapter.title}</h4>
                              <p className="text-xs text-text-muted">
                                {chapter.wordCount.toLocaleString()} words
                              </p>
                            </div>
                          </div>
                          <Badge variant={styles.badge}>{styles.text}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Writing Timeline / Progress */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Writing Timeline</CardTitle>
                <CardDescription>Track your writing progress over time</CardDescription>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-12">
                    <ChartBarIcon />
                    <p className="mt-3 text-sm text-text-muted">No progress tracked yet</p>
                    <p className="text-xs text-text-dim">
                      Your writing milestones will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timeline.map((entry, index) => (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="h-3 w-3 rounded-full bg-teal" />
                          {index < timeline.length - 1 && (
                            <div className="h-full w-0.5 bg-stroke" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium text-text">{entry.milestone}</p>
                          <div className="mt-1 flex items-center gap-3">
                            <span className="text-xs text-text-muted">{entry.date}</span>
                            <Badge variant="success" className="text-xs">
                              +{entry.wordsWritten.toLocaleString()} words
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Live Preview */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>Your stream feed</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <LivePreview
                  webrtcUrl={videoStatus?.webrtcUrl}
                  hlsUrl={videoStatus?.hlsUrl}
                  isStreamActive={videoStatus?.isStreaming}
                  size="sm"
                />
              </CardContent>
            </Card>

            {/* Quote Bank */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quote Bank</CardTitle>
                    <CardDescription>Memorable phrases and passages</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <PlusIcon />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-8">
                    <QuoteIcon />
                    <p className="mt-3 text-sm text-text-muted">No quotes saved</p>
                    <p className="text-xs text-text-dim">
                      Save memorable phrases here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="rounded-xl border border-stroke bg-bg-2 p-3"
                      >
                        <p className="text-sm italic text-text">&quot;{quote.text}&quot;</p>
                        {(quote.source || quote.page) && (
                          <p className="mt-2 text-xs text-text-dim">
                            {quote.source}
                            {quote.page && ` - p. ${quote.page}`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attribution Tracking */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sources & References</CardTitle>
                    <CardDescription>Track your attributions</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <PlusIcon />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {attributions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-8">
                    <LinkIcon />
                    <p className="mt-3 text-sm text-text-muted">No sources added</p>
                    <p className="text-xs text-text-dim">
                      Track references and citations
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attributions.map((attr) => (
                      <div
                        key={attr.id}
                        className="flex items-center justify-between rounded-lg bg-surface p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-text">
                            {attr.source}
                          </p>
                          {attr.notes && (
                            <p className="truncate text-xs text-text-muted">
                              {attr.notes}
                            </p>
                          )}
                        </div>
                        <Badge variant="default" className="ml-2 text-xs capitalize">
                          {attr.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Session Info</CardTitle>
                <CardDescription>Current writing session details</CardDescription>
              </CardHeader>
              <CardContent>
                {session ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Session</span>
                      <span className="text-text">{session.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Status</span>
                      <Badge
                        variant={
                          session.status === "live"
                            ? "error"
                            : session.status === "paused"
                              ? "warning"
                              : "default"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Duration</span>
                      <span className="font-mono text-text">{session.duration}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-6">
                    <p className="text-sm text-text-muted">Loading session...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

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
import { LivePreview, useLiveStream } from "@/components/video";
import { type Session } from "@/lib/stores/sessions";
import { useSession } from "@/hooks/useSessions";
import { useParams } from "next/navigation";

// Types for podcast dashboard data (will be populated via WebSocket)
interface Chapter {
  id: string;
  title: string;
  timestamp: string;
  duration: string;
}

interface Quote {
  id: string;
  text: string;
  speaker: string;
  timestamp: string;
}

interface Highlight {
  id: string;
  title: string;
  timestamp: string;
  type: "key-moment" | "topic" | "insight";
}

interface Promo {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

// Icons
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

const BookmarkIcon = () => (
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
      d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
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

const SparklesIcon = () => (
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
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
    />
  </svg>
);

const ListBulletIcon = () => (
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
      d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

const MegaphoneIcon = () => (
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
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
    />
  </svg>
);

export default function PodcastPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [duration, setDuration] = useState("0:00:00");

  // State for podcast data (will be populated via WebSocket)
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);

  // Live stream status
  const { status: videoStatus } = useLiveStream();

  // Load session from API
  const { session: apiSession } = useSession(id);
  useEffect(() => {
    if (apiSession) {
      setSession(apiSession);
      setDuration(apiSession.duration);
    }
  }, [apiSession]);

  // Update duration for live sessions
  useEffect(() => {
    if (!session || session.status !== "live") return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(session.startedAt).getTime();
      const seconds = Math.floor(elapsed / 1000);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      setDuration(
        `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Session object for header
  const headerSession = {
    id,
    name: session?.name || "Loading...",
    status: session?.status || ("active" as const),
    duration,
    workflow: "Podcast Console",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={headerSession}
        isStreaming={videoStatus?.isStreaming}
        title="Podcast Console"
        subtitle="Chapter markers, quote extraction, and highlight tracking"
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <ClockIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Duration</p>
                <p className="text-2xl font-bold text-text">{duration}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <ListBulletIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Chapters</p>
                <p className="text-2xl font-bold text-text">{chapters.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <ChatBubbleIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Quotes</p>
                <p className="text-2xl font-bold text-text">{quotes.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <SparklesIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Highlights</p>
                <p className="text-2xl font-bold text-text">{highlights.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content - Chapters */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chapters List */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Chapters</CardTitle>
                    <CardDescription>
                      Auto-detected chapter markers and segments
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" disabled={chapters.length === 0}>
                    Export Chapters
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {chapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface mb-4">
                      <ListBulletIcon />
                    </div>
                    <p className="text-text-muted text-center">
                      No chapters detected yet
                    </p>
                    <p className="text-sm text-text-muted/70 text-center mt-1">
                      Chapters will appear as topics are identified
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-text-muted">
                            {chapter.timestamp}
                          </span>
                          <span className="text-text font-medium">
                            {chapter.title}
                          </span>
                        </div>
                        <Badge variant="default">{chapter.duration}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote Bank */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quote Bank</CardTitle>
                    <CardDescription>
                      Notable quotes extracted from the conversation
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" disabled={quotes.length === 0}>
                    Export Quotes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface mb-4">
                      <ChatBubbleIcon />
                    </div>
                    <p className="text-text-muted text-center">
                      No quotes captured yet
                    </p>
                    <p className="text-sm text-text-muted/70 text-center mt-1">
                      Notable quotes will be extracted automatically
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="rounded-xl border-l-4 border-l-teal bg-teal/5 p-4"
                      >
                        <p className="text-text italic mb-2">"{quote.text}"</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text-muted">
                            - {quote.speaker}
                          </span>
                          <span className="font-mono text-xs text-text-muted">
                            {quote.timestamp}
                          </span>
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
            {/* Live Audio/Video Preview */}
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

            {/* Promos Section */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MegaphoneIcon />
                  <CardTitle>Promos</CardTitle>
                </div>
                <CardDescription>
                  Sponsor mentions and promotional content
                </CardDescription>
              </CardHeader>
              <CardContent>
                {promos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-8">
                    <p className="text-sm text-text-muted text-center">
                      No promos detected
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {promos.map((promo) => (
                      <div
                        key={promo.id}
                        className="rounded-xl bg-warning/10 border border-warning/20 p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text">
                            {promo.title}
                          </span>
                          <span className="font-mono text-xs text-text-muted">
                            {promo.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted">
                          {promo.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Highlights */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookmarkIcon />
                  <CardTitle>Highlights</CardTitle>
                </div>
                <CardDescription>
                  Key moments and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                {highlights.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-8">
                    <p className="text-sm text-text-muted text-center">
                      No highlights yet
                    </p>
                    <p className="text-xs text-text-muted/70 text-center mt-1">
                      Key moments will be marked here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {highlights.map((highlight) => (
                      <div
                        key={highlight.id}
                        className="flex items-center justify-between rounded-lg bg-surface p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              highlight.type === "key-moment"
                                ? "warning"
                                : highlight.type === "insight"
                                  ? "success"
                                  : "default"
                            }
                            className="text-xs"
                          >
                            {highlight.type}
                          </Badge>
                          <span className="text-sm text-text">
                            {highlight.title}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-text-muted">
                          {highlight.timestamp}
                        </span>
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
                <CardDescription>Current recording details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">Status</span>
                    <Badge
                      variant={
                        session?.status === "live"
                          ? "success"
                          : session?.status === "paused"
                            ? "warning"
                            : "default"
                      }
                    >
                      {session?.status || "loading"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">Duration</span>
                    <span className="font-mono text-sm text-text">{duration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">Workflow</span>
                    <span className="text-sm text-text">Podcast Console</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

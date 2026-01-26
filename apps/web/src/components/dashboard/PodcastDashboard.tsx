"use client";

import { useEffect, useMemo } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "@/components/ui";

interface PodcastDashboardProps {
  sessionId: string;
  wsUrl: string;
}

const BookIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const ChatIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const MegaphoneIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
  </svg>
);

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function PodcastDashboard({ sessionId, wsUrl }: PodcastDashboardProps) {
  const { connect, disconnect, outputs, isConnected } = useWebSocket();

  useEffect(() => {
    if (wsUrl) {
      connect(wsUrl);
    }
    return () => {
      disconnect();
    };
  }, [wsUrl, connect, disconnect]);

  // Process outputs for chapters
  const chapters = useMemo(() => {
    return outputs
      .filter((e) => {
        const payload = e.payload as any;
        return payload?.category === "CHAPTER_MARKER" || payload?.outputCategory === "CHAPTER_MARKER";
      })
      .map((e) => {
        const payload = e.payload as any;
        return {
          id: e.id,
          title: payload.text || payload.title || payload.content || "Chapter",
          timestamp: formatTimestamp(payload.t || e.ts),
          description: payload.description || payload.metadata?.description || "",
        };
      });
  }, [outputs]);

  // Process outputs for quotes
  const quotes = useMemo(() => {
    return outputs
      .filter((e) => {
        const payload = e.payload as any;
        return payload?.category === "QUOTE" || payload?.outputCategory === "QUOTE";
      })
      .map((e) => {
        const payload = e.payload as any;
        return {
          id: e.id,
          text: payload.text || payload.content || "Quote",
          speaker: payload.speaker || payload.metadata?.speaker || "Unknown",
          timestamp: formatTimestamp(e.ts),
        };
      });
  }, [outputs]);

  // Process outputs for promo drafts
  const promoDrafts = useMemo(() => {
    return outputs
      .filter((e) => {
        const payload = e.payload as any;
        const cat = payload?.category || payload?.outputCategory;
        return cat === "SOCIAL_POST" || cat === "EPISODE_META";
      })
      .map((e) => {
        const payload = e.payload as any;
        return {
          id: e.id,
          text: payload.text || payload.content || "Promo content",
          timestamp: formatTimestamp(e.ts),
          type: payload.category || payload.outputCategory || "SOCIAL_POST",
        };
      });
  }, [outputs]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Chapter Timeline */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <div className="flex items-center gap-2">
                <BookIcon />
                Chapters
              </div>
            </CardTitle>
            <Badge variant="teal">{chapters.length}</Badge>
          </div>
          <CardDescription>
            AI-generated chapter markers for your episode
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <div className="py-8 text-center text-sm text-text-muted">
              <p>Connecting to live session...</p>
            </div>
          )}
          {isConnected && chapters.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">
              <BookIcon />
              <p className="mt-2">No chapters yet</p>
              <p className="mt-1 text-xs">Chapters will appear as the episode progresses</p>
            </div>
          )}
          <div className="space-y-3">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="rounded-xl border border-stroke bg-surface p-3 transition-colors hover:bg-surface-hover"
              >
                <div className="mb-1 flex items-start justify-between">
                  <h4 className="font-medium text-text">{chapter.title}</h4>
                  <span className="font-mono text-xs text-text-muted">{chapter.timestamp}</span>
                </div>
                {chapter.description && (
                  <p className="text-xs text-text-muted">{chapter.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quote Bank */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <div className="flex items-center gap-2">
                <ChatIcon />
                Quotes
              </div>
            </CardTitle>
            <Badge variant="purple">{quotes.length}</Badge>
          </div>
          <CardDescription>
            Memorable quotes from the conversation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <div className="py-8 text-center text-sm text-text-muted">
              <p>Connecting to live session...</p>
            </div>
          )}
          {isConnected && quotes.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">
              <ChatIcon />
              <p className="mt-2">No quotes captured yet</p>
              <p className="mt-1 text-xs">Notable quotes will appear here</p>
            </div>
          )}
          <div className="space-y-3">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="rounded-xl border border-stroke bg-surface p-3 transition-colors hover:bg-surface-hover"
              >
                <p className="mb-2 text-sm italic text-text">&ldquo;{quote.text}&rdquo;</p>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="font-medium">{quote.speaker}</span>
                  <span>{quote.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Promo Drafts */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <div className="flex items-center gap-2">
                <MegaphoneIcon />
                Promo Drafts
              </div>
            </CardTitle>
            <Badge variant="success">{promoDrafts.length}</Badge>
          </div>
          <CardDescription>
            Social media and marketing content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <div className="py-8 text-center text-sm text-text-muted">
              <p>Connecting to live session...</p>
            </div>
          )}
          {isConnected && promoDrafts.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">
              <MegaphoneIcon />
              <p className="mt-2">No promo content yet</p>
              <p className="mt-1 text-xs">Marketing content will be generated automatically</p>
            </div>
          )}
          <div className="space-y-3">
            {promoDrafts.map((promo) => (
              <div
                key={promo.id}
                className="rounded-xl border border-stroke bg-surface p-3 transition-colors hover:bg-surface-hover"
              >
                <p className="mb-2 text-sm text-text">{promo.text}</p>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <Badge variant="default" className="text-xs">
                    {promo.type}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-auto py-1 text-xs">
                    Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

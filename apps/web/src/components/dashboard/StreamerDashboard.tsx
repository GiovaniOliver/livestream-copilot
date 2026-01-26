"use client";

import { useEffect, useMemo, useState } from "react";
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
import { VideoPlayer, ClipPreviewModal } from "@/components/video";
import { getClipMediaUrl } from "@/lib/api/clips";
import type { EventEnvelope } from "@livestream-copilot/shared";
import type { Clip } from "@/components/dashboards/streamer/types";

interface StreamerDashboardProps {
  sessionId: string;
  wsUrl: string;
}

const FilmIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
  </svg>
);

const PlayIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function detectPlatform(text: string): string[] {
  const platforms: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("twitter") || lower.includes("𝕏") || lower.includes("#")) platforms.push("X");
  if (lower.includes("youtube") || lower.includes("yt")) platforms.push("YouTube");
  if (lower.includes("tiktok") || lower.includes("tt")) platforms.push("TikTok");
  if (lower.includes("instagram") || lower.includes("ig")) platforms.push("Instagram");
  if (lower.includes("linkedin")) platforms.push("LinkedIn");

  return platforms.length > 0 ? platforms : ["General"];
}

export function StreamerDashboard({ sessionId, wsUrl }: StreamerDashboardProps) {
  const { connect, disconnect, clips, outputs, moments, isConnected } = useWebSocket();
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Connect to WebSocket on mount
  useEffect(() => {
    if (wsUrl) {
      connect(wsUrl);
    }
    return () => {
      disconnect();
    };
  }, [wsUrl, connect, disconnect]);

  // Process outputs for social posts
  const socialPosts = useMemo(() => {
    return outputs
      .filter((e) => {
        const payload = e.payload as any;
        return payload?.category === "SOCIAL_POST" || payload?.outputCategory === "SOCIAL_POST";
      })
      .map((e) => {
        const payload = e.payload as any;
        return {
          id: e.id,
          text: payload.text || payload.content || "No content",
          timestamp: formatTimestamp(e.ts),
          platforms: detectPlatform(payload.text || payload.content || ""),
          metadata: payload.metadata || {},
        };
      });
  }, [outputs]);

  // Process clips
  const clipList = useMemo(() => {
    return clips.map((e) => {
      const payload = e.payload as any;
      const duration = payload.t1 - payload.t0 || 0;
      return {
        id: e.id,
        artifactId: payload.artifactId || payload.id || e.id,
        title: payload.title || `Clip at ${formatTimestamp(e.ts)}`,
        hookText: payload.hookText || "Auto-generated clip from stream",
        thumbnailUrl: payload.thumbnailArtifactId || "",
        timestamp: formatTimestamp(payload.t0 || e.ts),
        duration,
        durationFormatted: `${Math.floor(duration)}s`,
        path: payload.path || "",
        status: "ready" as const,
        createdAt: new Date(e.ts),
        startTime: payload.t0 || 0,
        endTime: payload.t1 || 0,
      };
    });
  }, [clips]);

  // Handler functions
  const handlePreviewClip = (clip: typeof clipList[0]) => {
    const clipData: Clip = {
      id: clip.artifactId,
      title: clip.title,
      hookText: clip.hookText,
      thumbnailUrl: clip.thumbnailUrl,
      duration: clip.duration,
      status: clip.status,
      createdAt: clip.createdAt,
      startTime: clip.startTime,
      endTime: clip.endTime,
    };
    setPreviewClip(clipData);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
  };

  const handleNextClip = () => {
    if (!previewClip) return;
    const currentIndex = clipList.findIndex((c) => c.artifactId === previewClip.id);
    if (currentIndex < clipList.length - 1) {
      const nextClip = clipList[currentIndex + 1];
      handlePreviewClip(nextClip);
    }
  };

  const handlePreviousClip = () => {
    if (!previewClip) return;
    const currentIndex = clipList.findIndex((c) => c.artifactId === previewClip.id);
    if (currentIndex > 0) {
      const prevClip = clipList[currentIndex - 1];
      handlePreviewClip(prevClip);
    }
  };

  const handleExportClip = (clip: Clip) => {
    console.log("Export clip:", clip.id);
    // TODO: Implement export functionality
  };

  // Process moments
  const momentList = useMemo(() => {
    return moments.map((e) => {
      const payload = e.payload as any;
      return {
        id: e.id,
        label: payload.label || payload.text || "Moment",
        timestamp: formatTimestamp(e.ts),
        t: payload.t || e.ts,
      };
    });
  }, [moments]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Social Posts */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Social Posts</CardTitle>
            <Badge variant="teal">{socialPosts.length}</Badge>
          </div>
          <CardDescription>
            AI-generated social content from your stream
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <div className="py-8 text-center text-sm text-text-muted">
              <p>Connecting to live stream...</p>
            </div>
          )}
          {isConnected && socialPosts.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">
              <DocumentIcon />
              <p className="mt-2">No posts generated yet</p>
              <p className="mt-1 text-xs">Posts will appear here as AI generates them</p>
            </div>
          )}
          <div className="space-y-3">
            {socialPosts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-stroke bg-surface p-3 transition-colors hover:bg-surface-hover"
              >
                <p className="mb-2 text-sm text-text">{post.text}</p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {post.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="rounded bg-teal/10 px-2 py-0.5 text-xs text-teal"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{post.timestamp}</span>
                  <Button variant="ghost" size="sm" className="h-auto py-1 text-xs">
                    Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detected Clips */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Detected Clips</CardTitle>
            <Badge variant="purple">{clipList.length}</Badge>
          </div>
          <CardDescription>
            Video clips captured from replay buffer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <div className="py-8 text-center text-sm text-text-muted">
              <p>Connecting to live stream...</p>
            </div>
          )}
          {isConnected && clipList.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">
              <FilmIcon />
              <p className="mt-2">No clips captured yet</p>
              <p className="mt-1 text-xs">Clips will appear here when captured</p>
            </div>
          )}
          <div className="space-y-3">
            {clipList.map((clip) => (
              <div
                key={clip.id}
                className="rounded-xl border border-stroke bg-surface p-3 transition-colors hover:bg-surface-hover"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="font-medium text-text">{clip.title}</h4>
                  <Badge variant="purple" className="text-xs">
                    {clip.durationFormatted}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{clip.timestamp}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreviewClip(clip)}
                      className="flex items-center gap-1 text-teal transition-colors hover:text-teal-400"
                    >
                      <PlayIcon />
                      Preview
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-purple transition-colors hover:text-purple-400"
                    >
                      <DownloadIcon />
                      Export
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Moment Markers */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Moment Markers</CardTitle>
            <Badge variant="success">{momentList.length}</Badge>
          </div>
          <CardDescription>
            Key moments and highlights from the stream
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <div className="py-8 text-center text-sm text-text-muted">
              <p>Connecting to live stream...</p>
            </div>
          )}
          {isConnected && momentList.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">
              <p>No moments marked yet</p>
              <p className="mt-1 text-xs">Moments will appear here as they're detected</p>
            </div>
          )}
          <div className="space-y-2">
            {momentList.map((moment) => (
              <div
                key={moment.id}
                className="flex items-center justify-between rounded-lg border border-stroke bg-surface p-2 text-sm"
              >
                <span className="text-text">{moment.label}</span>
                <span className="font-mono text-xs text-text-muted">{moment.timestamp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clip Preview Modal */}
      <ClipPreviewModal
        clip={previewClip}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onExport={handleExportClip}
        onNext={handleNextClip}
        onPrevious={handlePreviousClip}
        hasNext={
          previewClip
            ? clipList.findIndex((c) => c.artifactId === previewClip.id) <
              clipList.length - 1
            : false
        }
        hasPrevious={
          previewClip
            ? clipList.findIndex((c) => c.artifactId === previewClip.id) > 0
            : false
        }
        videoSrc={previewClip ? getClipMediaUrl(previewClip.id) : undefined}
      />
    </div>
  );
}

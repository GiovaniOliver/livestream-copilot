"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useMoments } from "@/hooks/useMoments";
import { ClipBin, type ClipData } from "./ClipBin";
import { PostQueue, type SocialPost, type Platform } from "./PostQueue";
import { MomentRail, type Moment, type MomentType } from "./MomentRail";
import { ClipPreviewModal } from "@/components/video";
import { getClipMediaUrl } from "@/lib/api/clips";
import type { Clip } from "@/components/dashboards/streamer/types";

interface ProducerDeskDashboardProps {
  sessionId: string;
  sessionStartTime?: number;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatSecondsToTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function detectPlatform(text: string): Platform {
  const lower = text.toLowerCase();
  if (lower.includes("linkedin")) return "linkedin";
  if (lower.includes("twitter") || lower.includes("X")) return "x";
  if (lower.includes("youtube") || lower.includes("yt")) return "youtube";
  if (lower.includes("instagram") || lower.includes("ig")) return "instagram";
  if (lower.includes("tiktok") || lower.includes("tt")) return "tiktok";
  return "x"; // Default to X
}

function detectMomentType(label: string): MomentType {
  const lower = label.toLowerCase();
  if (lower.includes("sponsor") || lower.includes("ad")) return "sponsor";
  if (lower.includes("question") || lower.includes("q&a") || lower.includes("qa")) return "qa";
  if (lower.includes("clip") || lower.includes("highlight")) return "highlight";
  if (lower.includes("chapter") || lower.includes("topic")) return "chapter";
  if (lower.includes("hype")) return "hype";
  return "custom";
}

export function ProducerDeskDashboard({
  sessionId,
  sessionStartTime = Date.now(),
}: ProducerDeskDashboardProps) {
  const { connect, disconnect, clips, outputs, moments: wsMoments, isConnected } = useWebSocket();

  // Fetch historical moments from API
  const {
    moments: apiMoments,
    isLoading: momentsLoading,
    createMoment,
  } = useMoments(sessionId);

  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Connect to WebSocket on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Transform clips to ClipData format
  const clipList: ClipData[] = useMemo(() => {
    return clips.map((e) => {
      const payload = e.payload as any;
      const duration = (payload.t1 - payload.t0) || 0;

      // Generate hook variants from payload or create defaults
      const hookVariants = payload.hookVariants || [
        payload.hookText || `Check out this highlight from ${formatTimestamp(e.ts)}!`,
        `You won't believe what happened at ${formatTimestamp(e.ts)}`,
        `This moment was incredible!`,
      ];

      return {
        id: e.id,
        artifactId: payload.artifactId || payload.id || e.id,
        title: payload.title || `Clip at ${formatTimestamp(e.ts)}`,
        hookVariants,
        thumbnailUrl: payload.thumbnailUrl || payload.thumbnailArtifactId || "",
        duration,
        timestamp: formatTimestamp(e.ts),
        status: payload.status || "ready",
        createdAt: new Date(e.ts),
        startTime: payload.t0 || 0,
        endTime: payload.t1 || 0,
      };
    });
  }, [clips]);

  // Transform outputs to SocialPost format
  const postList: SocialPost[] = useMemo(() => {
    return outputs
      .filter((e) => {
        const payload = e.payload as any;
        return payload?.category === "SOCIAL_POST" || payload?.outputCategory === "SOCIAL_POST";
      })
      .map((e) => {
        const payload = e.payload as any;
        const text = payload.text || payload.content || "";

        return {
          id: e.id,
          text,
          timestamp: formatTimestamp(e.ts),
          platform: payload.platform || detectPlatform(text),
          status: payload.status || "draft",
          scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : undefined,
          metadata: payload.metadata || {},
        };
      });
  }, [outputs]);

  // Combine API moments with WebSocket moments, deduplicating by ID
  const momentList: Moment[] = useMemo(() => {
    // Start with API moments (historical data)
    const momentsMap = new Map<string, Moment>();

    // Add API moments first
    apiMoments.forEach((m) => {
      momentsMap.set(m.id, {
        id: m.id,
        label: m.label,
        type: (m.type as MomentType) || detectMomentType(m.label),
        timestamp: m.timestamp * 1000, // Convert seconds to ms for consistency
        displayTime: formatSecondsToTime(m.timestamp),
        duration: undefined,
        metadata: {},
      });
    });

    // Add WebSocket moments (real-time updates)
    wsMoments.forEach((e) => {
      const payload = e.payload as any;
      const label = payload.label || payload.text || "Moment";
      const timestampSec = payload.timestamp || (e.ts / 1000);

      momentsMap.set(e.id, {
        id: e.id,
        label,
        type: payload.momentType || payload.type || detectMomentType(label),
        timestamp: payload.t || e.ts,
        displayTime: formatSecondsToTime(timestampSec),
        duration: payload.duration,
        metadata: payload.metadata || {},
      });
    });

    // Convert to array and sort by timestamp
    return Array.from(momentsMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [apiMoments, wsMoments]);

  // Clip handlers
  const handlePreviewClip = useCallback((clip: ClipData) => {
    const clipData: Clip = {
      id: clip.artifactId,
      title: clip.title,
      hookText: clip.hookVariants[0] || "",
      thumbnailUrl: clip.thumbnailUrl,
      duration: clip.duration,
      status: clip.status,
      createdAt: clip.createdAt,
      startTime: clip.startTime,
      endTime: clip.endTime,
    };
    setPreviewClip(clipData);
    setIsPreviewOpen(true);
  }, []);

  const handleExportClip = useCallback((clip: ClipData) => {
    console.log("Export clip:", clip.id);
    // TODO: Open export modal with clip data
  }, []);

  const handleEditHook = useCallback((clipId: string, hookIndex: number) => {
    console.log("Edit hook:", clipId, hookIndex);
    // TODO: Open inline editor for hook variant
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const handleNextClip = useCallback(() => {
    if (!previewClip) return;
    const currentIndex = clipList.findIndex((c) => c.artifactId === previewClip.id);
    if (currentIndex < clipList.length - 1) {
      handlePreviewClip(clipList[currentIndex + 1]);
    }
  }, [previewClip, clipList, handlePreviewClip]);

  const handlePreviousClip = useCallback(() => {
    if (!previewClip) return;
    const currentIndex = clipList.findIndex((c) => c.artifactId === previewClip.id);
    if (currentIndex > 0) {
      handlePreviewClip(clipList[currentIndex - 1]);
    }
  }, [previewClip, clipList, handlePreviewClip]);

  // Post handlers
  const handleEditPost = useCallback((post: SocialPost) => {
    console.log("Edit post:", post.id);
    // TODO: Open post editor modal
  }, []);

  const handleApprovePost = useCallback((postId: string) => {
    console.log("Approve post:", postId);
    // TODO: Call API to approve post
  }, []);

  const handlePublishPost = useCallback((postId: string) => {
    console.log("Publish post:", postId);
    // TODO: Call API to publish post
  }, []);

  const handleCopyPost = useCallback((text: string) => {
    console.log("Copied:", text);
    // Toast notification could be added here
  }, []);

  const handleSchedulePost = useCallback((postId: string, date: Date) => {
    console.log("Schedule post:", postId, date);
    // TODO: Call API to schedule post
  }, []);

  const handleDeletePost = useCallback((postId: string) => {
    console.log("Delete post:", postId);
    // TODO: Call API to delete post
  }, []);

  // Moment handlers
  const handleMomentClick = useCallback((moment: Moment) => {
    console.log("Jump to moment:", moment.id, moment.timestamp);
    // TODO: Seek to moment timestamp in video player
  }, []);

  const handleMomentDelete = useCallback((momentId: string) => {
    console.log("Delete moment:", momentId);
    // TODO: Call API to delete moment
  }, []);

  const handleAddMoment = useCallback(async (timestamp: number) => {
    console.log("Add moment at:", timestamp);
    try {
      // Create moment via API
      await createMoment({
        type: "marker",
        label: `Marker at ${formatSecondsToTime(timestamp)}`,
        timestamp,
      });
    } catch (error) {
      console.error("Failed to create moment:", error);
    }
  }, [createMoment]);

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Post Queue - Takes up left column */}
      <div className="lg:col-span-1">
        <PostQueue
          posts={postList}
          onEdit={handleEditPost}
          onApprove={handleApprovePost}
          onPublish={handlePublishPost}
          onCopy={handleCopyPost}
          onSchedule={handleSchedulePost}
          onDelete={handleDeletePost}
          isConnected={isConnected}
        />
      </div>

      {/* Middle column - Clip Bin */}
      <div className="lg:col-span-1">
        <ClipBin
          clips={clipList}
          onPreview={handlePreviewClip}
          onExport={handleExportClip}
          onEditHook={handleEditHook}
          isConnected={isConnected}
        />
      </div>

      {/* Right column - Moment Rail */}
      <div className="lg:col-span-1">
        <MomentRail
          moments={momentList}
          sessionStartTime={sessionStartTime}
          currentTime={Date.now()}
          onMomentClick={handleMomentClick}
          onMomentDelete={handleMomentDelete}
          onAddMoment={handleAddMoment}
          isConnected={isConnected}
          isLive={true}
          isLoading={momentsLoading}
        />
      </div>

      {/* Clip Preview Modal */}
      <ClipPreviewModal
        clip={previewClip}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onExport={(clip) => handleExportClip(clipList.find((c) => c.artifactId === clip.id)!)}
        onNext={handleNextClip}
        onPrevious={handlePreviousClip}
        hasNext={
          previewClip
            ? clipList.findIndex((c) => c.artifactId === previewClip.id) < clipList.length - 1
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

export default ProducerDeskDashboard;

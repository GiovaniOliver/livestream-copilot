"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ClipBin } from "./ClipBin";
import { PostQueue } from "./PostQueue";
import { MomentRail } from "./MomentRail";
import { ClipPreviewModal } from "@/components/video";
import { getClipMediaUrl } from "@/lib/api/clips";
import { mockClips, mockPosts, mockMoments, MOCK_STREAM_DURATION } from "./mockData";
import type { ProducerDeskProps, Clip, Post, Moment } from "./types";
import { logger } from "@/lib/logger";

// ============================================================
// Icons
// ============================================================

function LayoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function MinimizeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

// ============================================================
// Panel Header Component
// ============================================================

interface PanelHeaderProps {
  title: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  children?: React.ReactNode;
}

function PanelHeader({
  title,
  isExpanded,
  onToggleExpand,
  children,
}: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-stroke bg-bg-1 px-4 py-2">
      <span className="text-sm font-medium text-text-muted">{title}</span>
      <div className="flex items-center gap-2">
        {children}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="rounded-md p-1 text-text-muted hover:bg-surface hover:text-text"
            aria-label={isExpanded ? "Minimize panel" : "Expand panel"}
          >
            {isExpanded ? (
              <MinimizeIcon className="h-4 w-4" />
            ) : (
              <ExpandIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ProducerDesk Component
// ============================================================

export function ProducerDesk({
  clips = mockClips,
  posts = mockPosts,
  moments = mockMoments,
  streamDuration = MOCK_STREAM_DURATION,
  currentTime = 1800, // Default to 30 minutes in
  onClipSelect,
  onClipEdit,
  onClipExport,
  onPostEdit,
  onPostCopy,
  onPostApprove,
  onPostShare,
  onMomentClick,
}: ProducerDeskProps) {
  const [selectedClipId, setSelectedClipId] = useState<string | undefined>();
  const [expandedPanel, setExpandedPanel] = useState<
    "clips" | "posts" | "moments" | null
  >(null);
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Handlers
  const handleClipSelect = (clip: Clip) => {
    setSelectedClipId(clip.id);
    setPreviewClip(clip);
    setIsPreviewOpen(true);
    onClipSelect?.(clip);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
  };

  const handleNextClip = () => {
    if (!previewClip) return;
    const currentIndex = clips.findIndex((c) => c.id === previewClip.id);
    if (currentIndex < clips.length - 1) {
      const nextClip = clips[currentIndex + 1];
      setPreviewClip(nextClip);
      setSelectedClipId(nextClip.id);
    }
  };

  const handlePreviousClip = () => {
    if (!previewClip) return;
    const currentIndex = clips.findIndex((c) => c.id === previewClip.id);
    if (currentIndex > 0) {
      const prevClip = clips[currentIndex - 1];
      setPreviewClip(prevClip);
      setSelectedClipId(prevClip.id);
    }
  };

  const handleClipEdit = (clip: Clip) => {
    onClipEdit?.(clip);
    logger.debug("Edit clip:", clip.id);
  };

  const handleClipExport = (clip: Clip) => {
    onClipExport?.(clip);
    logger.debug("Export clip:", clip.id);
  };

  const handlePostEdit = (post: Post) => {
    onPostEdit?.(post);
    logger.debug("Edit post:", post.id);
  };

  const handlePostCopy = (post: Post) => {
    onPostCopy?.(post);
    logger.debug("Copy post:", post.id);
  };

  const handlePostApprove = (post: Post) => {
    onPostApprove?.(post);
    logger.debug("Approve post:", post.id);
  };

  const handlePostShare = (post: Post) => {
    onPostShare?.(post);
    logger.debug("Share post:", post.id);
  };

  const handleMomentClick = (moment: Moment) => {
    onMomentClick?.(moment);
    logger.debug("Click moment:", moment.id);
  };

  const togglePanelExpand = (panel: "clips" | "posts" | "moments") => {
    setExpandedPanel(expandedPanel === panel ? null : panel);
  };

  // Check if a panel should be visible (not minimized when another is expanded)
  const isPanelVisible = (panel: "clips" | "posts" | "moments") => {
    return expandedPanel === null || expandedPanel === panel;
  };

  return (
    <div className="flex h-full flex-col bg-bg-0">
      {/* Dashboard Header */}
      <header className="flex items-center justify-between border-b border-stroke bg-bg-1 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
            <LayoutIcon className="h-5 w-5 text-text" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">Producer Desk</h1>
            <p className="text-xs text-text-muted">
              Live Streamer Workflow Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-stroke bg-bg-0 px-3 py-1.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
            <span className="text-xs text-text-muted">Stream Active</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left Panel: Clip Bin */}
        <div
          className={cn(
            "flex flex-col border-r border-stroke transition-all duration-300",
            expandedPanel === "clips"
              ? "flex-1"
              : expandedPanel !== null
                ? "hidden lg:flex lg:w-0 lg:overflow-hidden"
                : "w-full lg:w-80 xl:w-96"
          )}
        >
          {isPanelVisible("clips") && (
            <>
              <PanelHeader
                title="Clips"
                isExpanded={expandedPanel === "clips"}
                onToggleExpand={() => togglePanelExpand("clips")}
              />
              <div className="flex-1 overflow-hidden">
                <ClipBin
                  clips={clips}
                  onClipSelect={handleClipSelect}
                  onClipEdit={handleClipEdit}
                  onClipExport={handleClipExport}
                  selectedClipId={selectedClipId}
                />
              </div>
            </>
          )}
        </div>

        {/* Center Panel: Post Queue */}
        <div
          className={cn(
            "flex flex-col transition-all duration-300",
            expandedPanel === "posts"
              ? "flex-1"
              : expandedPanel !== null
                ? "hidden lg:flex lg:w-0 lg:overflow-hidden"
                : "flex-1"
          )}
        >
          {isPanelVisible("posts") && (
            <>
              <PanelHeader
                title="Posts"
                isExpanded={expandedPanel === "posts"}
                onToggleExpand={() => togglePanelExpand("posts")}
              />
              <div className="flex-1 overflow-hidden">
                <PostQueue
                  posts={posts}
                  onPostEdit={handlePostEdit}
                  onPostCopy={handlePostCopy}
                  onPostApprove={handlePostApprove}
                  onPostShare={handlePostShare}
                />
              </div>
            </>
          )}
        </div>

        {/* Right Panel: Moment Rail */}
        <div
          className={cn(
            "flex flex-col border-l border-stroke transition-all duration-300",
            expandedPanel === "moments"
              ? "flex-1"
              : expandedPanel !== null
                ? "hidden lg:flex lg:w-0 lg:overflow-hidden"
                : "w-full lg:w-80 xl:w-96"
          )}
        >
          {isPanelVisible("moments") && (
            <>
              <PanelHeader
                title="Timeline"
                isExpanded={expandedPanel === "moments"}
                onToggleExpand={() => togglePanelExpand("moments")}
              />
              <div className="flex-1 overflow-hidden">
                <MomentRail
                  moments={moments}
                  totalDuration={streamDuration}
                  currentTime={currentTime}
                  onMomentClick={handleMomentClick}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="flex items-center justify-between border-t border-stroke bg-bg-1 px-6 py-2">
        <div className="flex items-center gap-4 text-xs text-text-dim">
          <span>{clips.length} clips</span>
          <span className="text-stroke">|</span>
          <span>{posts.length} posts</span>
          <span className="text-stroke">|</span>
          <span>{moments.length} moments</span>
        </div>
        <div className="text-xs text-text-dim">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </footer>

      {/* Clip Preview Modal */}
      <ClipPreviewModal
        clip={previewClip}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onEdit={handleClipEdit}
        onExport={handleClipExport}
        onNext={handleNextClip}
        onPrevious={handlePreviousClip}
        hasNext={
          previewClip
            ? clips.findIndex((c) => c.id === previewClip.id) < clips.length - 1
            : false
        }
        hasPrevious={
          previewClip ? clips.findIndex((c) => c.id === previewClip.id) > 0 : false
        }
        videoSrc={previewClip ? getClipMediaUrl(previewClip.id) : undefined}
      />
    </div>
  );
}

export default ProducerDesk;

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PostCard } from "./PostCard";
import type { PostQueueProps, Platform, PostStatus } from "./types";
import { PLATFORM_CONFIG } from "./types";

// ============================================================
// Platform Icons
// ============================================================

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<Platform, React.FC<{ className?: string }>> = {
  x: XIcon,
  linkedin: LinkedInIcon,
  instagram: InstagramIcon,
  youtube: YouTubeIcon,
};

// ============================================================
// Status Configuration
// ============================================================

type StatusFilterOption = PostStatus | "all";

const STATUS_OPTIONS: { value: StatusFilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
];

// ============================================================
// PostQueue Component
// ============================================================

export function PostQueue({
  posts,
  onPostEdit,
  onPostCopy,
  onPostApprove,
  onPostShare,
  onPostContentChange,
  activePlatform: externalActivePlatform,
  activeStatus: externalActiveStatus,
}: PostQueueProps) {
  const [activePlatform, setActivePlatform] = useState<Platform | "all">(
    externalActivePlatform ?? "all"
  );
  const [activeStatus, setActiveStatus] = useState<StatusFilterOption>(
    externalActiveStatus ?? "all"
  );

  // Filter posts based on selected filters
  const filteredPosts = posts.filter((post) => {
    const platformMatch =
      activePlatform === "all" || post.platform === activePlatform;
    const statusMatch =
      activeStatus === "all" || post.status === activeStatus;
    return platformMatch && statusMatch;
  });

  // Count posts by platform
  const platformCounts = {
    all: posts.length,
    x: posts.filter((p) => p.platform === "x").length,
    linkedin: posts.filter((p) => p.platform === "linkedin").length,
    instagram: posts.filter((p) => p.platform === "instagram").length,
    youtube: posts.filter((p) => p.platform === "youtube").length,
  };

  // Count posts by status
  const statusCounts = {
    all: posts.length,
    draft: posts.filter((p) => p.status === "draft").length,
    approved: posts.filter((p) => p.status === "approved").length,
    published: posts.filter((p) => p.status === "published").length,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-2">
          <FileTextIcon className="h-5 w-5 text-purple" />
          <h2 className="text-lg font-semibold text-text">Post Queue</h2>
          <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted">
            {posts.length}
          </span>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-stroke px-4 py-2">
        <button
          onClick={() => setActivePlatform("all")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            activePlatform === "all"
              ? "bg-purple/10 text-purple"
              : "text-text-muted hover:bg-surface hover:text-text"
          )}
        >
          All
          <span className="opacity-60">({platformCounts.all})</span>
        </button>

        {(Object.keys(PLATFORM_ICONS) as Platform[]).map((platform) => {
          const Icon = PLATFORM_ICONS[platform];
          const config = PLATFORM_CONFIG[platform];
          const count = platformCounts[platform];

          return (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                activePlatform === platform
                  ? "text-text"
                  : "text-text-muted hover:bg-surface hover:text-text"
              )}
              style={{
                backgroundColor:
                  activePlatform === platform
                    ? `${config.color}20`
                    : undefined,
                color:
                  activePlatform === platform ? config.color : undefined,
              }}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{config.name.split(" ")[0]}</span>
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 border-b border-stroke px-4 py-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setActiveStatus(option.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeStatus === option.value
                ? "bg-surface text-text"
                : "text-text-muted hover:bg-surface-hover hover:text-text"
            )}
          >
            {option.label}
            <span className="ml-1 opacity-60">
              ({statusCounts[option.value]})
            </span>
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredPosts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-muted">
            <FileTextIcon className="mb-3 h-12 w-12 opacity-50" />
            <p className="text-sm">No posts found</p>
            <p className="mt-1 text-xs text-text-dim">
              {activePlatform !== "all" || activeStatus !== "all"
                ? "Try adjusting your filters"
                : "Posts will appear here when created"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onEdit={onPostEdit}
                onCopy={onPostCopy}
                onApprove={onPostApprove}
                onShare={onPostShare}
                onContentChange={onPostContentChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-stroke px-4 py-2">
        <div className="flex items-center justify-between text-xs text-text-dim">
          <span>
            {statusCounts.draft} drafts | {statusCounts.approved} approved
          </span>
          <span>{statusCounts.published} published</span>
        </div>
      </div>
    </div>
  );
}

export default PostQueue;

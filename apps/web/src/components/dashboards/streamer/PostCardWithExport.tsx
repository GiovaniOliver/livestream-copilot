"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CopyToClipboard, ExportButton, ExportModal, type ExportContent } from "@/components/export";
import { useExport } from "@/hooks/useExport";
import type { PostCardProps, Platform, PostStatus } from "./types";
import { PLATFORM_CONFIG } from "./types";
import { logger } from "@/lib/logger";

// ============================================================
// Platform Icons
// ============================================================

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

function XIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  );
}

function YouTubeIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<Platform, React.FC<IconProps>> = {
  x: XIcon,
  linkedin: LinkedInIcon,
  instagram: InstagramIcon,
  youtube: YouTubeIcon,
};

// ============================================================
// Action Icons
// ============================================================

function EditIcon({ className }: { className?: string }) {
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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ============================================================
// Status Configuration
// ============================================================

const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; variant: "default" | "teal" | "purple" }
> = {
  draft: { label: "Draft", variant: "default" },
  approved: { label: "Approved", variant: "teal" },
  published: { label: "Published", variant: "purple" },
};

// ============================================================
// PostCardWithExport Component
// ============================================================

export function PostCardWithExport({
  post,
  onEdit,
  onCopy,
  onApprove,
  onShare,
  onContentChange,
  isEditing: externalIsEditing,
}: PostCardProps) {
  const [isEditing, setIsEditing] = useState(externalIsEditing ?? false);
  const [content, setContent] = useState(post.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const PlatformIcon = PLATFORM_ICONS[post.platform];
  const platformConfig = PLATFORM_CONFIG[post.platform];
  const statusConfig = STATUS_CONFIG[post.status];
  const characterCount = content.length;
  const isOverLimit = characterCount > post.characterLimit;

  // Export functionality
  const {
    isModalOpen,
    currentContent,
    openExport,
    closeExport,
    handleExport,
    generateHashtagSuggestions,
  } = useExport({
    onSuccess: () => {
      logger.debug("Export successful");
      onShare?.(post);
    },
  });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, [isEditing, content.length]);

  const handleEdit = () => {
    if (isEditing) {
      onContentChange?.(post.id, content);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
    onEdit?.(post);
  };

  const handleApprove = () => {
    onApprove?.(post);
  };

  const handleExportClick = () => {
    const exportContent: ExportContent = {
      id: post.id,
      type: "post",
      title: `${platformConfig.name} Post`,
      caption: content,
      createdAt: post.createdAt,
    };

    openExport(exportContent);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setContent(post.content);
      setIsEditing(false);
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleEdit();
    }
  };

  const hashtagSuggestions = currentContent
    ? generateHashtagSuggestions(currentContent)
    : [];

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border transition-all duration-200",
          "bg-bg-1 hover:bg-bg-2",
          isEditing ? "border-teal shadow-glow" : "border-stroke"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${platformConfig.color}20` }}
            >
              <PlatformIcon
                className="h-4 w-4"
                style={{ color: platformConfig.color }}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-text">
                {platformConfig.name}
              </span>
            </div>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>

        {/* Content */}
        <div className="p-4">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full resize-none rounded-lg border bg-bg-0 p-3 text-sm text-text",
                "placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-teal",
                isOverLimit ? "border-error" : "border-stroke"
              )}
              rows={4}
              placeholder="Write your post content..."
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-text-muted">
              {content}
            </p>
          )}

          <div className="mt-2 flex items-center justify-end">
            <span
              className={cn(
                "text-xs font-medium",
                isOverLimit ? "text-error" : "text-text-dim"
              )}
            >
              {characterCount}/{post.characterLimit}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-stroke px-4 py-3">
          <CopyToClipboard
            text={content}
            variant="inline"
            size="sm"
            onCopy={() => onCopy?.(post)}
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="gap-1.5"
            aria-label={isEditing ? "Save changes" : "Edit post"}
          >
            {isEditing ? (
              <>
                <CheckIcon className="h-4 w-4 text-teal" />
                <span className="text-xs text-teal">Save</span>
              </>
            ) : (
              <>
                <EditIcon className="h-4 w-4" />
                <span className="text-xs">Edit</span>
              </>
            )}
          </Button>

          {post.status === "draft" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleApprove}
              className="gap-1.5"
              aria-label="Approve post"
            >
              <CheckIcon className="h-4 w-4" />
              <span className="text-xs">Approve</span>
            </Button>
          )}

          <ExportButton
            onClick={handleExportClick}
            variant="ghost"
            size="sm"
            label="Export"
            showIcon
            disabled={post.status === "draft"}
            className="ml-auto"
          />
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isModalOpen}
        onClose={closeExport}
        content={currentContent}
        onExport={handleExport}
        hashtagSuggestions={hashtagSuggestions}
      />
    </>
  );
}

export default PostCardWithExport;

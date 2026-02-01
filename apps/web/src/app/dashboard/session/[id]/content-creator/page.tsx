"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardHeader } from "@/components/dashboard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "@/components/ui";
import { LiveVideoPreview, useLiveStream } from "@/components/video";
import { ClipQueueDashboard } from "@/components/clip-queue";
import { type Session } from "@/lib/stores/sessions";
import { useSession } from "@/hooks/useSessions";
import { useClips } from "@/hooks/useClips";
import { useOutputs, type Output } from "@/hooks/useOutputs";
import { getHealth } from "@/lib/api/health";
import { cn } from "@/lib/utils";
import type { OutputStatus } from "@/lib/api/outputs";
import { logger } from "@/lib/logger";

// ============================================================
// Types
// ============================================================

interface MomentMarker {
  id: string;
  type: "hype" | "qa" | "sponsor" | "clip";
  timestamp: number;
  label: string;
}

// ============================================================
// Icons
// ============================================================

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
      />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

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

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================
// Platform Config
// ============================================================

const PLATFORM_CONFIG = {
  x: { name: "X (Twitter)", color: "#1DA1F2", Icon: XIcon },
  linkedin: { name: "LinkedIn", color: "#0A66C2", Icon: LinkedInIcon },
  instagram: { name: "Instagram", color: "#E4405F", Icon: InstagramIcon },
  youtube: { name: "YouTube", color: "#FF0000", Icon: YouTubeIcon },
  general: { name: "General", color: "#6B7280", Icon: DocumentIcon },
} as const;

// ============================================================
// Moment Type Config
// ============================================================

const MOMENT_TYPE_CONFIG = {
  hype: { name: "Hype", color: "#FBBF24" },
  qa: { name: "Q&A", color: "#8B5CF6" },
  sponsor: { name: "Sponsor", color: "#2EE59D" },
  clip: { name: "Clip", color: "#00D4C7" },
} as const;

// ============================================================
// Page Props
// ============================================================

interface ContentCreatorPageProps {
  params: Promise<{ id: string }>;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calculate live duration from session start time to now
 */
function calculateLiveDuration(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const durationMs = now - start;

  const seconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================
// Post Card Component with Edit/Copy/Regenerate functionality
// ============================================================

interface PostCardProps {
  output: Output;
  onApprove: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: { title?: string; text?: string }) => Promise<void>;
}

function PostCard({ output, onApprove, onDelete, onUpdate }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(output.title || "");
  const [editText, setEditText] = useState(output.text);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const platformConfig = PLATFORM_CONFIG[output.platform];

  // Reset edit state when output changes
  useEffect(() => {
    setEditTitle(output.title || "");
    setEditText(output.text);
  }, [output.title, output.text]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      const textToCopy = output.title
        ? `${output.title}\n\n${output.text}`
        : output.text;

      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);

      // Reset success state after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      logger.error("Failed to copy to clipboard:", err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = output.title
          ? `${output.title}\n\n${output.text}`
          : output.text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch {
        logger.error("Fallback copy also failed");
      }
    }
  }, [output.title, output.text]);

  // Handle edit mode toggle
  const handleStartEdit = useCallback(() => {
    setEditTitle(output.title || "");
    setEditText(output.text);
    setIsEditing(true);
  }, [output.title, output.text]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditTitle(output.title || "");
    setEditText(output.text);
    setIsEditing(false);
  }, [output.title, output.text]);

  // Handle save edit
  const handleSaveEdit = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onUpdate(output.id, {
        title: editTitle || undefined,
        text: editText,
      });
      setIsEditing(false);
    } catch (err) {
      logger.error("Failed to save edit:", err);
    } finally {
      setIsSaving(false);
    }
  }, [output.id, editTitle, editText, onUpdate, isSaving]);

  // Handle delete with confirmation
  const handleDelete = useCallback(async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete(output.id);
    } catch (err) {
      logger.error("Failed to delete:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [output.id, onDelete, isDeleting]);

  // Handle regenerate content
  const handleRegenerate = useCallback(async () => {
    if (isRegenerating) return;

    setIsRegenerating(true);
    try {
      // TODO: Implement regenerate API endpoint
      // For now, show a message that this feature is coming soon
      // await regenerateOutput(output.id);

      // Placeholder: show alert for now
      alert("Regenerate feature coming soon! This will use AI to create a new version of this post.");
    } catch (err) {
      logger.error("Failed to regenerate:", err);
    } finally {
      setIsRegenerating(false);
    }
  }, [isRegenerating]);

  if (isEditing) {
    return (
      <div className="rounded-xl border border-purple/50 bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <span style={{ color: platformConfig.color }}>
            <platformConfig.Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-text-muted">
            Editing {platformConfig.name} Post
          </span>
        </div>

        {/* Title input */}
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Title (optional)"
          className="mb-2 w-full rounded-lg border border-stroke bg-bg-2 px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
        />

        {/* Text input */}
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder="Post content"
          rows={4}
          className="mb-3 w-full resize-none rounded-lg border border-stroke bg-bg-2 px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
        />

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={isSaving}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={isSaving || !editText.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-purple px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple/90 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <LoadingSpinner className="h-3 w-3" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-3 w-3" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stroke bg-surface p-4 transition-colors hover:bg-surface-hover">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: platformConfig.color }}>
          <platformConfig.Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium text-text-muted">
          {platformConfig.name}
        </span>
        <Badge
          variant={
            output.status === "approved"
              ? "success"
              : output.status === "published"
              ? "teal"
              : "default"
          }
          className="ml-auto text-xs"
        >
          {output.status}
        </Badge>
      </div>

      {/* Content */}
      {output.title && (
        <h4 className="mb-1 text-sm font-medium text-text">
          {output.title}
        </h4>
      )}
      <p className="line-clamp-3 text-sm text-text">
        {output.text}
      </p>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-text-dim">
          {output.formattedDate}
        </span>

        <div className="flex gap-1">
          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "rounded p-1 transition-colors",
              copySuccess
                ? "bg-success/10 text-success"
                : "text-text-muted hover:bg-surface hover:text-text"
            )}
            title={copySuccess ? "Copied!" : "Copy to clipboard"}
          >
            {copySuccess ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <ClipboardIcon className="h-4 w-4" />
            )}
          </button>

          {/* Edit button */}
          <button
            type="button"
            onClick={handleStartEdit}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface hover:text-text"
            title="Edit post"
          >
            <PencilIcon className="h-4 w-4" />
          </button>

          {/* Regenerate button */}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="rounded p-1 text-purple transition-colors hover:bg-purple/10 disabled:opacity-50"
            title="Regenerate with AI"
          >
            {isRegenerating ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <SparklesIcon className="h-4 w-4" />
            )}
          </button>

          {/* Approve button (only for drafts) */}
          {output.status === "draft" && (
            <button
              type="button"
              onClick={() => onApprove(output.id)}
              className="rounded p-1 text-success transition-colors hover:bg-success/10"
              title="Approve"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          )}

          {/* Delete button with confirmation */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded p-1 text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                title="Confirm delete"
              >
                {isDeleting ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  <CheckIcon className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded p-1 text-text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-50"
                title="Cancel"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded p-1 text-error transition-colors hover:bg-error/10"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Content Creator Dashboard Page
// ============================================================

export default function ContentCreatorPage({ params }: ContentCreatorPageProps) {
  const [sessionId, setSessionId] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);

  // Moment markers - to be populated via WebSocket
  const [moments, setMoments] = useState<MomentMarker[]>([]);

  // Platform filter for post drafts
  const [activePlatform, setActivePlatform] = useState<
    "all" | "x" | "linkedin" | "instagram" | "youtube" | "general"
  >("all");

  // Current time for timeline
  const [currentTime, setCurrentTime] = useState(0);

  // Total stream duration (in seconds)
  const [totalDuration, setTotalDuration] = useState(0);

  // OBS connection status
  const [isObsConnected, setIsObsConnected] = useState(false);

  // Live duration ticker (for live sessions)
  const [liveDuration, setLiveDuration] = useState<string>("0:00:00");

  // Clip queue sidebar state
  const [isClipQueueCollapsed, setIsClipQueueCollapsed] = useState(false);

  // Live stream status hook
  const { status: videoStatus } = useLiveStream();

  // Resolve params
  useEffect(() => {
    params.then(({ id }) => {
      setSessionId(id);
    });
  }, [params]);

  // Load session from API
  const { session: apiSession } = useSession(sessionId);
  useEffect(() => {
    if (apiSession) {
      setSession(apiSession);
    }
  }, [apiSession]);

  // Fetch clips from API using useClips hook
  const {
    clips,
    isLoading: isClipsLoading,
    error: clipsError,
    refresh: refreshClips,
  } = useClips(sessionId, { limit: 50, autoRefresh: true });

  // Fetch outputs (post drafts) from API using useOutputs hook
  const {
    outputs,
    isLoading: isOutputsLoading,
    error: outputsError,
    refresh: refreshOutputs,
    updateOutput,
    updateStatus: updateOutputStatus,
    deleteOutput,
    draftCount,
    approvedCount,
    platformCounts,
  } = useOutputs(sessionId, { limit: 50, autoRefresh: true });

  // Update live duration every second for live sessions
  useEffect(() => {
    if (session?.status === "live" && session?.startedAt) {
      // Initial calculation
      setLiveDuration(calculateLiveDuration(session.startedAt));

      // Update every second
      const interval = setInterval(() => {
        setLiveDuration(calculateLiveDuration(session.startedAt));
      }, 1000);

      return () => clearInterval(interval);
    } else if (session?.duration) {
      // Use stored duration for ended sessions
      setLiveDuration(session.duration);
    }
  }, [session?.status, session?.startedAt, session?.duration]);

  // Check OBS connection status via health endpoint
  const checkObsStatus = useCallback(async () => {
    try {
      const health = await getHealth();
      setIsObsConnected(health.components?.obs ?? false);
    } catch {
      setIsObsConnected(false);
    }
  }, []);

  // Poll OBS status every 5 seconds
  useEffect(() => {
    checkObsStatus();
    const interval = setInterval(checkObsStatus, 5000);
    return () => clearInterval(interval);
  }, [checkObsStatus]);

  // Filter outputs by platform
  const filteredOutputs =
    activePlatform === "all"
      ? outputs
      : outputs.filter((o) => o.platform === activePlatform);

  // Calculate all platform counts including "all"
  const allPlatformCounts = {
    all: outputs.length,
    ...platformCounts,
  };

  // Handle approving an output
  const handleApprove = useCallback(
    async (outputId: string) => {
      try {
        await updateOutputStatus(outputId, "approved");
      } catch (err) {
        logger.error("Failed to approve output:", err);
      }
    },
    [updateOutputStatus]
  );

  // Handle deleting an output
  const handleDelete = useCallback(
    async (outputId: string) => {
      try {
        await deleteOutput(outputId);
      } catch (err) {
        logger.error("Failed to delete output:", err);
      }
    },
    [deleteOutput]
  );

  // Handle updating an output (for edit functionality)
  const handleUpdate = useCallback(
    async (outputId: string, updates: { title?: string; text?: string }) => {
      try {
        await updateOutput(outputId, updates);
      } catch (err) {
        logger.error("Failed to update output:", err);
        throw err; // Re-throw so PostCard can handle the error
      }
    },
    [updateOutput]
  );

  // Get display duration - use live calculation for live sessions, stored value otherwise
  const displayDuration = useMemo(() => {
    if (session?.status === "live") {
      return liveDuration;
    }
    return session?.duration || "0:00:00";
  }, [session?.status, session?.duration, liveDuration]);

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-text-muted">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Add margin-right when clip queue sidebar is expanded */}
      <div className={cn("transition-all duration-300", !isClipQueueCollapsed && "mr-80")}>
      <DashboardHeader
        session={
          session
            ? {
                id: session.id,
                name: session.name,
                status: session.status,
                duration: displayDuration,
                workflow: "Content Creator",
              }
            : {
                id: sessionId,
                name: "Session",
                status: "active",
                workflow: "Content Creator",
              }
        }
        isStreaming={videoStatus?.isStreaming}
        title="Content Creator"
        subtitle="Clip queue, post drafts by platform, and moment rail for fast publishing"
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Clips Detected */}
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <FilmIcon className="h-5 w-5 text-purple" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Clips Detected</p>
                <p className="text-2xl font-bold text-text">
                  {isClipsLoading ? "--" : clips.length}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Outputs Generated */}
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <DocumentIcon className="h-5 w-5 text-teal" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Post Drafts</p>
                <p className="text-2xl font-bold text-text">
                  {isOutputsLoading ? "--" : outputs.length}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Approved Posts */}
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckIcon className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Approved</p>
                <p className="text-2xl font-bold text-text">
                  {isOutputsLoading ? "--" : approvedCount}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Session Duration */}
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <ClockIcon className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Duration</p>
                <p className="text-2xl font-bold font-mono text-text">
                  {displayDuration}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content - Video Preview */}
          <div className="lg:col-span-2">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  Real-time stream preview with highlight detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Live Video Preview */}
                <div className="relative">
                  <LiveVideoPreview
                    webrtcUrl={videoStatus?.webrtcUrl}
                    hlsUrl={videoStatus?.hlsUrl}
                    isStreamActive={videoStatus?.isStreaming ?? isObsConnected}
                    onConnectionChange={(connected) => {
                      // Optional: sync with OBS connection state if needed
                      if (connected && !isObsConnected) {
                        setIsObsConnected(true);
                      }
                    }}
                  />
                  {/* Timestamp overlay */}
                  <div className="absolute bottom-4 right-4 z-10">
                    <span className="rounded bg-black/50 px-2 py-1 font-mono text-sm text-white">
                      {displayDuration}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Detected Clips */}
          <div>
            <Card variant="elevated" className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Detected Clips</CardTitle>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => refreshClips()}
                      disabled={isClipsLoading}
                      className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-50"
                      title="Refresh clips"
                    >
                      <RefreshIcon className={cn("h-4 w-4", isClipsLoading && "animate-spin")} />
                    </button>
                    <Badge variant={clips.length > 0 ? "teal" : "default"}>
                      {isClipsLoading ? "..." : `${clips.length} clips`}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  {clipsError
                    ? "Failed to load clips"
                    : "AI-detected highlights from your stream"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isClipsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <LoadingSpinner className="mb-3 h-8 w-8 text-teal" />
                    <p className="text-sm text-text-muted">Loading clips...</p>
                  </div>
                ) : clipsError ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                      <FilmIcon className="h-6 w-6 text-error" />
                    </div>
                    <p className="text-sm text-error">{clipsError}</p>
                    <button
                      type="button"
                      onClick={() => refreshClips()}
                      className="mt-3 text-xs text-teal hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : clips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                      <FilmIcon className="h-6 w-6 text-text-dim" />
                    </div>
                    <p className="text-sm text-text-muted">No clips detected yet</p>
                    <p className="mt-1 text-xs text-text-dim">
                      Clips will appear here as they are detected
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {clips.map((clip) => (
                      <div
                        key={clip.id}
                        className="rounded-xl border border-stroke bg-surface p-3 transition-colors hover:bg-surface-hover"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <h4 className="font-medium text-text">
                            Clip at {clip.timestamp}
                          </h4>
                          <Badge variant="teal" className="text-xs">
                            {clip.durationFormatted}
                          </Badge>
                        </div>
                        <div className="mb-2 flex flex-wrap gap-1">
                          <span className="rounded bg-bg-2 px-2 py-0.5 text-xs text-text-muted">
                            {clip.t0.toFixed(1)}s - {clip.t1.toFixed(1)}s
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-muted">
                          <span>
                            {new Date(clip.createdAt).toLocaleTimeString()}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="flex items-center gap-1 text-teal transition-colors hover:text-teal-400"
                            >
                              <PlayIcon className="h-3 w-3" />
                              Preview
                            </button>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-purple transition-colors hover:text-purple-400"
                            >
                              <DownloadIcon className="h-3 w-3" />
                              Export
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Timeline Section */}
        <Card variant="elevated" className="mt-6">
          <CardHeader>
            <CardTitle>Stream Timeline</CardTitle>
            <CardDescription>
              Visual overview of highlights and engagement throughout the stream
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Timeline Placeholder */}
            <div className="h-24 rounded-xl bg-bg-2">
              <div className="flex h-full flex-col items-center justify-center">
                <p className="text-sm text-text-muted">
                  Timeline visualization will appear here
                </p>
                <p className="mt-1 text-xs text-text-dim">
                  Showing moments and engagement data in real-time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Post Drafts Section */}
        <Card variant="elevated" className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Post Drafts</CardTitle>
                <CardDescription>
                  AI-generated social media posts ready for review and publishing
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshOutputs()}
                  disabled={isOutputsLoading}
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-50"
                  title="Refresh posts"
                >
                  <RefreshIcon className={cn("h-4 w-4", isOutputsLoading && "animate-spin")} />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Platform Tabs */}
            <div className="mb-4 flex gap-1 overflow-x-auto border-b border-stroke pb-3">
              <button
                type="button"
                onClick={() => setActivePlatform("all")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  activePlatform === "all"
                    ? "bg-purple/10 text-purple"
                    : "text-text-muted hover:bg-surface hover:text-text"
                )}
              >
                All
                <span className="opacity-60">({allPlatformCounts.all})</span>
              </button>

              {(Object.keys(PLATFORM_CONFIG) as Array<keyof typeof PLATFORM_CONFIG>).map(
                (platform) => {
                  const config = PLATFORM_CONFIG[platform];
                  const count = platformCounts[platform] || 0;

                  return (
                    <button
                      key={platform}
                      type="button"
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
                      <config.Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {config.name.split(" ")[0]}
                      </span>
                      <span className="opacity-60">({count})</span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Posts Grid */}
            {isOutputsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <LoadingSpinner className="mb-3 h-8 w-8 text-purple" />
                <p className="text-sm text-text-muted">Loading post drafts...</p>
              </div>
            ) : outputsError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                  <DocumentIcon className="h-6 w-6 text-error" />
                </div>
                <p className="text-sm text-error">{outputsError}</p>
                <button
                  type="button"
                  onClick={() => refreshOutputs()}
                  className="mt-3 text-xs text-purple hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : filteredOutputs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                  <DocumentIcon className="h-6 w-6 text-text-dim" />
                </div>
                <p className="text-sm text-text-muted">No post drafts yet</p>
                <p className="mt-1 text-xs text-text-dim">
                  AI-generated posts will appear here as clips are detected
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {filteredOutputs.map((output) => (
                  <PostCard
                    key={output.id}
                    output={output}
                    onApprove={handleApprove}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Moment Rail Section */}
        <Card variant="elevated" className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Moment Rail</CardTitle>
                <CardDescription>
                  Mark and track key moments during the stream
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {(Object.keys(MOMENT_TYPE_CONFIG) as Array<keyof typeof MOMENT_TYPE_CONFIG>).map(
                  (type) => {
                    const config = MOMENT_TYPE_CONFIG[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
                        style={{ color: config.color }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.name}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {moments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                  <BookmarkIcon className="h-6 w-6 text-text-dim" />
                </div>
                <p className="text-sm text-text-muted">No moments marked yet</p>
                <p className="mt-1 text-xs text-text-dim">
                  Click a moment type above to mark the current timestamp
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline Track */}
                <div className="h-2 rounded-full bg-bg-2">
                  {/* Current position indicator */}
                  {totalDuration > 0 && (
                    <div
                      className="h-full rounded-full bg-teal/50"
                      style={{
                        width: `${(currentTime / totalDuration) * 100}%`,
                      }}
                    />
                  )}
                </div>

                {/* Moment Markers */}
                <div className="relative mt-4 flex flex-wrap gap-2">
                  {moments.map((moment) => {
                    const config = MOMENT_TYPE_CONFIG[moment.type];
                    return (
                      <div
                        key={moment.id}
                        className="flex items-center gap-2 rounded-lg border border-stroke bg-surface px-3 py-2 transition-colors hover:bg-surface-hover"
                        style={{ borderColor: `${config.color}40` }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-xs font-medium text-text">
                          {moment.label}
                        </span>
                        <span className="text-xs text-text-dim">
                          {Math.floor(moment.timestamp / 60)}:
                          {(moment.timestamp % 60).toString().padStart(2, "0")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Clip Queue Sidebar */}
      <ClipQueueDashboard
        sessionId={sessionId}
        isCollapsed={isClipQueueCollapsed}
        onToggleCollapse={() => setIsClipQueueCollapsed(!isClipQueueCollapsed)}
      />
    </div>
  );
}

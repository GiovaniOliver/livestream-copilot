// ============================================================
// Producer Desk Types
// TypeScript interfaces for the Live Streamer workflow dashboard
// ============================================================

import { API_CONFIG } from '@/lib/config';

// ============================================================
// Clip Types
// ============================================================

export type ClipStatus = "processing" | "ready" | "error";

export interface Clip {
  id: string;
  artifactId: string; // Artifact ID used to generate media URLs
  title: string;
  hookText: string;
  thumbnailUrl: string;
  path: string; // Path to video file on backend
  duration: number; // in seconds
  status: ClipStatus;
  createdAt: Date;
  startTime: number; // timestamp in stream (seconds)
  endTime: number; // timestamp in stream (seconds)
}

export interface ClipCardProps {
  clip: Clip;
  onEdit?: (clip: Clip) => void;
  onExport?: (clip: Clip) => void;
  onClick?: (clip: Clip) => void;
  isSelected?: boolean;
}

export interface ClipBinProps {
  clips: Clip[];
  onClipSelect?: (clip: Clip) => void;
  onClipEdit?: (clip: Clip) => void;
  onClipExport?: (clip: Clip) => void;
  selectedClipId?: string;
}

// ============================================================
// Post Types
// ============================================================

export type Platform = "x" | "linkedin" | "instagram" | "youtube";

export type PostStatus = "draft" | "approved" | "published";

export interface Post {
  id: string;
  platform: Platform;
  content: string;
  status: PostStatus;
  clipId?: string; // Associated clip if any
  createdAt: Date;
  scheduledAt?: Date;
  publishedAt?: Date;
  characterLimit: number;
}

export interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void;
  onCopy?: (post: Post) => void;
  onApprove?: (post: Post) => void;
  onShare?: (post: Post) => void;
  onContentChange?: (postId: string, content: string) => void;
  isEditing?: boolean;
}

export interface PostQueueProps {
  posts: Post[];
  onPostEdit?: (post: Post) => void;
  onPostCopy?: (post: Post) => void;
  onPostApprove?: (post: Post) => void;
  onPostShare?: (post: Post) => void;
  onPostContentChange?: (postId: string, content: string) => void;
  activePlatform?: Platform | "all";
  activeStatus?: PostStatus | "all";
}

// ============================================================
// Moment Types
// ============================================================

export type MomentType = "hype" | "qa" | "sponsor" | "clip";

export interface Moment {
  id: string;
  type: MomentType;
  timestamp: number; // in seconds
  label: string;
  description?: string;
  clipId?: string; // Associated clip if any
}

export interface MomentMarkerProps {
  moment: Moment;
  onClick?: (moment: Moment) => void;
  onHover?: (moment: Moment | null) => void;
  isActive?: boolean;
  position: number; // Percentage position on timeline (0-100)
}

export interface MomentRailProps {
  moments: Moment[];
  totalDuration: number; // Total stream duration in seconds
  onMomentClick?: (moment: Moment) => void;
  onMomentHover?: (moment: Moment | null) => void;
  currentTime?: number; // Current playback position
}

// ============================================================
// Producer Desk Props
// ============================================================

export interface ProducerDeskProps {
  clips?: Clip[];
  posts?: Post[];
  moments?: Moment[];
  streamDuration?: number;
  currentTime?: number;
  onClipSelect?: (clip: Clip) => void;
  onClipEdit?: (clip: Clip) => void;
  onClipExport?: (clip: Clip) => void;
  onPostEdit?: (post: Post) => void;
  onPostCopy?: (post: Post) => void;
  onPostApprove?: (post: Post) => void;
  onPostShare?: (post: Post) => void;
  onMomentClick?: (moment: Moment) => void;
}

// ============================================================
// Platform Configuration
// ============================================================

export interface PlatformConfig {
  id: Platform;
  name: string;
  icon: React.ReactNode;
  characterLimit: number;
  color: string;
}

export const PLATFORM_CONFIG: Record<Platform, Omit<PlatformConfig, "icon">> = {
  x: {
    id: "x",
    name: "X (Twitter)",
    characterLimit: 280,
    color: "#1DA1F2",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    characterLimit: 3000,
    color: "#0A66C2",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    characterLimit: 2200,
    color: "#E4405F",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    characterLimit: 5000,
    color: "#FF0000",
  },
};

// ============================================================
// Moment Type Configuration
// ============================================================

export interface MomentTypeConfig {
  id: MomentType;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const MOMENT_TYPE_CONFIG: Record<MomentType, MomentTypeConfig> = {
  hype: {
    id: "hype",
    name: "Hype Moment",
    color: "#FBBF24", // warning/amber
    bgColor: "bg-warning/20",
    borderColor: "border-warning/40",
  },
  qa: {
    id: "qa",
    name: "Q&A",
    color: "#8B5CF6", // purple
    bgColor: "bg-purple/20",
    borderColor: "border-purple/40",
  },
  sponsor: {
    id: "sponsor",
    name: "Sponsor",
    color: "#2EE59D", // success/green
    bgColor: "bg-success/20",
    borderColor: "border-success/40",
  },
  clip: {
    id: "clip",
    name: "Clip",
    color: "#00D4C7", // teal
    bgColor: "bg-teal/20",
    borderColor: "border-teal/40",
  },
};

// ============================================================
// Utility Functions
// ============================================================

/**
 * Generate video URL for a clip
 * @param artifactId - The artifact ID of the clip
 * @returns Full URL to the clip's video file
 */
export function getClipVideoUrl(artifactId: string): string {
  const baseUrl = API_CONFIG.desktopApiUrl;
  return `${baseUrl}/api/clips/${artifactId}/media`;
}

/**
 * Generate thumbnail URL for a clip
 * @param artifactId - The artifact ID of the clip
 * @returns Full URL to the clip's thumbnail
 */
export function getClipThumbnailUrl(artifactId: string): string {
  const baseUrl = API_CONFIG.desktopApiUrl;
  return `${baseUrl}/api/clips/${artifactId}/thumbnail`;
}

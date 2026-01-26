// ============================================================
// Social Media Export Types
// TypeScript interfaces for export functionality across all dashboards
// ============================================================

// ============================================================
// Platform Types
// ============================================================

export type SocialPlatform = "x" | "linkedin" | "instagram" | "tiktok" | "youtube";

export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  characterLimit: number;
  videoMaxDuration?: number; // in seconds
  videoMaxSize?: number; // in MB
  supportedFormats: string[];
  aspectRatios: AspectRatio[];
  color: string;
  hashtagLimit?: number;
}

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";

export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  x: {
    id: "x",
    name: "X (Twitter)",
    characterLimit: 280,
    videoMaxDuration: 140,
    videoMaxSize: 512,
    supportedFormats: ["mp4", "mov"],
    aspectRatios: ["16:9", "1:1"],
    color: "#1DA1F2",
    hashtagLimit: 2,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    characterLimit: 3000,
    videoMaxDuration: 600,
    videoMaxSize: 5120,
    supportedFormats: ["mp4", "mov", "avi"],
    aspectRatios: ["16:9", "1:1", "4:5"],
    color: "#0A66C2",
    hashtagLimit: 5,
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    characterLimit: 2200,
    videoMaxDuration: 90,
    videoMaxSize: 100,
    supportedFormats: ["mp4", "mov"],
    aspectRatios: ["9:16", "1:1", "4:5"],
    color: "#E4405F",
    hashtagLimit: 30,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    characterLimit: 2200,
    videoMaxDuration: 180,
    videoMaxSize: 287,
    supportedFormats: ["mp4", "mov"],
    aspectRatios: ["9:16"],
    color: "#000000",
    hashtagLimit: 100,
  },
  youtube: {
    id: "youtube",
    name: "YouTube Shorts",
    characterLimit: 5000,
    videoMaxDuration: 60,
    videoMaxSize: 256,
    supportedFormats: ["mp4", "mov", "avi"],
    aspectRatios: ["9:16"],
    color: "#FF0000",
    hashtagLimit: 15,
  },
};

// ============================================================
// Export Format Types
// ============================================================

export type ExportFormat = "mp4" | "mov" | "webm";

export type VideoQuality = "1080p" | "720p" | "480p";

export interface ExportFormatOptions {
  format: ExportFormat;
  quality: VideoQuality;
  aspectRatio: AspectRatio;
  includeCaptions?: boolean;
  includeWatermark?: boolean;
}

// ============================================================
// Export Content Types
// ============================================================

export interface ExportContent {
  id: string;
  type: "clip" | "post" | "quote" | "chapter";
  title: string;
  caption?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: Date;
}

export interface ExportRequest {
  contentId: string;
  platforms: SocialPlatform[];
  caption: string;
  hashtags: string[];
  formatOptions: ExportFormatOptions;
  customFilename?: string;
}

// ============================================================
// Export Status Types
// ============================================================

export type ExportStatus = "idle" | "preparing" | "exporting" | "completed" | "error";

export interface ExportProgress {
  status: ExportStatus;
  progress: number; // 0-100
  message?: string;
  error?: string;
}

export interface ExportResult {
  id: string;
  contentId: string;
  platform: SocialPlatform;
  downloadUrl: string;
  filename: string;
  fileSize: number;
  createdAt: Date;
}

// ============================================================
// Export History Types
// ============================================================

export interface ExportHistoryItem {
  id: string;
  contentTitle: string;
  platforms: SocialPlatform[];
  exportedAt: Date;
  downloads: number;
}

// ============================================================
// Caption Template Types
// ============================================================

export interface CaptionTemplate {
  id: string;
  name: string;
  template: string;
  platforms: SocialPlatform[];
  variables: string[]; // e.g., ["title", "duration", "hashtags"]
}

export const DEFAULT_CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    id: "simple",
    name: "Simple",
    template: "{title}\n\n{hashtags}",
    platforms: ["x", "linkedin", "instagram", "tiktok", "youtube"],
    variables: ["title", "hashtags"],
  },
  {
    id: "engaging",
    name: "Engaging",
    template: "🔥 {title}\n\n✨ {description}\n\n{hashtags}",
    platforms: ["instagram", "tiktok"],
    variables: ["title", "description", "hashtags"],
  },
  {
    id: "professional",
    name: "Professional",
    template: "{title}\n\n{description}\n\nLearn more: {link}\n\n{hashtags}",
    platforms: ["linkedin", "youtube"],
    variables: ["title", "description", "link", "hashtags"],
  },
  {
    id: "thread",
    name: "Thread Starter",
    template: "{title}\n\nA thread 🧵👇\n\n{hashtags}",
    platforms: ["x"],
    variables: ["title", "hashtags"],
  },
];

// ============================================================
// Hashtag Suggestion Types
// ============================================================

export interface HashtagSuggestion {
  tag: string;
  relevance: number; // 0-1
  popularity: "high" | "medium" | "low";
  platforms: SocialPlatform[];
}

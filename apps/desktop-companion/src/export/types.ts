/**
 * Export Types and Interfaces
 *
 * Type definitions for social media export functionality.
 */

export {
  ExportType,
  ExportStatus,
  SocialPlatform,
  ExportFormat
} from "../generated/prisma/enums.js";

/**
 * Platform-specific character limits and constraints
 */
export interface PlatformConstraints {
  maxLength: number;
  supportsThreads: boolean;
  supportsHashtags: boolean;
  supportsMarkdown: boolean;
  supportsEmojis: boolean;
  videoMaxSize?: number; // in MB
  videoFormats?: ExportFormat[];
  videoMaxDuration?: number; // in seconds
  aspectRatios?: string[];
}

/**
 * Platform constraints configuration
 */
export const PLATFORM_CONSTRAINTS: Record<SocialPlatform, PlatformConstraints> = {
  TWITTER: {
    maxLength: 280,
    supportsThreads: true,
    supportsHashtags: true,
    supportsMarkdown: false,
    supportsEmojis: true,
    videoMaxSize: 512,
    videoFormats: ['MP4', 'MOV'],
    videoMaxDuration: 140,
    aspectRatios: ['16:9', '1:1', '9:16'],
  },
  LINKEDIN: {
    maxLength: 3000,
    supportsThreads: false,
    supportsHashtags: true,
    supportsMarkdown: false,
    supportsEmojis: true,
    videoMaxSize: 5120,
    videoFormats: ['MP4', 'MOV'],
    videoMaxDuration: 600,
    aspectRatios: ['16:9', '1:1', '9:16'],
  },
  INSTAGRAM: {
    maxLength: 2200,
    supportsThreads: false,
    supportsHashtags: true,
    supportsMarkdown: false,
    supportsEmojis: true,
    videoMaxSize: 100,
    videoFormats: ['MP4', 'MOV'],
    videoMaxDuration: 60,
    aspectRatios: ['1:1', '4:5', '9:16'],
  },
  TIKTOK: {
    maxLength: 2200,
    supportsThreads: false,
    supportsHashtags: true,
    supportsMarkdown: false,
    supportsEmojis: true,
    videoMaxSize: 500,
    videoFormats: ['MP4', 'WEBM', 'MOV'],
    videoMaxDuration: 600,
    aspectRatios: ['9:16'],
  },
  YOUTUBE: {
    maxLength: 5000,
    supportsThreads: false,
    supportsHashtags: true,
    supportsMarkdown: false,
    supportsEmojis: true,
    videoMaxSize: 256000,
    videoFormats: ['MP4', 'MOV', 'WEBM'],
    videoMaxDuration: 43200,
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
  FACEBOOK: {
    maxLength: 63206,
    supportsThreads: false,
    supportsHashtags: true,
    supportsMarkdown: false,
    supportsEmojis: true,
    videoMaxSize: 10240,
    videoFormats: ['MP4', 'MOV'],
    videoMaxDuration: 7200,
    aspectRatios: ['16:9', '1:1', '9:16'],
  },
  THREADS: {
    maxLength: 500,
    supportsThreads: false,
    supportsHashtags: true,
    supportsMarkdown: false,
    supportsEmojis: true,
    videoMaxSize: 500,
    videoFormats: ['MP4', 'MOV'],
    videoMaxDuration: 300,
    aspectRatios: ['1:1', '4:5', '9:16'],
  },
  BLUESKY: {
    maxLength: 300,
    supportsThreads: true,
    supportsHashtags: true,
    supportsMarkdown: false,
    supportsEmojis: true,
    videoMaxSize: 50,
    videoFormats: ['MP4'],
    videoMaxDuration: 60,
    aspectRatios: ['16:9', '1:1', '9:16'],
  },
};

/**
 * Post export request
 */
export interface ExportPostRequest {
  text: string;
  platform: SocialPlatform;
  sessionId?: string;
  clipId?: string;
  options?: {
    copyToClipboard?: boolean;
    saveToFile?: boolean;
    optimizeHashtags?: boolean;
    addTimestamps?: boolean;
    createThread?: boolean; // For platforms that support threads
  };
}

/**
 * Clip export request
 */
export interface ExportClipRequest {
  clipId: string;
  format: ExportFormat;
  platform?: SocialPlatform;
  options?: {
    quality?: 'low' | 'medium' | 'high' | 'original';
    generateThumbnail?: boolean;
    addWatermark?: boolean;
    optimizeForPlatform?: boolean;
    targetAspectRatio?: string;
  };
}

/**
 * Batch export request
 */
export interface ExportBatchRequest {
  items: Array<{
    type: 'post' | 'clip';
    data: ExportPostRequest | ExportClipRequest;
  }>;
  options?: {
    zipOutput?: boolean;
    includeMetadata?: boolean;
  };
}

/**
 * Formatted post result
 */
export interface FormattedPost {
  platform: SocialPlatform;
  content: string;
  isThread: boolean;
  threadParts?: string[];
  hashtags: string[];
  characterCount: number;
  truncated: boolean;
  warnings: string[];
}

/**
 * Export result
 */
export interface ExportResult {
  id: string;
  type: ExportType;
  status: ExportStatus;
  filePath?: string;
  fileSize?: number;
  thumbnailPath?: string;
  content?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Platform formatting options
 */
export interface FormatOptions {
  optimizeHashtags?: boolean;
  addEmojis?: boolean;
  professionalTone?: boolean;
  casualTone?: boolean;
  includeCallToAction?: boolean;
  maxHashtags?: number;
}

/**
 * Thread split options
 */
export interface ThreadSplitOptions {
  maxLength: number;
  preserveSentences: boolean;
  addNumbers: boolean;
  addContinuationMarkers: boolean;
}

/**
 * Video conversion options
 */
export interface VideoConversionOptions {
  inputPath: string;
  outputPath: string;
  format: ExportFormat;
  quality?: 'low' | 'medium' | 'high' | 'original';
  targetAspectRatio?: string;
  maxSizeMB?: number;
  maxDuration?: number;
  addWatermark?: boolean;
  watermarkText?: string;
  generateThumbnail?: boolean;
  thumbnailPath?: string;
}

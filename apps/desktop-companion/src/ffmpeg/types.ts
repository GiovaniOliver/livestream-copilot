/**
 * FFmpeg module types for clip trimming pipeline.
 * SOC-262: Implements clip trimming from OBS replay buffer.
 */

/**
 * Video metadata obtained from ffprobe.
 */
export interface VideoMetadata {
  /** Duration in seconds */
  duration: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Video codec (e.g., 'h264', 'hevc') */
  codec: string;
  /** Frame rate as string (e.g., '30/1') */
  fps: string;
  /** Bitrate in bits per second */
  bitrate: number;
  /** Container format (e.g., 'mp4', 'mkv') */
  format: string;
}

/**
 * Input parameters for the trimClip function.
 */
export interface TrimClipInput {
  /** Path to the OBS replay buffer file */
  replayBufferPath: string;
  /** Clip start time in seconds from session start */
  t0: number;
  /** Clip end time in seconds from session start */
  t1: number;
  /** Base directory for the session (sessions/{sessionId}) */
  sessionDir: string;
  /** Unique artifact ID for this clip */
  artifactId: string;
  /** Optional output format (defaults to 'mp4') */
  format?: OutputFormat;
  /** Unix timestamp when replay buffer was saved */
  replayBufferSavedAt?: number;
  /** Session start Unix timestamp */
  sessionStartedAt?: number;
  /** Replay buffer duration in seconds (default: 300) */
  replayBufferSeconds?: number;
}

/**
 * Result of the trimClip operation.
 */
export interface TrimClipResult {
  /** Path to the trimmed clip file */
  clipPath: string;
  /** Path to the generated thumbnail */
  thumbnailPath: string;
  /** Duration of the trimmed clip in seconds */
  duration: number;
  /** Metadata of the output clip */
  metadata?: VideoMetadata;
  /** Artifact ID for the generated thumbnail */
  thumbnailArtifactId?: string;
  /** Start time of the trimmed clip in seconds from session start */
  trimmedStartTime?: number;
}

/**
 * Supported output formats.
 */
export type OutputFormat = 'mp4' | 'webm' | 'mov';

/**
 * Output profile for different use cases.
 */
export interface OutputProfile {
  /** Profile name */
  name: string;
  /** Output format */
  format: OutputFormat;
  /** Video codec */
  videoCodec: string;
  /** Audio codec */
  audioCodec: string;
  /** Additional ffmpeg output options */
  outputOptions: string[];
}

/**
 * Predefined output profiles.
 */
export const OUTPUT_PROFILES: Record<string, OutputProfile> = {
  /** High quality archive format */
  archive: {
    name: 'archive',
    format: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    outputOptions: [
      '-preset medium',
      '-crf 18',
      '-movflags +faststart',
    ],
  },
  /** Optimized for social media (Twitter/X, Instagram) */
  social: {
    name: 'social',
    format: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    outputOptions: [
      '-preset fast',
      '-crf 23',
      '-maxrate 8M',
      '-bufsize 16M',
      '-movflags +faststart',
    ],
  },
  /** Web-optimized WebM format */
  web: {
    name: 'web',
    format: 'webm',
    videoCodec: 'libvpx-vp9',
    audioCodec: 'libopus',
    outputOptions: [
      '-crf 30',
      '-b:v 0',
      '-deadline good',
    ],
  },
};

/**
 * Thumbnail generation options.
 */
export interface ThumbnailOptions {
  /** Width in pixels (height auto-calculated to preserve aspect ratio) */
  width?: number;
  /** Quality (1-31, lower is better for JPEG) */
  quality?: number;
  /** Output format */
  format?: 'jpg' | 'png';
}

/**
 * FFmpeg configuration options.
 */
export interface FFmpegConfig {
  /** Path to ffmpeg binary (optional, defaults to 'ffmpeg' in PATH) */
  ffmpegPath?: string;
  /** Path to ffprobe binary (optional, defaults to 'ffprobe' in PATH) */
  ffprobePath?: string;
  /** Default output format */
  defaultFormat: OutputFormat;
  /** Default thumbnail options */
  thumbnailDefaults: ThumbnailOptions;
}

/**
 * Error types for the ffmpeg module.
 */
export class FFmpegError extends Error {
  constructor(
    message: string,
    public readonly code: FFmpegErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'FFmpegError';
  }
}

export type FFmpegErrorCode =
  | 'FFMPEG_NOT_FOUND'
  | 'FFPROBE_NOT_FOUND'
  | 'INPUT_FILE_NOT_FOUND'
  | 'INVALID_TIMESTAMPS'
  | 'PROBE_FAILED'
  | 'TRIM_FAILED'
  | 'THUMBNAIL_FAILED'
  | 'OUTPUT_DIR_ERROR';

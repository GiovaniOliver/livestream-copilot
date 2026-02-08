import { ffmpegLogger } from '../logger/index.js';

/**
 * FFmpeg module for clip trimming pipeline.
 * SOC-262: Implements clip trimming from OBS replay buffer.
 *
 * This module provides:
 * - Video probing (metadata extraction)
 * - Clip trimming from replay buffer
 * - Thumbnail generation
 *
 * @example
 * ```typescript
 * import {
 *   trimClip,
 *   probeVideo,
 *   generateThumbnail,
 *   configureFfmpeg,
 * } from './ffmpeg';
 *
 * // Configure custom ffmpeg path (optional)
 * configureFfmpeg(process.env.FFMPEG_PATH);
 *
 * // Trim a clip from replay buffer
 * const result = await trimClip({
 *   replayBufferPath: '/path/to/replay.mp4',
 *   t0: 120,
 *   t1: 150,
 *   sessionDir: './sessions/abc123',
 *   artifactId: 'clip-uuid',
 * });
 *
 * ffmpegLogger.info('Clip saved to:', result.clipPath);
 * ffmpegLogger.info('Thumbnail at:', result.thumbnailPath);
 * ```
 */

// Re-export types
export type {
  VideoMetadata,
  TrimClipInput,
  TrimClipResult,
  OutputFormat,
  OutputProfile,
  ThumbnailOptions,
  FFmpegConfig,
  FFmpegErrorCode,
} from './types.js';

export {
  FFmpegError,
  OUTPUT_PROFILES,
} from './types.js';

// Re-export probe functions
export {
  probeVideo,
  getVideoDuration,
  isFFprobeAvailable,
  configureFfprobe,
} from './probe.js';

// Re-export thumbnail functions
export {
  generateThumbnail,
  generateThumbnailAtMidpoint,
  generateThumbnailStrip,
} from './thumbnail.js';

// Re-export trimmer functions
export {
  trimClip,
  trimClipDirect,
  calculateBufferOffsets,
  configureFfmpeg,
  isFFmpegAvailable,
} from './trimmer.js';

/**
 * Initialize the FFmpeg module with optional custom paths.
 *
 * @param config - Configuration options
 */
export function initializeFFmpeg(config?: {
  ffmpegPath?: string;
  ffprobePath?: string;
}): void {
  if (config?.ffmpegPath) {
    const { configureFfmpeg } = require('./trimmer.js');
    configureFfmpeg(config.ffmpegPath);
  }
  if (config?.ffprobePath) {
    const { configureFfprobe } = require('./probe.js');
    configureFfprobe(config.ffprobePath);
  }
}

/**
 * Check if all FFmpeg tools are available.
 *
 * @returns Promise resolving to availability status
 */
export async function checkFFmpegAvailability(): Promise<{
  ffmpeg: boolean;
  ffprobe: boolean;
  ready: boolean;
}> {
  const { isFFmpegAvailable } = await import('./trimmer.js');
  const { isFFprobeAvailable } = await import('./probe.js');

  const [ffmpegAvail, ffprobeAvail] = await Promise.all([
    isFFmpegAvailable(),
    isFFprobeAvailable(),
  ]);

  return {
    ffmpeg: ffmpegAvail,
    ffprobe: ffprobeAvail,
    ready: ffmpegAvail && ffprobeAvail,
  };
}

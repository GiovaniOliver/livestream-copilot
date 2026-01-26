/**
 * FFprobe wrapper for extracting video metadata.
 * SOC-262: Used to get replay buffer duration for accurate trimming.
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import { FFmpegError, type VideoMetadata } from './types.js';

/**
 * Configure ffprobe path if provided via environment variable.
 */
export function configureFfprobe(ffprobePath?: string): void {
  if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
  }
}

/**
 * Probe a video file and extract metadata.
 *
 * @param filePath - Path to the video file
 * @returns Promise resolving to video metadata
 * @throws FFmpegError if probing fails
 */
export async function probeVideo(filePath: string): Promise<VideoMetadata> {
  // Verify file exists
  if (!fs.existsSync(filePath)) {
    throw new FFmpegError(
      `Input file not found: ${filePath}`,
      'INPUT_FILE_NOT_FOUND',
      { filePath }
    );
  }

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(
          new FFmpegError(
            `Failed to probe video: ${err.message}`,
            'PROBE_FAILED',
            { filePath, error: err }
          )
        );
        return;
      }

      try {
        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video'
        );

        if (!videoStream) {
          reject(
            new FFmpegError(
              'No video stream found in file',
              'PROBE_FAILED',
              { filePath, streams: metadata.streams.map((s) => s.codec_type) }
            )
          );
          return;
        }

        // Extract duration - prefer format duration, fall back to stream duration
        const duration =
          metadata.format.duration ??
          (videoStream.duration ? parseFloat(String(videoStream.duration)) : 0);

        // Extract frame rate
        let fps = '30/1'; // Default
        if (videoStream.r_frame_rate) {
          fps = videoStream.r_frame_rate;
        } else if (videoStream.avg_frame_rate) {
          fps = videoStream.avg_frame_rate;
        }

        // Extract bitrate
        const bitrate =
          metadata.format.bit_rate ??
          (videoStream.bit_rate ? parseInt(String(videoStream.bit_rate), 10) : 0);

        const result: VideoMetadata = {
          duration,
          width: videoStream.width ?? 1920,
          height: videoStream.height ?? 1080,
          codec: videoStream.codec_name ?? 'unknown',
          fps,
          bitrate: typeof bitrate === 'string' ? parseInt(bitrate, 10) : bitrate,
          format: metadata.format.format_name ?? 'unknown',
        };

        resolve(result);
      } catch (parseError) {
        reject(
          new FFmpegError(
            `Failed to parse video metadata: ${parseError}`,
            'PROBE_FAILED',
            { filePath, metadata, error: parseError }
          )
        );
      }
    });
  });
}

/**
 * Get video duration in seconds.
 *
 * @param filePath - Path to the video file
 * @returns Promise resolving to duration in seconds
 */
export async function getVideoDuration(filePath: string): Promise<number> {
  const metadata = await probeVideo(filePath);
  return metadata.duration;
}

/**
 * Check if ffprobe is available.
 *
 * @returns Promise resolving to true if ffprobe is available
 */
export async function isFFprobeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    // Use a simple probe on a nonexistent file to check if ffprobe binary exists
    // The error type will tell us if ffprobe itself is missing vs just the file
    ffmpeg.ffprobe('/nonexistent/test/file.mp4', (err) => {
      if (err) {
        const errMessage = err.message.toLowerCase();
        // If ffprobe is not found, the error message typically contains these
        if (
          errMessage.includes('ffprobe') &&
          (errMessage.includes('not found') ||
            errMessage.includes('enoent') ||
            errMessage.includes('cannot find'))
        ) {
          resolve(false);
          return;
        }
      }
      // If we get here, ffprobe exists (even if it failed on our fake file)
      resolve(true);
    });
  });
}

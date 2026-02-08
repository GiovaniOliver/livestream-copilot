/**
 * Frame Extractor
 *
 * Extracts frames from MediaMTX RTSP stream using FFmpeg.
 * Used for cloud-based visual detection providers.
 */

import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { config } from "../config/index.js";

import { logger } from '../logger/index.js';
/**
 * Frame extraction options
 */
export interface FrameExtractorOptions {
  /** RTSP stream URL */
  rtspUrl: string;
  /** Maximum width for output frame (for cost optimization) */
  maxWidth?: number;
  /** JPEG quality (1-100) */
  quality?: number;
}

const DEFAULT_OPTIONS: Partial<FrameExtractorOptions> = {
  maxWidth: 1024,
  quality: 85,
};

/**
 * Frame Extractor
 *
 * Extracts single frames from RTSP stream via FFmpeg.
 */
export class FrameExtractor {
  private options: Required<FrameExtractorOptions>;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(options: FrameExtractorOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    } as Required<FrameExtractorOptions>;
  }

  /**
   * Extract a single frame from the stream
   * Returns JPEG buffer
   */
  async extractFrame(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      // Build FFmpeg command
      // -rtsp_transport tcp: Use TCP for more reliable streaming
      // -i: Input RTSP URL
      // -vframes 1: Extract only 1 frame
      // -vf scale: Scale down to maxWidth while preserving aspect ratio
      // -f image2pipe: Output as pipe
      // -vcodec mjpeg: Output as JPEG
      // -q:v: JPEG quality (2 = high quality, 31 = low quality)
      const args = [
        "-rtsp_transport",
        "tcp",
        "-i",
        this.options.rtspUrl,
        "-vframes",
        "1",
        "-vf",
        `scale='min(${this.options.maxWidth},iw)':-1`,
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "-q:v",
        String(Math.round(31 - (this.options.quality / 100) * 29)), // Convert 1-100 to 31-2
        "pipe:1",
      ];

      const ffmpeg = spawn("ffmpeg", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      ffmpeg.stdout.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      ffmpeg.stderr.on("data", (data: Buffer) => {
        // FFmpeg outputs progress to stderr, we can ignore most of it
        const message = data.toString();
        if (message.includes("Error") || message.includes("error")) {
          logger.error({ ffmpegMessage: message }, "[frame-extractor] FFmpeg error");
        }
      });

      ffmpeg.on("close", (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on("error", (error) => {
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        ffmpeg.kill();
        reject(new Error("Frame extraction timeout"));
      }, 10000);
    });
  }

  /**
   * Start periodic frame extraction
   * @param intervalSec Interval in seconds between frame extractions
   * @param callback Called with each extracted frame
   */
  startPeriodicExtraction(
    intervalSec: number,
    callback: (frame: Buffer) => void
  ): void {
    if (this.intervalHandle) {
      this.stopPeriodicExtraction();
    }

    // Extract immediately, then at intervals
    this.extractFrame()
      .then(callback)
      .catch((err) => logger.error({ err }, "[frame-extractor] Initial extraction failed"));

    this.intervalHandle = setInterval(async () => {
      try {
        const frame = await this.extractFrame();
        callback(frame);
      } catch (error) {
        logger.error({ err: error }, "[frame-extractor] Periodic extraction failed");
      }
    }, intervalSec * 1000);

    logger.info(`[frame-extractor] Started periodic extraction every ${intervalSec}s`);
  }

  /**
   * Stop periodic frame extraction
   */
  stopPeriodicExtraction(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info("[frame-extractor] Stopped periodic extraction");
    }
  }
}

/**
 * Create a frame extractor with MediaMTX defaults
 */
export function createFrameExtractor(
  streamPath: string = "live/stream",
  options?: Partial<FrameExtractorOptions>
): FrameExtractor {
  const rtspUrl = `rtsp://localhost:8554/${streamPath}`;

  return new FrameExtractor({
    rtspUrl,
    ...options,
  });
}

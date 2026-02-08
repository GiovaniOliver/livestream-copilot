/**
 * Video Conversion Module
 *
 * Handles video format conversions for different social media platforms
 * using FFmpeg. Supports MP4, WebM, GIF, and MOV formats with platform-specific
 * optimizations.
 */

import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import type { ExportFormat, SocialPlatform, VideoConversionOptions } from './types.js';
import { PLATFORM_CONSTRAINTS } from './types.js';
import { generateThumbnail } from '../ffmpeg/thumbnail.js';
import { probeVideo } from '../ffmpeg/probe.js';

import { logger } from '../logger/index.js';
/**
 * Video conversion error
 */
export class VideoConversionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VideoConversionError';
  }
}

/**
 * Quality presets for video conversion
 */
const QUALITY_PRESETS = {
  low: {
    videoBitrate: '500k',
    audioBitrate: '64k',
    scale: 720,
  },
  medium: {
    videoBitrate: '1500k',
    audioBitrate: '128k',
    scale: 1080,
  },
  high: {
    videoBitrate: '3000k',
    audioBitrate: '192k',
    scale: 1080,
  },
  original: {
    videoBitrate: undefined,
    audioBitrate: undefined,
    scale: undefined,
  },
};

/**
 * Convert video to specified format
 */
export async function convertVideo(
  options: VideoConversionOptions
): Promise<{
  outputPath: string;
  fileSize: number;
  duration: number;
  thumbnailPath?: string;
}> {
  const {
    inputPath,
    outputPath,
    format,
    quality = 'medium',
    targetAspectRatio,
    maxSizeMB,
    maxDuration,
    addWatermark,
    watermarkText,
    generateThumbnail: shouldGenerateThumbnail,
    thumbnailPath,
  } = options;

  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    throw new VideoConversionError(
      'Input file not found',
      'INPUT_NOT_FOUND',
      { inputPath }
    );
  }

  // Probe input video
  const metadata = await probeVideo(inputPath);

  // Validate duration if max duration specified
  if (maxDuration && metadata.duration > maxDuration) {
    throw new VideoConversionError(
      `Video duration (${metadata.duration}s) exceeds maximum (${maxDuration}s)`,
      'DURATION_EXCEEDED',
      { duration: metadata.duration, maxDuration }
    );
  }

  // Get quality preset
  const preset = QUALITY_PRESETS[quality];

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Set video codec and format based on export format
    switch (format) {
      case 'MP4':
        command = command
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-preset', 'medium',
            '-profile:v', 'main',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', // Enable streaming
          ]);
        break;

      case 'WEBM':
        command = command
          .videoCodec('libvpx-vp9')
          .audioCodec('libopus')
          .outputOptions([
            '-deadline', 'good',
            '-cpu-used', '2',
          ]);
        break;

      case 'GIF':
        command = command
          .outputOptions([
            '-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
          ])
          .noAudio();
        break;

      case 'MOV':
        command = command
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-preset', 'medium',
            '-profile:v', 'main',
            '-pix_fmt', 'yuv420p',
          ]);
        break;

      default:
        reject(new VideoConversionError(
          `Unsupported format: ${format}`,
          'UNSUPPORTED_FORMAT',
          { format }
        ));
        return;
    }

    // Apply quality settings (unless original or GIF)
    if (quality !== 'original' && format !== 'GIF') {
      if (preset.videoBitrate) {
        command = command.videoBitrate(preset.videoBitrate);
      }
      if (preset.audioBitrate) {
        command = command.audioBitrate(preset.audioBitrate);
      }
      if (preset.scale) {
        command = command.size(`?x${preset.scale}`);
      }
    }

    // Apply aspect ratio transformation
    if (targetAspectRatio && format !== 'GIF') {
      const filter = getAspectRatioFilter(targetAspectRatio);
      if (filter) {
        command = command.videoFilters(filter);
      }
    }

    // Add watermark if requested
    if (addWatermark && watermarkText && format !== 'GIF') {
      command = command.videoFilters([
        {
          filter: 'drawtext',
          options: {
            text: watermarkText,
            fontsize: 24,
            fontcolor: 'white@0.8',
            x: '(w-text_w-10)',
            y: '(h-text_h-10)',
            shadowcolor: 'black@0.5',
            shadowx: 2,
            shadowy: 2,
          },
        },
      ]);
    }

    // Set output
    command = command.output(outputPath);

    // Handle progress and completion
    command
      .on('start', (commandLine) => {
        logger.info({ commandLine }, '[VideoConverter] FFmpeg command');
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          logger.info(`[VideoConverter] Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('error', (err) => {
        reject(new VideoConversionError(
          'Video conversion failed',
          'CONVERSION_FAILED',
          { error: err.message }
        ));
      })
      .on('end', async () => {
        try {
          // Get output file stats
          const stats = fs.statSync(outputPath);
          const fileSize = stats.size;

          // Check if file size exceeds maximum
          if (maxSizeMB && fileSize > maxSizeMB * 1024 * 1024) {
            // Clean up oversized file
            fs.unlinkSync(outputPath);
            reject(new VideoConversionError(
              `Output file size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${maxSizeMB}MB)`,
              'SIZE_EXCEEDED',
              { fileSize, maxSizeMB }
            ));
            return;
          }

          // Generate thumbnail if requested
          let generatedThumbnailPath: string | undefined;
          if (shouldGenerateThumbnail && format !== 'GIF') {
            try {
              const thumbPath = thumbnailPath || outputPath.replace(/\.[^.]+$/, '_thumb.jpg');
              generatedThumbnailPath = await generateThumbnail(outputPath, thumbPath, metadata.duration / 2);
            } catch (err) {
              logger.warn({ err }, '[VideoConverter] Failed to generate thumbnail');
            }
          }

          resolve({
            outputPath,
            fileSize,
            duration: metadata.duration,
            thumbnailPath: generatedThumbnailPath,
          });
        } catch (err) {
          reject(new VideoConversionError(
            'Failed to process conversion result',
            'POST_CONVERSION_ERROR',
            { error: err }
          ));
        }
      })
      .run();
  });
}

/**
 * Get video filter for aspect ratio transformation
 */
function getAspectRatioFilter(aspectRatio: string): string | null {
  switch (aspectRatio) {
    case '16:9':
      return 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
    case '9:16':
      return 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2';
    case '1:1':
      return 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2';
    case '4:5':
      return 'scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2';
    default:
      return null;
  }
}

/**
 * Optimize video for specific platform
 */
export async function optimizeForPlatform(
  inputPath: string,
  outputDir: string,
  platform: SocialPlatform,
  format?: ExportFormat
): Promise<{
  outputPath: string;
  fileSize: number;
  duration: number;
  thumbnailPath?: string;
}> {
  const constraints = PLATFORM_CONSTRAINTS[platform];

  // Determine output format
  let outputFormat: ExportFormat;
  if (format) {
    // Validate format is supported by platform
    if (constraints.videoFormats && !constraints.videoFormats.includes(format)) {
      throw new VideoConversionError(
        `Format ${format} not supported by ${platform}`,
        'UNSUPPORTED_FORMAT_FOR_PLATFORM',
        { format, platform, supportedFormats: constraints.videoFormats }
      );
    }
    outputFormat = format;
  } else {
    // Use first supported format
    outputFormat = (constraints.videoFormats?.[0] || 'MP4') as ExportFormat;
  }

  // Generate output filename
  const basename = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(
    outputDir,
    `${basename}_${platform.toLowerCase()}.${outputFormat.toLowerCase()}`
  );

  // Determine optimal aspect ratio for platform
  let targetAspectRatio: string | undefined;
  if (constraints.aspectRatios && constraints.aspectRatios.length > 0) {
    // Prefer 9:16 for vertical platforms, 16:9 for horizontal
    if (constraints.aspectRatios.includes('9:16')) {
      targetAspectRatio = '9:16';
    } else if (constraints.aspectRatios.includes('16:9')) {
      targetAspectRatio = '16:9';
    } else {
      targetAspectRatio = constraints.aspectRatios[0];
    }
  }

  // Convert with platform-specific optimizations
  return convertVideo({
    inputPath,
    outputPath,
    format: outputFormat,
    quality: 'high',
    targetAspectRatio,
    maxSizeMB: constraints.videoMaxSize,
    maxDuration: constraints.videoMaxDuration,
    generateThumbnail: true,
  });
}

/**
 * Batch convert videos to multiple formats
 */
export async function batchConvertVideo(
  inputPath: string,
  outputDir: string,
  formats: ExportFormat[]
): Promise<Array<{
  format: ExportFormat;
  outputPath: string;
  fileSize: number;
  duration: number;
  thumbnailPath?: string;
}>> {
  const results = [];

  for (const format of formats) {
    const basename = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${basename}.${format.toLowerCase()}`);

    try {
      const result = await convertVideo({
        inputPath,
        outputPath,
        format,
        quality: 'high',
        generateThumbnail: true,
      });

      results.push({
        format,
        ...result,
      });
    } catch (err) {
      logger.error({ err }, `[VideoConverter] Failed to convert to ${format}`);
    }
  }

  return results;
}

/**
 * Get video information
 */
export async function getVideoInfo(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  size: number;
  codec: string;
  bitrate: number;
}> {
  const metadata = await probeVideo(filePath);
  const stats = fs.statSync(filePath);

  return {
    duration: metadata.duration,
    width: metadata.width,
    height: metadata.height,
    aspectRatio: `${metadata.width}:${metadata.height}`,
    size: stats.size,
    codec: metadata.codec,
    bitrate: metadata.bitrate,
  };
}

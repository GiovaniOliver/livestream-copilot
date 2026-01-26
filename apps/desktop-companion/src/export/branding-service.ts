/**
 * Video Branding Service
 *
 * Applies branding elements to videos using FFmpeg:
 * - Logo overlays with positioning and opacity
 * - Intro/outro clips with transitions
 * - Lower thirds with text styling
 * - Animated text overlays
 */

import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import type {
  BrandingConfig,
  BrandedExportRequest,
  LogoOverlay,
  BrandClip,
  LowerThird,
  TextOverlay,
  FilterGraphOptions,
} from './branding-types.js';
import { getPositionCoordinates } from './branding-types.js';
import { probeVideo } from '../ffmpeg/probe.js';
import { generateThumbnail } from '../ffmpeg/thumbnail.js';

/**
 * Branding service error
 */
export class BrandingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BrandingError';
  }
}

/**
 * Validate branding configuration
 */
export function validateBrandingConfig(config: BrandingConfig): string[] {
  const errors: string[] = [];

  // Validate logo
  if (config.logo) {
    if (!config.logo.path) {
      errors.push('Logo path is required');
    } else if (!fs.existsSync(config.logo.path)) {
      errors.push(`Logo file not found: ${config.logo.path}`);
    }
    if (config.logo.widthPercent < 1 || config.logo.widthPercent > 50) {
      errors.push('Logo width must be between 1% and 50%');
    }
    if (config.logo.opacity < 0 || config.logo.opacity > 1) {
      errors.push('Logo opacity must be between 0 and 1');
    }
  }

  // Validate intro
  if (config.intro) {
    if (!config.intro.path) {
      errors.push('Intro path is required');
    } else if (!fs.existsSync(config.intro.path)) {
      errors.push(`Intro file not found: ${config.intro.path}`);
    }
  }

  // Validate outro
  if (config.outro) {
    if (!config.outro.path) {
      errors.push('Outro path is required');
    } else if (!fs.existsSync(config.outro.path)) {
      errors.push(`Outro file not found: ${config.outro.path}`);
    }
  }

  // Validate lower thirds
  if (config.lowerThirds) {
    config.lowerThirds.forEach((lt, index) => {
      if (!lt.text) {
        errors.push(`Lower third ${index + 1}: text is required`);
      }
      if (lt.duration <= 0) {
        errors.push(`Lower third ${index + 1}: duration must be positive`);
      }
    });
  }

  return errors;
}

/**
 * Build FFmpeg filter for logo overlay
 */
function buildLogoFilter(
  logo: LogoOverlay,
  videoWidth: number,
  videoDuration: number
): string {
  const targetWidth = Math.round((videoWidth * logo.widthPercent) / 100);
  const coords = getPositionCoordinates(logo.position, targetWidth, 0, logo.margin);

  let filter = `[1:v]scale=${targetWidth}:-1`;

  // Apply opacity if not 100%
  if (logo.opacity < 1) {
    filter += `,format=rgba,colorchannelmixer=aa=${logo.opacity}`;
  }

  filter += `[logo];`;

  // Build overlay with timing
  const startTime = logo.delay || 0;
  const endTime = logo.duration ? startTime + logo.duration : videoDuration;

  filter += `[0:v][logo]overlay=${coords.x}:${coords.y}`;

  // Add enable condition for timing
  if (startTime > 0 || logo.duration) {
    filter += `:enable='between(t,${startTime},${endTime})'`;
  }

  // Add fade if specified
  if (logo.fadeIn && logo.fadeIn > 0) {
    filter = filter.replace('[logo]', `[logofade];[logofade]fade=in:st=${startTime}:d=${logo.fadeIn}[logo]`);
  }

  return filter;
}

/**
 * Build FFmpeg filter for lower third
 */
function buildLowerThirdFilter(
  lt: LowerThird,
  videoWidth: number,
  videoHeight: number,
  index: number
): string {
  const fontSize = lt.fontSize || 32;
  const subtitleSize = Math.round(fontSize * 0.7);
  const padding = Math.round(fontSize * 0.5);
  const boxHeight = lt.subtitle ? fontSize + subtitleSize + padding * 3 : fontSize + padding * 2;
  const yPosition = videoHeight - boxHeight - 50;

  let xPosition: string;
  switch (lt.position) {
    case 'left':
      xPosition = '50';
      break;
    case 'right':
      xPosition = `${videoWidth - 400}`;
      break;
    case 'center':
    default:
      xPosition = `(w-text_w)/2`;
      break;
  }

  // Build drawbox + drawtext filter
  let filter = '';

  // Background box
  const bgColor = lt.backgroundColor || '0x00000099';
  filter += `drawbox=x=0:y=${yPosition}:w=${videoWidth}:h=${boxHeight}:color=${bgColor}:t=fill:enable='between(t,${lt.startTime},${lt.startTime + lt.duration})'`;

  // Main text
  const textColor = lt.textColor || 'white';
  const fontFamily = lt.fontFamily || 'Arial';
  filter += `,drawtext=text='${escapeText(lt.text)}':fontcolor=${textColor}:fontsize=${fontSize}:fontfile='${fontFamily}':x=${xPosition}:y=${yPosition + padding}:enable='between(t,${lt.startTime},${lt.startTime + lt.duration})'`;

  // Subtitle text
  if (lt.subtitle) {
    filter += `,drawtext=text='${escapeText(lt.subtitle)}':fontcolor=${textColor}@0.8:fontsize=${subtitleSize}:fontfile='${fontFamily}':x=${xPosition}:y=${yPosition + fontSize + padding * 2}:enable='between(t,${lt.startTime},${lt.startTime + lt.duration})'`;
  }

  return filter;
}

/**
 * Build FFmpeg filter for text overlay
 */
function buildTextOverlayFilter(
  overlay: TextOverlay,
  videoWidth: number,
  videoHeight: number
): string {
  const coords = getPositionCoordinates(
    overlay.position,
    0, // Will be calculated by FFmpeg
    0,
    20
  );

  const fontFamily = overlay.fontFamily || 'Arial';
  let filter = `drawtext=text='${escapeText(overlay.text)}':fontcolor=${overlay.color}:fontsize=${overlay.fontSize}:fontfile='${fontFamily}':x=${coords.x}:y=${coords.y}`;

  // Add background box if specified
  if (overlay.backgroundColor) {
    filter += `:box=1:boxcolor=${overlay.backgroundColor}:boxborderw=10`;
  }

  // Add timing
  filter += `:enable='between(t,${overlay.startTime},${overlay.startTime + overlay.duration})'`;

  return filter;
}

/**
 * Escape text for FFmpeg filter
 */
function escapeText(text: string): string {
  return text
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Apply branding to a video
 */
export async function applyBranding(
  inputPath: string,
  outputPath: string,
  branding: BrandingConfig
): Promise<{
  outputPath: string;
  fileSize: number;
  duration: number;
  thumbnailPath?: string;
}> {
  // Validate inputs
  if (!fs.existsSync(inputPath)) {
    throw new BrandingError('Input file not found', 'INPUT_NOT_FOUND', { inputPath });
  }

  const validationErrors = validateBrandingConfig(branding);
  if (validationErrors.length > 0) {
    throw new BrandingError('Invalid branding configuration', 'INVALID_CONFIG', {
      errors: validationErrors,
    });
  }

  // Probe input video
  const metadata = await probeVideo(inputPath);
  const { duration, width, height } = metadata;

  // Create output directory if needed
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Determine if we need intro/outro concatenation
  const hasIntro = !!branding.intro;
  const hasOutro = !!branding.outro;

  if (hasIntro || hasOutro) {
    // Complex workflow: concat intro + branded main + outro
    return applyBrandingWithConcats(inputPath, outputPath, branding, metadata);
  }

  // Simple workflow: apply overlays only
  return applyBrandingOverlays(inputPath, outputPath, branding, metadata);
}

/**
 * Apply branding overlays without intro/outro
 */
async function applyBrandingOverlays(
  inputPath: string,
  outputPath: string,
  branding: BrandingConfig,
  metadata: { duration: number; width: number; height: number }
): Promise<{
  outputPath: string;
  fileSize: number;
  duration: number;
  thumbnailPath?: string;
}> {
  const { duration, width, height } = metadata;

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Add logo input if specified
    if (branding.logo) {
      command = command.input(branding.logo.path);
    }

    // Build filter complex
    const filters: string[] = [];

    // Logo overlay
    if (branding.logo) {
      filters.push(buildLogoFilter(branding.logo, width, duration));
    }

    // Lower thirds
    if (branding.lowerThirds && branding.lowerThirds.length > 0) {
      branding.lowerThirds.forEach((lt, index) => {
        filters.push(buildLowerThirdFilter(lt, width, height, index));
      });
    }

    // Text overlays
    if (branding.textOverlays && branding.textOverlays.length > 0) {
      branding.textOverlays.forEach((overlay) => {
        filters.push(buildTextOverlayFilter(overlay, width, height));
      });
    }

    // Apply filters
    if (filters.length > 0) {
      if (branding.logo) {
        // Complex filter with logo input
        command = command.complexFilter(filters.join(','));
      } else {
        // Video filters only
        command = command.videoFilters(filters);
      }
    }

    // Output settings
    command = command
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset', 'medium',
        '-crf', '23',
        '-movflags', '+faststart',
      ])
      .output(outputPath);

    // Run conversion
    command
      .on('start', (cmd) => {
        console.log('[BrandingService] FFmpeg command:', cmd);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[BrandingService] Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('error', (err) => {
        reject(new BrandingError('Branding failed', 'BRANDING_FAILED', { error: err.message }));
      })
      .on('end', async () => {
        try {
          const stats = fs.statSync(outputPath);

          // Generate thumbnail
          const thumbPath = outputPath.replace(/\.[^.]+$/, '_thumb.jpg');
          let thumbnailPath: string | undefined;
          try {
            thumbnailPath = await generateThumbnail(outputPath, thumbPath, {
              timestamp: duration / 2,
              size: '1280x720',
            });
          } catch (err) {
            console.warn('[BrandingService] Failed to generate thumbnail:', err);
          }

          resolve({
            outputPath,
            fileSize: stats.size,
            duration,
            thumbnailPath,
          });
        } catch (err) {
          reject(new BrandingError('Post-processing failed', 'POST_PROCESSING_ERROR', { error: err }));
        }
      })
      .run();
  });
}

/**
 * Apply branding with intro/outro concatenation
 */
async function applyBrandingWithConcats(
  inputPath: string,
  outputPath: string,
  branding: BrandingConfig,
  metadata: { duration: number; width: number; height: number }
): Promise<{
  outputPath: string;
  fileSize: number;
  duration: number;
  thumbnailPath?: string;
}> {
  const { duration, width, height } = metadata;
  const tempDir = path.join(path.dirname(outputPath), '.temp_branding');

  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    const segments: string[] = [];
    let totalDuration = 0;

    // Process intro if specified
    if (branding.intro) {
      const introPath = path.join(tempDir, 'intro_processed.mp4');
      await processIntroOutro(branding.intro.path, introPath, width, height, branding.intro.duration);
      segments.push(introPath);
      totalDuration += branding.intro.duration;
    }

    // Apply overlays to main video
    const mainPath = path.join(tempDir, 'main_branded.mp4');
    await applyBrandingOverlays(inputPath, mainPath, {
      ...branding,
      intro: undefined,
      outro: undefined,
    }, metadata);
    segments.push(mainPath);
    totalDuration += duration;

    // Process outro if specified
    if (branding.outro) {
      const outroPath = path.join(tempDir, 'outro_processed.mp4');
      await processIntroOutro(branding.outro.path, outroPath, width, height, branding.outro.duration);
      segments.push(outroPath);
      totalDuration += branding.outro.duration;
    }

    // Concatenate segments
    const result = await concatenateSegments(segments, outputPath);

    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    return {
      ...result,
      duration: totalDuration,
    };
  } catch (err) {
    // Clean up on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw err;
  }
}

/**
 * Process intro/outro clip to match main video specs
 */
async function processIntroOutro(
  inputPath: string,
  outputPath: string,
  targetWidth: number,
  targetHeight: number,
  duration: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters([
        `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
        `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2`,
      ])
      .duration(duration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset', 'medium',
        '-crf', '23',
      ])
      .output(outputPath)
      .on('error', (err) => {
        reject(new BrandingError('Intro/outro processing failed', 'PROCESSING_FAILED', { error: err.message }));
      })
      .on('end', () => {
        resolve();
      })
      .run();
  });
}

/**
 * Concatenate video segments
 */
async function concatenateSegments(
  segments: string[],
  outputPath: string
): Promise<{
  outputPath: string;
  fileSize: number;
  duration: number;
  thumbnailPath?: string;
}> {
  // Create concat file
  const concatFilePath = path.join(path.dirname(outputPath), '.concat_list.txt');
  const concatContent = segments.map((s) => `file '${s.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatFilePath, concatContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .videoCodec('copy')
      .audioCodec('copy')
      .outputOptions(['-movflags', '+faststart'])
      .output(outputPath)
      .on('error', (err) => {
        fs.unlinkSync(concatFilePath);
        reject(new BrandingError('Concatenation failed', 'CONCAT_FAILED', { error: err.message }));
      })
      .on('end', async () => {
        fs.unlinkSync(concatFilePath);

        try {
          const stats = fs.statSync(outputPath);
          const metadata = await probeVideo(outputPath);

          // Generate thumbnail
          const thumbPath = outputPath.replace(/\.[^.]+$/, '_thumb.jpg');
          let thumbnailPath: string | undefined;
          try {
            thumbnailPath = await generateThumbnail(outputPath, thumbPath, {
              timestamp: metadata.duration / 2,
              size: '1280x720',
            });
          } catch (err) {
            console.warn('[BrandingService] Failed to generate thumbnail:', err);
          }

          resolve({
            outputPath,
            fileSize: stats.size,
            duration: metadata.duration,
            thumbnailPath,
          });
        } catch (err) {
          reject(new BrandingError('Post-concatenation failed', 'POST_CONCAT_ERROR', { error: err }));
        }
      })
      .run();
  });
}

/**
 * Quick preview of branding (lower quality, faster processing)
 */
export async function previewBranding(
  inputPath: string,
  outputPath: string,
  branding: BrandingConfig
): Promise<string> {
  const metadata = await probeVideo(inputPath);

  // Use lower quality settings for preview
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Add logo input if specified
    if (branding.logo) {
      command = command.input(branding.logo.path);
    }

    // Build simplified filters for preview
    const filters: string[] = [];

    if (branding.logo) {
      filters.push(buildLogoFilter(branding.logo, metadata.width, metadata.duration));
    }

    if (branding.lowerThirds && branding.lowerThirds.length > 0) {
      filters.push(buildLowerThirdFilter(branding.lowerThirds[0], metadata.width, metadata.height, 0));
    }

    if (filters.length > 0) {
      if (branding.logo) {
        command = command.complexFilter(filters.join(','));
      } else {
        command = command.videoFilters(filters);
      }
    }

    command
      .duration(10) // Only process first 10 seconds for preview
      .videoCodec('libx264')
      .outputOptions([
        '-preset', 'ultrafast',
        '-crf', '28',
        '-vf', 'scale=640:-1',
      ])
      .output(outputPath)
      .on('error', (err) => {
        reject(new BrandingError('Preview failed', 'PREVIEW_FAILED', { error: err.message }));
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .run();
  });
}

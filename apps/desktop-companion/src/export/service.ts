/**
 * Export Service
 *
 * Orchestrates export operations for social media content and clips.
 * Handles formatting, conversion, and tracking of exports.
 */

import fs from 'fs';
import path from 'path';
import type {
  ExportPostRequest,
  ExportClipRequest,
  ExportBatchRequest,
  ExportResult,
  FormattedPost,
} from './types.js';
import { ExportType, ExportStatus, SocialPlatform, ExportFormat } from './types.js';
import { formatForPlatform, splitIntoThread, optimizeHashtags } from './formatters.js';
import { convertVideo, optimizeForPlatform, batchConvertVideo } from './video-converter.js';
import * as ClipService from '../db/services/clip.service.js';
import * as ExportDBService from '../db/services/export.service.js';

/**
 * Export service error
 */
export class ExportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

/**
 * Export a social media post
 */
export async function exportPost(
  userId: string,
  request: ExportPostRequest,
  organizationId?: string
): Promise<ExportResult> {
  const { text, platform, sessionId, clipId, options = {} } = request;

  // Create export record
  const exportRecord = await ExportDBService.createExport({
    userId,
    organizationId,
    sessionId,
    clipId,
    type: ExportType.POST,
    platform,
  });

  try {
    await ExportDBService.markExportStarted(exportRecord.id);

    // Format content for platform
    const formatted = formatForPlatform(text, platform, {
      optimizeHashtags: options.optimizeHashtags,
      maxHashtags: options.optimizeHashtags ? undefined : 5,
    });

    let finalContent = formatted.content;
    const metadata: Record<string, any> = {
      isThread: formatted.isThread,
      characterCount: formatted.characterCount,
      hashtags: formatted.hashtags,
      warnings: formatted.warnings,
    };

    // Handle thread creation if needed
    if (formatted.isThread && formatted.threadParts) {
      metadata.threadParts = formatted.threadParts;
      if (options.createThread) {
        finalContent = formatted.threadParts.join('\n\n---THREAD BREAK---\n\n');
      }
    }

    // Note: Clipboard functionality would be handled by the client application
    if (options.copyToClipboard) {
      metadata.copyToClipboard = true;
      metadata.clipboardNote = 'Client should copy this content to clipboard';
    }

    // Save to file if requested
    let filePath: string | undefined;
    if (options.saveToFile) {
      const timestamp = Date.now();
      const filename = `${platform.toLowerCase()}_post_${timestamp}.txt`;
      const exportDir = path.join(process.cwd(), 'exports', 'posts');

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      filePath = path.join(exportDir, filename);
      fs.writeFileSync(filePath, finalContent, 'utf-8');
      metadata.savedToFile = true;
    }

    // Mark as completed
    await ExportDBService.markExportCompleted(exportRecord.id, {
      filePath,
      fileSize: filePath ? BigInt(Buffer.from(finalContent).length) : undefined,
      metadata,
    });

    const completed = await ExportDBService.getExportById(exportRecord.id);

    return {
      id: completed!.id,
      type: completed!.type,
      status: completed!.status,
      content: finalContent,
      filePath,
      metadata,
      createdAt: completed!.createdAt,
      completedAt: completed!.completedAt || undefined,
    };
  } catch (err: any) {
    await ExportDBService.markExportFailed(
      exportRecord.id,
      err.message || 'Unknown error'
    );
    throw new ExportError(
      'Failed to export post',
      'POST_EXPORT_FAILED',
      { error: err.message }
    );
  }
}

/**
 * Export a video clip
 */
export async function exportClip(
  userId: string,
  request: ExportClipRequest,
  organizationId?: string
): Promise<ExportResult> {
  const { clipId, format, platform, options = {} } = request;

  // Get clip from database
  const clip = await ClipService.getClipByArtifactId(clipId);
  if (!clip) {
    throw new ExportError('Clip not found', 'CLIP_NOT_FOUND', { clipId });
  }

  // Verify clip file exists
  if (!fs.existsSync(clip.path)) {
    throw new ExportError(
      'Clip file not found on disk',
      'CLIP_FILE_NOT_FOUND',
      { clipId, path: clip.path }
    );
  }

  // Create export record
  const exportRecord = await ExportDBService.createExport({
    userId,
    organizationId,
    sessionId: clip.sessionId,
    clipId: clip.id,
    type: ExportType.CLIP,
    platform,
    format,
  });

  try {
    await ExportDBService.markExportStarted(exportRecord.id);

    const exportDir = path.join(process.cwd(), 'exports', 'clips');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    let outputPath: string;
    let fileSize: number;
    let thumbnailPath: string | undefined;

    if (options.optimizeForPlatform && platform) {
      // Optimize for specific platform
      const result = await optimizeForPlatform(clip.path, exportDir, platform, format);
      outputPath = result.outputPath;
      fileSize = result.fileSize;
      thumbnailPath = result.thumbnailPath;
    } else {
      // Standard conversion
      const basename = path.basename(clip.path, path.extname(clip.path));
      outputPath = path.join(exportDir, `${basename}_export.${format.toLowerCase()}`);

      const result = await convertVideo({
        inputPath: clip.path,
        outputPath,
        format,
        quality: options.quality || 'high',
        targetAspectRatio: options.targetAspectRatio,
        generateThumbnail: options.generateThumbnail !== false,
        addWatermark: options.addWatermark,
      });

      outputPath = result.outputPath;
      fileSize = result.fileSize;
      thumbnailPath = result.thumbnailPath;
    }

    // Mark as completed
    await ExportDBService.markExportCompleted(exportRecord.id, {
      filePath: outputPath,
      fileSize: BigInt(fileSize),
      thumbnailPath,
      metadata: {
        originalPath: clip.path,
        format,
        quality: options.quality || 'high',
        platform: platform || null,
        aspectRatio: options.targetAspectRatio || null,
      },
    });

    const completed = await ExportDBService.getExportById(exportRecord.id);

    return {
      id: completed!.id,
      type: completed!.type,
      status: completed!.status,
      filePath: outputPath,
      fileSize,
      thumbnailPath,
      createdAt: completed!.createdAt,
      completedAt: completed!.completedAt || undefined,
    };
  } catch (err: any) {
    await ExportDBService.markExportFailed(
      exportRecord.id,
      err.message || 'Unknown error'
    );
    throw new ExportError(
      'Failed to export clip',
      'CLIP_EXPORT_FAILED',
      { error: err.message, clipId }
    );
  }
}

/**
 * Batch export multiple items
 */
export async function exportBatch(
  userId: string,
  request: ExportBatchRequest,
  organizationId?: string
): Promise<{
  id: string;
  results: ExportResult[];
  success: number;
  failed: number;
  zipPath?: string;
}> {
  const { items, options = {} } = request;

  // Create batch export record
  const batchExport = await ExportDBService.createExport({
    userId,
    organizationId,
    type: ExportType.BATCH,
    metadata: { itemCount: items.length },
  });

  await ExportDBService.markExportStarted(batchExport.id);

  const results: ExportResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Process each item
  for (const item of items) {
    try {
      let result: ExportResult;

      if (item.type === 'post') {
        result = await exportPost(
          userId,
          item.data as ExportPostRequest,
          organizationId
        );
      } else {
        result = await exportClip(
          userId,
          item.data as ExportClipRequest,
          organizationId
        );
      }

      results.push(result);
      successCount++;
    } catch (err: any) {
      failedCount++;
      results.push({
        id: '',
        type: item.type === 'post' ? ExportType.POST : ExportType.CLIP,
        status: ExportStatus.FAILED,
        errorMessage: err.message,
        createdAt: new Date(),
      });
    }
  }

  // TODO: Implement ZIP creation if requested
  let zipPath: string | undefined;
  if (options.zipOutput && successCount > 0) {
    // ZIP implementation would go here
  }

  // Mark batch as completed
  await ExportDBService.markExportCompleted(batchExport.id, {
    filePath: zipPath,
    metadata: {
      itemCount: items.length,
      successCount,
      failedCount,
      results: results.map(r => ({ id: r.id, status: r.status })),
    },
  });

  return {
    id: batchExport.id,
    results,
    success: successCount,
    failed: failedCount,
    zipPath,
  };
}

/**
 * Get export history for a user
 */
export async function getExportHistory(
  userId: string,
  limit = 50,
  offset = 0
): Promise<ExportResult[]> {
  const exports = await ExportDBService.getUserExportHistory(userId, limit, offset);

  return exports.map(exp => ({
    id: exp.id,
    type: exp.type,
    status: exp.status,
    filePath: exp.filePath || undefined,
    fileSize: exp.fileSize ? Number(exp.fileSize) : undefined,
    thumbnailPath: exp.thumbnailPath || undefined,
    content: exp.content || undefined,
    metadata: exp.metadata as Record<string, any>,
    errorMessage: exp.errorMessage || undefined,
    createdAt: exp.createdAt,
    completedAt: exp.completedAt || undefined,
  }));
}

/**
 * Get export statistics for a user
 */
export async function getExportStats(userId: string) {
  return ExportDBService.getUserExportStats(userId);
}

/**
 * Delete an export
 */
export async function deleteExport(userId: string, exportId: string): Promise<void> {
  const exportRecord = await ExportDBService.getExportById(exportId);

  if (!exportRecord) {
    throw new ExportError('Export not found', 'EXPORT_NOT_FOUND', { exportId });
  }

  if (exportRecord.userId !== userId) {
    throw new ExportError(
      'Unauthorized to delete this export',
      'UNAUTHORIZED',
      { exportId, userId }
    );
  }

  // Delete file if exists
  if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
    try {
      fs.unlinkSync(exportRecord.filePath);
    } catch (err) {
      console.warn(`Failed to delete export file: ${exportRecord.filePath}`, err);
    }
  }

  // Delete thumbnail if exists
  if (exportRecord.thumbnailPath && fs.existsSync(exportRecord.thumbnailPath)) {
    try {
      fs.unlinkSync(exportRecord.thumbnailPath);
    } catch (err) {
      console.warn(`Failed to delete thumbnail: ${exportRecord.thumbnailPath}`, err);
    }
  }

  // Delete database record
  await ExportDBService.deleteExport(exportId);
}

/**
 * Get formatted post preview without saving
 */
export function previewPost(
  text: string,
  platform: SocialPlatform
): FormattedPost {
  return formatForPlatform(text, platform, {
    optimizeHashtags: true,
  });
}

/**
 * Format text for multiple platforms
 */
export function formatForMultiplePlatforms(
  text: string,
  platforms: SocialPlatform[]
): Record<SocialPlatform, FormattedPost> {
  const results: Record<string, FormattedPost> = {};

  for (const platform of platforms) {
    results[platform] = formatForPlatform(text, platform, {
      optimizeHashtags: true,
    });
  }

  return results as Record<SocialPlatform, FormattedPost>;
}

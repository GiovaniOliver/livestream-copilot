/**
 * Export Service
 *
 * Orchestrates export operations for social media content and clips.
 * Handles formatting, conversion, and tracking of exports.
 */

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';
import type { Response } from 'express';
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
import { logger } from '../logger/index.js';

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
 * Export item for batch ZIP creation
 */
interface ExportItem {
  path: string;
  filename: string;
  type: 'clip' | 'post' | 'metadata';
}

/**
 * Export metadata for ZIP archive
 */
interface ExportMetadata {
  session?: {
    id: string;
    title?: string;
    createdAt: Date;
  };
  totalItems: number;
  exportDate: Date;
  exportedBy?: string;
}

/**
 * ZIP progress event
 */
interface ZipProgress {
  processedBytes: number;
  totalFiles: number;
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
 * Generate README content for export archive
 */
function generateReadme(items: ExportItem[], metadata?: ExportMetadata): string {
  const lines: string[] = [
    'Export Package',
    '==============',
    '',
    `Created: ${new Date().toISOString()}`,
    `Total Files: ${items.length}`,
    '',
  ];

  if (metadata?.session) {
    lines.push('Session Information:');
    lines.push(`- ID: ${metadata.session.id}`);
    if (metadata.session.title) {
      lines.push(`- Title: ${metadata.session.title}`);
    }
    lines.push(`- Date: ${metadata.session.createdAt.toISOString()}`);
    lines.push('');
  }

  lines.push('Files Included:');
  items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.filename} (${item.type})`);
  });

  lines.push('');
  lines.push('---');
  lines.push('Generated by Livestream Copilot');

  return lines.join('\n');
}

/**
 * Create ZIP archive from export items
 */
async function createExportZip(
  items: ExportItem[],
  outputPath: string,
  metadata?: ExportMetadata,
  progressCallback?: (progress: ZipProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create write stream
    const output = createWriteStream(outputPath);

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Handle errors
    archive.on('error', (err) => {
      reject(err);
    });

    // Handle warnings
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        logger.warn({ err }, '[export/service] ZIP warning');
      } else {
        reject(err);
      }
    });

    // Track progress
    let totalBytes = 0;
    archive.on('progress', (progress) => {
      totalBytes = progress.fs.processedBytes;
      progressCallback?.({
        processedBytes: totalBytes,
        totalFiles: progress.entries.processed,
      });
    });

    // Pipe archive to output file
    archive.pipe(output);

    // Add files to archive
    for (const item of items) {
      if (fs.existsSync(item.path)) {
        archive.file(item.path, {
          name: item.filename || path.basename(item.path),
        });
      } else {
        logger.warn(`[export/service] File not found: ${item.path}`);
      }
    }

    // Add metadata file
    if (metadata) {
      const metadataJson = JSON.stringify(metadata, null, 2);
      archive.append(metadataJson, { name: 'metadata.json' });
    }

    // Add README
    const readme = generateReadme(items, metadata);
    archive.append(readme, { name: 'README.txt' });

    // Finalize archive
    output.on('close', () => {
      const finalSize = archive.pointer();
      logger.info(`[export/service] ZIP created: ${outputPath} (${finalSize} bytes)`);
      resolve(outputPath);
    });

    archive.finalize();
  });
}

/**
 * Stream ZIP archive directly to response
 */
export async function streamZipToResponse(
  items: ExportItem[],
  res: Response,
  metadata?: ExportMetadata
): Promise<void> {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="export.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    logger.error({ err }, '[export/service] ZIP error');
    if (!res.headersSent) {
      res.status(500).end();
    }
  });

  // Pipe directly to response
  archive.pipe(res);

  // Add files
  for (const item of items) {
    if (fs.existsSync(item.path)) {
      archive.file(item.path, { name: item.filename });
    }
  }

  // Add metadata
  if (metadata) {
    archive.append(JSON.stringify(metadata, null, 2), {
      name: 'metadata.json',
    });
  }

  // Add README
  const readme = generateReadme(items, metadata);
  archive.append(readme, { name: 'README.txt' });

  await archive.finalize();
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
  const exportItems: ExportItem[] = [];
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

      // Add to export items for ZIP
      if (result.filePath) {
        exportItems.push({
          path: result.filePath,
          filename: path.basename(result.filePath),
          type: item.type,
        });

        // Add thumbnail if present
        if (result.thumbnailPath) {
          exportItems.push({
            path: result.thumbnailPath,
            filename: `thumbnails/${path.basename(result.thumbnailPath)}`,
            type: 'metadata',
          });
        }
      }
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

  // Create ZIP if requested and there are successful exports
  let zipPath: string | undefined;
  if (options.zipOutput && successCount > 0) {
    try {
      const timestamp = Date.now();
      const zipFilename = `export_batch_${timestamp}.zip`;
      const exportDir = path.join(process.cwd(), 'exports', 'batches');

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      zipPath = path.join(exportDir, zipFilename);

      // Prepare metadata
      const zipMetadata: ExportMetadata = {
        totalItems: items.length,
        exportDate: new Date(),
        exportedBy: userId,
      };

      // Create ZIP archive
      await createExportZip(exportItems, zipPath, zipMetadata, (progress) => {
        logger.info(
          `[export/service] ZIP progress: ${progress.totalFiles}/${exportItems.length} files, ${progress.processedBytes} bytes`
        );
      });
    } catch (zipErr: any) {
      logger.error({ err: zipErr }, '[export/service] ZIP creation failed');
      // Don't fail the entire batch if ZIP fails
    }
  }

  // Mark batch as completed
  await ExportDBService.markExportCompleted(batchExport.id, {
    filePath: zipPath,
    fileSize: zipPath ? BigInt(fs.statSync(zipPath).size) : undefined,
    metadata: {
      itemCount: items.length,
      successCount,
      failedCount,
      results: results.map((r) => ({ id: r.id, status: r.status })),
      zipCreated: !!zipPath,
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
 * Cleanup old exports
 */
export async function cleanupOldExports(daysOld = 7): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  let cleanedCount = 0;

  try {
    // Get old completed exports from database
    const oldExports = await ExportDBService.getUserExportHistory('', 1000, 0);

    for (const exportRecord of oldExports) {
      if (
        exportRecord.status === ExportStatus.COMPLETED &&
        exportRecord.createdAt < cutoffDate
      ) {
        // Delete files
        if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
          try {
            await fs.promises.unlink(exportRecord.filePath);
          } catch (err) {
            logger.warn(
              { err },
              `[export/service] Failed to delete file: ${exportRecord.filePath}`
            );
          }
        }

        if (exportRecord.thumbnailPath && fs.existsSync(exportRecord.thumbnailPath)) {
          try {
            await fs.promises.unlink(exportRecord.thumbnailPath);
          } catch (err) {
            logger.warn(
              { err },
              `[export/service] Failed to delete thumbnail: ${exportRecord.thumbnailPath}`
            );
          }
        }

        // Delete database record
        await ExportDBService.deleteExport(exportRecord.id);
        cleanedCount++;
      }
    }

    logger.info(`[export/service] Cleaned up ${cleanedCount} old exports`);
    return cleanedCount;
  } catch (err) {
    logger.error({ err }, '[export/service] Cleanup failed');
    return cleanedCount;
  }
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

  return exports.map((exp) => ({
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
      logger.warn({ err }, `Failed to delete export file: ${exportRecord.filePath}`);
    }
  }

  // Delete thumbnail if exists
  if (exportRecord.thumbnailPath && fs.existsSync(exportRecord.thumbnailPath)) {
    try {
      fs.unlinkSync(exportRecord.thumbnailPath);
    } catch (err) {
      logger.warn({ err }, `Failed to delete thumbnail: ${exportRecord.thumbnailPath}`);
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

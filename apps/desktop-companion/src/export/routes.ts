/**
 * Export Routes
 *
 * Express router providing social media export endpoints:
 * - POST /post - Export social post text
 * - POST /clip - Export clip with format conversion
 * - POST /batch - Batch export multiple items
 * - GET /history - Get export history
 * - GET /stats - Get export statistics
 * - GET /:id/download - Download export file
 * - GET /:id/status - Get export status
 * - DELETE /:id - Delete an export
 * - POST /preview - Preview formatted post without saving
 *
 * @module export/routes
 */

import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { createReadStream } from 'fs';
import fs from 'fs';
import path from 'path';
import { authenticateToken, type AuthenticatedRequest } from '../auth/middleware.js';
import * as exportService from './service.js';
import type {
  ExportPostRequest,
  ExportClipRequest,
  ExportBatchRequest,
} from './types.js';
import { SocialPlatform, ExportFormat, ExportStatus } from './types.js';
import * as ExportDBService from '../db/services/export.service.js';

import { logger } from '../logger/index.js';
// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const SocialPlatformSchema = z.enum([
  'TWITTER',
  'LINKEDIN',
  'INSTAGRAM',
  'TIKTOK',
  'YOUTUBE',
  'FACEBOOK',
  'THREADS',
  'BLUESKY',
]);

const ExportFormatSchema = z.enum(['MP4', 'WEBM', 'GIF', 'MOV']);

const ExportPostSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text is too long'),
  platform: SocialPlatformSchema,
  sessionId: z.string().optional(),
  clipId: z.string().optional(),
  options: z
    .object({
      copyToClipboard: z.boolean().optional(),
      saveToFile: z.boolean().optional(),
      optimizeHashtags: z.boolean().optional(),
      addTimestamps: z.boolean().optional(),
      createThread: z.boolean().optional(),
    })
    .optional(),
});

const ExportClipSchema = z.object({
  clipId: z.string().min(1, 'Clip ID is required'),
  format: ExportFormatSchema,
  platform: SocialPlatformSchema.optional(),
  options: z
    .object({
      quality: z.enum(['low', 'medium', 'high', 'original']).optional(),
      generateThumbnail: z.boolean().optional(),
      addWatermark: z.boolean().optional(),
      optimizeForPlatform: z.boolean().optional(),
      targetAspectRatio: z.string().optional(),
    })
    .optional(),
});

const ExportBatchSchema = z.object({
  items: z.array(
    z.object({
      type: z.enum(['post', 'clip']),
      data: z.any(), // Will be validated individually
    })
  ),
  options: z
    .object({
      zipOutput: z.boolean().optional(),
      includeMetadata: z.boolean().optional(),
    })
    .optional(),
});

const PreviewPostSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text is too long'),
  platforms: z.array(SocialPlatformSchema).min(1, 'At least one platform is required'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

function handleValidationError(res: Response, error: ZodError): void {
  const messages = error.errors.map((e) => {
    const path = e.path.join('.');
    return path ? `${path}: ${e.message}` : e.message;
  });

  sendError(res, 400, 'VALIDATION_ERROR', messages.join('; '));
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * POST /api/export/post
 * Export a social media post
 */
async function exportPostHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    // Validate input
    const validationResult = ExportPostSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const request: ExportPostRequest = validationResult.data;

    // Validate organization membership
    const organizationId = user.organizations[0]?.id;
    if (!organizationId) {
      sendError(res, 403, 'NO_ORGANIZATION', 'User must belong to an organization');
      return;
    }

    // Export post
    const result = await exportService.exportPost(
      user.id,
      request,
      organizationId
    );

    sendSuccess(res, result, 201);
  } catch (error: any) {
    logger.error({ err: error }, '[export/routes] Export post error');

    if (error.name === 'ExportError') {
      sendError(res, 400, error.code, error.message);
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * POST /api/export/clip
 * Export a video clip
 */
async function exportClipHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    // Validate input
    const validationResult = ExportClipSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const request: ExportClipRequest = validationResult.data;

    // Validate organization membership
    const organizationId = user.organizations[0]?.id;
    if (!organizationId) {
      sendError(res, 403, 'NO_ORGANIZATION', 'User must belong to an organization');
      return;
    }

    // Export clip
    const result = await exportService.exportClip(
      user.id,
      request,
      organizationId
    );

    sendSuccess(res, result, 201);
  } catch (error: any) {
    logger.error({ err: error }, '[export/routes] Export clip error');

    if (error.name === 'ExportError') {
      sendError(res, 400, error.code, error.message);
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * POST /api/export/batch
 * Batch export multiple items
 */
async function exportBatchHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    // Validate input
    const validationResult = ExportBatchSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const request = validationResult.data as ExportBatchRequest;

    // Validate organization membership
    const organizationId = user.organizations[0]?.id;
    if (!organizationId) {
      sendError(res, 403, 'NO_ORGANIZATION', 'User must belong to an organization');
      return;
    }

    // Export batch
    const result = await exportService.exportBatch(
      user.id,
      request,
      organizationId
    );

    sendSuccess(res, result, 201);
  } catch (error: any) {
    logger.error({ err: error }, '[export/routes] Export batch error');

    if (error.name === 'ExportError') {
      sendError(res, 400, error.code, error.message);
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * GET /api/export/:id/status
 * Get export job status
 */
async function getExportStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const exportId = req.params.id;

    const exportJob = await ExportDBService.getExportById(exportId);

    if (!exportJob) {
      sendError(res, 404, 'EXPORT_NOT_FOUND', 'Export not found');
      return;
    }

    if (exportJob.userId !== user.id) {
      sendError(res, 403, 'UNAUTHORIZED', 'Unauthorized to access this export');
      return;
    }

    // Calculate progress
    let progress = 0;
    if (exportJob.status === ExportStatus.COMPLETED) {
      progress = 100;
    } else if (exportJob.status === ExportStatus.PROCESSING) {
      progress = 50; // Rough estimate
    }

    sendSuccess(res, {
      id: exportJob.id,
      status: exportJob.status,
      progress,
      createdAt: exportJob.createdAt,
      completedAt: exportJob.completedAt,
      errorMessage: exportJob.errorMessage,
      metadata: exportJob.metadata,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[export/routes] Get status error');
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * GET /api/export/:id/download
 * Download export file
 */
async function downloadExportHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const exportId = req.params.id;

    const exportJob = await ExportDBService.getExportById(exportId);

    if (!exportJob) {
      sendError(res, 404, 'EXPORT_NOT_FOUND', 'Export not found');
      return;
    }

    if (exportJob.userId !== user.id) {
      sendError(res, 403, 'UNAUTHORIZED', 'Unauthorized to access this export');
      return;
    }

    if (exportJob.status !== ExportStatus.COMPLETED) {
      sendError(res, 400, 'EXPORT_NOT_READY', 'Export is not ready for download');
      return;
    }

    if (!exportJob.filePath || !fs.existsSync(exportJob.filePath)) {
      sendError(res, 404, 'FILE_NOT_FOUND', 'Export file not found');
      return;
    }

    // Determine content type
    const ext = path.extname(exportJob.filePath).toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.zip') {
      contentType = 'application/zip';
    } else if (ext === '.mp4') {
      contentType = 'video/mp4';
    } else if (ext === '.webm') {
      contentType = 'video/webm';
    } else if (ext === '.mov') {
      contentType = 'video/quicktime';
    } else if (ext === '.txt') {
      contentType = 'text/plain';
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${path.basename(exportJob.filePath)}"`
    );

    if (exportJob.fileSize) {
      res.setHeader('Content-Length', exportJob.fileSize.toString());
    }

    // Stream file
    const fileStream = createReadStream(exportJob.filePath);

    fileStream.on('error', (err) => {
      logger.error({ err }, '[export/routes] File stream error');
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    fileStream.pipe(res);
  } catch (error: any) {
    logger.error({ err: error }, '[export/routes] Download error');
    if (!res.headersSent) {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
    }
  }
}

/**
 * GET /api/export/history
 * Get export history for current user
 */
async function getExportHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const history = await exportService.getExportHistory(user.id, limit, offset);

    sendSuccess(res, {
      exports: history,
      count: history.length,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[export/routes] Get history error');
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * GET /api/export/stats
 * Get export statistics for current user
 */
async function getExportStatsHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const stats = await exportService.getExportStats(user.id);

    sendSuccess(res, stats);
  } catch (error: any) {
    logger.error({ err: error }, '[export/routes] Get stats error');
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * DELETE /api/export/:id
 * Delete an export
 */
async function deleteExportHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const exportId = req.params.id;

    await exportService.deleteExport(user.id, exportId);

    sendSuccess(res, { message: 'Export deleted successfully' });
  } catch (error: any) {
    logger.error({ err: error }, '[export/routes] Delete export error');

    if (error.name === 'ExportError') {
      if (error.code === 'EXPORT_NOT_FOUND') {
        sendError(res, 404, error.code, error.message);
        return;
      }
      if (error.code === 'UNAUTHORIZED') {
        sendError(res, 403, error.code, error.message);
        return;
      }
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * POST /api/export/preview
 * Preview formatted post for multiple platforms without saving
 */
async function previewPostHandler(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validationResult = PreviewPostSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { text, platforms } = validationResult.data;

    // Format for all requested platforms
    const previews = exportService.formatForMultiplePlatforms(
      text,
      platforms as SocialPlatform[]
    );

    sendSuccess(res, { previews });
  } catch (error: any) {
    logger.error({ err: error }, '[export/routes] Preview post error');
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

/**
 * Creates and configures the export router.
 *
 * @returns Configured Express router
 */
export function createExportRouter(): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Export routes
  router.post('/post', exportPostHandler);
  router.post('/clip', exportClipHandler);
  router.post('/batch', exportBatchHandler);

  // Status and download
  router.get('/:id/status', getExportStatusHandler);
  router.get('/:id/download', downloadExportHandler);

  // History and statistics
  router.get('/history', getExportHistoryHandler);
  router.get('/stats', getExportStatsHandler);

  // Management routes
  router.delete('/:id', deleteExportHandler);

  // Preview route (no database writes)
  router.post('/preview', previewPostHandler);

  return router;
}

/**
 * Pre-configured export router.
 * Mount at /api/export in your Express app.
 *
 * @example
 * import { exportRouter } from './export/routes';
 * app.use('/api/export', exportRouter);
 */
export const exportRouter = createExportRouter();

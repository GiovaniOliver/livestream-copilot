/**
 * Export Routes
 *
 * Express router providing social media export endpoints:
 * - POST /post - Export social post text
 * - POST /clip - Export clip with format conversion
 * - POST /batch - Batch export multiple items
 * - GET /history - Get export history
 * - GET /stats - Get export statistics
 * - DELETE /:id - Delete an export
 * - POST /preview - Preview formatted post without saving
 *
 * @module export/routes
 */

import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { authenticateToken, type AuthenticatedRequest } from '../auth/middleware.js';
import * as exportService from './service.js';
import type {
  ExportPostRequest,
  ExportClipRequest,
  ExportBatchRequest,
} from './types.js';
import { SocialPlatform, ExportFormat } from './types.js';

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

    // Export post
    const result = await exportService.exportPost(
      user.id,
      request,
      user.organizationId
    );

    sendSuccess(res, result, 201);
  } catch (error: any) {
    console.error('[export/routes] Export post error:', error);

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

    // Export clip
    const result = await exportService.exportClip(
      user.id,
      request,
      user.organizationId
    );

    sendSuccess(res, result, 201);
  } catch (error: any) {
    console.error('[export/routes] Export clip error:', error);

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

    const request: ExportBatchRequest = validationResult.data;

    // Export batch
    const result = await exportService.exportBatch(
      user.id,
      request,
      user.organizationId
    );

    sendSuccess(res, result, 201);
  } catch (error: any) {
    console.error('[export/routes] Export batch error:', error);

    if (error.name === 'ExportError') {
      sendError(res, 400, error.code, error.message);
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
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
    console.error('[export/routes] Get history error:', error);
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
    console.error('[export/routes] Get stats error:', error);
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
    console.error('[export/routes] Delete export error:', error);

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
    console.error('[export/routes] Preview post error:', error);
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

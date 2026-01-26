/**
 * Branding Routes
 *
 * Express router providing video branding endpoints:
 * - POST /branded - Export clip with branding
 * - POST /preview - Generate branding preview
 * - GET /presets - Get user's branding presets
 * - POST /presets - Create branding preset
 * - PUT /presets/:id - Update branding preset
 * - DELETE /presets/:id - Delete branding preset
 *
 * @module export/branding-routes
 */

import { Router, type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import { z, ZodError } from 'zod';
import { authenticateToken, type AuthenticatedRequest } from '../auth/middleware.js';
import { applyBranding, previewBranding, validateBrandingConfig, BrandingError } from './branding-service.js';
import type { BrandingConfig, BrandedExportRequest, BrandingPreset } from './branding-types.js';
import * as ClipService from '../db/services/clip.service.js';
import * as ExportDBService from '../db/services/export.service.js';
import { ExportType } from './types.js';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const OverlayPositionSchema = z.enum([
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]);

const LogoOverlaySchema = z.object({
  path: z.string().min(1),
  position: OverlayPositionSchema,
  widthPercent: z.number().min(1).max(50),
  opacity: z.number().min(0).max(1),
  margin: z.number().min(0),
  fadeIn: z.number().optional(),
  fadeOut: z.number().optional(),
  delay: z.number().optional(),
  duration: z.number().optional(),
});

const BrandClipSchema = z.object({
  path: z.string().min(1),
  duration: z.number().positive(),
  fadeTransition: z.number().optional(),
  audioMode: z.enum(['keep', 'mute', 'fade']).optional(),
});

const LowerThirdSchema = z.object({
  text: z.string().min(1),
  subtitle: z.string().optional(),
  startTime: z.number().min(0),
  duration: z.number().positive(),
  position: z.enum(['left', 'center', 'right']),
  textColor: z.string(),
  backgroundColor: z.string(),
  fontSize: z.number().positive(),
  fontFamily: z.string().optional(),
  fadeDuration: z.number().optional(),
});

const TextOverlaySchema = z.object({
  text: z.string().min(1),
  position: OverlayPositionSchema,
  startTime: z.number().min(0),
  duration: z.number().positive(),
  fontSize: z.number().positive(),
  color: z.string(),
  backgroundColor: z.string().optional(),
  fontFamily: z.string().optional(),
  animation: z.enum(['none', 'fade', 'slide-in', 'typewriter']).optional(),
});

const BrandingConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  logo: LogoOverlaySchema.optional(),
  intro: BrandClipSchema.optional(),
  outro: BrandClipSchema.optional(),
  lowerThirds: z.array(LowerThirdSchema).optional(),
  textOverlays: z.array(TextOverlaySchema).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  audioDucking: z.boolean().optional(),
  audioDuckingLevel: z.number().min(0).max(1).optional(),
});

const BrandedExportSchema = z.object({
  clipId: z.string().min(1),
  format: z.enum(['MP4', 'WEBM', 'MOV']).optional().default('MP4'),
  quality: z.enum(['low', 'medium', 'high', 'original']).optional(),
  targetAspectRatio: z.string().optional(),
  brandingPresetId: z.string().optional(),
  branding: BrandingConfigSchema.optional(),
  generateThumbnail: z.boolean().optional().default(true),
});

const CreatePresetSchema = z.object({
  name: z.string().min(1).max(100),
  config: BrandingConfigSchema,
  isDefault: z.boolean().optional().default(false),
});

// =============================================================================
// IN-MEMORY PRESET STORAGE (Replace with DB in production)
// =============================================================================

const presetsStore: Map<string, BrandingPreset> = new Map();

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
    const p = e.path.join('.');
    return p ? `${p}: ${e.message}` : e.message;
  });

  sendError(res, 400, 'VALIDATION_ERROR', messages.join('; '));
}

function generateId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * POST /api/branding/export
 * Export a clip with branding applied
 */
async function brandedExportHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    // Validate input
    const validationResult = BrandedExportSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const request = validationResult.data;

    // Get clip from database
    const clip = await ClipService.getClipByArtifactId(request.clipId);
    if (!clip) {
      sendError(res, 404, 'CLIP_NOT_FOUND', 'Clip not found');
      return;
    }

    // Verify clip file exists
    if (!fs.existsSync(clip.path)) {
      sendError(res, 404, 'CLIP_FILE_NOT_FOUND', 'Clip file not found on disk');
      return;
    }

    // Get branding config
    let brandingConfig: BrandingConfig | undefined;

    if (request.branding) {
      brandingConfig = request.branding;
    } else if (request.brandingPresetId) {
      const preset = presetsStore.get(request.brandingPresetId);
      if (!preset) {
        sendError(res, 404, 'PRESET_NOT_FOUND', 'Branding preset not found');
        return;
      }
      if (preset.userId !== user.id) {
        sendError(res, 403, 'UNAUTHORIZED', 'Not authorized to use this preset');
        return;
      }
      brandingConfig = preset.config;
    }

    if (!brandingConfig) {
      sendError(res, 400, 'NO_BRANDING', 'No branding configuration provided');
      return;
    }

    // Validate branding config
    const configErrors = validateBrandingConfig(brandingConfig);
    if (configErrors.length > 0) {
      sendError(res, 400, 'INVALID_BRANDING', configErrors.join('; '));
      return;
    }

    // Create export record
    const exportRecord = await ExportDBService.createExport({
      userId: user.id,
      organizationId: user.organizationId,
      sessionId: clip.sessionId,
      clipId: clip.id,
      type: ExportType.CLIP,
      metadata: {
        branding: brandingConfig.name,
        withIntro: !!brandingConfig.intro,
        withOutro: !!brandingConfig.outro,
        withLogo: !!brandingConfig.logo,
      },
    });

    try {
      await ExportDBService.markExportStarted(exportRecord.id);

      // Prepare output path
      const exportDir = path.join(process.cwd(), 'exports', 'branded');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const basename = path.basename(clip.path, path.extname(clip.path));
      const outputPath = path.join(
        exportDir,
        `${basename}_branded_${Date.now()}.${request.format?.toLowerCase() || 'mp4'}`
      );

      // Apply branding
      const result = await applyBranding(clip.path, outputPath, brandingConfig);

      // Mark as completed
      await ExportDBService.markExportCompleted(exportRecord.id, {
        filePath: result.outputPath,
        fileSize: BigInt(result.fileSize),
        thumbnailPath: result.thumbnailPath,
        metadata: {
          branding: brandingConfig.name,
          duration: result.duration,
        },
      });

      sendSuccess(res, {
        id: exportRecord.id,
        status: 'completed',
        filePath: result.outputPath,
        fileSize: result.fileSize,
        duration: result.duration,
        thumbnailPath: result.thumbnailPath,
      }, 201);
    } catch (err: any) {
      await ExportDBService.markExportFailed(exportRecord.id, err.message);
      throw err;
    }
  } catch (error: any) {
    console.error('[branding/routes] Branded export error:', error);

    if (error.name === 'BrandingError') {
      sendError(res, 400, error.code, error.message);
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * POST /api/branding/preview
 * Generate a quick preview with branding (first 10 seconds)
 */
async function previewBrandingHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const { clipId, branding } = req.body;

    if (!clipId || !branding) {
      sendError(res, 400, 'MISSING_FIELDS', 'clipId and branding are required');
      return;
    }

    // Get clip
    const clip = await ClipService.getClipByArtifactId(clipId);
    if (!clip) {
      sendError(res, 404, 'CLIP_NOT_FOUND', 'Clip not found');
      return;
    }

    if (!fs.existsSync(clip.path)) {
      sendError(res, 404, 'CLIP_FILE_NOT_FOUND', 'Clip file not found');
      return;
    }

    // Generate preview
    const previewDir = path.join(process.cwd(), 'exports', 'previews');
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }

    const previewPath = path.join(previewDir, `preview_${Date.now()}.mp4`);
    const outputPath = await previewBranding(clip.path, previewPath, branding);

    sendSuccess(res, {
      previewPath: outputPath,
      message: 'Preview generated successfully',
    });
  } catch (error: any) {
    console.error('[branding/routes] Preview error:', error);

    if (error.name === 'BrandingError') {
      sendError(res, 400, error.code, error.message);
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * GET /api/branding/presets
 * Get all branding presets for current user
 */
async function getPresetsHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const userPresets = Array.from(presetsStore.values())
      .filter((p) => p.userId === user.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    sendSuccess(res, { presets: userPresets });
  } catch (error: any) {
    console.error('[branding/routes] Get presets error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * POST /api/branding/presets
 * Create a new branding preset
 */
async function createPresetHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const validationResult = CreatePresetSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { name, config, isDefault } = validationResult.data;

    // If setting as default, unset other defaults
    if (isDefault) {
      presetsStore.forEach((preset, id) => {
        if (preset.userId === user.id && preset.isDefault) {
          presetsStore.set(id, { ...preset, isDefault: false });
        }
      });
    }

    const preset: BrandingPreset = {
      id: generateId(),
      userId: user.id,
      organizationId: user.organizationId,
      name,
      config: { ...config, id: undefined },
      isDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    presetsStore.set(preset.id, preset);

    sendSuccess(res, { preset }, 201);
  } catch (error: any) {
    console.error('[branding/routes] Create preset error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * PUT /api/branding/presets/:id
 * Update a branding preset
 */
async function updatePresetHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const presetId = req.params.id;

    const preset = presetsStore.get(presetId);
    if (!preset) {
      sendError(res, 404, 'PRESET_NOT_FOUND', 'Preset not found');
      return;
    }

    if (preset.userId !== user.id) {
      sendError(res, 403, 'UNAUTHORIZED', 'Not authorized to update this preset');
      return;
    }

    const { name, config, isDefault } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      presetsStore.forEach((p, id) => {
        if (p.userId === user.id && p.isDefault && id !== presetId) {
          presetsStore.set(id, { ...p, isDefault: false });
        }
      });
    }

    const updatedPreset: BrandingPreset = {
      ...preset,
      name: name || preset.name,
      config: config || preset.config,
      isDefault: isDefault !== undefined ? isDefault : preset.isDefault,
      updatedAt: new Date(),
    };

    presetsStore.set(presetId, updatedPreset);

    sendSuccess(res, { preset: updatedPreset });
  } catch (error: any) {
    console.error('[branding/routes] Update preset error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

/**
 * DELETE /api/branding/presets/:id
 * Delete a branding preset
 */
async function deletePresetHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const presetId = req.params.id;

    const preset = presetsStore.get(presetId);
    if (!preset) {
      sendError(res, 404, 'PRESET_NOT_FOUND', 'Preset not found');
      return;
    }

    if (preset.userId !== user.id) {
      sendError(res, 403, 'UNAUTHORIZED', 'Not authorized to delete this preset');
      return;
    }

    presetsStore.delete(presetId);

    sendSuccess(res, { message: 'Preset deleted successfully' });
  } catch (error: any) {
    console.error('[branding/routes] Delete preset error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

/**
 * Creates and configures the branding router.
 *
 * @returns Configured Express router
 */
export function createBrandingRouter(): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Export with branding
  router.post('/export', brandedExportHandler);
  router.post('/preview', previewBrandingHandler);

  // Preset management
  router.get('/presets', getPresetsHandler);
  router.post('/presets', createPresetHandler);
  router.put('/presets/:id', updatePresetHandler);
  router.delete('/presets/:id', deletePresetHandler);

  return router;
}

/**
 * Pre-configured branding router.
 * Mount at /api/branding in your Express app.
 */
export const brandingRouter = createBrandingRouter();

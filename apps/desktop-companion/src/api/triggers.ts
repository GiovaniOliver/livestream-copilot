/**
 * Triggers API Routes
 *
 * REST API endpoints for auto-trigger configuration:
 * - Get/update trigger config per workflow
 * - Add/remove audio trigger phrases
 * - Upload/delete visual trigger reference images
 *
 * @module api/triggers
 */

import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import * as TriggerConfigService from "../db/services/trigger-config.service.js";
import * as ReferenceImageService from "../db/services/reference-image.service.js";
import { authenticateToken } from "../auth/middleware.js";
import path from "path";
import fs from "fs/promises";
import { config } from "../config/index.js";

// Multer will be lazy-loaded when needed
let _multer: typeof import("multer") | null = null;
let _multerLoadAttempted = false;

async function getMulter() {
  if (!_multerLoadAttempted) {
    _multerLoadAttempted = true;
    try {
      _multer = await import("multer");
    } catch {
      console.warn("[triggers] multer not available - file upload disabled");
    }
  }
  return _multer?.default;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateTriggerConfigSchema = z.object({
  audioEnabled: z.boolean().optional(),
  visualEnabled: z.boolean().optional(),
  frameSampleRate: z.number().int().min(1).max(60).optional(),
  autoClipEnabled: z.boolean().optional(),
  autoClipDuration: z.number().int().min(15).max(300).optional(),
  triggerCooldown: z.number().int().min(5).max(300).optional(),
});

const addAudioTriggerSchema = z.object({
  phrase: z.string().min(1).max(100),
  caseSensitive: z.boolean().default(false),
});

const addVisualTriggerSchema = z.object({
  label: z.string().min(1).max(50),
  threshold: z.number().min(0).max(1).default(0.8),
});

// =============================================================================
// RESPONSE HELPERS
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
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  sendError(res, 400, "VALIDATION_ERROR", messages.join("; "));
}

// =============================================================================
// FILE UPLOAD SETUP
// =============================================================================

const UPLOAD_DIR = path.join(config.SESSION_DIR, "reference-images");

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `ref-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."));
    }
  },
});

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/workflows/:workflow/triggers
 * Get trigger configuration for a workflow.
 */
async function getTriggerConfigHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workflow } = req.params;

    const triggerConfig = await TriggerConfigService.getOrCreateTriggerConfig(workflow);
    const referenceImages = await ReferenceImageService.getEnabledReferenceImages(workflow);

    sendSuccess(res, {
      config: triggerConfig,
      referenceImages,
    });
  } catch (error) {
    console.error("[api/triggers] Error getting trigger config:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get trigger configuration.");
  }
}

/**
 * PUT /api/workflows/:workflow/triggers
 * Update trigger configuration for a workflow.
 */
async function updateTriggerConfigHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workflow } = req.params;

    const validationResult = updateTriggerConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const config = await TriggerConfigService.updateTriggerConfig(
      workflow,
      validationResult.data
    );

    sendSuccess(res, { config });
  } catch (error) {
    console.error("[api/triggers] Error updating trigger config:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update trigger configuration.");
  }
}

/**
 * POST /api/workflows/:workflow/triggers/audio
 * Add a new audio trigger phrase.
 */
async function addAudioTriggerHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workflow } = req.params;

    const validationResult = addAudioTriggerSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { phrase, caseSensitive } = validationResult.data;
    const config = await TriggerConfigService.addAudioTrigger(workflow, phrase, caseSensitive);

    sendSuccess(res, { config }, 201);
  } catch (error) {
    console.error("[api/triggers] Error adding audio trigger:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to add audio trigger.");
  }
}

/**
 * DELETE /api/workflows/:workflow/triggers/audio/:triggerId
 * Remove an audio trigger phrase.
 */
async function removeAudioTriggerHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workflow, triggerId } = req.params;

    const config = await TriggerConfigService.removeAudioTrigger(workflow, triggerId);

    sendSuccess(res, { config });
  } catch (error) {
    console.error("[api/triggers] Error removing audio trigger:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to remove audio trigger.");
  }
}

/**
 * PATCH /api/workflows/:workflow/triggers/audio/:triggerId
 * Toggle audio trigger enabled state.
 */
async function toggleAudioTriggerHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workflow, triggerId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      sendError(res, 400, "VALIDATION_ERROR", "enabled must be a boolean");
      return;
    }

    const config = await TriggerConfigService.toggleAudioTrigger(workflow, triggerId, enabled);

    sendSuccess(res, { config });
  } catch (error) {
    console.error("[api/triggers] Error toggling audio trigger:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to toggle audio trigger.");
  }
}

/**
 * POST /api/workflows/:workflow/triggers/visual
 * Upload a new visual trigger reference image.
 */
async function addVisualTriggerHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workflow } = req.params;

    if (!req.file) {
      sendError(res, 400, "VALIDATION_ERROR", "No image file provided.");
      return;
    }

    const validationResult = addVisualTriggerSchema.safeParse(req.body);
    if (!validationResult.success) {
      // Delete uploaded file on validation error
      await fs.unlink(req.file.path).catch(() => {});
      handleValidationError(res, validationResult.error);
      return;
    }

    const { label, threshold } = validationResult.data;

    // Create reference image in database
    const referenceImage = await ReferenceImageService.createReferenceImage({
      workflow,
      label,
      imagePath: req.file.path,
      threshold,
    });

    // Add to trigger config visual triggers
    const config = await TriggerConfigService.addVisualTrigger(
      workflow,
      label,
      referenceImage.id,
      threshold
    );

    sendSuccess(res, { config, referenceImage }, 201);
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    console.error("[api/triggers] Error adding visual trigger:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to add visual trigger.");
  }
}

/**
 * DELETE /api/workflows/:workflow/triggers/visual/:triggerId
 * Remove a visual trigger reference image.
 */
async function removeVisualTriggerHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workflow, triggerId } = req.params;

    // Get the reference image to delete the file
    const referenceImage = await ReferenceImageService.getReferenceImageById(triggerId);
    if (referenceImage) {
      // Delete the file
      await fs.unlink(referenceImage.imagePath).catch(() => {});
      // Delete from database
      await ReferenceImageService.deleteReferenceImage(triggerId);
    }

    // Remove from trigger config
    const config = await TriggerConfigService.removeVisualTrigger(workflow, triggerId);

    sendSuccess(res, { config });
  } catch (error) {
    console.error("[api/triggers] Error removing visual trigger:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to remove visual trigger.");
  }
}

/**
 * GET /api/workflows/:workflow/triggers/visual
 * List all visual trigger reference images for a workflow.
 */
async function listVisualTriggersHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workflow } = req.params;

    const referenceImages = await ReferenceImageService.listReferenceImages({ workflow });

    sendSuccess(res, { referenceImages });
  } catch (error) {
    console.error("[api/triggers] Error listing visual triggers:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list visual triggers.");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

export function createTriggersRouter(): Router {
  const router = Router({ mergeParams: true });

  // Read endpoints
  router.get("/", getTriggerConfigHandler);
  router.get("/visual", listVisualTriggersHandler);

  // Write endpoints - require authentication in production
  router.put("/", updateTriggerConfigHandler);
  router.post("/audio", addAudioTriggerHandler);
  router.delete("/audio/:triggerId", removeAudioTriggerHandler);
  router.patch("/audio/:triggerId", toggleAudioTriggerHandler);
  router.post("/visual", upload.single("image"), addVisualTriggerHandler);
  router.delete("/visual/:triggerId", removeVisualTriggerHandler);

  return router;
}

export const triggersRouter = createTriggersRouter();

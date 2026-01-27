/**
 * Clip Queue API Routes
 *
 * REST API endpoints for clip queue management:
 * - List queue items for a session
 * - Get queue item details
 * - Update queue items (title, etc.)
 * - Delete/cancel queue items
 * - Retry failed items
 *
 * @module api/clip-queue
 */

import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import * as ClipQueueService from "../db/services/clip-queue.service.js";
import { getSessionById } from "../db/services/session.service.js";
import { authenticateToken } from "../auth/middleware.js";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const listQueueSchema = z.object({
  status: z.enum(["PENDING", "RECORDING", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const updateQueueItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
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
// TRANSFORM HELPERS
// =============================================================================

interface ClipQueueItemApiResponse {
  id: string;
  sessionId: string;
  clipId: string | null;
  status: string;
  triggerType: string;
  triggerSource: string | null;
  triggerConfidence: number | null;
  t0: number;
  t1: number | null;
  duration: number | null;
  thumbnailPath: string | null;
  title: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

function transformQueueItem(
  item: ClipQueueService.ClipQueueItemWithDuration
): ClipQueueItemApiResponse {
  return {
    id: item.id,
    sessionId: item.sessionId,
    clipId: item.clipId,
    status: item.status.toLowerCase(),
    triggerType: item.triggerType.toLowerCase(),
    triggerSource: item.triggerSource,
    triggerConfidence: item.triggerConfidence,
    t0: item.t0,
    t1: item.t1,
    duration: item.duration,
    thumbnailPath: item.thumbnailPath,
    title: item.title,
    errorMessage: item.errorMessage,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/sessions/:sessionId/clip-queue
 * List all clip queue items for a session.
 */
async function listSessionClipQueueHandler(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    const validationResult = listQueueSchema.safeParse(req.query);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { status, limit, offset } = validationResult.data;

    // Check if session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found.");
      return;
    }

    // Get queue items
    const items = await ClipQueueService.listClipQueueItems({
      sessionId,
      status: status as ClipQueueService.ClipQueueStatus | undefined,
      limit,
      offset,
    });

    const total = await ClipQueueService.countClipQueueItems({ sessionId, status: status as ClipQueueService.ClipQueueStatus | undefined });
    const stats = await ClipQueueService.getClipQueueStats(sessionId);

    sendSuccess(res, {
      items: items.map(transformQueueItem),
      stats,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    console.error("[api/clip-queue] Error listing clip queue:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list clip queue.");
  }
}

/**
 * GET /api/clip-queue/:id
 * Get a single clip queue item.
 */
async function getClipQueueItemHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const item = await ClipQueueService.getClipQueueItemById(id);
    if (!item) {
      sendError(res, 404, "NOT_FOUND", "Clip queue item not found.");
      return;
    }

    const itemWithDuration: ClipQueueService.ClipQueueItemWithDuration = {
      ...item,
      duration: item.t1 !== null ? item.t1 - item.t0 : null,
    };

    sendSuccess(res, { item: transformQueueItem(itemWithDuration) });
  } catch (error) {
    console.error("[api/clip-queue] Error getting clip queue item:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get clip queue item.");
  }
}

/**
 * PATCH /api/clip-queue/:id
 * Update a clip queue item (title, etc.).
 */
async function updateClipQueueItemHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const validationResult = updateQueueItemSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    // Check if item exists
    const existing = await ClipQueueService.getClipQueueItemById(id);
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Clip queue item not found.");
      return;
    }

    const item = await ClipQueueService.updateClipQueueItem(id, validationResult.data);

    const itemWithDuration: ClipQueueService.ClipQueueItemWithDuration = {
      ...item,
      duration: item.t1 !== null ? item.t1 - item.t0 : null,
    };

    sendSuccess(res, { item: transformQueueItem(itemWithDuration) });
  } catch (error) {
    console.error("[api/clip-queue] Error updating clip queue item:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update clip queue item.");
  }
}

/**
 * DELETE /api/clip-queue/:id
 * Delete/cancel a clip queue item.
 */
async function deleteClipQueueItemHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if item exists
    const existing = await ClipQueueService.getClipQueueItemById(id);
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Clip queue item not found.");
      return;
    }

    // Don't allow deleting items that are currently processing
    if (existing.status === "PROCESSING") {
      sendError(res, 400, "INVALID_STATE", "Cannot delete item that is currently processing.");
      return;
    }

    await ClipQueueService.deleteClipQueueItem(id);

    sendSuccess(res, { message: "Clip queue item deleted." });
  } catch (error) {
    console.error("[api/clip-queue] Error deleting clip queue item:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete clip queue item.");
  }
}

/**
 * POST /api/clip-queue/:id/retry
 * Retry a failed clip queue item.
 */
async function retryClipQueueItemHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if item exists
    const existing = await ClipQueueService.getClipQueueItemById(id);
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Clip queue item not found.");
      return;
    }

    // Only allow retrying failed items
    if (existing.status !== "FAILED") {
      sendError(res, 400, "INVALID_STATE", "Can only retry failed items.");
      return;
    }

    const item = await ClipQueueService.retryClipQueueItem(id);

    const itemWithDuration: ClipQueueService.ClipQueueItemWithDuration = {
      ...item,
      duration: item.t1 !== null ? item.t1 - item.t0 : null,
    };

    sendSuccess(res, { item: transformQueueItem(itemWithDuration) });
  } catch (error) {
    console.error("[api/clip-queue] Error retrying clip queue item:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to retry clip queue item.");
  }
}

/**
 * GET /api/clip-queue/stats
 * Get overall clip queue stats (all sessions).
 */
async function getClipQueueStatsHandler(req: Request, res: Response): Promise<void> {
  try {
    const [pending, recording, processing, completed, failed] = await Promise.all([
      ClipQueueService.countClipQueueItems({ status: "PENDING" }),
      ClipQueueService.countClipQueueItems({ status: "RECORDING" }),
      ClipQueueService.countClipQueueItems({ status: "PROCESSING" }),
      ClipQueueService.countClipQueueItems({ status: "COMPLETED" }),
      ClipQueueService.countClipQueueItems({ status: "FAILED" }),
    ]);

    sendSuccess(res, {
      stats: {
        total: pending + recording + processing + completed + failed,
        pending,
        recording,
        processing,
        completed,
        failed,
      },
    });
  } catch (error) {
    console.error("[api/clip-queue] Error getting clip queue stats:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get clip queue stats.");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

export function createClipQueueRouter(): Router {
  const router = Router();

  // Stats endpoint
  router.get("/stats", getClipQueueStatsHandler);

  // Single item endpoints
  router.get("/:id", getClipQueueItemHandler);
  router.patch("/:id", updateClipQueueItemHandler);
  router.delete("/:id", deleteClipQueueItemHandler);
  router.post("/:id/retry", retryClipQueueItemHandler);

  return router;
}

export function createSessionClipQueueRouter(): Router {
  const router = Router({ mergeParams: true });

  // List queue items for a session
  router.get("/", listSessionClipQueueHandler);

  return router;
}

export const clipQueueRouter = createClipQueueRouter();
export const sessionClipQueueRouter = createSessionClipQueueRouter();

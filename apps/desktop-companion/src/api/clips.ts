/**
 * Clips API Routes
 *
 * REST API endpoints for clip management:
 * - List clips for a session
 * - Get clip details
 * - Delete clips
 *
 * @module api/clips
 */

import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import {
  getSessionClips,
  getClipById,
  getClipByArtifactId,
  deleteClip,
  deleteClipByArtifactId,
  countClips,
  type ClipWithDuration,
} from "../db/services/clip.service.js";
import { getSessionById } from "../db/services/session.service.js";
import { authenticateToken } from "../auth/middleware.js";
import { apiLogger } from "../logger/index.js";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const listClipsSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
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

interface ClipApiResponse {
  id: string;
  artifactId: string;
  sessionId: string;
  path: string;
  t0: number;
  t1: number;
  duration: number;
  thumbnailId: string | null;
  createdAt: string;
  updatedAt: string;
}

function transformClip(clip: ClipWithDuration): ClipApiResponse {
  return {
    id: clip.id,
    artifactId: clip.artifactId,
    sessionId: clip.sessionId,
    path: clip.path,
    t0: clip.t0,
    t1: clip.t1,
    duration: clip.duration,
    thumbnailId: clip.thumbnailId,
    createdAt: clip.createdAt.toISOString(),
    updatedAt: clip.updatedAt.toISOString(),
  };
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/sessions/:sessionId/clips
 * List all clips for a specific session.
 */
async function listSessionClipsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    const validationResult = listClipsSchema.safeParse(req.query);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { limit, offset } = validationResult.data;

    // Check if session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found.");
      return;
    }

    // Get clips for the session
    const clips = await getSessionClips(sessionId);
    const total = await countClips({ sessionId });

    // Apply pagination manually (since getSessionClips doesn't support it)
    const paginatedClips = clips.slice(offset, offset + limit);

    // Transform clips for API response
    const transformedClips = paginatedClips.map(transformClip);

    sendSuccess(res, {
      clips: transformedClips,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    apiLogger.error({ err: error }, "[api/clips] Error listing session clips");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list clips.");
  }
}

/**
 * GET /api/clips/:id
 * Get a single clip by ID or artifact ID.
 */
async function getClipHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Try to find by ID first, then by artifact ID
    let clip = await getClipById(id);
    if (!clip) {
      clip = await getClipByArtifactId(id);
    }

    if (!clip) {
      sendError(res, 404, "NOT_FOUND", "Clip not found.");
      return;
    }

    // Add duration to clip
    const clipWithDuration: ClipWithDuration = {
      ...clip,
      duration: clip.t1 - clip.t0,
    };

    sendSuccess(res, { clip: transformClip(clipWithDuration) });
  } catch (error) {
    apiLogger.error({ err: error }, "[api/clips] Error getting clip");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get clip.");
  }
}

/**
 * DELETE /api/clips/:id
 * Delete a clip by ID or artifact ID.
 */
async function deleteClipHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Try to find by ID first, then by artifact ID
    let clip = await getClipById(id);
    let deleteByArtifact = false;

    if (!clip) {
      clip = await getClipByArtifactId(id);
      deleteByArtifact = true;
    }

    if (!clip) {
      sendError(res, 404, "NOT_FOUND", "Clip not found.");
      return;
    }

    // Delete the clip
    if (deleteByArtifact) {
      await deleteClipByArtifactId(id);
    } else {
      await deleteClip(id);
    }

    sendSuccess(res, { message: "Clip deleted successfully." });
  } catch (error) {
    apiLogger.error({ err: error }, "[api/clips] Error deleting clip");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete clip.");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

export function createClipsRouter(): Router {
  const router = Router();

  // Read endpoints - no auth for development
  router.get("/:id", getClipHandler);

  // Write endpoints require authentication
  router.delete("/:id", authenticateToken, deleteClipHandler);

  return router;
}

export function createSessionClipsRouter(): Router {
  const router = Router({ mergeParams: true });

  // Read endpoints - no auth for development
  router.get("/", listSessionClipsHandler);

  return router;
}

export const clipsRouter = createClipsRouter();
export const sessionClipsRouter = createSessionClipsRouter();

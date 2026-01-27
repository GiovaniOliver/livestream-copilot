/**
 * Sessions API Routes
 *
 * REST API endpoints for session management:
 * - List sessions with filtering
 * - Get session details
 * - Update session metadata
 * - Delete sessions
 *
 * @module api/sessions
 */

import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import {
  listSessions,
  getSessionById,
  getSessionWithCounts,
  getSessionWithRelations,
  updateSession,
  deleteSession,
  type SessionWithCounts,
} from "../db/services/session.service.js";
import { listOutputs } from "../db/services/output.service.js";
import { authenticateToken, type AuthenticatedRequest } from "../auth/middleware.js";

// =============================================================================
// ACTIVE SESSION STATE
// =============================================================================

/**
 * Getter function to retrieve the current in-memory active session's database ID.
 * This is set by the main server module to allow the API to determine
 * if a session is truly "live" (both endedAt === null AND currently running).
 */
let getActiveSessionDbId: (() => string | null) | null = null;
let clearActiveSession: (() => void) | null = null;

/**
 * Set the active session getter function.
 * Called by the main server to inject the current session state.
 */
export function setActiveSessionGetter(getter: () => string | null): void {
  getActiveSessionDbId = getter;
}

/**
 * Set the active session clearer function.
 * Called by the main server to allow the API to end the in-memory session.
 */
export function setActiveSessionClearer(clearer: () => void): void {
  clearActiveSession = clearer;
}

/**
 * Check if a session is truly active (currently running in memory).
 * A session is only considered "live" if:
 * 1. It has no endedAt timestamp in the database
 * 2. It matches the currently running session in memory
 *
 * This prevents old sessions with endedAt: null (from crashes/restarts)
 * from incorrectly showing as "Live".
 */
function isSessionTrulyActive(sessionId: string, endedAt: Date | null): boolean {
  // If session has ended, it's not active
  if (endedAt !== null) {
    return false;
  }

  // If we have an active session getter, check if this session is the current one
  if (getActiveSessionDbId) {
    const activeDbId = getActiveSessionDbId();
    return activeDbId === sessionId;
  }

  // Fallback: if no getter is set, use the old behavior (endedAt === null)
  // This maintains backward compatibility
  return true;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const listSessionsSchema = z.object({
  workflow: z.string().optional(),
  captureMode: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  orderBy: z.enum(["startedAt", "createdAt", "updatedAt"]).default("startedAt"),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
});

const updateSessionSchema = z.object({
  title: z.string().max(200).optional(),
  participants: z.array(z.string()).optional(),
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
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/sessions
 * List all sessions with optional filtering.
 */
async function listSessionsHandler(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = listSessionsSchema.safeParse(req.query);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { workflow, captureMode, active, limit, offset, orderBy, orderDir } =
      validationResult.data;

    const sessions = await listSessions({
      workflow,
      captureMode,
      active,
      limit,
      offset,
      orderBy,
      orderDir,
    });

    // Transform sessions for API response
    const transformedSessions = sessions.map((session) => ({
      id: session.id,
      workflow: session.workflow,
      captureMode: session.captureMode,
      title: session.title,
      participants: session.participants,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      isActive: isSessionTrulyActive(session.id, session.endedAt),
      counts: session._count ?? { events: 0, outputs: 0, clips: 0 },
    }));

    sendSuccess(res, {
      sessions: transformedSessions,
      pagination: {
        limit,
        offset,
        total: transformedSessions.length,
      },
    });
  } catch (error) {
    console.error("[api/sessions] Error listing sessions:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list sessions.");
  }
}

/**
 * GET /api/sessions/:id
 * Get a single session by ID with optional related data.
 */
async function getSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const includeRelations = req.query.include === "relations";

    let session;
    if (includeRelations) {
      session = await getSessionWithRelations(id);
    } else {
      session = await getSessionWithCounts(id);
    }

    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found.");
      return;
    }

    // Transform for API response
    const transformedSession = {
      id: session.id,
      workflow: session.workflow,
      captureMode: session.captureMode,
      title: session.title,
      participants: session.participants,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      isActive: isSessionTrulyActive(session.id, session.endedAt),
      counts: (session as SessionWithCounts)._count ?? { events: 0, outputs: 0, clips: 0 },
      // Include relations if requested
      ...((session as any).events && { events: (session as any).events }),
      ...((session as any).outputs && { outputs: (session as any).outputs }),
      ...((session as any).clips && { clips: (session as any).clips }),
    };

    sendSuccess(res, { session: transformedSession });
  } catch (error) {
    console.error("[api/sessions] Error getting session:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get session.");
  }
}

/**
 * GET /api/sessions/:id/outputs
 * Get all outputs for a specific session.
 */
async function getSessionOutputsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if session exists first
    const session = await getSessionById(id);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found.");
      return;
    }

    const outputs = await listOutputs({ sessionId: id });
    sendSuccess(res, { outputs });
  } catch (error) {
    console.error("[api/sessions] Error getting session outputs:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get session outputs.");
  }
}

/**
 * PATCH /api/sessions/:id
 * Update session metadata.
 */
async function updateSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const validationResult = updateSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    // Check if session exists
    const existing = await getSessionById(id);
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Session not found.");
      return;
    }

    const updatedSession = await updateSession(id, validationResult.data);

    sendSuccess(res, {
      session: {
        id: updatedSession.id,
        workflow: updatedSession.workflow,
        captureMode: updatedSession.captureMode,
        title: updatedSession.title,
        participants: updatedSession.participants,
        startedAt: updatedSession.startedAt?.toISOString() ?? null,
        endedAt: updatedSession.endedAt?.toISOString() ?? null,
        createdAt: updatedSession.createdAt.toISOString(),
        updatedAt: updatedSession.updatedAt.toISOString(),
        isActive: isSessionTrulyActive(updatedSession.id, updatedSession.endedAt),
      },
    });
  } catch (error) {
    console.error("[api/sessions] Error updating session:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update session.");
  }
}

/**
 * POST /api/sessions/:id/end
 * End a session by ID (mark as ended in database).
 * This allows ending sessions that are showing as "live" in the database
 * even if they're not the current in-memory session.
 */
async function endSessionByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if session exists
    const existing = await getSessionById(id);
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Session not found.");
      return;
    }

    // Check if already ended
    if (existing.endedAt !== null) {
      sendError(res, 400, "ALREADY_ENDED", "Session is already ended.");
      return;
    }

    // End the session by setting endedAt and status
    const endedAt = new Date();
    const updatedSession = await updateSession(id, {
      endedAt,
      status: "completed",
    });

    // Calculate duration if startedAt exists
    const durationMs = existing.startedAt
      ? endedAt.getTime() - existing.startedAt.getTime()
      : 0;

    // IMPORTANT: Clear in-memory session if it matches the one we just ended
    if (clearActiveSession && getActiveSessionDbId) {
      if (getActiveSessionDbId() === id) {
        clearActiveSession();
      }
    }

    sendSuccess(res, {
      session: {
        id: updatedSession.id,
        workflow: updatedSession.workflow,
        captureMode: updatedSession.captureMode,
        title: updatedSession.title,
        participants: updatedSession.participants,
        startedAt: updatedSession.startedAt?.toISOString() ?? null,
        endedAt: updatedSession.endedAt?.toISOString() ?? null,
        createdAt: updatedSession.createdAt.toISOString(),
        updatedAt: updatedSession.updatedAt.toISOString(),
        isActive: false,
        duration: durationMs,
      },
      message: "Session ended successfully.",
    });
  } catch (error) {
    console.error("[api/sessions] Error ending session:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to end session.");
  }
}

/**
 * DELETE /api/sessions/:id
 * Delete a session and all related data.
 */
async function deleteSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if session exists
    const existing = await getSessionById(id);
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Session not found.");
      return;
    }

    // Check if this is the currently active session
    const isCurrentlyActive = isSessionTrulyActive(existing.id, existing.endedAt);
    if (isCurrentlyActive) {
      sendError(res, 400, "SESSION_ACTIVE", "Cannot delete an active session. End it first.");
      return;
    }

    // For sessions with endedAt === null but not currently running,
    // we should still allow deletion (these are orphaned sessions from crashes)
    // The isSessionTrulyActive check above handles this case

    await deleteSession(id);

    sendSuccess(res, { message: "Session deleted successfully." });
  } catch (error) {
    console.error("[api/sessions] Error deleting session:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete session.");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

export function createSessionsRouter(): Router {
  const router = Router();

  // Read endpoints - no auth for development
  router.get("/", listSessionsHandler);
  router.get("/:id", getSessionHandler);
  router.get("/:id/outputs", getSessionOutputsHandler);

  // Write endpoints require authentication
  router.patch("/:id", authenticateToken, updateSessionHandler);
  router.post("/:id/end", authenticateToken, endSessionByIdHandler);
  router.delete("/:id", authenticateToken, deleteSessionHandler);

  return router;
}

export const sessionsRouter = createSessionsRouter();

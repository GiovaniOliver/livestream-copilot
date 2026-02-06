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
import rateLimit from "express-rate-limit";
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
import { logger } from "../logger/index.js";

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
// RATE LIMITERS
// =============================================================================

/**
 * Rate limiter for session list endpoint - prevents data scraping
 * - 30 requests per minute per IP
 * - Protects against DoS and bulk data extraction
 */
const sessionListRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // 30 requests per window
  message: "Too many session list requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Rate limiter for individual session access
 * - 100 requests per minute per IP
 * - More permissive than list endpoint
 */
const sessionReadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many session requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * UUID validation regex
 * Validates standard UUID v4 format used by Prisma
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sessionIdSchema = z.string().regex(UUID_REGEX, "Invalid session ID format");

const listSessionsSchema = z.object({
  workflow: z.string().max(100).optional(),
  captureMode: z.string().max(50).optional(),
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

const getSessionOutputsSchema = z.object({
  category: z.string().max(50).optional(),
  status: z.enum(["draft", "approved", "published", "archived"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const updateSessionSchema = z.object({
  title: z.string().max(200).optional(),
  participants: z.array(z.string().max(100)).max(50).optional(),
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
 *
 * Security features:
 * - Rate limited to prevent data scraping (30 req/min)
 * - Input validation with max lengths
 * - Secure error handling without stack trace exposure
 * - Pagination enforced with reasonable limits
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
    logger.error({ err: error }, "[api/sessions] Error listing sessions");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list sessions.");
  }
}

/**
 * GET /api/sessions/:id
 * Get a single session by ID with optional related data.
 *
 * Security features:
 * - UUID format validation before database query
 * - Rate limited to prevent abuse
 * - Secure error handling
 * - Input sanitization
 */
async function getSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate session ID format
    const idValidation = sessionIdSchema.safeParse(id);
    if (!idValidation.success) {
      sendError(res, 400, "INVALID_SESSION_ID", "Invalid session ID format.");
      return;
    }

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
    logger.error({ err: error, sessionId: req.params.id }, "[api/sessions] Error getting session");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get session.");
  }
}

/**
 * GET /api/sessions/:id/outputs
 * Get all outputs for a specific session with filtering and pagination.
 *
 * Security features:
 * - UUID format validation
 * - Input validation with safe defaults
 * - Rate limiting
 * - Pagination enforced
 * - Category and status filtering with validation
 */
async function getSessionOutputsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate session ID format
    const idValidation = sessionIdSchema.safeParse(id);
    if (!idValidation.success) {
      sendError(res, 400, "INVALID_SESSION_ID", "Invalid session ID format.");
      return;
    }

    // Validate query parameters
    const validationResult = getSessionOutputsSchema.safeParse(req.query);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { category, status, limit, offset } = validationResult.data;

    // Check if session exists first
    const session = await getSessionById(id);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found.");
      return;
    }

    // Get outputs with filtering
    const outputs = await listOutputs({
      sessionId: id,
      category,
      status: status as "draft" | "approved" | "published" | "archived" | undefined,
      limit,
      offset,
    });

    // Transform outputs for API response
    const transformedOutputs = outputs.map((output) => ({
      id: output.id,
      sessionId: output.sessionId,
      category: output.category,
      title: output.title,
      text: output.text,
      refs: output.refs,
      meta: output.meta as Record<string, unknown> | null,
      status: output.status,
      createdAt: output.createdAt.toISOString(),
      updatedAt: output.updatedAt.toISOString(),
    }));

    sendSuccess(res, {
      outputs: transformedOutputs,
      pagination: {
        limit,
        offset,
        total: transformedOutputs.length,
      },
    });
  } catch (error) {
    logger.error(
      { err: error, sessionId: req.params.id },
      "[api/sessions] Error getting session outputs"
    );
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get session outputs.");
  }
}

/**
 * PATCH /api/sessions/:id
 * Update session metadata.
 *
 * Security features:
 * - Requires authentication
 * - UUID format validation
 * - Input sanitization with max lengths
 * - Existence check before update
 */
async function updateSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate session ID format
    const idValidation = sessionIdSchema.safeParse(id);
    if (!idValidation.success) {
      sendError(res, 400, "INVALID_SESSION_ID", "Invalid session ID format.");
      return;
    }

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

    logger.info(
      { sessionId: id, updates: Object.keys(validationResult.data) },
      "[api/sessions] Session updated"
    );

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
    logger.error({ err: error, sessionId: req.params.id }, "[api/sessions] Error updating session");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update session.");
  }
}

/**
 * POST /api/sessions/:id/end
 * End a session by ID (mark as ended in database).
 * This allows ending sessions that are showing as "live" in the database
 * even if they're not the current in-memory session.
 *
 * Security features:
 * - Requires authentication
 * - UUID format validation
 * - Idempotency check (already ended)
 * - Audit logging
 */
async function endSessionByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate session ID format
    const idValidation = sessionIdSchema.safeParse(id);
    if (!idValidation.success) {
      sendError(res, 400, "INVALID_SESSION_ID", "Invalid session ID format.");
      return;
    }

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

    logger.info({ sessionId: id, durationMs }, "[api/sessions] Session ended");

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
    logger.error({ err: error, sessionId: req.params.id }, "[api/sessions] Error ending session");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to end session.");
  }
}

/**
 * DELETE /api/sessions/:id
 * Delete a session and all related data.
 *
 * Security features:
 * - Requires authentication
 * - UUID format validation
 * - Active session protection
 * - Audit logging for deletion
 * - Cascading deletion handled by database constraints
 */
async function deleteSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate session ID format
    const idValidation = sessionIdSchema.safeParse(id);
    if (!idValidation.success) {
      sendError(res, 400, "INVALID_SESSION_ID", "Invalid session ID format.");
      return;
    }

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

    logger.info(
      { sessionId: id, workflow: existing.workflow },
      "[api/sessions] Session deleted"
    );

    sendSuccess(res, { message: "Session deleted successfully." });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.id }, "[api/sessions] Error deleting session");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete session.");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

/**
 * Creates the sessions router with all endpoints.
 *
 * Security considerations:
 * - Read endpoints have rate limiting but no auth (for development/demo)
 * - In production, consider adding authentication to read endpoints
 * - Write endpoints always require authentication
 * - All endpoints have input validation and sanitization
 * - UUID format validation prevents injection attacks
 * - Rate limiting prevents DoS and data scraping
 *
 * TODO: Enable authentication on read endpoints for production deployment
 */
export function createSessionsRouter(): Router {
  const router = Router();

  // Read endpoints - rate limited, no auth for development
  // SECURITY: In production, add authenticateToken middleware
  router.get("/", sessionListRateLimiter, listSessionsHandler);
  router.get("/:id", sessionReadRateLimiter, getSessionHandler);
  router.get("/:id/outputs", sessionReadRateLimiter, getSessionOutputsHandler);

  // Write endpoints require authentication
  router.patch("/:id", authenticateToken, updateSessionHandler);
  router.post("/:id/end", authenticateToken, endSessionByIdHandler);
  router.delete("/:id", authenticateToken, deleteSessionHandler);

  return router;
}

export const sessionsRouter = createSessionsRouter();

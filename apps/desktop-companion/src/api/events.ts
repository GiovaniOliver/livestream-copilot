/**
 * Events API Routes
 *
 * REST API endpoints for event management:
 * - List events with filtering by type (e.g., MOMENT_MARKER)
 * - Get event by ID
 * - Create moment markers
 *
 * @module api/events
 */

import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import {
  listEvents,
  getEventById,
  createEvent,
  countEvents,
  type EventFilters,
} from "../db/services/event.service.js";
import { getSessionById } from "../db/services/session.service.js";
import { authenticateToken } from "../auth/middleware.js";

import { apiLogger } from '../logger/index.js';
// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const listEventsSchema = z.object({
  sessionId: z.string().optional(),
  type: z.string().optional(),
  types: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",") : undefined)),
  afterTs: z
    .string()
    .optional()
    .transform((val) => (val ? BigInt(val) : undefined)),
  beforeTs: z
    .string()
    .optional()
    .transform((val) => (val ? BigInt(val) : undefined)),
  limit: z.coerce.number().int().positive().max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
});

const createMomentSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  type: z
    .enum(["hype", "qa", "sponsor", "clip", "highlight", "marker"])
    .default("marker"),
  label: z.string().min(1, "label is required").max(200),
  description: z.string().max(1000).optional(),
  timestamp: z.number().nonnegative("timestamp must be non-negative"),
  clipId: z.string().optional(),
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

/**
 * Transform event for API response
 */
function transformEvent(event: {
  id: string;
  sessionId: string;
  type: string;
  payload: unknown;
  ts: bigint;
  traceId: string | null;
  spanId: string | null;
  createdAt: Date;
}) {
  return {
    id: event.id,
    sessionId: event.sessionId,
    type: event.type,
    payload: event.payload,
    ts: event.ts.toString(),
    timestamp: Number(event.ts),
    traceId: event.traceId,
    spanId: event.spanId,
    createdAt: event.createdAt.toISOString(),
  };
}

/**
 * Transform moment event payload to moment format
 */
function transformMomentEvent(event: {
  id: string;
  sessionId: string;
  type: string;
  payload: unknown;
  ts: bigint;
  createdAt: Date;
}) {
  const payload = event.payload as {
    momentType?: string;
    type?: string;
    label?: string;
    description?: string;
    timestamp?: number;
    clipId?: string;
  };

  return {
    id: event.id,
    sessionId: event.sessionId,
    type: payload.momentType || payload.type || "marker",
    label: payload.label || "Moment",
    description: payload.description,
    timestamp: payload.timestamp ?? Math.floor(Number(event.ts) / 1000),
    clipId: payload.clipId,
    createdAt: event.createdAt.toISOString(),
  };
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/events
 * List events with optional filtering.
 */
async function listEventsHandler(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = listEventsSchema.safeParse(req.query);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { sessionId, type, types, afterTs, beforeTs, limit, offset, orderDir } =
      validationResult.data;

    const filters: EventFilters = {
      sessionId,
      type,
      types,
      afterTs,
      beforeTs,
      limit,
      offset,
      orderDir,
    };

    const events = await listEvents(filters);
    const total = await countEvents({ sessionId, type });

    sendSuccess(res, {
      events: events.map(transformEvent),
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    apiLogger.error({ err: error }, "[api/events] Error listing events");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list events.");
  }
}

/**
 * GET /api/events/moments
 * List moment marker events for a session.
 * Convenience endpoint that filters for MOMENT_MARKER type.
 */
async function listMomentsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, limit = 100, offset = 0 } = req.query;

    if (!sessionId || typeof sessionId !== "string") {
      sendError(res, 400, "VALIDATION_ERROR", "sessionId query parameter is required");
      return;
    }

    // Verify session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found");
      return;
    }

    const events = await listEvents({
      sessionId,
      type: "MOMENT_MARKER",
      limit: Number(limit),
      offset: Number(offset),
      orderDir: "asc",
    });

    const total = await countEvents({ sessionId, type: "MOMENT_MARKER" });

    const moments = events.map(transformMomentEvent);

    sendSuccess(res, {
      moments,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total,
      },
    });
  } catch (error) {
    apiLogger.error({ err: error }, "[api/events] Error listing moments");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list moments.");
  }
}

/**
 * GET /api/events/:id
 * Get a single event by ID.
 */
async function getEventHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const event = await getEventById(id);
    if (!event) {
      sendError(res, 404, "NOT_FOUND", "Event not found.");
      return;
    }

    sendSuccess(res, { event: transformEvent(event) });
  } catch (error) {
    apiLogger.error({ err: error }, "[api/events] Error getting event");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get event.");
  }
}

/**
 * POST /api/events/moments
 * Create a new moment marker event.
 */
async function createMomentHandler(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = createMomentSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { sessionId, type, label, description, timestamp, clipId } =
      validationResult.data;

    // Verify session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found");
      return;
    }

    // Create moment event
    const event = await createEvent({
      sessionId,
      type: "MOMENT_MARKER",
      ts: BigInt(Date.now()),
      payload: {
        momentType: type,
        label,
        description,
        timestamp,
        clipId,
      },
    });

    const moment = transformMomentEvent(event);

    sendSuccess(res, { moment }, 201);
  } catch (error) {
    apiLogger.error({ err: error }, "[api/events] Error creating moment");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create moment.");
  }
}

// =============================================================================
// SESSION-SCOPED ROUTES
// =============================================================================

/**
 * GET /api/sessions/:sessionId/events
 * List events for a specific session.
 */
async function getSessionEventsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const { type, limit = 100, offset = 0 } = req.query;

    // Verify session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found");
      return;
    }

    const filters: EventFilters = {
      sessionId,
      type: typeof type === "string" ? type : undefined,
      limit: Number(limit),
      offset: Number(offset),
      orderDir: "asc",
    };

    const events = await listEvents(filters);
    const total = await countEvents({
      sessionId,
      type: typeof type === "string" ? type : undefined,
    });

    sendSuccess(res, {
      events: events.map(transformEvent),
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total,
      },
    });
  } catch (error) {
    apiLogger.error({ err: error }, "[api/events] Error getting session events");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get session events.");
  }
}

/**
 * GET /api/sessions/:sessionId/moments
 * List moment markers for a specific session.
 */
async function getSessionMomentsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Verify session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found");
      return;
    }

    const events = await listEvents({
      sessionId,
      type: "MOMENT_MARKER",
      limit: Number(limit),
      offset: Number(offset),
      orderDir: "asc",
    });

    const total = await countEvents({ sessionId, type: "MOMENT_MARKER" });
    const moments = events.map(transformMomentEvent);

    sendSuccess(res, {
      moments,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total,
      },
    });
  } catch (error) {
    apiLogger.error({ err: error }, "[api/events] Error getting session moments");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get session moments.");
  }
}

/**
 * POST /api/sessions/:sessionId/moments
 * Create a moment marker for a specific session.
 */
async function createSessionMomentHandler(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    // Add sessionId to body for validation
    const bodyWithSessionId = { ...req.body, sessionId };

    const validationResult = createMomentSchema.safeParse(bodyWithSessionId);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { type, label, description, timestamp, clipId } = validationResult.data;

    // Verify session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found");
      return;
    }

    // Create moment event
    const event = await createEvent({
      sessionId,
      type: "MOMENT_MARKER",
      ts: BigInt(Date.now()),
      payload: {
        momentType: type,
        label,
        description,
        timestamp,
        clipId,
      },
    });

    const moment = transformMomentEvent(event);

    sendSuccess(res, { moment }, 201);
  } catch (error) {
    apiLogger.error({ err: error }, "[api/events] Error creating session moment");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create moment.");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

export function createEventsRouter(): Router {
  const router = Router();

  // Read endpoints - no auth for development
  router.get("/", listEventsHandler);
  router.get("/moments", listMomentsHandler);
  router.get("/:id", getEventHandler);

  // Write endpoints require authentication
  router.post("/moments", authenticateToken, createMomentHandler);

  return router;
}

export function createSessionEventsRouter(): Router {
  const router = Router({ mergeParams: true });

  // Read endpoints - no auth for development
  router.get("/", getSessionEventsHandler);
  router.get("/moments", getSessionMomentsHandler);

  // Write endpoints require authentication
  router.post("/moments", authenticateToken, createSessionMomentHandler);

  return router;
}

export const eventsRouter = createEventsRouter();
export const sessionEventsRouter = createSessionEventsRouter();

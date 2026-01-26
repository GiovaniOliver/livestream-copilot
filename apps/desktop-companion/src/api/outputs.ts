/**
 * Outputs API Routes
 *
 * REST API endpoints for output (post draft) management:
 * - Get single output
 * - Update output (for editing posts)
 * - Delete output
 * - Batch update status
 *
 * @module api/outputs
 */

import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import {
  getOutputById,
  getOutputWithSession,
  updateOutput,
  updateOutputStatus,
  deleteOutput,
  listOutputs,
  approveAllDrafts,
  countOutputs,
  type OutputStatus,
} from "../db/services/output.service.js";
import { getSessionById } from "../db/services/session.service.js";
import { authenticateToken } from "../auth/middleware.js";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateOutputSchema = z.object({
  title: z.string().max(500).optional(),
  text: z.string().max(10000).optional(),
  refs: z.array(z.string()).optional(),
  meta: z.record(z.unknown()).optional(),
  status: z.enum(["draft", "approved", "published", "archived"]).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["draft", "approved", "published", "archived"]),
});

const listOutputsSchema = z.object({
  sessionId: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["draft", "approved", "published", "archived"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  orderBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
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

interface OutputApiResponse {
  id: string;
  sessionId: string;
  category: string;
  title: string | null;
  text: string;
  refs: string[];
  meta: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function transformOutput(output: {
  id: string;
  sessionId: string;
  category: string;
  title: string | null;
  text: string;
  refs: string[];
  meta: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): OutputApiResponse {
  return {
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
  };
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/outputs
 * List outputs with optional filtering.
 */
async function listOutputsHandler(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = listOutputsSchema.safeParse(req.query);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { sessionId, category, status, limit, offset, orderBy, orderDir } =
      validationResult.data;

    const outputs = await listOutputs({
      sessionId,
      category,
      status: status as OutputStatus | undefined,
      limit,
      offset,
      orderBy,
      orderDir,
    });

    const total = await countOutputs({ sessionId, category, status: status as OutputStatus | undefined });

    // Transform outputs for API response
    const transformedOutputs = outputs.map(transformOutput);

    sendSuccess(res, {
      outputs: transformedOutputs,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    console.error("[api/outputs] Error listing outputs:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list outputs.");
  }
}

/**
 * GET /api/outputs/:id
 * Get a single output by ID.
 */
async function getOutputHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const output = await getOutputWithSession(id);

    if (!output) {
      sendError(res, 404, "NOT_FOUND", "Output not found.");
      return;
    }

    const transformedOutput = {
      ...transformOutput(output),
      session: {
        id: output.session.id,
        workflow: output.session.workflow,
        title: output.session.title,
      },
    };

    sendSuccess(res, { output: transformedOutput });
  } catch (error) {
    console.error("[api/outputs] Error getting output:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get output.");
  }
}

/**
 * PATCH /api/outputs/:id
 * Update output content and metadata.
 */
async function updateOutputHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const validationResult = updateOutputSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    // Check if output exists
    const existing = await getOutputById(id);
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Output not found.");
      return;
    }

    const updatedOutput = await updateOutput(id, {
      ...validationResult.data,
      status: validationResult.data.status as OutputStatus | undefined,
    });

    sendSuccess(res, { output: transformOutput(updatedOutput) });
  } catch (error) {
    console.error("[api/outputs] Error updating output:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update output.");
  }
}

/**
 * PATCH /api/outputs/:id/status
 * Update only the output status.
 */
async function updateOutputStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const validationResult = updateStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    // Check if output exists
    const existing = await getOutputById(id);
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Output not found.");
      return;
    }

    const updatedOutput = await updateOutputStatus(id, validationResult.data.status as OutputStatus);

    sendSuccess(res, { output: transformOutput(updatedOutput) });
  } catch (error) {
    console.error("[api/outputs] Error updating output status:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update output status.");
  }
}

/**
 * DELETE /api/outputs/:id
 * Delete an output.
 */
async function deleteOutputHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if output exists
    const existing = await getOutputById(id);
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Output not found.");
      return;
    }

    await deleteOutput(id);

    sendSuccess(res, { message: "Output deleted successfully." });
  } catch (error) {
    console.error("[api/outputs] Error deleting output:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete output.");
  }
}

/**
 * POST /api/sessions/:sessionId/outputs/approve-all
 * Approve all draft outputs for a session.
 */
async function approveAllDraftsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    // Check if session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, 404, "NOT_FOUND", "Session not found.");
      return;
    }

    const count = await approveAllDrafts(sessionId);

    sendSuccess(res, {
      message: `Approved ${count} draft(s).`,
      count,
    });
  } catch (error) {
    console.error("[api/outputs] Error approving all drafts:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to approve drafts.");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

export function createOutputsRouter(): Router {
  const router = Router();

  // Read endpoints - no auth for development
  router.get("/", listOutputsHandler);
  router.get("/:id", getOutputHandler);

  // Write endpoints require authentication
  router.patch("/:id", authenticateToken, updateOutputHandler);
  router.patch("/:id/status", authenticateToken, updateOutputStatusHandler);
  router.delete("/:id", authenticateToken, deleteOutputHandler);

  return router;
}

export function createSessionOutputsRouter(): Router {
  const router = Router({ mergeParams: true });

  // All endpoints require authentication
  router.post("/approve-all", authenticateToken, approveAllDraftsHandler);

  return router;
}

export const outputsRouter = createOutputsRouter();
export const sessionOutputsRouter = createSessionOutputsRouter();

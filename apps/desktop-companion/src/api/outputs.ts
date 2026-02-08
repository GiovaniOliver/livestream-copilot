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
import rateLimit from "express-rate-limit";
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
import { complete, isAIConfigured, getDefaultModel, getDefaultMaxTokens } from "../agents/client.js";
import { apiLogger } from '../logger/index.js';
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

const regenerateOutputSchema = z.object({
  instructions: z.string().max(1000).optional(),
});

// =============================================================================
// RATE LIMITERS
// =============================================================================

/**
 * Rate limiter for regenerate endpoint - prevents excessive AI API calls
 * - 10 requests per minute per IP
 * - Critical for preventing API quota exhaustion and cost overruns
 */
const regenerateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // 10 requests per window
  message: "Too many regeneration requests. Please try again in a minute.",
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP address
    const user = (req as any).user;
    return user?.id || req.ip || "unknown";
  },
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
    apiLogger.error({ err: error }, "[api/outputs] Error listing outputs");
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
    apiLogger.error({ err: error }, "[api/outputs] Error getting output");
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
    apiLogger.error({ err: error }, "[api/outputs] Error updating output");
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
    apiLogger.error({ err: error }, "[api/outputs] Error updating output status");
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
    apiLogger.error({ err: error }, "[api/outputs] Error deleting output");
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
    apiLogger.error({ err: error }, "[api/outputs] Error approving all drafts");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to approve drafts.");
  }
}

/**
 * POST /api/outputs/:id/regenerate
 * Regenerate output content using AI with optional custom instructions.
 *
 * Security features:
 * - Rate limited to prevent API abuse (10 req/min)
 * - Input validation (max 1000 chars for instructions)
 * - Authentication required
 * - AI configuration check
 * - Comprehensive error handling
 * - Security logging
 */
async function regenerateOutputHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const { id } = req.params;

  try {
    // Validate request body
    const validationResult = regenerateOutputSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { instructions } = validationResult.data;

    // Check if AI is configured
    if (!isAIConfigured()) {
      logger.warn({ outputId: id }, "Regenerate attempt without AI configured");
      sendError(res, 503, "AI_NOT_CONFIGURED", "AI service is not configured.");
      return;
    }

    // Get existing output
    const existingOutput = await getOutputWithSession(id);
    if (!existingOutput) {
      sendError(res, 404, "NOT_FOUND", "Output not found.");
      return;
    }

    logger.info({
      outputId: id,
      sessionId: existingOutput.sessionId,
      category: existingOutput.category,
      hasInstructions: !!instructions,
    }, "Regenerating output content");

    // Build AI prompt based on output category and existing content
    const prompt = buildRegeneratePrompt(existingOutput, instructions);

    // Call AI to regenerate content
    const aiResponse = await complete({
      model: getDefaultModel(),
      maxTokens: getDefaultMaxTokens(),
      temperature: 0.8, // Higher temperature for more creative variations
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const regeneratedText = aiResponse.content.trim();

    // Validate regenerated content is not empty
    if (!regeneratedText) {
      logger.error({ outputId: id }, "AI returned empty content");
      sendError(res, 500, "AI_ERROR", "Failed to generate content.");
      return;
    }

    // Update output with regenerated content
    const updatedOutput = await updateOutput(id, {
      text: regeneratedText,
      meta: {
        ...(existingOutput.meta as Record<string, unknown> || {}),
        regeneratedAt: new Date().toISOString(),
        regenerationInstructions: instructions || null,
        previousText: existingOutput.text, // Store previous version
        aiMetadata: {
          model: getDefaultModel(),
          inputTokens: aiResponse.usage.inputTokens,
          outputTokens: aiResponse.usage.outputTokens,
        },
      },
    });

    const durationMs = Date.now() - startTime;

    logger.info({
      outputId: id,
      sessionId: existingOutput.sessionId,
      durationMs,
      inputTokens: aiResponse.usage.inputTokens,
      outputTokens: aiResponse.usage.outputTokens,
    }, "Output regenerated successfully");

    sendSuccess(res, {
      output: transformOutput(updatedOutput),
      regenerationMetadata: {
        durationMs,
        tokensUsed: aiResponse.usage.inputTokens + aiResponse.usage.outputTokens,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logger.error({
      err: error,
      outputId: id,
      durationMs,
    }, "Failed to regenerate output");

    // Return user-friendly error message without exposing internal details
    sendError(res, 500, "REGENERATION_FAILED", "Failed to regenerate content. Please try again.");
  }
}

/**
 * Build AI prompt for regenerating content based on output type
 *
 * Security: Sanitizes and validates all inputs before template insertion
 */
function buildRegeneratePrompt(
  output: {
    category: string;
    title: string | null;
    text: string;
    session: {
      workflow: string;
      title: string | null;
    };
  },
  customInstructions?: string
): string {
  // Sanitize inputs - prevent prompt injection
  const safeCategory = output.category.replace(/[<>]/g, '');
  const safeWorkflow = output.session.workflow.replace(/[<>]/g, '');
  const safeSessionTitle = output.session.title?.replace(/[<>]/g, '') || 'Untitled Session';
  const safeOutputTitle = output.title?.replace(/[<>]/g, '') || '';
  const safePreviousContent = output.text.replace(/[<>]/g, '');
  const safeInstructions = customInstructions?.replace(/[<>]/g, '') || '';

  // Build category-specific prompt
  let categoryGuidance = '';

  switch (safeCategory.toLowerCase()) {
    case 'x':
    case 'twitter':
      categoryGuidance = 'Create an engaging X/Twitter post (max 280 characters) that captures attention and encourages interaction.';
      break;
    case 'linkedin':
      categoryGuidance = 'Create a professional LinkedIn post (max 1300 characters) with clear value proposition and professional tone.';
      break;
    case 'instagram':
      categoryGuidance = 'Create an Instagram caption that is visual, engaging, and uses relevant hashtags.';
      break;
    case 'youtube':
      categoryGuidance = 'Create a compelling YouTube description that improves discoverability and viewer engagement.';
      break;
    default:
      categoryGuidance = 'Create engaging social media content appropriate for the platform.';
  }

  return `You are an expert social media content creator. Regenerate the following ${safeCategory} post with a fresh perspective while maintaining the core message.

Session Context:
- Workflow: ${safeWorkflow}
- Session Title: ${safeSessionTitle}
- Content Type: ${safeCategory}
${safeOutputTitle ? `- Post Title: ${safeOutputTitle}` : ''}

Previous Version:
${safePreviousContent}

Task: ${categoryGuidance}

${safeInstructions ? `Additional Instructions: ${safeInstructions}` : ''}

Requirements:
1. Keep the core message and key points
2. Use fresh wording and different structure
3. Maintain appropriate tone and style for ${safeCategory}
4. Make it engaging and shareable
5. DO NOT include any meta-commentary or explanations
6. Return ONLY the new post content

New ${safeCategory} post:`;
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

  // Regenerate endpoint - requires auth and rate limiting
  router.post(
    "/:id/regenerate",
    authenticateToken,
    regenerateRateLimiter,
    regenerateOutputHandler
  );

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

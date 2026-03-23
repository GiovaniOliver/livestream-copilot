/**
 * Post Routes
 *
 * Bridges persisted SOCIAL_POST outputs into an authenticated post-oriented API
 * for review and publish actions.
 */

import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import { authenticateToken, type AuthenticatedRequest } from "../auth/middleware.js";
import {
  getOutputById,
  updateOutput,
  updateOutputStatus,
  deleteOutput,
  type OutputStatus,
} from "../db/services/output.service.js";
import * as SocialService from "../social/service.js";

import { logger } from "../logger/index.js";

const postsLogger = logger.child({ module: "api/posts" });

const updatePostSchema = z.object({
  title: z.string().max(500).optional(),
  text: z.string().min(1).max(10000).optional(),
  platform: z.string().min(1).max(50).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const publishPostSchema = z.object({
  connectionId: z.string().min(1),
  platform: z.string().min(1).max(50).optional(),
  text: z.string().min(1).max(10000).optional(),
  title: z.string().max(500).optional(),
  hashtags: z.array(z.string().min(1).max(100)).max(30).optional(),
  visibility: z.enum(["public", "private", "unlisted"]).optional(),
});

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
  scheduledFor?: string;
}

type LookupError = {
  statusCode: number;
  code: string;
  message: string;
};

type SocialPostOutput = NonNullable<Awaited<ReturnType<typeof getOutputById>>>;

type SocialPostLookupResult =
  | { output: SocialPostOutput }
  | { error: LookupError };

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
  const messages = error.errors.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  sendError(res, 400, "VALIDATION_ERROR", messages.join("; "));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePlatform(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  switch (normalized) {
    case "x":
    case "twitter":
    case "x_post":
      return "twitter";
    case "linkedin":
      return "linkedin";
    case "instagram":
      return "instagram";
    case "youtube":
      return "youtube";
    case "tiktok":
      return "tiktok";
    case "facebook":
      return "facebook";
    case "threads":
      return "threads";
    case "bluesky":
      return "bluesky";
    default:
      return normalized;
  }
}

function transformPostOutput(output: {
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
  const meta = isRecord(output.meta) ? output.meta : null;
  const scheduledFor =
    typeof meta?.scheduledFor === "string" ? meta.scheduledFor : undefined;

  return {
    id: output.id,
    sessionId: output.sessionId,
    category: output.category,
    title: output.title,
    text: output.text,
    refs: output.refs,
    meta,
    status: output.status,
    createdAt: output.createdAt.toISOString(),
    updatedAt: output.updatedAt.toISOString(),
    ...(scheduledFor ? { scheduledFor } : {}),
  };
}

async function getSocialPostOutput(id: string): Promise<SocialPostLookupResult> {
  const output = await getOutputById(id);

  if (!output) {
    return { error: { statusCode: 404, code: "NOT_FOUND", message: "Post not found." } };
  }

  if (output.category !== "SOCIAL_POST") {
    return {
      error: {
        statusCode: 400,
        code: "INVALID_POST_OUTPUT",
        message: "Only SOCIAL_POST outputs can be mutated through the posts API.",
      },
    };
  }

  if (output.status === "archived") {
    return {
      error: {
        statusCode: 409,
        code: "POST_ARCHIVED",
        message: "Archived posts cannot be changed or published.",
      },
    };
  }

  return { output };
}

function hasLookupError(result: SocialPostLookupResult): result is { error: LookupError } {
  return "error" in result;
}

async function approvePostHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await getSocialPostOutput(id);

    if (hasLookupError(result)) {
      sendError(res, result.error.statusCode, result.error.code, result.error.message);
      return;
    }

    const output =
      result.output.status === "approved"
        ? result.output
        : await updateOutputStatus(id, "approved");

    const transformed = transformPostOutput(output);
    sendSuccess(res, {
      message: "Post approved.",
      post: transformed,
      output: transformed,
    });
  } catch (error) {
    postsLogger.error({ err: error }, "Failed to approve post");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to approve post.");
  }
}

async function updatePostHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const validationResult = updatePostSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const result = await getSocialPostOutput(id);
    if (hasLookupError(result)) {
      sendError(res, result.error.statusCode, result.error.code, result.error.message);
      return;
    }

    const existingMeta = isRecord(result.output.meta) ? result.output.meta : {};
    const normalizedPlatform = normalizePlatform(validationResult.data.platform);

    const updatedOutput = await updateOutput(id, {
      title: validationResult.data.title,
      text: validationResult.data.text,
      meta:
        validationResult.data.meta !== undefined || normalizedPlatform !== null
          ? {
              ...existingMeta,
              ...(validationResult.data.meta ?? {}),
              ...(normalizedPlatform ? { platform: normalizedPlatform } : {}),
            }
          : undefined,
    });

    const transformed = transformPostOutput(updatedOutput);
    sendSuccess(res, {
      message: "Post updated.",
      post: transformed,
      output: transformed,
    });
  } catch (error) {
    postsLogger.error({ err: error }, "Failed to update post");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update post.");
  }
}

async function publishPostHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).user;

    const validationResult = publishPostSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const result = await getSocialPostOutput(id);
    if (hasLookupError(result)) {
      sendError(res, result.error.statusCode, result.error.code, result.error.message);
      return;
    }

    const output = result.output;
    const existingMeta = isRecord(output.meta) ? output.meta : {};
    const connection = await SocialService.getConnection(
      validationResult.data.connectionId,
      user.id
    );

    if (!connection) {
      sendError(
        res,
        404,
        "CONNECTION_NOT_FOUND",
        "The selected social connection was not found for this user."
      );
      return;
    }

    if (!connection.isActive) {
      sendError(
        res,
        409,
        "CONNECTION_INACTIVE",
        "The selected social connection is inactive. Reconnect the account before publishing."
      );
      return;
    }

    const requestedPlatform =
      normalizePlatform(validationResult.data.platform) ??
      normalizePlatform(existingMeta.platform) ??
      null;
    const connectionPlatform = normalizePlatform(connection.platform);

    if (requestedPlatform && connectionPlatform && requestedPlatform !== connectionPlatform) {
      sendError(
        res,
        409,
        "PLATFORM_MISMATCH",
        `The selected connection is for ${connectionPlatform}, but the post targets ${requestedPlatform}.`
      );
      return;
    }

    const publishText = validationResult.data.text ?? output.text;
    if (!publishText.trim()) {
      sendError(res, 400, "EMPTY_POST", "Cannot publish an empty post.");
      return;
    }

    const resolvedPlatform = requestedPlatform ?? connectionPlatform;
    const content = {
      text: publishText,
      title: validationResult.data.title ?? output.title ?? undefined,
      hashtags: validationResult.data.hashtags,
    };

    const publishResult = await SocialService.createPost(
      validationResult.data.connectionId,
      user.id,
      content,
      {
        visibility: validationResult.data.visibility,
      }
    );

    if (!publishResult.success) {
      sendError(
        res,
        409,
        "PUBLISH_FAILED",
        publishResult.error || "Publishing failed."
      );
      return;
    }

    const updatedOutput = await updateOutput(id, {
      title: validationResult.data.title ?? output.title ?? undefined,
      text: publishText,
      status: "published" satisfies OutputStatus,
      meta: {
        ...existingMeta,
        ...(resolvedPlatform ? { platform: resolvedPlatform } : {}),
        publish: {
          connectionId: validationResult.data.connectionId,
          platform: resolvedPlatform ?? connection.platform,
          platformPostId: publishResult.platformPostId ?? null,
          platformUrl: publishResult.platformUrl ?? null,
          publishedAt: (publishResult.publishedAt ?? new Date()).toISOString(),
        },
      },
    });

    const transformed = transformPostOutput(updatedOutput);
    sendSuccess(res, {
      message: "Post published.",
      post: transformed,
      output: transformed,
    });
  } catch (error) {
    postsLogger.error({ err: error }, "Failed to publish post");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to publish post.");
  }
}

async function deletePostHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await getSocialPostOutput(id);

    if (hasLookupError(result)) {
      sendError(res, result.error.statusCode, result.error.code, result.error.message);
      return;
    }

    await deleteOutput(id);
    sendSuccess(res, { message: "Post deleted." });
  } catch (error) {
    postsLogger.error({ err: error }, "Failed to delete post");
    sendError(res, 500, "INTERNAL_ERROR", "Failed to delete post.");
  }
}

export function createPostsRouter(): Router {
  const router = Router();

  router.post("/:id/approve", authenticateToken, approvePostHandler);
  router.post("/:id/publish", authenticateToken, publishPostHandler);
  router.patch("/:id", authenticateToken, updatePostHandler);
  router.delete("/:id", authenticateToken, deletePostHandler);

  return router;
}

export const postsRouter = createPostsRouter();

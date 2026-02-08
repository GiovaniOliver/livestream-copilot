/**
 * Social Media Routes
 *
 * Express router for social media integration:
 * - GET /platforms - List available platforms
 * - POST /connect - Initiate OAuth connection
 * - GET /callback - OAuth callback handler
 * - GET /connections - List user's connections
 * - DELETE /connections/:id - Disconnect account
 * - POST /post - Create a post
 * - POST /post/multi - Post to multiple platforms
 * - GET /posts - Get post history
 */

import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { authenticateToken, type AuthenticatedRequest } from '../auth/middleware.js';
import * as SocialService from './service.js';
import { SocialAPIError } from './types.js';
import { SocialPlatform } from '../generated/prisma/enums.js';
import { config } from '../config/index.js';

import { logger } from '../logger/index.js';
// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const SocialPlatformSchema = z.enum([
  'YOUTUBE',
  'TWITTER',
  'TIKTOK',
  'LINKEDIN',
  'INSTAGRAM',
  'FACEBOOK',
  'THREADS',
  'BLUESKY',
]);

const ConnectRequestSchema = z.object({
  platform: SocialPlatformSchema,
  redirectUri: z.string().url().optional(),
});

const PostContentSchema = z.object({
  text: z.string().max(10000).optional(),
  title: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  hashtags: z.array(z.string().max(100)).max(30).optional(),
  mediaFiles: z
    .array(
      z.object({
        type: z.enum(['image', 'video', 'gif']),
        path: z.string(),
        mimeType: z.string(),
        altText: z.string().max(1000).optional(),
      })
    )
    .optional(),
});

const PostOptionsSchema = z.object({
  scheduledFor: z.string().datetime().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),
  replyToId: z.string().optional(),
  threadContinuation: z.boolean().optional(),
});

const CreatePostSchema = z.object({
  connectionId: z.string().min(1),
  content: PostContentSchema,
  options: PostOptionsSchema.optional(),
});

const MultiPostSchema = z.object({
  connectionIds: z.array(z.string().min(1)).min(1).max(10),
  content: PostContentSchema,
  options: PostOptionsSchema.optional(),
});

const GetPostsQuerySchema = z.object({
  connectionId: z.string().optional(),
  platform: SocialPlatformSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

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

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/v1/social/platforms
 * Lists available social platforms and their configuration status.
 */
async function getPlatformsHandler(req: Request, res: Response): Promise<void> {
  try {
    const platforms = SocialService.getAvailablePlatforms();
    sendSuccess(res, { platforms });
  } catch (error: any) {
    logger.error({ err: error }, '[social/routes] Get platforms error');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get platforms');
  }
}

/**
 * POST /api/v1/social/connect
 * Initiates OAuth connection for a social platform.
 */
async function connectHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const validationResult = ConnectRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { platform, redirectUri } = validationResult.data;

    // Use default redirect URI if not provided
    const callbackUri =
      redirectUri ||
      `${config.APP_URL}/api/v1/social/callback`;

    const result = await SocialService.initiateConnection(
      user.id,
      platform as SocialPlatform,
      callbackUri
    );

    sendSuccess(res, result);
  } catch (error: any) {
    logger.error({ err: error }, '[social/routes] Connect error');

    if (error instanceof SocialAPIError) {
      sendError(res, error.statusCode || 400, error.code, error.message);
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to initiate connection');
  }
}

/**
 * GET /api/v1/social/callback
 * OAuth callback handler.
 */
async function callbackHandler(req: Request, res: Response): Promise<void> {
  try {
    const { state, code, error: oauthError, error_description } = req.query;

    // Handle OAuth errors
    if (oauthError) {
      const errorUrl = `${config.FRONTEND_URL}/settings/social?error=${encodeURIComponent(
        String(error_description || oauthError)
      )}`;
      res.redirect(errorUrl);
      return;
    }

    if (!state || !code) {
      res.redirect(
        `${config.FRONTEND_URL}/settings/social?error=${encodeURIComponent(
          'Missing state or code'
        )}`
      );
      return;
    }

    const connection = await SocialService.completeConnection(
      String(state),
      String(code)
    );

    // Redirect to success page
    const successUrl = `${config.FRONTEND_URL}/settings/social?connected=${connection.platform}&account=${encodeURIComponent(
      connection.accountName || connection.platformUsername || ''
    )}`;
    res.redirect(successUrl);
  } catch (error: any) {
    logger.error({ err: error }, '[social/routes] Callback error');

    const errorMessage =
      error instanceof SocialAPIError
        ? error.message
        : 'Failed to complete connection';

    res.redirect(
      `${config.FRONTEND_URL}/settings/social?error=${encodeURIComponent(errorMessage)}`
    );
  }
}

/**
 * GET /api/v1/social/connections
 * Lists user's social connections.
 */
async function getConnectionsHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const connections = await SocialService.getConnections(user.id);
    sendSuccess(res, { connections });
  } catch (error: any) {
    logger.error({ err: error }, '[social/routes] Get connections error');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get connections');
  }
}

/**
 * GET /api/v1/social/connections/:id
 * Gets a specific connection.
 */
async function getConnectionHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const connectionId = req.params.id;

    const connection = await SocialService.getConnection(connectionId, user.id);

    if (!connection) {
      sendError(res, 404, 'NOT_FOUND', 'Connection not found');
      return;
    }

    sendSuccess(res, { connection });
  } catch (error: any) {
    logger.error({ err: error }, '[social/routes] Get connection error');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get connection');
  }
}

/**
 * DELETE /api/v1/social/connections/:id
 * Disconnects a social account.
 */
async function disconnectHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const connectionId = req.params.id;

    const success = await SocialService.disconnectAccount(connectionId, user.id);

    if (!success) {
      sendError(res, 404, 'NOT_FOUND', 'Connection not found');
      return;
    }

    sendSuccess(res, { message: 'Account disconnected successfully' });
  } catch (error: any) {
    logger.error({ err: error }, '[social/routes] Disconnect error');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to disconnect account');
  }
}

/**
 * POST /api/v1/social/post
 * Creates a post on a connected platform.
 */
async function createPostHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const validationResult = CreatePostSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { connectionId, content, options } = validationResult.data;

    const result = await SocialService.createPost(
      connectionId,
      user.id,
      content,
      options
        ? {
            ...options,
            scheduledFor: options.scheduledFor
              ? new Date(options.scheduledFor)
              : undefined,
          }
        : undefined
    );

    if (result.success) {
      sendSuccess(res, result, 201);
    } else {
      sendError(res, 400, 'POST_FAILED', result.error || 'Failed to create post');
    }
  } catch (error: any) {
    logger.error({ err: error }, '[social/routes] Create post error');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create post');
  }
}

/**
 * POST /api/v1/social/post/multi
 * Creates a post on multiple platforms.
 */
async function createMultiPostHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const validationResult = MultiPostSchema.safeParse(req.body);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { connectionIds, content, options } = validationResult.data;

    const results = await SocialService.createMultiPlatformPost(
      user.id,
      connectionIds,
      content,
      options
        ? {
            ...options,
            scheduledFor: options.scheduledFor
              ? new Date(options.scheduledFor)
              : undefined,
          }
        : undefined
    );

    // Convert Map to object for JSON response
    const resultsObject: Record<string, any> = {};
    for (const [id, result] of results) {
      resultsObject[id] = result;
    }

    const successCount = Array.from(results.values()).filter((r) => r.success).length;
    const failCount = results.size - successCount;

    sendSuccess(res, {
      results: resultsObject,
      summary: {
        total: results.size,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[social/routes] Create multi-post error');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create posts');
  }
}

/**
 * GET /api/v1/social/posts
 * Gets post history.
 */
async function getPostsHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const validationResult = GetPostsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      handleValidationError(res, validationResult.error);
      return;
    }

    const { connectionId, platform, limit, offset } = validationResult.data;

    const result = await SocialService.getPostHistory(user.id, {
      connectionId,
      platform: platform as SocialPlatform | undefined,
      limit,
      offset,
    });

    sendSuccess(res, result);
  } catch (error: any) {
    logger.error({ err: error }, '[social/routes] Get posts error');
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get posts');
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

/**
 * Creates and configures the social media router.
 */
export function createSocialRouter(): Router {
  const router = Router();

  // Public routes (no auth required)
  router.get('/callback', callbackHandler);

  // Protected routes
  router.use(authenticateToken);

  // Platform information
  router.get('/platforms', getPlatformsHandler);

  // Connection management
  router.post('/connect', connectHandler);
  router.get('/connections', getConnectionsHandler);
  router.get('/connections/:id', getConnectionHandler);
  router.delete('/connections/:id', disconnectHandler);

  // Posting
  router.post('/post', createPostHandler);
  router.post('/post/multi', createMultiPostHandler);
  router.get('/posts', getPostsHandler);

  return router;
}

/**
 * Pre-configured social router.
 */
export const socialRouter = createSocialRouter();

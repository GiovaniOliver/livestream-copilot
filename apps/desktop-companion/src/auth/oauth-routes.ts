/**
 * OAuth Routes
 *
 * Express router providing OAuth authentication endpoints:
 * - Initiate OAuth flow for providers (Google, GitHub, Twitch)
 * - Handle OAuth callbacks
 * - Link OAuth accounts to existing users
 *
 * @module auth/oauth-routes
 */

import { Router, type Request, type Response } from "express";
import { authService, AuthError } from "./service.js";
import {
  generateAuthorizationUrl,
  validateState,
  exchangeCodeForTokens,
  fetchUserInfo,
  getConfiguredProviders,
  isProviderConfigured,
  type OAuthProvider,
} from "./oauth.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "./middleware.js";
import { config } from "../config/index.js";
import { prisma } from "../db/index.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "./utils.js";

import { logger } from '../logger/index.js';
// =============================================================================
// TYPES
// =============================================================================

interface OAuthCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

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

function getRedirectUri(req: Request, provider: string): string {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  return `${protocol}://${host}/api/v1/auth/oauth/${provider}/callback`;
}

function getDeviceInfo(req: Request): string | undefined {
  const userAgent = req.headers["user-agent"];
  return userAgent ? userAgent.substring(0, 200) : undefined;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/v1/auth/oauth/providers
 * Get list of configured OAuth providers.
 */
async function getProvidersHandler(req: Request, res: Response): Promise<void> {
  const providers = getConfiguredProviders();
  sendSuccess(res, { providers });
}

/**
 * GET /api/v1/auth/oauth/:provider
 * Initiate OAuth flow for a provider.
 */
async function initiateOAuthHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { provider } = req.params;

    // Validate provider
    if (!["google", "github", "twitch"].includes(provider)) {
      sendError(res, 400, "INVALID_PROVIDER", "Invalid OAuth provider");
      return;
    }

    if (!isProviderConfigured(provider as OAuthProvider)) {
      sendError(
        res,
        400,
        "PROVIDER_NOT_CONFIGURED",
        `OAuth provider ${provider} is not configured`
      );
      return;
    }

    const redirectUri = getRedirectUri(req, provider);
    const { url, state } = generateAuthorizationUrl(
      provider as OAuthProvider,
      redirectUri
    );

    // Redirect to provider
    res.redirect(url);
  } catch (error) {
    logger.error({ err: error }, "[auth/oauth] Initiate error");
    sendError(
      res,
      500,
      "OAUTH_ERROR",
      "Failed to initiate OAuth flow"
    );
  }
}

/**
 * GET /api/v1/auth/oauth/:provider/callback
 * Handle OAuth callback from provider.
 */
async function handleOAuthCallbackHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { provider } = req.params;
    const query = req.query as OAuthCallbackQuery;

    // Check for errors from provider
    if (query.error) {
      logger.error(
        `[auth/oauth] Provider error: ${query.error} - ${query.error_description}`
      );
      // Redirect to frontend with error
      const frontendUrl = config.FRONTEND_URL || "http://localhost:3000";
      res.redirect(
        `${frontendUrl}/auth/error?error=${encodeURIComponent(query.error)}`
      );
      return;
    }

    // Validate code and state
    if (!query.code || !query.state) {
      sendError(res, 400, "INVALID_CALLBACK", "Missing code or state");
      return;
    }

    // Validate state
    const oauthState = validateState(query.state);
    if (!oauthState) {
      sendError(res, 400, "INVALID_STATE", "Invalid or expired state");
      return;
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      provider as OAuthProvider,
      query.code,
      oauthState.redirectUri,
      oauthState.codeVerifier
    );

    // Fetch user info
    const userInfo = await fetchUserInfo(
      provider as OAuthProvider,
      tokens.access_token
    );

    if (!userInfo.email) {
      sendError(
        res,
        400,
        "EMAIL_REQUIRED",
        "Email is required for authentication"
      );
      return;
    }

    // Check if OAuth connection exists
    const existingConnection = await prisma.oAuthConnection.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId: userInfo.id,
        },
      },
      include: { user: true },
    });

    let user;
    let isNewUser = false;

    if (existingConnection) {
      // Existing OAuth user - update tokens
      await prisma.oAuthConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
        },
      });
      user = existingConnection.user;
    } else {
      // Check if user exists with this email
      const existingUser = await prisma.user.findUnique({
        where: { email: userInfo.email },
      });

      if (existingUser) {
        // Link OAuth to existing user
        await prisma.oAuthConnection.create({
          data: {
            userId: existingUser.id,
            provider,
            providerId: userInfo.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000)
              : null,
          },
        });
        user = existingUser;
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name,
            avatarUrl: userInfo.avatarUrl,
            emailVerified: true, // OAuth emails are verified
            status: "ACTIVE",
            oauthConnections: {
              create: {
                provider,
                providerId: userInfo.id,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: tokens.expires_in
                  ? new Date(Date.now() + tokens.expires_in * 1000)
                  : null,
              },
            },
          },
        });
        isNewUser = true;
      }
    }

    // Generate tokens
    const deviceInfo = getDeviceInfo(req);
    const ipAddress = getClientIp(req);

    // Get user with organizations
    const userWithOrgs = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!userWithOrgs) {
      sendError(res, 500, "USER_ERROR", "Failed to load user");
      return;
    }

    // Create access token
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      organizations: userWithOrgs.memberships.map((m) => ({
        id: m.organization.id,
        role: m.role,
      })),
      type: "access",
    });

    // Create refresh token
    const { token: refreshToken, jti } = generateRefreshToken({ sub: user.id });
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    });

    // Redirect to frontend with tokens
    const frontendUrl = config.FRONTEND_URL || "http://localhost:3000";
    const callbackUrl = new URL(`${frontendUrl}/auth/callback`);
    callbackUrl.searchParams.set("accessToken", accessToken);
    callbackUrl.searchParams.set("refreshToken", refreshToken);
    callbackUrl.searchParams.set("isNewUser", String(isNewUser));

    res.redirect(callbackUrl.toString());
  } catch (error) {
    logger.error({ err: error }, "[auth/oauth] Callback error");

    // Redirect to frontend with error
    const frontendUrl = config.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/auth/error?error=oauth_failed`);
  }
}

/**
 * POST /api/v1/auth/oauth/:provider/link
 * Link OAuth account to existing authenticated user.
 */
async function linkOAuthAccountHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { provider } = req.params;
    const user = (req as AuthenticatedRequest).user;

    if (!["google", "github", "twitch"].includes(provider)) {
      sendError(res, 400, "INVALID_PROVIDER", "Invalid OAuth provider");
      return;
    }

    if (!isProviderConfigured(provider as OAuthProvider)) {
      sendError(
        res,
        400,
        "PROVIDER_NOT_CONFIGURED",
        `OAuth provider ${provider} is not configured`
      );
      return;
    }

    // Check if already linked
    const existing = await prisma.oAuthConnection.findFirst({
      where: {
        userId: user.id,
        provider,
      },
    });

    if (existing) {
      sendError(
        res,
        400,
        "ALREADY_LINKED",
        `${provider} account is already linked`
      );
      return;
    }

    // Generate authorization URL with linking flag
    const redirectUri = getRedirectUri(req, provider);
    const { url, state } = generateAuthorizationUrl(
      provider as OAuthProvider,
      redirectUri
    );

    // Store user ID in state for linking
    // In production, use a more secure mechanism

    sendSuccess(res, { url, state });
  } catch (error) {
    logger.error({ err: error }, "[auth/oauth] Link error");
    sendError(res, 500, "LINK_ERROR", "Failed to initiate account linking");
  }
}

/**
 * DELETE /api/v1/auth/oauth/:provider
 * Unlink OAuth account from authenticated user.
 */
async function unlinkOAuthAccountHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { provider } = req.params;
    const user = (req as AuthenticatedRequest).user;

    // Check if user has password (can't unlink last auth method)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { oauthConnections: true },
    });

    if (!dbUser) {
      sendError(res, 404, "USER_NOT_FOUND", "User not found");
      return;
    }

    const hasPassword = !!dbUser.passwordHash;
    const connectionCount = dbUser.oauthConnections.length;

    if (!hasPassword && connectionCount <= 1) {
      sendError(
        res,
        400,
        "CANNOT_UNLINK",
        "Cannot unlink last authentication method. Please add a password first."
      );
      return;
    }

    // Remove OAuth connection
    await prisma.oAuthConnection.deleteMany({
      where: {
        userId: user.id,
        provider,
      },
    });

    sendSuccess(res, { message: `${provider} account unlinked` });
  } catch (error) {
    logger.error({ err: error }, "[auth/oauth] Unlink error");
    sendError(res, 500, "UNLINK_ERROR", "Failed to unlink account");
  }
}

/**
 * GET /api/v1/auth/oauth/connections
 * Get user's linked OAuth accounts.
 */
async function getConnectionsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;

    const connections = await prisma.oAuthConnection.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        createdAt: true,
      },
    });

    sendSuccess(res, { connections });
  } catch (error) {
    logger.error({ err: error }, "[auth/oauth] Get connections error");
    sendError(res, 500, "CONNECTION_ERROR", "Failed to get connections");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

export function createOAuthRouter(): Router {
  const router = Router();

  // Public routes
  router.get("/providers", getProvidersHandler);
  router.get("/:provider", initiateOAuthHandler);
  router.get("/:provider/callback", handleOAuthCallbackHandler);

  // Protected routes
  router.post("/:provider/link", authenticateToken, linkOAuthAccountHandler);
  router.delete("/:provider", authenticateToken, unlinkOAuthAccountHandler);
  router.get("/connections", authenticateToken, getConnectionsHandler);

  return router;
}

export const oauthRouter = createOAuthRouter();

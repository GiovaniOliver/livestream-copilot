/**
 * Social Media Service
 *
 * Manages social media connections and posting:
 * - OAuth connection flow
 * - Token refresh and management
 * - Content posting across platforms
 * - Connection management
 */

import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { getClient, isPlatformConfigured, getSupportedPlatforms } from './clients/index.js';
import type {
  SocialPlatform,
  SocialOAuthState,
  SocialConnectionData,
  ConnectSocialResponse,
  PostContent,
  PostOptions,
  PostResult,
  SocialUserInfo,
} from './types.js';
import { SocialAPIError, TokenExpiredError } from './types.js';
import { logger } from '../logger/index.js';

const socialLogger = logger.child({ module: 'social' });

// In-memory state storage for OAuth (use Redis in production)
const pendingStates = new Map<string, SocialOAuthState>();

// =============================================================================
// ENCRYPTION HELPERS
// =============================================================================

const ENCRYPTION_KEY = process.env.SOCIAL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me';
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Initiates OAuth connection for a social platform.
 */
export async function initiateConnection(
  userId: string,
  platform: SocialPlatform,
  redirectUri: string
): Promise<ConnectSocialResponse> {
  const client = getClient(platform);

  if (!client) {
    throw new SocialAPIError(
      `Platform ${platform} is not supported`,
      platform,
      'UNSUPPORTED_PLATFORM',
      400
    );
  }

  if (!isPlatformConfigured(platform)) {
    throw new SocialAPIError(
      `Platform ${platform} is not configured`,
      platform,
      'NOT_CONFIGURED',
      400
    );
  }

  // Generate state and PKCE
  const state = crypto.randomBytes(32).toString('base64url');
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const nonce = crypto.randomBytes(16).toString('base64url');

  // Store state for validation
  const oauthState: SocialOAuthState = {
    platform,
    userId,
    codeVerifier,
    redirectUri,
    nonce,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  pendingStates.set(state, oauthState);

  // Generate authorization URL
  const authorizationUrl = client.getAuthorizationUrl(redirectUri, state, codeVerifier);

  socialLogger.info(
    { userId, platform },
    'Initiated social connection'
  );

  return { authorizationUrl, state };
}

/**
 * Completes OAuth connection after callback.
 */
export async function completeConnection(
  state: string,
  code: string
): Promise<SocialConnectionData> {
  // Validate state
  const oauthState = pendingStates.get(state);

  if (!oauthState) {
    throw new SocialAPIError(
      'Invalid or expired state',
      'TWITTER', // Default, will be overwritten
      'INVALID_STATE',
      400
    );
  }

  if (Date.now() > oauthState.expiresAt) {
    pendingStates.delete(state);
    throw new SocialAPIError(
      'OAuth state expired',
      oauthState.platform,
      'STATE_EXPIRED',
      400
    );
  }

  pendingStates.delete(state);

  const { platform, userId, codeVerifier, redirectUri } = oauthState;
  const client = getClient(platform);

  if (!client) {
    throw new SocialAPIError(
      `Platform ${platform} is not supported`,
      platform,
      'UNSUPPORTED_PLATFORM',
      400
    );
  }

  // Exchange code for tokens
  const tokens = await client.exchangeCodeForTokens(code, redirectUri, codeVerifier);

  // Get user info
  const userInfo = await client.getUserInfo(tokens.access_token);

  // Check for existing connection
  const existingConnection = await prisma.socialConnection.findFirst({
    where: {
      userId,
      platform,
      platformUserId: userInfo.id,
    },
  });

  // Calculate token expiration
  const tokenExpiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : undefined;

  // Create or update connection
  const connection = await prisma.socialConnection.upsert({
    where: {
      userId_platform_platformUserId: {
        userId,
        platform,
        platformUserId: userInfo.id,
      },
    },
    create: {
      userId,
      platform,
      platformUserId: userInfo.id,
      platformUsername: userInfo.username,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt,
      scopes: tokens.scope?.split(' ') || [],
      accountName: userInfo.displayName,
      avatarUrl: userInfo.avatarUrl,
      isActive: true,
    },
    update: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt,
      scopes: tokens.scope?.split(' ') || [],
      accountName: userInfo.displayName,
      avatarUrl: userInfo.avatarUrl,
      platformUsername: userInfo.username,
      isActive: true,
      lastError: null,
    },
  });

  socialLogger.info(
    { userId, platform, connectionId: connection.id },
    'Social connection completed'
  );

  return {
    id: connection.id,
    platform: connection.platform as SocialPlatform,
    platformUserId: connection.platformUserId,
    platformUsername: connection.platformUsername || undefined,
    accountName: connection.accountName || undefined,
    avatarUrl: connection.avatarUrl || undefined,
    isActive: connection.isActive,
    scopes: connection.scopes,
    lastUsedAt: connection.lastUsedAt || undefined,
    createdAt: connection.createdAt,
  };
}

/**
 * Gets all social connections for a user.
 */
export async function getConnections(userId: string): Promise<SocialConnectionData[]> {
  const connections = await prisma.socialConnection.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return connections.map((conn) => ({
    id: conn.id,
    platform: conn.platform as SocialPlatform,
    platformUserId: conn.platformUserId,
    platformUsername: conn.platformUsername || undefined,
    accountName: conn.accountName || undefined,
    avatarUrl: conn.avatarUrl || undefined,
    isActive: conn.isActive,
    scopes: conn.scopes,
    lastUsedAt: conn.lastUsedAt || undefined,
    createdAt: conn.createdAt,
  }));
}

/**
 * Gets a specific connection.
 */
export async function getConnection(
  connectionId: string,
  userId: string
): Promise<SocialConnectionData | null> {
  const connection = await prisma.socialConnection.findFirst({
    where: { id: connectionId, userId },
  });

  if (!connection) return null;

  return {
    id: connection.id,
    platform: connection.platform as SocialPlatform,
    platformUserId: connection.platformUserId,
    platformUsername: connection.platformUsername || undefined,
    accountName: connection.accountName || undefined,
    avatarUrl: connection.avatarUrl || undefined,
    isActive: connection.isActive,
    scopes: connection.scopes,
    lastUsedAt: connection.lastUsedAt || undefined,
    createdAt: connection.createdAt,
  };
}

/**
 * Disconnects a social account.
 */
export async function disconnectAccount(
  connectionId: string,
  userId: string
): Promise<boolean> {
  const connection = await prisma.socialConnection.findFirst({
    where: { id: connectionId, userId },
  });

  if (!connection) {
    return false;
  }

  // Try to revoke token
  const client = getClient(connection.platform as SocialPlatform);
  if (client && client.revokeToken) {
    try {
      const accessToken = decrypt(connection.accessToken);
      await client.revokeToken(accessToken);
    } catch (err) {
      socialLogger.warn(
        { err, connectionId },
        'Failed to revoke token during disconnect'
      );
    }
  }

  // Delete connection
  await prisma.socialConnection.delete({
    where: { id: connectionId },
  });

  socialLogger.info(
    { userId, connectionId, platform: connection.platform },
    'Social account disconnected'
  );

  return true;
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

/**
 * Gets a valid access token for a connection, refreshing if needed.
 */
async function getValidAccessToken(connectionId: string): Promise<string> {
  const connection = await prisma.socialConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new SocialAPIError(
      'Connection not found',
      'TWITTER',
      'CONNECTION_NOT_FOUND',
      404
    );
  }

  const platform = connection.platform as SocialPlatform;
  let accessToken = decrypt(connection.accessToken);

  // Check if token is expired or expiring soon
  const isExpired =
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000; // 5 min buffer

  if (isExpired && connection.refreshToken) {
    const client = getClient(platform);

    if (!client) {
      throw new SocialAPIError(
        `Platform ${platform} is not supported`,
        platform,
        'UNSUPPORTED_PLATFORM',
        400
      );
    }

    try {
      const refreshToken = decrypt(connection.refreshToken);
      const tokens = await client.refreshAccessToken(refreshToken);

      // Update stored tokens
      await prisma.socialConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token
            ? encrypt(tokens.refresh_token)
            : connection.refreshToken,
          tokenExpiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : connection.tokenExpiresAt,
          lastError: null,
        },
      });

      accessToken = tokens.access_token;

      socialLogger.debug(
        { connectionId, platform },
        'Refreshed access token'
      );
    } catch (err) {
      // Mark connection as having an error
      await prisma.socialConnection.update({
        where: { id: connectionId },
        data: {
          lastError: err instanceof Error ? err.message : 'Token refresh failed',
          isActive: false,
        },
      });

      throw err;
    }
  }

  return accessToken;
}

// =============================================================================
// POSTING
// =============================================================================

/**
 * Creates a post on a connected social platform.
 */
export async function createPost(
  connectionId: string,
  userId: string,
  content: PostContent,
  options?: PostOptions
): Promise<PostResult> {
  const connection = await prisma.socialConnection.findFirst({
    where: { id: connectionId, userId },
  });

  if (!connection) {
    return {
      success: false,
      error: 'Connection not found',
    };
  }

  if (!connection.isActive) {
    return {
      success: false,
      error: 'Connection is not active. Please reconnect.',
    };
  }

  const platform = connection.platform as SocialPlatform;
  const client = getClient(platform);

  if (!client) {
    return {
      success: false,
      error: `Platform ${platform} is not supported`,
    };
  }

  try {
    const accessToken = await getValidAccessToken(connectionId);
    const result = await client.createPost(accessToken, content, options);

    // Record the post
    if (result.success) {
      await prisma.socialPost.create({
        data: {
          userId,
          connectionId,
          platform,
          platformPostId: result.platformPostId,
          content: content.text,
          mediaUrls: content.mediaFiles?.map((m) => m.path) || [],
          status: 'published',
          publishedAt: result.publishedAt || new Date(),
          platformUrl: result.platformUrl,
        },
      });

      // Update last used
      await prisma.socialConnection.update({
        where: { id: connectionId },
        data: { lastUsedAt: new Date(), lastError: null },
      });

      socialLogger.info(
        { userId, connectionId, platform, postId: result.platformPostId },
        'Post created successfully'
      );
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update connection with error
    await prisma.socialConnection.update({
      where: { id: connectionId },
      data: { lastError: errorMessage },
    });

    // Handle token expiration
    if (error instanceof TokenExpiredError) {
      await prisma.socialConnection.update({
        where: { id: connectionId },
        data: { isActive: false },
      });

      return {
        success: false,
        error: 'Token expired. Please reconnect your account.',
      };
    }

    socialLogger.error(
      { err: error, userId, connectionId, platform },
      'Failed to create post'
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Creates a post on multiple connected platforms.
 */
export async function createMultiPlatformPost(
  userId: string,
  connectionIds: string[],
  content: PostContent,
  options?: PostOptions
): Promise<Map<string, PostResult>> {
  const results = new Map<string, PostResult>();

  // Post to each platform in parallel
  const promises = connectionIds.map(async (connectionId) => {
    const result = await createPost(connectionId, userId, content, options);
    results.set(connectionId, result);
  });

  await Promise.allSettled(promises);

  return results;
}

// =============================================================================
// POST HISTORY
// =============================================================================

/**
 * Gets post history for a user.
 */
export async function getPostHistory(
  userId: string,
  options?: {
    connectionId?: string;
    platform?: SocialPlatform;
    limit?: number;
    offset?: number;
  }
): Promise<{
  posts: Array<{
    id: string;
    platform: SocialPlatform;
    content?: string;
    platformUrl?: string;
    status: string;
    publishedAt?: Date;
    views?: number;
    likes?: number;
    comments?: number;
  }>;
  total: number;
}> {
  const where: any = { userId };

  if (options?.connectionId) {
    where.connectionId = options.connectionId;
  }

  if (options?.platform) {
    where.platform = options.platform;
  }

  const [posts, total] = await Promise.all([
    prisma.socialPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prisma.socialPost.count({ where }),
  ]);

  return {
    posts: posts.map((post) => ({
      id: post.id,
      platform: post.platform as SocialPlatform,
      content: post.content || undefined,
      platformUrl: post.platformUrl || undefined,
      status: post.status,
      publishedAt: post.publishedAt || undefined,
      views: post.views || undefined,
      likes: post.likes || undefined,
      comments: post.comments || undefined,
    })),
    total,
  };
}

// =============================================================================
// PLATFORM INFO
// =============================================================================

/**
 * Gets available platforms with configuration status.
 */
export function getAvailablePlatforms(): Array<{
  platform: SocialPlatform;
  configured: boolean;
  name: string;
}> {
  const platforms = getSupportedPlatforms();

  return platforms.map((platform) => ({
    platform,
    configured: isPlatformConfigured(platform),
    name: getPlatformDisplayName(platform),
  }));
}

/**
 * Gets display name for a platform.
 */
function getPlatformDisplayName(platform: SocialPlatform): string {
  const names: Record<SocialPlatform, string> = {
    YOUTUBE: 'YouTube',
    TWITTER: 'X (Twitter)',
    TIKTOK: 'TikTok',
    LINKEDIN: 'LinkedIn',
    INSTAGRAM: 'Instagram',
    FACEBOOK: 'Facebook',
    THREADS: 'Threads',
    BLUESKY: 'Bluesky',
  };

  return names[platform] || platform;
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Cleans up expired OAuth states.
 */
export function cleanupExpiredStates(): void {
  const now = Date.now();
  for (const [key, state] of pendingStates) {
    if (now > state.expiresAt) {
      pendingStates.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredStates, 5 * 60 * 1000);

/**
 * Social Media Integration Types
 *
 * Type definitions for social media platform connections and posting.
 */

import type { SocialPlatform } from '../generated/prisma/enums.js';

export { SocialPlatform };

// =============================================================================
// OAUTH TYPES
// =============================================================================

export interface SocialOAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  revokeUrl?: string;
}

export interface SocialTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface SocialUserInfo {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  platform: SocialPlatform;
  raw: Record<string, unknown>;
}

export interface SocialOAuthState {
  platform: SocialPlatform;
  userId: string;
  codeVerifier?: string;
  redirectUri: string;
  nonce: string;
  expiresAt: number;
}

// =============================================================================
// CONNECTION TYPES
// =============================================================================

export interface SocialConnectionData {
  id: string;
  platform: SocialPlatform;
  platformUserId: string;
  platformUsername?: string;
  accountName?: string;
  avatarUrl?: string;
  isActive: boolean;
  scopes: string[];
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface ConnectSocialRequest {
  platform: SocialPlatform;
  redirectUri: string;
}

export interface ConnectSocialResponse {
  authorizationUrl: string;
  state: string;
}

// =============================================================================
// POSTING TYPES
// =============================================================================

export interface PostContent {
  text?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  mediaFiles?: PostMedia[];
}

export interface PostMedia {
  type: 'image' | 'video' | 'gif';
  path: string;
  mimeType: string;
  altText?: string;
}

export interface PostOptions {
  scheduledFor?: Date;
  visibility?: 'public' | 'private' | 'unlisted';
  replyToId?: string;
  threadContinuation?: boolean;
}

export interface CreatePostRequest {
  connectionId: string;
  content: PostContent;
  options?: PostOptions;
}

export interface PostResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
  publishedAt?: Date;
}

export interface ScheduledPost {
  id: string;
  connectionId: string;
  platform: SocialPlatform;
  content: PostContent;
  scheduledFor: Date;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  createdAt: Date;
}

// =============================================================================
// PLATFORM CLIENT INTERFACE
// =============================================================================

export interface SocialPlatformClient {
  platform: SocialPlatform;

  /**
   * Generates OAuth authorization URL
   */
  getAuthorizationUrl(
    redirectUri: string,
    state: string,
    codeVerifier?: string
  ): string;

  /**
   * Exchanges authorization code for tokens
   */
  exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<SocialTokenResponse>;

  /**
   * Refreshes access token using refresh token
   */
  refreshAccessToken(refreshToken: string): Promise<SocialTokenResponse>;

  /**
   * Fetches user profile information
   */
  getUserInfo(accessToken: string): Promise<SocialUserInfo>;

  /**
   * Creates a post on the platform
   */
  createPost(
    accessToken: string,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult>;

  /**
   * Uploads media to the platform (if required before posting)
   */
  uploadMedia?(
    accessToken: string,
    media: PostMedia
  ): Promise<{ mediaId: string }>;

  /**
   * Deletes a post from the platform
   */
  deletePost?(accessToken: string, postId: string): Promise<boolean>;

  /**
   * Revokes access token
   */
  revokeToken?(accessToken: string): Promise<boolean>;
}

// =============================================================================
// API ERROR TYPES
// =============================================================================

export class SocialAPIError extends Error {
  constructor(
    message: string,
    public platform: SocialPlatform,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SocialAPIError';
  }
}

export class TokenExpiredError extends SocialAPIError {
  constructor(platform: SocialPlatform, details?: Record<string, unknown>) {
    super('Access token expired', platform, 'TOKEN_EXPIRED', 401, details);
    this.name = 'TokenExpiredError';
  }
}

export class RateLimitError extends SocialAPIError {
  constructor(
    platform: SocialPlatform,
    public retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super('Rate limit exceeded', platform, 'RATE_LIMIT', 429, details);
    this.name = 'RateLimitError';
  }
}

export class PermissionDeniedError extends SocialAPIError {
  constructor(platform: SocialPlatform, details?: Record<string, unknown>) {
    super('Permission denied', platform, 'PERMISSION_DENIED', 403, details);
    this.name = 'PermissionDeniedError';
  }
}

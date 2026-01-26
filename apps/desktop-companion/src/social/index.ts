/**
 * Social Media Integration Module
 *
 * Provides social media platform integrations for:
 * - OAuth authentication with platforms
 * - Content posting (text, images, videos)
 * - Account management
 * - Post analytics
 *
 * Supported Platforms:
 * - YouTube
 * - Twitter/X
 * - TikTok
 * - LinkedIn
 *
 * @module social
 */

// Routes
export { socialRouter, createSocialRouter } from './routes.js';

// Service functions
export {
  initiateConnection,
  completeConnection,
  getConnections,
  getConnection,
  disconnectAccount,
  createPost,
  createMultiPlatformPost,
  getPostHistory,
  getAvailablePlatforms,
  cleanupExpiredStates,
} from './service.js';

// Platform clients
export {
  getClient,
  getConfiguredClients,
  getSupportedPlatforms,
  isPlatformSupported,
  isPlatformConfigured,
  registerClient,
  YouTubeClient,
  TwitterClient,
  TikTokClient,
  LinkedInClient,
  BaseSocialClient,
} from './clients/index.js';

// Types
export type {
  SocialPlatform,
  SocialOAuthConfig,
  SocialTokenResponse,
  SocialUserInfo,
  SocialOAuthState,
  SocialConnectionData,
  ConnectSocialRequest,
  ConnectSocialResponse,
  PostContent,
  PostMedia,
  PostOptions,
  CreatePostRequest,
  PostResult,
  ScheduledPost,
  SocialPlatformClient,
} from './types.js';

export {
  SocialAPIError,
  TokenExpiredError,
  RateLimitError,
  PermissionDeniedError,
} from './types.js';

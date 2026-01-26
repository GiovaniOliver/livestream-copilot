/**
 * Social Platform Clients Index
 *
 * Factory and exports for social media platform clients.
 */

import type { SocialPlatformClient, SocialPlatform } from '../types.js';
import { YouTubeClient, youtubeClient } from './youtube-client.js';
import { TwitterClient, twitterClient } from './twitter-client.js';
import { TikTokClient, tiktokClient } from './tiktok-client.js';
import { LinkedInClient, linkedinClient } from './linkedin-client.js';

// Re-export clients
export { YouTubeClient, youtubeClient } from './youtube-client.js';
export { TwitterClient, twitterClient } from './twitter-client.js';
export { TikTokClient, tiktokClient } from './tiktok-client.js';
export { LinkedInClient, linkedinClient } from './linkedin-client.js';
export { BaseSocialClient } from './base-client.js';

// =============================================================================
// CLIENT REGISTRY
// =============================================================================

const clientRegistry: Map<SocialPlatform, SocialPlatformClient> = new Map([
  ['YOUTUBE', youtubeClient],
  ['TWITTER', twitterClient],
  ['TIKTOK', tiktokClient],
  ['LINKEDIN', linkedinClient],
]);

/**
 * Gets the platform client for a specific social platform.
 */
export function getClient(platform: SocialPlatform): SocialPlatformClient | null {
  return clientRegistry.get(platform) || null;
}

/**
 * Gets all configured platform clients.
 */
export function getConfiguredClients(): Array<{
  platform: SocialPlatform;
  client: SocialPlatformClient;
}> {
  const configured: Array<{
    platform: SocialPlatform;
    client: SocialPlatformClient;
  }> = [];

  for (const [platform, client] of clientRegistry) {
    if ('isConfigured' in client && typeof client.isConfigured === 'function') {
      if ((client as any).isConfigured()) {
        configured.push({ platform, client });
      }
    }
  }

  return configured;
}

/**
 * Gets list of supported platforms.
 */
export function getSupportedPlatforms(): SocialPlatform[] {
  return Array.from(clientRegistry.keys());
}

/**
 * Checks if a platform is supported.
 */
export function isPlatformSupported(platform: SocialPlatform): boolean {
  return clientRegistry.has(platform);
}

/**
 * Checks if a platform is configured (has API credentials).
 */
export function isPlatformConfigured(platform: SocialPlatform): boolean {
  const client = clientRegistry.get(platform);
  if (!client) return false;

  if ('isConfigured' in client && typeof client.isConfigured === 'function') {
    return (client as any).isConfigured();
  }

  return true;
}

/**
 * Registers a custom platform client.
 */
export function registerClient(
  platform: SocialPlatform,
  client: SocialPlatformClient
): void {
  clientRegistry.set(platform, client);
}

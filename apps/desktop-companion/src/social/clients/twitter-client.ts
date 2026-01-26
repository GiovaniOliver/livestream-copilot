/**
 * Twitter/X API Client
 *
 * Provides Twitter API v2 integration for:
 * - OAuth 2.0 authentication with PKCE
 * - Tweet creation with media
 * - Thread creation
 */

import fs from 'fs';
import crypto from 'crypto';
import { BaseSocialClient } from './base-client.js';
import type {
  SocialOAuthConfig,
  SocialUserInfo,
  PostContent,
  PostOptions,
  PostResult,
  PostMedia,
  SocialPlatform,
} from '../types.js';
import { SocialAPIError } from '../types.js';
import { config } from '../../config/index.js';

const TWITTER_API_BASE = 'https://api.twitter.com/2';
const TWITTER_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';

export class TwitterClient extends BaseSocialClient {
  platform: SocialPlatform = 'TWITTER';

  protected config: SocialOAuthConfig = {
    clientId: config.TWITTER_CLIENT_ID || '',
    clientSecret: config.TWITTER_CLIENT_SECRET || '',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access',
    ],
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userInfoUrl: `${TWITTER_API_BASE}/users/me`,
    revokeUrl: 'https://api.twitter.com/2/oauth2/revoke',
  };

  protected addAuthorizationParams(params: URLSearchParams): void {
    // Twitter requires PKCE
    params.set('code_challenge_method', 'S256');
  }

  /**
   * Gets Twitter user information.
   */
  async getUserInfo(accessToken: string): Promise<SocialUserInfo> {
    const response = await this.apiRequest<{
      data: {
        id: string;
        username: string;
        name: string;
        profile_image_url?: string;
      };
    }>(`${TWITTER_API_BASE}/users/me?user.fields=profile_image_url`, {
      accessToken,
    });

    return {
      id: response.data.id,
      username: response.data.username,
      displayName: response.data.name,
      avatarUrl: response.data.profile_image_url?.replace('_normal', ''),
      platform: this.platform,
      raw: response.data,
    };
  }

  /**
   * Creates a tweet, optionally with media.
   */
  async createPost(
    accessToken: string,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult> {
    try {
      // Upload media if present
      const mediaIds: string[] = [];
      if (content.mediaFiles && content.mediaFiles.length > 0) {
        for (const media of content.mediaFiles) {
          const result = await this.uploadMedia(accessToken, media);
          mediaIds.push(result.mediaId);
        }
      }

      // Build tweet text
      let text = content.text || '';
      if (content.hashtags && content.hashtags.length > 0) {
        const hashtags = content.hashtags
          .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
          .join(' ');
        text = `${text}\n\n${hashtags}`;
      }

      // Prepare tweet payload
      const tweetPayload: {
        text: string;
        media?: { media_ids: string[] };
        reply?: { in_reply_to_tweet_id: string };
      } = { text };

      if (mediaIds.length > 0) {
        tweetPayload.media = { media_ids: mediaIds };
      }

      if (options?.replyToId) {
        tweetPayload.reply = { in_reply_to_tweet_id: options.replyToId };
      }

      const response = await this.apiRequest<{
        data: {
          id: string;
          text: string;
        };
      }>(`${TWITTER_API_BASE}/tweets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetPayload),
        accessToken,
      });

      return {
        success: true,
        platformPostId: response.data.id,
        platformUrl: `https://twitter.com/i/web/status/${response.data.id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof SocialAPIError) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Creates a thread of tweets.
   */
  async createThread(
    accessToken: string,
    tweets: string[],
    mediaFiles?: PostMedia[][]
  ): Promise<PostResult[]> {
    const results: PostResult[] = [];
    let previousTweetId: string | undefined;

    for (let i = 0; i < tweets.length; i++) {
      const result = await this.createPost(
        accessToken,
        {
          text: tweets[i],
          mediaFiles: mediaFiles?.[i],
        },
        previousTweetId ? { replyToId: previousTweetId } : undefined
      );

      results.push(result);

      if (!result.success) {
        break;
      }

      previousTweetId = result.platformPostId;
    }

    return results;
  }

  /**
   * Uploads media to Twitter.
   * Uses chunked upload for videos.
   */
  async uploadMedia(
    accessToken: string,
    media: PostMedia
  ): Promise<{ mediaId: string }> {
    const fileBuffer = fs.readFileSync(media.path);
    const fileSize = fileBuffer.length;

    if (media.type === 'video' || fileSize > 5 * 1024 * 1024) {
      return this.chunkedUpload(accessToken, media, fileBuffer);
    }

    return this.simpleUpload(accessToken, media, fileBuffer);
  }

  /**
   * Simple upload for images under 5MB.
   */
  private async simpleUpload(
    accessToken: string,
    media: PostMedia,
    fileBuffer: Buffer
  ): Promise<{ mediaId: string }> {
    const base64Data = fileBuffer.toString('base64');

    const formData = new URLSearchParams({
      media_data: base64Data,
    });

    const response = await fetch(TWITTER_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new SocialAPIError(
        `Media upload failed: ${response.status}`,
        this.platform,
        'UPLOAD_FAILED',
        response.status,
        { raw: errorText }
      );
    }

    const result = (await response.json()) as { media_id_string: string };
    return { mediaId: result.media_id_string };
  }

  /**
   * Chunked upload for videos and large files.
   */
  private async chunkedUpload(
    accessToken: string,
    media: PostMedia,
    fileBuffer: Buffer
  ): Promise<{ mediaId: string }> {
    const totalBytes = fileBuffer.length;
    const mediaType = media.mimeType;
    const mediaCategory = media.type === 'video' ? 'tweet_video' : 'tweet_image';

    // INIT
    const initResponse = await fetch(TWITTER_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        command: 'INIT',
        total_bytes: totalBytes.toString(),
        media_type: mediaType,
        media_category: mediaCategory,
      }).toString(),
    });

    if (!initResponse.ok) {
      throw new SocialAPIError(
        'Failed to initialize chunked upload',
        this.platform,
        'UPLOAD_INIT_FAILED',
        initResponse.status
      );
    }

    const initData = (await initResponse.json()) as { media_id_string: string };
    const mediaId = initData.media_id_string;

    // APPEND - upload in chunks
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    let segmentIndex = 0;

    for (let offset = 0; offset < totalBytes; offset += chunkSize) {
      const chunk = fileBuffer.slice(offset, Math.min(offset + chunkSize, totalBytes));
      const base64Chunk = chunk.toString('base64');

      const appendResponse = await fetch(TWITTER_UPLOAD_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          command: 'APPEND',
          media_id: mediaId,
          media_data: base64Chunk,
          segment_index: segmentIndex.toString(),
        }).toString(),
      });

      if (!appendResponse.ok) {
        throw new SocialAPIError(
          `Failed to upload chunk ${segmentIndex}`,
          this.platform,
          'UPLOAD_CHUNK_FAILED',
          appendResponse.status
        );
      }

      segmentIndex++;
    }

    // FINALIZE
    const finalizeResponse = await fetch(TWITTER_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        command: 'FINALIZE',
        media_id: mediaId,
      }).toString(),
    });

    if (!finalizeResponse.ok) {
      throw new SocialAPIError(
        'Failed to finalize upload',
        this.platform,
        'UPLOAD_FINALIZE_FAILED',
        finalizeResponse.status
      );
    }

    const finalData = (await finalizeResponse.json()) as {
      media_id_string: string;
      processing_info?: {
        state: string;
        check_after_secs?: number;
      };
    };

    // Wait for processing if needed (for videos)
    if (finalData.processing_info) {
      await this.waitForProcessing(accessToken, mediaId);
    }

    return { mediaId };
  }

  /**
   * Waits for video processing to complete.
   */
  private async waitForProcessing(
    accessToken: string,
    mediaId: string,
    maxWaitMs = 60000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const statusResponse = await fetch(
        `${TWITTER_UPLOAD_URL}?command=STATUS&media_id=${mediaId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!statusResponse.ok) {
        throw new SocialAPIError(
          'Failed to check processing status',
          this.platform,
          'PROCESSING_CHECK_FAILED',
          statusResponse.status
        );
      }

      const statusData = (await statusResponse.json()) as {
        processing_info?: {
          state: string;
          check_after_secs?: number;
          error?: { message: string };
        };
      };

      if (!statusData.processing_info) {
        return; // Processing complete
      }

      if (statusData.processing_info.state === 'succeeded') {
        return;
      }

      if (statusData.processing_info.state === 'failed') {
        throw new SocialAPIError(
          statusData.processing_info.error?.message || 'Video processing failed',
          this.platform,
          'PROCESSING_FAILED',
          500
        );
      }

      // Wait before checking again
      const waitMs = (statusData.processing_info.check_after_secs || 5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    throw new SocialAPIError(
      'Video processing timed out',
      this.platform,
      'PROCESSING_TIMEOUT',
      408
    );
  }

  /**
   * Deletes a tweet.
   */
  async deletePost(accessToken: string, tweetId: string): Promise<boolean> {
    try {
      const response = await fetch(`${TWITTER_API_BASE}/tweets/${tweetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const twitterClient = new TwitterClient();

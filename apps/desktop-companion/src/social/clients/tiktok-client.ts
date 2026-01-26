/**
 * TikTok API Client
 *
 * Provides TikTok API integration for:
 * - OAuth 2.0 authentication
 * - Video uploads via Content Posting API
 * - User profile access
 */

import fs from 'fs';
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

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export class TikTokClient extends BaseSocialClient {
  platform: SocialPlatform = 'TIKTOK';

  protected config: SocialOAuthConfig = {
    clientId: config.TIKTOK_CLIENT_KEY || '',
    clientSecret: config.TIKTOK_CLIENT_SECRET || '',
    scopes: [
      'user.info.basic',
      'video.publish',
      'video.upload',
    ],
    authorizationUrl: 'https://www.tiktok.com/v2/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    userInfoUrl: `${TIKTOK_API_BASE}/user/info/`,
    revokeUrl: `${TIKTOK_API_BASE}/oauth/revoke/`,
  };

  protected addAuthorizationParams(params: URLSearchParams): void {
    // TikTok uses client_key instead of client_id
    params.set('client_key', this.config.clientId);
    params.delete('client_id');
  }

  protected modifyTokenRequest(body: URLSearchParams): void {
    // TikTok uses client_key instead of client_id
    body.set('client_key', this.config.clientId);
    body.delete('client_id');
  }

  /**
   * Gets TikTok user information.
   */
  async getUserInfo(accessToken: string): Promise<SocialUserInfo> {
    const response = await this.apiRequest<{
      data: {
        user: {
          open_id: string;
          union_id: string;
          avatar_url: string;
          display_name: string;
          username?: string;
        };
      };
      error: {
        code: string;
        message: string;
      };
    }>(`${TIKTOK_API_BASE}/user/info/?fields=open_id,union_id,avatar_url,display_name`, {
      accessToken,
    });

    if (response.error && response.error.code !== 'ok') {
      throw new SocialAPIError(
        response.error.message,
        this.platform,
        response.error.code,
        400
      );
    }

    const user = response.data.user;

    return {
      id: user.open_id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      platform: this.platform,
      raw: user,
    };
  }

  /**
   * Creates a video post on TikTok.
   * Uses the Content Posting API (direct post method).
   */
  async createPost(
    accessToken: string,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult> {
    // TikTok requires video media
    const videoMedia = content.mediaFiles?.find((m) => m.type === 'video');
    if (!videoMedia) {
      return {
        success: false,
        error: 'TikTok requires a video file',
      };
    }

    try {
      // Step 1: Initialize video upload
      const videoBuffer = fs.readFileSync(videoMedia.path);
      const videoSize = videoBuffer.length;

      const initResponse = await this.apiRequest<{
        data: {
          publish_id: string;
          upload_url: string;
        };
        error: {
          code: string;
          message: string;
        };
      }>(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: this.buildCaption(content),
            privacy_level: this.mapPrivacy(options?.visibility),
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: videoSize, // Single chunk for simplicity
            total_chunk_count: 1,
          },
        }),
        accessToken,
      });

      if (initResponse.error && initResponse.error.code !== 'ok') {
        throw new SocialAPIError(
          initResponse.error.message,
          this.platform,
          initResponse.error.code,
          400
        );
      }

      const { publish_id, upload_url } = initResponse.data;

      // Step 2: Upload video content
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoSize.toString(),
          'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
        },
        body: videoBuffer,
      });

      if (!uploadResponse.ok) {
        throw new SocialAPIError(
          `Video upload failed: ${uploadResponse.status}`,
          this.platform,
          'UPLOAD_FAILED',
          uploadResponse.status
        );
      }

      // Step 3: Check publish status
      const statusResult = await this.checkPublishStatus(accessToken, publish_id);

      return {
        success: statusResult.success,
        platformPostId: statusResult.videoId,
        platformUrl: statusResult.shareUrl,
        publishedAt: new Date(),
        error: statusResult.error,
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
   * Builds video caption with hashtags.
   */
  private buildCaption(content: PostContent): string {
    let caption = content.text || content.title || '';

    if (content.hashtags && content.hashtags.length > 0) {
      const hashtags = content.hashtags
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
        .join(' ');
      caption = `${caption} ${hashtags}`;
    }

    // TikTok caption limit is 2200 characters
    return caption.slice(0, 2200);
  }

  /**
   * Maps visibility option to TikTok privacy level.
   */
  private mapPrivacy(visibility?: 'public' | 'private' | 'unlisted'): string {
    switch (visibility) {
      case 'private':
        return 'SELF_ONLY';
      case 'unlisted':
        return 'MUTUAL_FOLLOW_FRIENDS';
      default:
        return 'PUBLIC_TO_EVERYONE';
    }
  }

  /**
   * Checks the status of a video publish.
   */
  private async checkPublishStatus(
    accessToken: string,
    publishId: string,
    maxRetries = 30
  ): Promise<{
    success: boolean;
    videoId?: string;
    shareUrl?: string;
    error?: string;
  }> {
    for (let i = 0; i < maxRetries; i++) {
      const response = await this.apiRequest<{
        data: {
          status: string;
          publish_id: string;
          uploaded_bytes?: number;
          video_id?: string;
          share_url?: string;
          fail_reason?: string;
        };
        error: {
          code: string;
          message: string;
        };
      }>(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publish_id: publishId }),
        accessToken,
      });

      if (response.error && response.error.code !== 'ok') {
        return {
          success: false,
          error: response.error.message,
        };
      }

      const status = response.data.status;

      if (status === 'PUBLISH_COMPLETE') {
        return {
          success: true,
          videoId: response.data.video_id,
          shareUrl: response.data.share_url,
        };
      }

      if (status === 'FAILED') {
        return {
          success: false,
          error: response.data.fail_reason || 'Video publish failed',
        };
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return {
      success: false,
      error: 'Publish status check timed out',
    };
  }

  /**
   * TikTok doesn't support deleting videos via API.
   */
  async deletePost(accessToken: string, videoId: string): Promise<boolean> {
    // TikTok API doesn't support video deletion
    return false;
  }
}

export const tiktokClient = new TikTokClient();

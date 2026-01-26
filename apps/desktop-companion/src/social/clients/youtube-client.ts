/**
 * YouTube API Client
 *
 * Provides YouTube Data API v3 integration for:
 * - OAuth authentication
 * - Video uploads
 * - Shorts publishing
 * - Channel management
 */

import fs from 'fs';
import path from 'path';
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

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

export class YouTubeClient extends BaseSocialClient {
  platform: SocialPlatform = 'YOUTUBE';

  protected config: SocialOAuthConfig = {
    clientId: config.YOUTUBE_CLIENT_ID || config.GOOGLE_CLIENT_ID || '',
    clientSecret: config.YOUTUBE_CLIENT_SECRET || config.GOOGLE_CLIENT_SECRET || '',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ],
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: `${YOUTUBE_API_BASE}/channels`,
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
  };

  protected addAuthorizationParams(params: URLSearchParams): void {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  /**
   * Gets YouTube channel information for the authenticated user.
   */
  async getUserInfo(accessToken: string): Promise<SocialUserInfo> {
    const response = await this.apiRequest<{
      items: Array<{
        id: string;
        snippet: {
          title: string;
          description: string;
          customUrl?: string;
          thumbnails: {
            default?: { url: string };
            medium?: { url: string };
            high?: { url: string };
          };
        };
      }>;
    }>(`${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`, {
      accessToken,
    });

    if (!response.items || response.items.length === 0) {
      throw new SocialAPIError(
        'No YouTube channel found',
        this.platform,
        'NO_CHANNEL',
        404
      );
    }

    const channel = response.items[0];

    return {
      id: channel.id,
      username: channel.snippet.customUrl,
      displayName: channel.snippet.title,
      avatarUrl:
        channel.snippet.thumbnails.high?.url ||
        channel.snippet.thumbnails.medium?.url ||
        channel.snippet.thumbnails.default?.url,
      platform: this.platform,
      raw: channel,
    };
  }

  /**
   * Uploads a video to YouTube.
   */
  async createPost(
    accessToken: string,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult> {
    // YouTube requires video media
    const videoMedia = content.mediaFiles?.find((m) => m.type === 'video');
    if (!videoMedia) {
      return {
        success: false,
        error: 'YouTube requires a video file',
      };
    }

    try {
      // Step 1: Initialize resumable upload
      const metadata = {
        snippet: {
          title: content.title || 'Untitled Video',
          description: this.buildDescription(content),
          tags: content.hashtags || [],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: options?.visibility || 'public',
          selfDeclaredMadeForKids: false,
        },
      };

      const initResponse = await fetch(
        `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': videoMedia.mimeType,
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        throw new SocialAPIError(
          `Failed to initialize upload: ${initResponse.status}`,
          this.platform,
          'UPLOAD_INIT_FAILED',
          initResponse.status,
          { raw: errorText }
        );
      }

      const uploadUrl = initResponse.headers.get('Location');
      if (!uploadUrl) {
        throw new SocialAPIError(
          'No upload URL returned',
          this.platform,
          'NO_UPLOAD_URL',
          500
        );
      }

      // Step 2: Upload the video file
      const videoBuffer = fs.readFileSync(videoMedia.path);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': videoMedia.mimeType,
          'Content-Length': videoBuffer.length.toString(),
        },
        body: videoBuffer,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new SocialAPIError(
          `Failed to upload video: ${uploadResponse.status}`,
          this.platform,
          'UPLOAD_FAILED',
          uploadResponse.status,
          { raw: errorText }
        );
      }

      const video = (await uploadResponse.json()) as {
        id: string;
        snippet: { title: string };
      };

      return {
        success: true,
        platformPostId: video.id,
        platformUrl: `https://www.youtube.com/watch?v=${video.id}`,
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
   * Builds video description with hashtags.
   */
  private buildDescription(content: PostContent): string {
    let description = content.description || content.text || '';

    if (content.hashtags && content.hashtags.length > 0) {
      const hashtags = content.hashtags
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
        .join(' ');
      description = `${description}\n\n${hashtags}`;
    }

    return description;
  }

  /**
   * Deletes a video from YouTube.
   */
  async deletePost(accessToken: string, videoId: string): Promise<boolean> {
    try {
      const response = await fetch(`${YOUTUBE_API_BASE}/videos?id=${videoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.status === 204;
    } catch {
      return false;
    }
  }

  /**
   * Gets video analytics.
   */
  async getVideoStats(
    accessToken: string,
    videoId: string
  ): Promise<{
    views: number;
    likes: number;
    comments: number;
  }> {
    const response = await this.apiRequest<{
      items: Array<{
        statistics: {
          viewCount: string;
          likeCount: string;
          commentCount: string;
        };
      }>;
    }>(`${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoId}`, {
      accessToken,
    });

    if (!response.items || response.items.length === 0) {
      return { views: 0, likes: 0, comments: 0 };
    }

    const stats = response.items[0].statistics;

    return {
      views: parseInt(stats.viewCount || '0'),
      likes: parseInt(stats.likeCount || '0'),
      comments: parseInt(stats.commentCount || '0'),
    };
  }
}

export const youtubeClient = new YouTubeClient();

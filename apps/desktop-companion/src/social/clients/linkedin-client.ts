/**
 * LinkedIn API Client
 *
 * Provides LinkedIn API integration for:
 * - OAuth 2.0 authentication
 * - Text and image posts
 * - Video uploads
 * - Profile access
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

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

export class LinkedInClient extends BaseSocialClient {
  platform: SocialPlatform = 'LINKEDIN';

  protected config: SocialOAuthConfig = {
    clientId: config.LINKEDIN_CLIENT_ID || '',
    clientSecret: config.LINKEDIN_CLIENT_SECRET || '',
    scopes: [
      'openid',
      'profile',
      'email',
      'w_member_social',
    ],
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: `${LINKEDIN_API_BASE}/userinfo`,
  };

  /**
   * Gets LinkedIn user information.
   */
  async getUserInfo(accessToken: string): Promise<SocialUserInfo> {
    const response = await this.apiRequest<{
      sub: string;
      email?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    }>(this.config.userInfoUrl!, {
      accessToken,
    });

    return {
      id: response.sub,
      email: response.email,
      displayName: response.name || `${response.given_name} ${response.family_name}`,
      avatarUrl: response.picture,
      platform: this.platform,
      raw: response,
    };
  }

  /**
   * Creates a post on LinkedIn.
   */
  async createPost(
    accessToken: string,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult> {
    try {
      // Get user URN first
      const userInfo = await this.getUserInfo(accessToken);
      const personUrn = `urn:li:person:${userInfo.id}`;

      // Upload media if present
      const mediaAssets: { media: string; title?: { text: string } }[] = [];

      if (content.mediaFiles && content.mediaFiles.length > 0) {
        for (const media of content.mediaFiles) {
          const asset = await this.uploadMedia(accessToken, media, personUrn);
          mediaAssets.push({
            media: asset.mediaId,
            title: media.altText ? { text: media.altText } : undefined,
          });
        }
      }

      // Build post content
      const text = this.buildPostText(content);

      // Create post payload
      const postPayload: {
        author: string;
        lifecycleState: string;
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: string };
            shareMediaCategory: string;
            media?: Array<{ status: string; media: string; title?: { text: string } }>;
          };
        };
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': string;
        };
      } = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: mediaAssets.length > 0 ? 'IMAGE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility':
            options?.visibility === 'private' ? 'CONNECTIONS' : 'PUBLIC',
        },
      };

      if (mediaAssets.length > 0) {
        postPayload.specificContent['com.linkedin.ugc.ShareContent'].media =
          mediaAssets.map((asset) => ({
            status: 'READY',
            media: asset.media,
            title: asset.title,
          }));
      }

      const response = await this.apiRequest<{
        id: string;
      }>(`${LINKEDIN_API_BASE}/ugcPosts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postPayload),
        accessToken,
      });

      // Extract share ID from URN
      const shareId = response.id.split(':').pop() || response.id;

      return {
        success: true,
        platformPostId: response.id,
        platformUrl: `https://www.linkedin.com/feed/update/${response.id}`,
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
   * Builds post text with hashtags.
   */
  private buildPostText(content: PostContent): string {
    let text = content.text || content.description || '';

    if (content.hashtags && content.hashtags.length > 0) {
      const hashtags = content.hashtags
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
        .join(' ');
      text = `${text}\n\n${hashtags}`;
    }

    // LinkedIn post limit is 3000 characters
    return text.slice(0, 3000);
  }

  /**
   * Uploads media to LinkedIn.
   */
  async uploadMedia(
    accessToken: string,
    media: PostMedia,
    ownerUrn?: string
  ): Promise<{ mediaId: string }> {
    // Step 1: Register upload
    const registerResponse = await this.apiRequest<{
      value: {
        uploadMechanism: {
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
            uploadUrl: string;
          };
        };
        asset: string;
      };
    }>(`${LINKEDIN_API_BASE}/assets?action=registerUpload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          owner: ownerUrn,
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          serviceRelationships: [
            {
              identifier: 'urn:li:userGeneratedContent',
              relationshipType: 'OWNER',
            },
          ],
        },
      }),
      accessToken,
    });

    const uploadUrl =
      registerResponse.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl;
    const asset = registerResponse.value.asset;

    // Step 2: Upload the file
    const fileBuffer = fs.readFileSync(media.path);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': media.mimeType,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      throw new SocialAPIError(
        `Media upload failed: ${uploadResponse.status}`,
        this.platform,
        'UPLOAD_FAILED',
        uploadResponse.status
      );
    }

    return { mediaId: asset };
  }

  /**
   * Deletes a post from LinkedIn.
   */
  async deletePost(accessToken: string, postUrn: string): Promise<boolean> {
    try {
      // LinkedIn uses a different endpoint for deletion
      const response = await fetch(
        `${LINKEDIN_API_BASE}/ugcPosts/${encodeURIComponent(postUrn)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      return response.status === 204;
    } catch {
      return false;
    }
  }
}

export const linkedinClient = new LinkedInClient();

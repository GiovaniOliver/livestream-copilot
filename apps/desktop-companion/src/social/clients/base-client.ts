/**
 * Base Social Platform Client
 *
 * Abstract base class for social media platform integrations.
 * Provides common functionality for OAuth and API calls.
 */

import crypto from 'crypto';
import type {
  SocialPlatformClient,
  SocialOAuthConfig,
  SocialTokenResponse,
  SocialUserInfo,
  PostContent,
  PostOptions,
  PostResult,
  PostMedia,
  SocialPlatform,
} from '../types.js';
import { SocialAPIError, TokenExpiredError, RateLimitError } from '../types.js';

export abstract class BaseSocialClient implements SocialPlatformClient {
  abstract platform: SocialPlatform;
  protected abstract config: SocialOAuthConfig;

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Generates a cryptographically secure random string.
   */
  protected generateRandomString(length: number): string {
    return crypto.randomBytes(length).toString('base64url').slice(0, length);
  }

  /**
   * Generates a PKCE code challenge from a code verifier.
   */
  protected generateCodeChallenge(codeVerifier: string): string {
    return crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
  }

  /**
   * Makes an authenticated API request with error handling.
   */
  protected async apiRequest<T>(
    url: string,
    options: RequestInit & { accessToken?: string } = {}
  ): Promise<T> {
    const { accessToken, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle common error cases
    if (response.status === 401) {
      throw new TokenExpiredError(this.platform);
    }

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      throw new RateLimitError(this.platform, retryAfter);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: Record<string, unknown> = {};

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }

      throw new SocialAPIError(
        `API request failed: ${response.status}`,
        this.platform,
        'API_ERROR',
        response.status,
        errorData
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text() as unknown as T;
  }

  // =============================================================================
  // OAUTH METHODS
  // =============================================================================

  /**
   * Checks if the platform client is configured.
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  /**
   * Generates OAuth authorization URL.
   */
  getAuthorizationUrl(
    redirectUri: string,
    state: string,
    codeVerifier?: string
  ): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });

    // Add PKCE if code verifier provided
    if (codeVerifier) {
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    // Allow subclasses to add platform-specific params
    this.addAuthorizationParams(params);

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Override to add platform-specific authorization parameters.
   */
  protected addAuthorizationParams(params: URLSearchParams): void {
    // Default implementation does nothing
  }

  /**
   * Exchanges authorization code for tokens.
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<SocialTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    if (codeVerifier) {
      body.set('code_verifier', codeVerifier);
    }

    // Allow subclasses to modify token request
    this.modifyTokenRequest(body);

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new SocialAPIError(
        `Token exchange failed: ${response.status}`,
        this.platform,
        'TOKEN_EXCHANGE_FAILED',
        response.status,
        { raw: errorText }
      );
    }

    return response.json();
  }

  /**
   * Override to modify token request parameters.
   */
  protected modifyTokenRequest(body: URLSearchParams): void {
    // Default implementation does nothing
  }

  /**
   * Refreshes access token using refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<SocialTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new SocialAPIError(
        `Token refresh failed: ${response.status}`,
        this.platform,
        'TOKEN_REFRESH_FAILED',
        response.status,
        { raw: errorText }
      );
    }

    return response.json();
  }

  // =============================================================================
  // ABSTRACT METHODS
  // =============================================================================

  /**
   * Fetches user profile information.
   */
  abstract getUserInfo(accessToken: string): Promise<SocialUserInfo>;

  /**
   * Creates a post on the platform.
   */
  abstract createPost(
    accessToken: string,
    content: PostContent,
    options?: PostOptions
  ): Promise<PostResult>;

  // =============================================================================
  // OPTIONAL METHODS (can be overridden)
  // =============================================================================

  /**
   * Uploads media to the platform.
   */
  async uploadMedia?(
    accessToken: string,
    media: PostMedia
  ): Promise<{ mediaId: string }>;

  /**
   * Deletes a post from the platform.
   */
  async deletePost?(accessToken: string, postId: string): Promise<boolean>;

  /**
   * Revokes access token.
   */
  async revokeToken?(accessToken: string): Promise<boolean> {
    if (!this.config.revokeUrl) {
      return false;
    }

    try {
      const response = await fetch(this.config.revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: accessToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }).toString(),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

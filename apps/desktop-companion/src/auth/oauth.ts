/**
 * OAuth Provider Integration
 *
 * Provides OAuth authentication for:
 * - Google
 * - GitHub
 * - Twitch
 *
 * Features:
 * - Authorization URL generation with PKCE
 * - Token exchange
 * - User profile fetching
 * - Account linking
 *
 * @module auth/oauth
 */

import crypto from "crypto";
import { config } from "../config/index.js";

// =============================================================================
// TYPES
// =============================================================================

export type OAuthProvider = "google" | "github" | "twitch";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: OAuthProvider;
  raw: Record<string, unknown>;
}

export interface OAuthState {
  provider: OAuthProvider;
  codeVerifier?: string;
  redirectUri: string;
  nonce: string;
  expiresAt: number;
}

// =============================================================================
// PROVIDER CONFIGURATIONS
// =============================================================================

const OAUTH_CONFIGS: Record<OAuthProvider, OAuthConfig> = {
  google: {
    clientId: config.GOOGLE_CLIENT_ID || "",
    clientSecret: config.GOOGLE_CLIENT_SECRET || "",
    scopes: ["openid", "email", "profile"],
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  github: {
    clientId: config.GITHUB_CLIENT_ID || "",
    clientSecret: config.GITHUB_CLIENT_SECRET || "",
    scopes: ["user:email", "read:user"],
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
  },
  twitch: {
    clientId: config.TWITCH_CLIENT_ID || "",
    clientSecret: config.TWITCH_CLIENT_SECRET || "",
    scopes: ["user:read:email"],
    authorizationUrl: "https://id.twitch.tv/oauth2/authorize",
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    userInfoUrl: "https://api.twitch.tv/helix/users",
  },
};

// In-memory state storage (use Redis in production)
const pendingStates = new Map<string, OAuthState>();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generates a cryptographically secure random string.
 */
function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

/**
 * Generates a PKCE code verifier.
 */
function generateCodeVerifier(): string {
  return generateRandomString(64);
}

/**
 * Generates a PKCE code challenge from a code verifier.
 */
function generateCodeChallenge(codeVerifier: string): string {
  return crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
}

/**
 * Checks if a provider is configured and available.
 */
export function isProviderConfigured(provider: OAuthProvider): boolean {
  const cfg = OAUTH_CONFIGS[provider];
  return !!(cfg.clientId && cfg.clientSecret);
}

/**
 * Gets the list of configured OAuth providers.
 */
export function getConfiguredProviders(): OAuthProvider[] {
  return (["google", "github", "twitch"] as OAuthProvider[]).filter(
    isProviderConfigured
  );
}

// =============================================================================
// AUTHORIZATION
// =============================================================================

export interface AuthorizationUrlResult {
  url: string;
  state: string;
}

/**
 * Generates an OAuth authorization URL for the specified provider.
 *
 * @param provider - OAuth provider
 * @param redirectUri - Callback URL
 * @returns Authorization URL and state token
 */
export function generateAuthorizationUrl(
  provider: OAuthProvider,
  redirectUri: string
): AuthorizationUrlResult {
  const cfg = OAUTH_CONFIGS[provider];

  if (!isProviderConfigured(provider)) {
    throw new Error(`OAuth provider ${provider} is not configured`);
  }

  // Generate state and PKCE values
  const state = generateRandomString(32);
  const nonce = generateRandomString(16);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store state for validation
  const oauthState: OAuthState = {
    provider,
    codeVerifier,
    redirectUri,
    nonce,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  pendingStates.set(state, oauthState);

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scopes.join(" "),
    state,
    nonce,
  });

  // Add PKCE for providers that support it (Google, Twitch)
  if (provider === "google" || provider === "twitch") {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }

  // Provider-specific params
  if (provider === "google") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }

  if (provider === "twitch") {
    params.set("force_verify", "true");
  }

  const url = `${cfg.authorizationUrl}?${params.toString()}`;

  return { url, state };
}

// =============================================================================
// TOKEN EXCHANGE
// =============================================================================

/**
 * Validates the OAuth state token.
 *
 * @param state - State token from callback
 * @returns OAuth state if valid, null otherwise
 */
export function validateState(state: string): OAuthState | null {
  const oauthState = pendingStates.get(state);

  if (!oauthState) {
    return null;
  }

  // Check expiration
  if (Date.now() > oauthState.expiresAt) {
    pendingStates.delete(state);
    return null;
  }

  // Remove used state
  pendingStates.delete(state);

  return oauthState;
}

/**
 * Exchanges an authorization code for tokens.
 *
 * @param provider - OAuth provider
 * @param code - Authorization code
 * @param redirectUri - Callback URL
 * @param codeVerifier - PKCE code verifier (if used)
 * @returns OAuth tokens
 */
export async function exchangeCodeForTokens(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<OAuthTokenResponse> {
  const cfg = OAUTH_CONFIGS[provider];

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  // Add PKCE verifier if provided
  if (codeVerifier && (provider === "google" || provider === "twitch")) {
    body.set("code_verifier", codeVerifier);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // GitHub requires Accept header
  if (provider === "github") {
    headers["Accept"] = "application/json";
  }

  const response = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data as OAuthTokenResponse;
}

// =============================================================================
// USER INFO
// =============================================================================

/**
 * Fetches user information from the OAuth provider.
 *
 * @param provider - OAuth provider
 * @param accessToken - OAuth access token
 * @returns Normalized user info
 */
export async function fetchUserInfo(
  provider: OAuthProvider,
  accessToken: string
): Promise<OAuthUserInfo> {
  const cfg = OAUTH_CONFIGS[provider];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  // Twitch requires Client-ID header
  if (provider === "twitch") {
    headers["Client-Id"] = cfg.clientId;
  }

  // GitHub requires User-Agent
  if (provider === "github") {
    headers["User-Agent"] = "FluxBoard-App";
  }

  const response = await fetch(cfg.userInfoUrl, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const data = await response.json();

  // Normalize user info based on provider
  return normalizeUserInfo(provider, data, accessToken);
}

/**
 * Normalizes provider-specific user data to a common format.
 */
async function normalizeUserInfo(
  provider: OAuthProvider,
  data: Record<string, unknown>,
  accessToken: string
): Promise<OAuthUserInfo> {
  switch (provider) {
    case "google":
      return {
        id: data.sub as string,
        email: data.email as string,
        name: data.name as string | undefined,
        avatarUrl: data.picture as string | undefined,
        provider,
        raw: data,
      };

    case "github": {
      // GitHub may not include email in user info, need to fetch separately
      let email = data.email as string | null;

      if (!email) {
        email = await fetchGitHubEmail(accessToken);
      }

      return {
        id: String(data.id),
        email: email || "",
        name: (data.name as string) || (data.login as string),
        avatarUrl: data.avatar_url as string | undefined,
        provider,
        raw: data,
      };
    }

    case "twitch": {
      // Twitch returns data in an array
      const userData = (data.data as Array<Record<string, unknown>>)?.[0] || {};

      return {
        id: userData.id as string,
        email: userData.email as string,
        name: userData.display_name as string | undefined,
        avatarUrl: userData.profile_image_url as string | undefined,
        provider,
        raw: userData,
      };
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Fetches the primary email from GitHub.
 */
async function fetchGitHubEmail(accessToken: string): Promise<string | null> {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "FluxBoard-App",
    },
  });

  if (!response.ok) {
    return null;
  }

  const emails = (await response.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;

  // Find primary verified email
  const primary = emails.find((e) => e.primary && e.verified);
  if (primary) return primary.email;

  // Fall back to any verified email
  const verified = emails.find((e) => e.verified);
  return verified?.email || null;
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Cleans up expired OAuth states.
 * Should be called periodically.
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

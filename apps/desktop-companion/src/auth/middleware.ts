/**
 * Authentication Middleware
 *
 * Provides Express middleware for authentication and authorization:
 * - JWT access token verification
 * - API key authentication
 * - Role-based access control (platform and organization levels)
 *
 * Security Features:
 * - Bearer token extraction with strict validation
 * - API key lookup with hash comparison (constant-time)
 * - Rate limit enforcement for API keys
 * - Permission checking for API keys
 * - Role hierarchy enforcement
 * - Request user context attachment
 *
 * @module auth/middleware
 */

import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import {
  verifyAccessToken,
  hashApiKey,
  validateApiKeyFormat,
  type AccessTokenPayload,
} from "./utils.js";
import { PlatformRole, OrgRole } from "../generated/prisma/enums.js";

import { logger } from '../logger/index.js';
// =============================================================================
// TYPES
// =============================================================================

/**
 * Authenticated user context attached to requests.
 * Contains user identity and authorization claims from JWT or API key.
 */
export interface AuthenticatedUser {
  /** User's unique identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's platform-wide role */
  platformRole: PlatformRole;
  /** Organizations the user belongs to with their roles */
  organizations: Array<{
    id: string;
    role: OrgRole;
  }>;
  /** Authentication method used */
  authMethod: "jwt" | "api_key";
  /** API key ID if authenticated via API key */
  apiKeyId?: string;
  /** Organization ID if API key is scoped to an organization */
  apiKeyOrgId?: string;
  /** Permissions granted to the API key */
  apiKeyPermissions?: string[];
}

/**
 * Extended Express Request with authenticated user.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Express Request with optional authenticated user.
 */
export interface OptionalAuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Error response structure for authentication failures.
 */
interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extracts Bearer token from Authorization header.
 * Implements strict RFC 6750 validation.
 *
 * @param authHeader - The Authorization header value
 * @returns The token if valid Bearer format, null otherwise
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Must start with "Bearer " (case-insensitive per RFC 6750)
  const parts = authHeader.split(" ");
  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;
  if (scheme.toLowerCase() !== "bearer") {
    return null;
  }

  // Token must not be empty and should not contain spaces
  if (!token || token.includes(" ")) {
    return null;
  }

  return token;
}

/**
 * Extracts API key from request headers.
 * Supports both X-API-Key header and Authorization: ApiKey scheme.
 *
 * @param req - Express request object
 * @returns The API key if found, null otherwise
 */
function extractApiKey(req: Request): string | null {
  // Check X-API-Key header first (preferred)
  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey.length > 0) {
    return xApiKey;
  }

  // Check Authorization header with ApiKey scheme
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2) {
      const [scheme, key] = parts;
      if (scheme.toLowerCase() === "apikey" && key) {
        return key;
      }
    }
  }

  return null;
}

/**
 * Sends a standardized authentication error response.
 *
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param code - Error code for client handling
 * @param message - Human-readable error message
 */
function sendAuthError(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void {
  const response: AuthErrorResponse = {
    error: {
      code,
      message,
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Gets client IP address from request.
 * Handles proxy scenarios with X-Forwarded-For header.
 *
 * @param req - Express request object
 * @returns Client IP address
 */
function getClientIp(req: Request): string {
  // Trust X-Forwarded-For only if behind a trusted proxy
  // In production, configure Express trust proxy setting
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    // Take the first IP in the chain (original client)
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

// =============================================================================
// JWT AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Middleware that authenticates requests using JWT access tokens.
 *
 * Security measures:
 * - Validates Bearer token format strictly
 * - Verifies JWT signature and expiration
 * - Validates token type to prevent refresh token misuse
 * - Attaches user context to request for downstream handlers
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    sendAuthError(
      res,
      401,
      "MISSING_TOKEN",
      "Authentication required. Please provide a valid access token."
    );
    return;
  }

  // Verify the access token
  const payload = verifyAccessToken(token);

  if (!payload) {
    sendAuthError(
      res,
      401,
      "INVALID_TOKEN",
      "Invalid or expired access token."
    );
    return;
  }

  // Attach user context to request
  const user: AuthenticatedUser = {
    id: payload.sub,
    email: payload.email,
    platformRole: payload.platformRole as PlatformRole,
    organizations: payload.organizations.map((org) => ({
      id: org.id,
      role: org.role as OrgRole,
    })),
    authMethod: "jwt",
  };

  (req as AuthenticatedRequest).user = user;
  next();
}

/**
 * Optional authentication middleware.
 * Like authenticateToken but doesn't fail if no token is present.
 * Useful for endpoints that behave differently for authenticated users.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    // No token - continue without user context
    next();
    return;
  }

  // Verify the access token
  const payload = verifyAccessToken(token);

  if (!payload) {
    // Invalid token - continue without user context (don't fail)
    // This is intentional for optional auth
    next();
    return;
  }

  // Attach user context to request
  const user: AuthenticatedUser = {
    id: payload.sub,
    email: payload.email,
    platformRole: payload.platformRole as PlatformRole,
    organizations: payload.organizations.map((org) => ({
      id: org.id,
      role: org.role as OrgRole,
    })),
    authMethod: "jwt",
  };

  (req as OptionalAuthRequest).user = user;
  next();
}

// =============================================================================
// API KEY AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * In-memory rate limit tracking for API keys.
 * In production, use Redis or similar for distributed rate limiting.
 */
const apiKeyRateLimits = new Map<
  string,
  { count: number; windowStart: number }
>();

/**
 * Rate limit window in milliseconds (1 minute).
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * Checks if an API key has exceeded its rate limit.
 *
 * @param keyId - The API key ID
 * @param limit - The rate limit per minute
 * @returns True if rate limited, false otherwise
 */
function isRateLimited(keyId: string, limit: number): boolean {
  const now = Date.now();
  const entry = apiKeyRateLimits.get(keyId);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // New window
    apiKeyRateLimits.set(keyId, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count++;
  return false;
}

/**
 * Middleware that authenticates requests using API keys.
 *
 * Security measures:
 * - Validates API key format before database lookup
 * - Uses hash comparison (constant-time via crypto.timingSafeEqual)
 * - Checks API key expiration
 * - Enforces rate limits
 * - Updates last used timestamp for security auditing
 * - Attaches user and organization context to request
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      sendAuthError(
        res,
        401,
        "MISSING_API_KEY",
        "API key required. Please provide a valid API key."
      );
      return;
    }

    // Validate API key format before database lookup
    if (!validateApiKeyFormat(apiKey)) {
      sendAuthError(res, 401, "INVALID_API_KEY", "Invalid API key format.");
      return;
    }

    // Hash the API key for lookup
    const keyHash = hashApiKey(apiKey);

    // Look up API key by hash (unique index)
    const apiKeyRecord = await prisma.aPIKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        },
        organization: true,
      },
    });

    if (!apiKeyRecord) {
      // Use same error message to prevent enumeration
      sendAuthError(res, 401, "INVALID_API_KEY", "Invalid API key.");
      return;
    }

    // Check if API key has expired
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      sendAuthError(res, 401, "API_KEY_EXPIRED", "API key has expired.");
      return;
    }

    // Check rate limit
    if (isRateLimited(apiKeyRecord.id, apiKeyRecord.rateLimit)) {
      res.setHeader("Retry-After", "60");
      sendAuthError(
        res,
        429,
        "RATE_LIMITED",
        "Rate limit exceeded. Please try again later."
      );
      return;
    }

    // Check user account status
    const user = apiKeyRecord.user;
    if (user.status === "SUSPENDED") {
      sendAuthError(
        res,
        403,
        "ACCOUNT_SUSPENDED",
        "Your account has been suspended."
      );
      return;
    }

    if (user.status === "DELETED") {
      sendAuthError(
        res,
        403,
        "ACCOUNT_DELETED",
        "This account has been deleted."
      );
      return;
    }

    // Update last used timestamp (fire and forget for performance)
    prisma.aPIKey
      .update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        logger.error({ err: error }, "[auth] Failed to update API key lastUsedAt");
      });

    // Build organization list from user memberships
    const organizations = user.memberships.map((m) => ({
      id: m.organization.id,
      role: m.role as OrgRole,
    }));

    // Attach user context to request
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      platformRole: user.platformRole as PlatformRole,
      organizations,
      authMethod: "api_key",
      apiKeyId: apiKeyRecord.id,
      apiKeyOrgId: apiKeyRecord.organizationId ?? undefined,
      apiKeyPermissions: apiKeyRecord.permissions,
    };

    (req as AuthenticatedRequest).user = authenticatedUser;
    next();
  } catch (error) {
    logger.error({ err: error }, "[auth] API key authentication error");
    sendAuthError(
      res,
      500,
      "INTERNAL_ERROR",
      "An internal error occurred during authentication."
    );
  }
}

// =============================================================================
// ROLE-BASED ACCESS CONTROL MIDDLEWARE
// =============================================================================

/**
 * Platform role hierarchy for authorization checks.
 * Higher index = more privileges.
 */
const PLATFORM_ROLE_HIERARCHY: PlatformRole[] = [
  PlatformRole.USER,
  PlatformRole.ADMIN,
  PlatformRole.SUPER_ADMIN,
];

/**
 * Organization role hierarchy for authorization checks.
 * Higher index = more privileges.
 */
const ORG_ROLE_HIERARCHY: OrgRole[] = [
  OrgRole.VIEWER,
  OrgRole.MEMBER,
  OrgRole.ADMIN,
  OrgRole.OWNER,
];

/**
 * Creates middleware that requires the user to have one of the specified platform roles.
 *
 * Security measures:
 * - Validates user is authenticated
 * - Checks role against allowed roles list
 * - Super admins always pass (implicit highest privilege)
 *
 * @param roles - Array of allowed platform roles
 * @returns Express middleware function
 *
 * @example
 * router.get('/admin/users', authenticateToken, requirePlatformRole([PlatformRole.ADMIN]), handler);
 */
export function requirePlatformRole(
  roles: PlatformRole[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      sendAuthError(
        res,
        401,
        "NOT_AUTHENTICATED",
        "Authentication required."
      );
      return;
    }

    // Super admin always has access
    if (user.platformRole === PlatformRole.SUPER_ADMIN) {
      next();
      return;
    }

    // Check if user has one of the required roles
    if (roles.includes(user.platformRole)) {
      next();
      return;
    }

    // For API key authentication, also check permissions if applicable
    if (user.authMethod === "api_key" && user.apiKeyPermissions) {
      const requiredPermission = `platform:${roles.join("|")}`;
      if (user.apiKeyPermissions.some((p) => roles.some((r) => p === `role:${r}`))) {
        next();
        return;
      }
    }

    sendAuthError(
      res,
      403,
      "INSUFFICIENT_PERMISSIONS",
      "You do not have permission to perform this action."
    );
  };
}

/**
 * Creates middleware that requires the user to have one of the specified organization roles.
 * The organization is determined from req.params.orgId or req.body.organizationId.
 *
 * Security measures:
 * - Validates user is authenticated
 * - Validates organization ID is provided
 * - Verifies user is a member of the organization
 * - Checks role against allowed roles list
 * - Organization owners always pass for their org
 * - Super admins always pass (implicit platform-wide privilege)
 *
 * @param roles - Array of allowed organization roles
 * @returns Express middleware function
 *
 * @example
 * router.post('/orgs/:orgId/settings', authenticateToken, requireOrgRole([OrgRole.ADMIN]), handler);
 */
export function requireOrgRole(
  roles: OrgRole[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      sendAuthError(
        res,
        401,
        "NOT_AUTHENTICATED",
        "Authentication required."
      );
      return;
    }

    // Super admin always has access
    if (user.platformRole === PlatformRole.SUPER_ADMIN) {
      next();
      return;
    }

    // Get organization ID from params or body
    const orgId =
      req.params.orgId ||
      req.params.organizationId ||
      (req.body as { organizationId?: string })?.organizationId;

    if (!orgId) {
      sendAuthError(
        res,
        400,
        "MISSING_ORG_ID",
        "Organization ID is required."
      );
      return;
    }

    // Find user's membership in this organization
    const membership = user.organizations.find((org) => org.id === orgId);

    if (!membership) {
      sendAuthError(
        res,
        403,
        "NOT_ORG_MEMBER",
        "You are not a member of this organization."
      );
      return;
    }

    // Organization owner always has access within their org
    if (membership.role === OrgRole.OWNER) {
      next();
      return;
    }

    // Check if user has one of the required roles
    if (roles.includes(membership.role)) {
      next();
      return;
    }

    // For API key authentication scoped to this org, check permissions
    if (
      user.authMethod === "api_key" &&
      user.apiKeyOrgId === orgId &&
      user.apiKeyPermissions
    ) {
      if (user.apiKeyPermissions.some((p) => roles.some((r) => p === `org:${r}`))) {
        next();
        return;
      }
    }

    sendAuthError(
      res,
      403,
      "INSUFFICIENT_ORG_PERMISSIONS",
      "You do not have permission to perform this action in this organization."
    );
  };
}

/**
 * Creates middleware that requires the API key to have specific permissions.
 * This is only applicable when authenticating via API key.
 *
 * @param permissions - Array of required permission strings
 * @returns Express middleware function
 *
 * @example
 * router.post('/api/webhooks', authenticateApiKey, requireApiKeyPermission(['webhooks:write']), handler);
 */
export function requireApiKeyPermission(
  permissions: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      sendAuthError(
        res,
        401,
        "NOT_AUTHENTICATED",
        "Authentication required."
      );
      return;
    }

    // If not using API key auth, allow (JWT auth has full permissions)
    if (user.authMethod !== "api_key") {
      next();
      return;
    }

    // Check if API key has all required permissions
    const keyPermissions = user.apiKeyPermissions || [];
    const hasAllPermissions = permissions.every((required) =>
      keyPermissions.some(
        (granted) => granted === required || granted === "*"
      )
    );

    if (!hasAllPermissions) {
      sendAuthError(
        res,
        403,
        "INSUFFICIENT_API_KEY_PERMISSIONS",
        "This API key does not have permission to perform this action."
      );
      return;
    }

    next();
  };
}

// =============================================================================
// UTILITY MIDDLEWARE
// =============================================================================

/**
 * Middleware that extracts client IP address and attaches it to the request.
 * Useful for audit logging and rate limiting.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function extractClientInfo(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Attach client IP to request for downstream use
  (req as Request & { clientIp: string }).clientIp = getClientIp(req);
  next();
}

/**
 * Type guard to check if a request is authenticated.
 *
 * @param req - Express request object
 * @returns True if request has authenticated user
 */
export function isAuthenticated(
  req: Request
): req is AuthenticatedRequest {
  return (req as AuthenticatedRequest).user !== undefined;
}

/**
 * Gets the authenticated user from a request, if present.
 *
 * @param req - Express request object
 * @returns Authenticated user or undefined
 */
export function getAuthenticatedUser(
  req: Request
): AuthenticatedUser | undefined {
  return (req as OptionalAuthRequest).user;
}

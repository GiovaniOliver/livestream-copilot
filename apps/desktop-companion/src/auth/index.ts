/**
 * Authentication Module
 *
 * Provides secure authentication functionality including:
 * - User registration with email verification
 * - Login with JWT access/refresh token pair
 * - Token refresh and rotation
 * - Password reset flow
 * - Session management
 * - API key generation and verification
 * - Express middleware for authentication and authorization
 * - Express routes for authentication endpoints
 *
 * Security Features:
 * - bcrypt password hashing with cost factor 12
 * - JWT with short-lived access tokens (15 min default)
 * - Separate secrets for access and refresh tokens
 * - Refresh token rotation with JTI tracking
 * - API key generation with SHA-256 hashing
 * - Constant-time comparison for security-sensitive operations
 * - Protection against enumeration attacks
 * - Role-based access control (platform and organization levels)
 * - Input validation using Zod schemas
 *
 * @module auth
 */

// Service
export { authService, AuthError } from "./service.js";

// Types from service
export type {
  AuthService,
  UserWithOrgs,
  SafeUser,
  LoginResponse,
  RegistrationResponse,
  TokenRefreshResponse,
  EmailVerificationResponse,
} from "./service.js";

// Middleware
export {
  // JWT authentication
  authenticateToken,
  optionalAuth,

  // API key authentication
  authenticateApiKey,

  // Role-based access control
  requirePlatformRole,
  requireOrgRole,
  requireApiKeyPermission,

  // Utilities
  extractClientInfo,
  isAuthenticated,
  getAuthenticatedUser,
} from "./middleware.js";

// Types from middleware
export type {
  AuthenticatedUser,
  AuthenticatedRequest,
  OptionalAuthRequest,
} from "./middleware.js";

// Routes
export { authRouter, createAuthRouter } from "./routes.js";

// OAuth
export { oauthRouter, createOAuthRouter } from "./oauth-routes.js";
export {
  generateAuthorizationUrl,
  validateState,
  exchangeCodeForTokens,
  fetchUserInfo,
  getConfiguredProviders,
  isProviderConfigured,
  cleanupExpiredStates,
} from "./oauth.js";
export type {
  OAuthProvider,
  OAuthConfig,
  OAuthTokenResponse,
  OAuthUserInfo,
  OAuthState,
  AuthorizationUrlResult,
} from "./oauth.js";

// Utilities
export {
  // Password operations
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  needsRehash,

  // JWT operations
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeTokenUnsafe,

  // API key operations
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  getApiKeyEnvironment,
  validateApiKeyFormat,

  // Token utilities
  generateJti,
  generateSecureToken,
  generateVerificationToken,
  hashToken,

  // Security utilities
  secureCompare,

  // Expiry helpers
  getRefreshTokenExpiry,
  getVerificationTokenExpiry,
  getPasswordResetTokenExpiry,
} from "./utils.js";

// Types from utils
export type {
  AccessTokenPayload,
  RefreshTokenPayload,
  RefreshTokenInput,
  PasswordValidationResult,
  GeneratedApiKey,
} from "./utils.js";

/**
 * Authentication Utilities
 *
 * This module provides secure authentication utilities including:
 * - Password hashing and verification using bcrypt
 * - Password strength validation
 * - JWT access and refresh token generation/verification
 * - API key generation and hashing
 *
 * Security Considerations:
 * - Bcrypt with cost factor 12 for password hashing (adaptive and resistant to GPU attacks)
 * - Separate secrets for access and refresh tokens (defense in depth)
 * - Short-lived access tokens with longer-lived refresh tokens
 * - Cryptographically secure random number generation for API keys
 * - API keys are hashed before storage (only prefix is stored in plaintext)
 * - Token type validation prevents token confusion attacks
 * - JTI (JWT ID) in refresh tokens enables revocation tracking
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignOptions, JwtPayload } from "jsonwebtoken";
import crypto from "node:crypto";
import { pwnedPassword } from "hibp";
import { validateEnv } from "../config/env.js";

// JsonWebTokenError and TokenExpiredError are accessed via jwt namespace
// since jsonwebtoken is a CommonJS module
const { JsonWebTokenError, TokenExpiredError } = jwt;

// ============================================================================
// Configuration
// ============================================================================

/**
 * Bcrypt cost factor - 12 provides good security while maintaining reasonable
 * performance. This results in ~250ms hash time on modern hardware.
 * Higher values increase security but also increase login latency.
 */
const BCRYPT_COST_FACTOR = 12;

/**
 * Minimum password length following NIST SP 800-63B guidelines.
 * 12 characters provides strong entropy with a good character mix.
 */
const MIN_PASSWORD_LENGTH = 12;

/**
 * Maximum password length to prevent denial of service attacks
 * via extremely long password hashing operations.
 */
const MAX_PASSWORD_LENGTH = 128;

/**
 * API key random component length in bytes.
 * 32 bytes = 256 bits of entropy, providing strong cryptographic security.
 */
const API_KEY_RANDOM_BYTES = 32;

/**
 * API key prefix length for identification purposes.
 * This prefix is stored in plaintext for key lookup.
 */
const API_KEY_PREFIX_LENGTH = 8;

// ============================================================================
// Token Payload Types
// ============================================================================

/**
 * Payload structure for access tokens.
 * Contains user identity and authorization claims.
 */
export interface AccessTokenPayload {
  /** Subject - the user's unique identifier */
  sub: string;
  /** User's email address */
  email: string;
  /** User's platform-wide role (e.g., 'admin', 'user') */
  platformRole: string;
  /** Organizations the user belongs to with their roles */
  organizations: Array<{
    id: string;
    role: string;
  }>;
  /** Token type discriminator - prevents token confusion attacks */
  type: "access";
}

/**
 * Payload structure for refresh tokens.
 * Minimal claims for security - only used to issue new access tokens.
 */
export interface RefreshTokenPayload {
  /** Subject - the user's unique identifier */
  sub: string;
  /** Token type discriminator - prevents token confusion attacks */
  type: "refresh";
  /** JWT ID - unique identifier for token revocation tracking */
  jti: string;
}

/**
 * Result of password strength validation
 */
export interface PasswordValidationResult {
  /** Whether the password meets all requirements */
  valid: boolean;
  /** Array of specific validation errors */
  errors: string[];
}

/**
 * Result of API key generation
 */
export interface GeneratedApiKey {
  /** The full API key to return to the user (only shown once) */
  key: string;
  /** SHA-256 hash of the key for secure storage */
  hash: string;
  /** The prefix portion for key identification/lookup */
  prefix: string;
}

// ============================================================================
// Password Utilities
// ============================================================================

/**
 * Hashes a password using bcrypt with a secure cost factor.
 *
 * Security notes:
 * - Uses bcrypt which is specifically designed for password hashing
 * - Cost factor of 12 provides ~250ms hash time, resistant to brute force
 * - Automatically generates a cryptographically secure salt
 * - Salt is embedded in the hash output (no separate storage needed)
 *
 * @param password - The plaintext password to hash
 * @returns Promise resolving to the bcrypt hash string
 * @throws Error if password exceeds maximum length (DoS protection)
 *
 * @example
 * const hash = await hashPassword('SecureP@ssw0rd123');
 * // Store hash in database
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate password length to prevent DoS via extremely long passwords
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `Password exceeds maximum length of ${MAX_PASSWORD_LENGTH} characters`
    );
  }

  // Generate salt and hash in one operation
  // bcrypt.hash automatically generates a secure random salt
  const hash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

  return hash;
}

/**
 * Verifies a password against a bcrypt hash using constant-time comparison.
 *
 * Security notes:
 * - bcrypt.compare uses constant-time comparison to prevent timing attacks
 * - Returns false for any error to avoid leaking information
 * - Handles malformed hashes gracefully
 *
 * @param password - The plaintext password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 *
 * @example
 * const isValid = await verifyPassword('SecureP@ssw0rd123', storedHash);
 * if (isValid) {
 *   // Authenticate user
 * }
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    // Validate inputs to prevent crashes
    if (!password || !hash) {
      return false;
    }

    // bcrypt.compare performs constant-time comparison
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch {
    // Return false on any error to prevent information leakage
    // Errors could indicate malformed hash or other issues
    return false;
  }
}

/**
 * Validates password strength against security requirements.
 *
 * Requirements:
 * - Minimum 12 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Should not be similar to email (if provided)
 * - Must not appear in known data breaches (HIBP check)
 *
 * Security notes:
 * - Uses Have I Been Pwned API v3 with k-anonymity (only sends first 5 chars of SHA-1 hash)
 * - Gracefully degrades if HIBP API is unavailable (logs warning but doesn't block user)
 * - All checks are performed server-side for security
 * - HIBP API is rate-limited but designed for this use case
 *
 * @param password - The password to validate
 * @param email - Optional email to check for similarity (prevents using email as password)
 * @returns Promise resolving to object containing validation result and any error messages
 *
 * @example
 * const result = await validatePasswordStrength('weak');
 * if (!result.valid) {
 *   console.log(result.errors); // ['Password must be at least 12 characters', ...]
 * }
 */
export async function validatePasswordStrength(
  password: string,
  email?: string
): Promise<PasswordValidationResult> {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  // Check maximum length
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Check for number
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check for special character
  // Using a broad set of special characters for flexibility
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Check for email similarity (prevents using email as password)
  if (email) {
    const emailLocal = email.split("@")[0]?.toLowerCase() || "";
    const passwordLower = password.toLowerCase();
    if (
      emailLocal.length >= 3 &&
      (passwordLower.includes(emailLocal) || emailLocal.includes(passwordLower))
    ) {
      errors.push("Password should not be similar to your email address");
    }
  }

  // Check against breached passwords using Have I Been Pwned API
  // This uses k-anonymity: only the first 5 characters of the SHA-1 hash are sent
  // The full hash never leaves the client, providing strong privacy guarantees
  try {
    const pwnedCount = await pwnedPassword(password);

    if (pwnedCount > 0) {
      // Password has been exposed in data breaches
      errors.push(
        `This password has appeared in ${pwnedCount.toLocaleString()} data breaches and should not be used. Please choose a different password.`
      );
    }
  } catch (error) {
    // HIBP API failure should not block user registration
    // Log the error for monitoring but continue with other validations
    // This provides defense in depth - if HIBP is down, other checks still apply
    console.warn("[auth] HIBP API check failed:", {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    // In production, you might want to emit a metric/alert here
    // to monitor HIBP API availability
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// JWT Utilities
// ============================================================================

/**
 * Retrieves JWT configuration from environment.
 * Uses lazy loading to allow config to be set before first use.
 */
function getJwtConfig() {
  const config = validateEnv();
  return {
    accessSecret: config.JWT_SECRET,
    refreshSecret: config.JWT_REFRESH_SECRET,
    accessExpiry: config.JWT_ACCESS_EXPIRY,
    refreshExpiry: config.JWT_REFRESH_EXPIRY,
    apiKeyEnv: config.API_KEY_ENV,
  };
}

/**
 * Generates a signed JWT access token.
 *
 * Security notes:
 * - Uses HS256 (HMAC-SHA256) algorithm - secure for single-service scenarios
 * - Consider RS256 for distributed systems where public key verification is needed
 * - Short expiry (default 15 min) limits impact of token theft
 * - Token type in payload prevents refresh token from being used as access token
 *
 * @param payload - The access token payload containing user claims
 * @returns Signed JWT string
 *
 * @example
 * const token = generateAccessToken({
 *   sub: 'user-123',
 *   email: 'user@example.com',
 *   platformRole: 'user',
 *   organizations: [{ id: 'org-1', role: 'admin' }],
 *   type: 'access'
 * });
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  const config = getJwtConfig();

  const signOptions: SignOptions = {
    algorithm: "HS256",
    expiresIn: config.accessExpiry,
    // Include standard claims for interoperability
    issuer: "livestream-copilot",
    audience: "livestream-copilot-api",
  };

  // Ensure type is always 'access' regardless of input
  const tokenPayload = {
    ...payload,
    type: "access" as const,
  };

  return jwt.sign(tokenPayload, config.accessSecret, signOptions);
}

/**
 * Input for generating a refresh token.
 * JTI is generated automatically if not provided.
 */
export interface RefreshTokenInput {
  /** Subject - the user's unique identifier */
  sub: string;
  /** User's email address (optional, for convenience) */
  email?: string;
  /** User's platform role (optional, for convenience) */
  platformRole?: string;
}

/**
 * Generates a signed JWT refresh token.
 *
 * Security notes:
 * - Uses separate secret from access tokens (defense in depth)
 * - Contains minimal claims (only sub, type, jti)
 * - JTI enables server-side revocation tracking
 * - Longer expiry requires secure storage (HttpOnly, Secure cookies)
 * - Automatically generates a cryptographically secure JTI
 *
 * @param payload - The refresh token payload (jti generated automatically)
 * @returns Object containing the signed JWT and its JTI for database storage
 *
 * @example
 * const { token, jti } = generateRefreshToken({
 *   sub: 'user-123',
 *   email: 'user@example.com',
 *   platformRole: 'user'
 * });
 * // Store jti in database for revocation tracking
 * // Send token to client
 */
export function generateRefreshToken(
  payload: RefreshTokenInput
): { token: string; jti: string } {
  const config = getJwtConfig();
  const jti = generateJti();

  const signOptions: SignOptions = {
    algorithm: "HS256",
    expiresIn: config.refreshExpiry,
    issuer: "livestream-copilot",
    audience: "livestream-copilot-api",
  };

  // Build the full refresh token payload
  const tokenPayload: RefreshTokenPayload = {
    sub: payload.sub,
    type: "refresh",
    jti,
  };

  const token = jwt.sign(tokenPayload, config.refreshSecret, signOptions);
  return { token, jti };
}

/**
 * Verifies and decodes an access token.
 *
 * Security notes:
 * - Validates signature, expiration, and token type
 * - Returns null on any verification failure (no error details exposed)
 * - Explicitly checks token type to prevent refresh token misuse
 * - Validates issuer and audience claims
 *
 * @param token - The JWT string to verify
 * @returns Decoded payload if valid, null otherwise
 *
 * @example
 * const payload = verifyAccessToken(token);
 * if (payload) {
 *   console.log(`User ${payload.sub} authenticated`);
 * } else {
 *   // Token invalid, expired, or wrong type
 * }
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const config = getJwtConfig();

    const decoded = jwt.verify(token, config.accessSecret, {
      algorithms: ["HS256"],
      issuer: "livestream-copilot",
      audience: "livestream-copilot-api",
    }) as JwtPayload & AccessTokenPayload;

    // Validate token type to prevent token confusion attacks
    if (decoded.type !== "access") {
      return null;
    }

    // Validate required fields exist
    if (!decoded.sub || !decoded.email || !decoded.platformRole) {
      return null;
    }

    // Return only the payload fields, not JWT metadata
    return {
      sub: decoded.sub,
      email: decoded.email,
      platformRole: decoded.platformRole,
      organizations: decoded.organizations || [],
      type: "access",
    };
  } catch (error) {
    // Log error type for debugging but don't expose details
    if (error instanceof TokenExpiredError) {
      // Token was valid but expired - could log for metrics
    } else if (error instanceof JsonWebTokenError) {
      // Token was malformed or signature invalid - could log for security monitoring
    }
    return null;
  }
}

/**
 * Verifies and decodes a refresh token.
 *
 * Security notes:
 * - Uses separate secret from access tokens
 * - Returns JTI for revocation checking against database/cache
 * - Explicitly validates token type
 * - Should be combined with database lookup to check if JTI is revoked
 *
 * @param token - The JWT string to verify
 * @returns Decoded payload if valid, null otherwise
 *
 * @example
 * const payload = verifyRefreshToken(token);
 * if (payload) {
 *   // Check if jti is revoked in database before issuing new tokens
 *   const isRevoked = await checkTokenRevocation(payload.jti);
 *   if (!isRevoked) {
 *     const newAccessToken = generateAccessToken({...});
 *   }
 * }
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const config = getJwtConfig();

    const decoded = jwt.verify(token, config.refreshSecret, {
      algorithms: ["HS256"],
      issuer: "livestream-copilot",
      audience: "livestream-copilot-api",
    }) as JwtPayload & RefreshTokenPayload;

    // Validate token type to prevent token confusion attacks
    if (decoded.type !== "refresh") {
      return null;
    }

    // Validate required fields exist
    if (!decoded.sub || !decoded.jti) {
      return null;
    }

    // Return only the payload fields, not JWT metadata
    return {
      sub: decoded.sub,
      type: "refresh",
      jti: decoded.jti,
    };
  } catch (error) {
    // Log error type for debugging but don't expose details
    if (error instanceof TokenExpiredError) {
      // Refresh token expired - user must re-authenticate
    } else if (error instanceof JsonWebTokenError) {
      // Token was malformed or signature invalid
    }
    return null;
  }
}

// ============================================================================
// API Key Utilities
// ============================================================================

/**
 * Generates a new API key with prefix, hash, and full key.
 *
 * Format: lsc_{env}_{random}
 * - lsc: Application prefix (LiveStream Copilot)
 * - env: Environment (live or test) - allows easy identification
 * - random: 32 bytes of cryptographically secure random data, base64url encoded
 *
 * Security notes:
 * - Uses crypto.randomBytes for cryptographic randomness
 * - Full key is only returned once - must be shown to user immediately
 * - Hash is stored in database for verification
 * - Prefix is stored separately for key lookup without exposing hash
 *
 * @returns Object containing the full key, its hash, and the prefix
 *
 * @example
 * const { key, hash, prefix } = generateApiKey();
 * // Show 'key' to user once
 * // Store 'hash' and 'prefix' in database
 */
export function generateApiKey(): GeneratedApiKey {
  const config = getJwtConfig();

  // Generate cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(API_KEY_RANDOM_BYTES);

  // Convert to base64url encoding (URL-safe, no padding)
  const randomPart = randomBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // Construct the full API key
  const key = `lsc_${config.apiKeyEnv}_${randomPart}`;

  // Generate the hash for secure storage
  const hash = hashApiKey(key);

  // Extract prefix for lookup (first 8 characters of random part)
  const prefix = `lsc_${config.apiKeyEnv}_${randomPart.substring(0, API_KEY_PREFIX_LENGTH)}`;

  return {
    key,
    hash,
    prefix,
  };
}

/**
 * Hashes an API key using SHA-256 for secure storage.
 *
 * Security notes:
 * - SHA-256 is sufficient for API keys (unlike passwords, they have high entropy)
 * - No salt needed because API keys are already cryptographically random
 * - Constant-time comparison should be used when verifying (crypto.timingSafeEqual)
 *
 * @param key - The full API key to hash
 * @returns Hexadecimal SHA-256 hash of the key
 *
 * @example
 * const hash = hashApiKey('lsc_test_abc123...');
 * // Compare with stored hash using timing-safe comparison
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key, "utf8").digest("hex");
}

/**
 * Verifies an API key against its stored hash using constant-time comparison.
 *
 * Security notes:
 * - Uses crypto.timingSafeEqual to prevent timing attacks
 * - Returns false on any error to prevent information leakage
 *
 * @param key - The API key provided by the client
 * @param storedHash - The hash stored in the database
 * @returns True if the key matches the hash, false otherwise
 *
 * @example
 * const isValid = verifyApiKey(providedKey, storedHash);
 * if (isValid) {
 *   // API key is valid
 * }
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  try {
    const keyHash = hashApiKey(key);

    // Convert to buffers for timing-safe comparison
    const keyHashBuffer = Buffer.from(keyHash, "hex");
    const storedHashBuffer = Buffer.from(storedHash, "hex");

    // Check lengths match before timing-safe comparison
    if (keyHashBuffer.length !== storedHashBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(keyHashBuffer, storedHashBuffer);
  } catch {
    return false;
  }
}

/**
 * Extracts the environment from an API key.
 *
 * @param key - The API key to extract environment from
 * @returns 'live', 'test', or null if invalid format
 *
 * @example
 * const env = getApiKeyEnvironment('lsc_live_abc123...');
 * // Returns 'live'
 */
export function getApiKeyEnvironment(key: string): "live" | "test" | null {
  const match = key.match(/^lsc_(live|test)_/);
  if (match && (match[1] === "live" || match[1] === "test")) {
    return match[1];
  }
  return null;
}

/**
 * Validates API key format without verifying the key itself.
 *
 * @param key - The API key to validate
 * @returns True if format is valid, false otherwise
 *
 * @example
 * if (validateApiKeyFormat(key)) {
 *   // Proceed with database lookup
 * }
 */
export function validateApiKeyFormat(key: string): boolean {
  // Format: lsc_{live|test}_{base64url, ~43 chars}
  const pattern = /^lsc_(live|test)_[A-Za-z0-9_-]{40,50}$/;
  return pattern.test(key);
}

/**
 * Generates a cryptographically secure random string for JTI claims.
 *
 * @returns UUID v4 string for use as JWT ID
 *
 * @example
 * const jti = generateJti();
 * const refreshToken = generateRefreshToken({ sub: userId, type: 'refresh', jti });
 */
export function generateJti(): string {
  return crypto.randomUUID();
}

/**
 * Performs a constant-time string comparison to prevent timing attacks.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    // Ensure same length comparison
    if (bufA.length !== bufB.length) {
      // Compare against itself to maintain constant time
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Calculates the expiration date for a refresh token.
 *
 * @returns Date when refresh token should expire
 */
export function getRefreshTokenExpiry(): Date {
  const config = getJwtConfig();
  return new Date(Date.now() + config.refreshExpiry * 1000);
}

/**
 * Calculates the expiration date for a verification token.
 * Verification tokens expire in 24 hours.
 *
 * @returns Date when verification token should expire
 */
export function getVerificationTokenExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
}

/**
 * Calculates the expiration date for a password reset token.
 * Password reset tokens expire in 15 minutes for security.
 * Short window minimizes exposure if token is intercepted.
 *
 * @returns Date when password reset token should expire
 */
export function getPasswordResetTokenExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
}

// ============================================================================
// Legacy/Compatibility Functions
// ============================================================================

/**
 * Generates a cryptographically secure random token.
 *
 * @param bytes - Number of random bytes (default: 32 = 256 bits)
 * @returns Hex-encoded random string
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Hashes a token for secure storage in the database.
 * Uses SHA-256 which is sufficient for random tokens.
 *
 * @param token - The token to hash
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Generates a verification token for email verification or password reset.
 * Returns both the token (to send to user) and hash (to store in DB).
 *
 * @returns Object containing token and its hash
 */
export function generateVerificationToken(): { token: string; hash: string } {
  const token = generateSecureToken(32);
  const hash = hashToken(token);
  return { token, hash };
}

/**
 * Checks if a bcrypt password hash needs to be upgraded to current cost factor.
 * Call this after successful login to maintain security over time.
 *
 * Note: This is a simplified check that only verifies the cost factor.
 * For full algorithm migration support, consider additional checks.
 *
 * @param hash - The stored password hash
 * @returns True if the hash should be re-generated with current parameters
 */
export function needsRehash(hash: string): boolean {
  try {
    // bcrypt hash format: $2a$XX$... or $2b$XX$... where XX is the cost factor
    const match = hash.match(/^\$2[aby]?\$(\d{2})\$/);
    if (!match) {
      // Not a valid bcrypt hash, definitely needs rehash
      return true;
    }

    const currentCost = parseInt(match[1], 10);
    return currentCost < BCRYPT_COST_FACTOR;
  } catch {
    // If we can't parse the hash, assume it needs rehashing
    return true;
  }
}

/**
 * Decodes a token without verification (for debugging/logging).
 * WARNING: Do not use for authentication - always verify tokens first.
 *
 * @param token - The JWT to decode
 * @returns Decoded payload or null if invalid format
 */
export function decodeTokenUnsafe(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | null;
  } catch {
    return null;
  }
}

/**
 * Token Encryption Utility
 *
 * Provides AES-256-GCM authenticated encryption for sensitive tokens
 * stored at rest in the database (OAuth access tokens, refresh tokens).
 *
 * Security Properties:
 * - AES-256-GCM provides both confidentiality and integrity
 * - Each encryption uses a unique random IV (96 bits / 12 bytes)
 * - Authentication tag prevents tampering with ciphertext
 * - Key derived via PBKDF2 from TOKEN_ENCRYPTION_KEY env var
 * - Key derivation uses a fixed application-scoped salt (not per-record)
 *   because the unique IV per encryption already prevents identical
 *   plaintexts from producing identical ciphertexts
 *
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 *
 * @module utils/crypto
 */

import crypto from "node:crypto";
import { createLogger } from "../logger/index.js";

const cryptoLogger = createLogger("crypto");

// =============================================================================
// CONSTANTS
// =============================================================================

const ALGORITHM = "aes-256-gcm" as const;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = "sha512";

/**
 * Application-scoped salt for PBKDF2 key derivation.
 * This is not a secret -- it prevents rainbow table attacks and
 * ensures the derived key is unique to this application.
 * The per-encryption random IV handles uniqueness per ciphertext.
 */
const APPLICATION_SALT = Buffer.from(
  "fluxboard-livestream-copilot-token-encryption-v1",
  "utf8"
);

// =============================================================================
// TYPES
// =============================================================================

export class TokenEncryptionError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "TokenEncryptionError";
    this.code = code;
    Object.setPrototypeOf(this, TokenEncryptionError.prototype);
  }

  static missingKey(): TokenEncryptionError {
    return new TokenEncryptionError(
      "TOKEN_ENCRYPTION_KEY environment variable is not configured. " +
        "Generate one with: openssl rand -base64 32",
      "MISSING_ENCRYPTION_KEY"
    );
  }

  static invalidKey(): TokenEncryptionError {
    return new TokenEncryptionError(
      "TOKEN_ENCRYPTION_KEY must be at least 32 characters. " +
        "Generate one with: openssl rand -base64 32",
      "INVALID_ENCRYPTION_KEY"
    );
  }

  static decryptionFailed(): TokenEncryptionError {
    return new TokenEncryptionError(
      "Failed to decrypt token. The encryption key may have changed " +
        "or the ciphertext is corrupted.",
      "DECRYPTION_FAILED"
    );
  }

  static invalidFormat(): TokenEncryptionError {
    return new TokenEncryptionError(
      "Encrypted token has invalid format. Expected iv:authTag:ciphertext.",
      "INVALID_CIPHERTEXT_FORMAT"
    );
  }
}

// =============================================================================
// KEY MANAGEMENT
// =============================================================================

/**
 * Cached derived key to avoid repeated PBKDF2 computation.
 * The key is derived once and reused for the lifetime of the process.
 */
let cachedDerivedKey: Buffer | null = null;
let cachedKeySource: string | null = null;

/**
 * Derives a 256-bit encryption key from the configured passphrase
 * using PBKDF2 with SHA-512.
 *
 * The derived key is cached in memory to avoid repeated key derivation
 * on every encrypt/decrypt call. If the source key changes (e.g. during
 * testing), the cache is invalidated.
 *
 * @returns 32-byte derived encryption key
 * @throws TokenEncryptionError if key is missing or invalid
 */
function getDerivedKey(): Buffer {
  const keySource = process.env.TOKEN_ENCRYPTION_KEY;

  if (!keySource) {
    throw TokenEncryptionError.missingKey();
  }

  if (keySource.length < 32) {
    throw TokenEncryptionError.invalidKey();
  }

  // Return cached key if source hasn't changed
  if (cachedDerivedKey !== null && cachedKeySource === keySource) {
    return cachedDerivedKey;
  }

  // Derive key using PBKDF2
  const derivedKey = crypto.pbkdf2Sync(
    keySource,
    APPLICATION_SALT,
    PBKDF2_ITERATIONS,
    KEY_LENGTH_BYTES,
    PBKDF2_DIGEST
  );

  cachedDerivedKey = derivedKey;
  cachedKeySource = keySource;

  cryptoLogger.debug("Encryption key derived successfully");

  return derivedKey;
}

// =============================================================================
// ENCRYPTION / DECRYPTION
// =============================================================================

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Each call generates a unique random IV, ensuring identical plaintexts
 * produce different ciphertexts. The authentication tag ensures the
 * ciphertext cannot be tampered with without detection.
 *
 * @param plaintext - The string to encrypt (e.g. an OAuth token)
 * @returns Encrypted string in format: base64(iv):base64(authTag):base64(ciphertext)
 * @throws TokenEncryptionError if encryption key is not configured
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) {
    throw new TokenEncryptionError(
      "Cannot encrypt empty or null value",
      "EMPTY_PLAINTEXT"
    );
  }

  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts an encrypted token string produced by encryptToken().
 *
 * Validates the authentication tag to ensure the ciphertext has not
 * been tampered with. Returns the original plaintext on success.
 *
 * @param encrypted - Encrypted string in format: base64(iv):base64(authTag):base64(ciphertext)
 * @returns The original plaintext string
 * @throws TokenEncryptionError if decryption fails (wrong key, corrupted data, tampered ciphertext)
 */
export function decryptToken(encrypted: string): string {
  if (!encrypted) {
    throw new TokenEncryptionError(
      "Cannot decrypt empty or null value",
      "EMPTY_CIPHERTEXT"
    );
  }

  const parts = encrypted.split(":");

  if (parts.length !== 3) {
    throw TokenEncryptionError.invalidFormat();
  }

  const [ivBase64, authTagBase64, ciphertextBase64] = parts;

  let iv: Buffer;
  let authTag: Buffer;
  let ciphertext: Buffer;

  try {
    iv = Buffer.from(ivBase64, "base64");
    authTag = Buffer.from(authTagBase64, "base64");
    ciphertext = Buffer.from(ciphertextBase64, "base64");
  } catch {
    throw TokenEncryptionError.invalidFormat();
  }

  // Validate component sizes
  if (iv.length !== IV_LENGTH_BYTES) {
    throw TokenEncryptionError.invalidFormat();
  }

  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw TokenEncryptionError.invalidFormat();
  }

  const key = getDerivedKey();

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    // Log at debug level to avoid leaking info in production,
    // but include enough detail for debugging key rotation issues
    cryptoLogger.debug(
      { code: (error as NodeJS.ErrnoException).code },
      "Token decryption failed"
    );

    throw TokenEncryptionError.decryptionFailed();
  }
}

// =============================================================================
// TESTING UTILITIES
// =============================================================================

/**
 * Clears the cached derived key.
 * Only intended for use in tests where TOKEN_ENCRYPTION_KEY changes
 * between test cases.
 *
 * @internal
 */
export function _clearKeyCache(): void {
  cachedDerivedKey = null;
  cachedKeySource = null;
}

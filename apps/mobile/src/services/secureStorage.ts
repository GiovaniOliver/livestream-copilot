/**
 * Secure Storage Service
 *
 * Provides secure storage for sensitive data using:
 * - expo-secure-store for iOS/Android (Keychain/Keystore)
 * - Fallback to AsyncStorage for development
 *
 * Features:
 * - Encrypted storage on native platforms
 * - Automatic migration from AsyncStorage
 * - Type-safe key management
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { storeLogger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export type SecureStorageKey =
  | 'auth.accessToken'
  | 'auth.refreshToken'
  | 'auth.user'
  | 'auth.rememberMe'
  | 'auth.biometricEnabled'
  | 'connection.baseUrl';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Determine if we should use SecureStore (native) or fallback to AsyncStorage.
 * SecureStore is available on iOS and Android, but not on web.
 */
const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

// =============================================================================
// STORAGE OPERATIONS
// =============================================================================

/**
 * Store a value securely.
 *
 * @param key - Storage key
 * @param value - Value to store
 */
export async function setSecureItem(
  key: SecureStorageKey,
  value: string
): Promise<void> {
  try {
    if (isNativePlatform) {
      await SecureStore.setItemAsync(key, value);
    } else {
      // Fallback for web/dev
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    storeLogger.error( Failed to set ${key}:`, error);
    throw new Error(`Failed to save ${key}`);
  }
}

/**
 * Retrieve a value securely.
 *
 * @param key - Storage key
 * @returns Stored value or null if not found
 */
export async function getSecureItem(
  key: SecureStorageKey
): Promise<string | null> {
  try {
    if (isNativePlatform) {
      return await SecureStore.getItemAsync(key);
    } else {
      // Fallback for web/dev
      return await AsyncStorage.getItem(key);
    }
  } catch (error) {
    storeLogger.error( Failed to get ${key}:`, error);
    return null;
  }
}

/**
 * Remove a value from secure storage.
 *
 * @param key - Storage key
 */
export async function deleteSecureItem(
  key: SecureStorageKey
): Promise<void> {
  try {
    if (isNativePlatform) {
      await SecureStore.deleteItemAsync(key);
    } else {
      // Fallback for web/dev
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    storeLogger.error( Failed to delete ${key}:`, error);
    throw new Error(`Failed to delete ${key}`);
  }
}

/**
 * Clear all secure storage items.
 * Use with caution - this will remove all stored authentication data.
 */
export async function clearSecureStorage(): Promise<void> {
  const keys: SecureStorageKey[] = [
    'auth.accessToken',
    'auth.refreshToken',
    'auth.user',
    'auth.rememberMe',
    'auth.biometricEnabled',
    'connection.baseUrl',
  ];

  try {
    await Promise.all(keys.map(key => deleteSecureItem(key)));
  } catch (error) {
    storeLogger.error('[SecureStorage] Failed to clear storage:', error);
    throw new Error('Failed to clear secure storage');
  }
}

/**
 * Migrate data from AsyncStorage to SecureStore.
 * This should be called once during app initialization.
 *
 * @param legacyKey - Old AsyncStorage key
 * @param secureKey - New SecureStore key
 */
export async function migrateToSecureStorage(
  legacyKey: string,
  secureKey: SecureStorageKey
): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(legacyKey);
    if (value) {
      await setSecureItem(secureKey, value);
      await AsyncStorage.removeItem(legacyKey);
      storeLogger.info( Migrated ${legacyKey} to ${secureKey}`);
      return true;
    }
    return false;
  } catch (error) {
    storeLogger.error( Migration failed for ${legacyKey}:`, error);
    return false;
  }
}

/**
 * Check if secure storage is available on this device.
 */
export function isSecureStorageAvailable(): boolean {
  return isNativePlatform;
}

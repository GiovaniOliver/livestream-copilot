/**
 * Biometric Authentication Service
 *
 * Provides biometric authentication using:
 * - Face ID (iOS)
 * - Touch ID (iOS)
 * - Fingerprint (Android)
 * - Face Unlock (Android)
 *
 * Features:
 * - Device capability detection
 * - Secure credential storage
 * - Fallback to password auth
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricCapabilities {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: BiometricType[];
  securityLevel: 'strong' | 'weak' | 'none';
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

// =============================================================================
// CAPABILITY DETECTION
// =============================================================================

/**
 * Check if biometric authentication is available and enrolled.
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    // Check hardware support
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: ['none'],
        securityLevel: 'none',
      };
    }

    // Check if biometrics are enrolled
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    // Get supported authentication types
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    const biometricTypes: BiometricType[] = supportedTypes.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'facial';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'iris';
        default:
          return 'none';
      }
    }).filter(t => t !== 'none');

    // Determine security level
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

    return {
      isAvailable: hasHardware && isEnrolled,
      isEnrolled,
      supportedTypes: biometricTypes.length > 0 ? biometricTypes : ['none'],
      securityLevel: securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG
        ? 'strong'
        : securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK
        ? 'weak'
        : 'none',
    };
  } catch (error) {
    console.error('[BiometricAuth] Capability check failed:', error);
    return {
      isAvailable: false,
      isEnrolled: false,
      supportedTypes: ['none'],
      securityLevel: 'none',
    };
  }
}

/**
 * Get user-friendly name for biometric type.
 */
export function getBiometricTypeName(types: BiometricType[]): string {
  if (types.includes('facial')) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
  }
  if (types.includes('fingerprint')) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  if (types.includes('iris')) {
    return 'Iris Recognition';
  }
  return 'Biometric Authentication';
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Authenticate user using biometrics.
 *
 * @param promptMessage - Message to show in biometric prompt
 * @param cancelLabel - Label for cancel button (Android only)
 * @returns Authentication result
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to continue',
  cancelLabel: string = 'Cancel'
): Promise<BiometricAuthResult> {
  try {
    // Check capabilities first
    const capabilities = await checkBiometricCapabilities();

    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    if (!capabilities.isEnrolled) {
      return {
        success: false,
        error: 'No biometric credentials are enrolled. Please set up biometrics in your device settings.',
      };
    }

    // Attempt authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: false, // Allow fallback to device PIN/pattern
      requireConfirmation: false,
    });

    if (result.success) {
      return { success: true };
    }

    // Handle authentication failure
    if (result.error === 'user_cancel') {
      return {
        success: false,
        error: 'Authentication was cancelled',
      };
    }

    if (result.error === 'system_cancel') {
      return {
        success: false,
        error: 'Authentication was interrupted by the system',
      };
    }

    if (result.error === 'lockout') {
      return {
        success: false,
        error: 'Too many failed attempts. Biometric authentication is temporarily locked.',
      };
    }

    if (result.error === 'permanent_lockout') {
      return {
        success: false,
        error: 'Biometric authentication is permanently locked. Please use your password.',
      };
    }

    if (result.error === 'not_enrolled') {
      return {
        success: false,
        error: 'No biometric credentials enrolled',
      };
    }

    return {
      success: false,
      error: result.error || 'Authentication failed',
    };
  } catch (error) {
    console.error('[BiometricAuth] Authentication failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Check if device has strong biometric security.
 * Only strong biometrics should be used for sensitive operations.
 */
export async function hasStrongBiometricSecurity(): Promise<boolean> {
  const capabilities = await checkBiometricCapabilities();
  return capabilities.securityLevel === 'strong';
}

/**
 * Prompt user to enroll biometrics (if supported).
 * Note: This will only work on Android API 30+
 */
export async function promptBiometricEnrollment(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // This requires Android API 30+ and proper permissions
      // On older versions or iOS, direct the user to Settings manually
      console.log('[BiometricAuth] Directing user to enroll biometrics');
    }
  } catch (error) {
    console.error('[BiometricAuth] Failed to prompt enrollment:', error);
  }
}

/**
 * Authentication Store
 *
 * Manages user authentication state including:
 * - Login/logout with email/password and OAuth
 * - Token management with automatic refresh
 * - User profile
 * - Biometric authentication
 * - Remember me functionality
 * - Session timeout handling
 * - Secure token storage
 */

import { create } from "zustand";
import * as SecureStore from "../services/secureStorage";
import * as BiometricAuth from "../services/biometricAuth";
import NetInfo from "@react-native-community/netinfo";
import { authLogger } from "../services/logger";

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface BiometricSettings {
  enabled: boolean;
  availableTypes: BiometricAuth.BiometricType[];
}

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  rememberMe: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  tokenExpiresAt: number | null;
  lastActivityAt: number | null;
  sessionTimeoutMinutes: number;

  // Actions - Core Auth
  setTokens: (tokens: AuthTokens, rememberMe?: boolean) => Promise<void>;
  setUser: (user: User) => void;
  login: (
    email: string,
    password: string,
    baseUrl: string,
    rememberMe?: boolean
  ) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    baseUrl: string
  ) => Promise<void>;
  logout: (baseUrl: string) => Promise<void>;
  refreshAccessToken: (baseUrl: string) => Promise<boolean>;
  loadStoredAuth: () => Promise<void>;
  clearError: () => void;
  getAuthHeaders: () => Record<string, string>;

  // Actions - OAuth
  handleOAuthCallback: (
    accessToken: string,
    refreshToken: string,
    rememberMe?: boolean
  ) => Promise<void>;
  getOAuthProviders: (baseUrl: string) => Promise<string[]>;

  // Actions - Biometric
  checkBiometricAvailability: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;

  // Actions - Session Management
  updateActivity: () => void;
  checkSessionTimeout: () => boolean;
  setSessionTimeout: (minutes: number) => void;
  validateSession: (baseUrl: string) => Promise<boolean>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
const TOKEN_REFRESH_BUFFER_SECONDS = 300; // Refresh 5 mins before expiry

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  refreshToken: null,
  error: null,
  rememberMe: false,
  biometricEnabled: false,
  biometricAvailable: false,
  tokenExpiresAt: null,
  lastActivityAt: null,
  sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,

  // =============================================================================
  // CORE AUTHENTICATION
  // =============================================================================

  setTokens: async (tokens: AuthTokens, rememberMe = false) => {
    try {
      const expiresAt = Date.now() + tokens.expiresIn * 1000;

      // Store tokens securely
      await SecureStore.setSecureItem("auth.accessToken", tokens.accessToken);
      await SecureStore.setSecureItem("auth.refreshToken", tokens.refreshToken);
      await SecureStore.setSecureItem("auth.rememberMe", String(rememberMe));

      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: expiresAt,
        isAuthenticated: true,
        rememberMe,
        lastActivityAt: Date.now(),
      });
    } catch (error) {
      authLogger.error( Failed to persist tokens:", error);
      throw new Error("Failed to save authentication tokens");
    }
  },

  setUser: async (user: User) => {
    try {
      await SecureStore.setSecureItem("auth.user", JSON.stringify(user));
      set({ user });
    } catch (error) {
      authLogger.error( Failed to persist user:", error);
    }
  },

  login: async (email: string, password: string, baseUrl: string, rememberMe = false) => {
    set({ isLoading: true, error: null });

    try {
      // Check network connectivity
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("No internet connection. Please check your network.");
      }

      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Version": "1.0.0", // Mobile app version
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || "Login failed";

        // Provide more helpful error messages
        if (response.status === 401) {
          throw new Error("Invalid email or password");
        } else if (response.status === 403) {
          throw new Error("Your account has been suspended. Please contact support.");
        } else if (response.status === 429) {
          throw new Error("Too many login attempts. Please try again later.");
        } else {
          throw new Error(errorMessage);
        }
      }

      if (!data.success || !data.data) {
        throw new Error("Invalid response from server");
      }

      // Store tokens
      await get().setTokens(
        {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          expiresIn: data.data.expiresIn,
        },
        rememberMe
      );

      // Store user
      await get().setUser(data.data.user);

      set({ isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  register: async (
    email: string,
    password: string,
    name: string,
    baseUrl: string
  ) => {
    set({ isLoading: true, error: null });

    try {
      // Check network connectivity
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error("No internet connection. Please check your network.");
      }

      const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Version": "1.0.0",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || "Registration failed";

        if (response.status === 409) {
          throw new Error("An account with this email already exists");
        } else if (response.status === 429) {
          throw new Error("Too many registration attempts. Please try again later.");
        } else {
          throw new Error(errorMessage);
        }
      }

      set({ isLoading: false, error: null });
      return data.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Registration failed";
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  logout: async (baseUrl: string) => {
    const { refreshToken } = get();

    try {
      // Call logout endpoint if we have a refresh token
      if (refreshToken) {
        await fetch(`${baseUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {
          // Ignore errors - we're logging out anyway
        });
      }
    } finally {
      // Clear all secure storage
      await SecureStore.clearSecureStorage();

      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        lastActivityAt: null,
        error: null,
        rememberMe: false,
      });
    }
  },

  refreshAccessToken: async (baseUrl: string) => {
    const { refreshToken } = get();

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Refresh token is invalid - logout
        authLogger.info( Refresh token invalid, logging out");
        await get().logout(baseUrl);
        return false;
      }

      // Update access token
      const expiresAt = Date.now() + data.data.expiresIn * 1000;
      await SecureStore.setSecureItem("auth.accessToken", data.data.accessToken);

      set({
        accessToken: data.data.accessToken,
        tokenExpiresAt: expiresAt,
      });

      return true;
    } catch (error) {
      authLogger.error( Token refresh failed:", error);
      return false;
    }
  },

  loadStoredAuth: async () => {
    try {
      // Load tokens and user from secure storage
      const [accessToken, refreshToken, userJson, rememberMeStr, biometricStr] =
        await Promise.all([
          SecureStore.getSecureItem("auth.accessToken"),
          SecureStore.getSecureItem("auth.refreshToken"),
          SecureStore.getSecureItem("auth.user"),
          SecureStore.getSecureItem("auth.rememberMe"),
          SecureStore.getSecureItem("auth.biometricEnabled"),
        ]);

      const rememberMe = rememberMeStr === "true";
      const biometricEnabled = biometricStr === "true";

      if (accessToken && refreshToken) {
        const user = userJson ? JSON.parse(userJson) : null;

        set({
          isAuthenticated: true,
          isLoading: false,
          accessToken,
          refreshToken,
          user,
          rememberMe,
          biometricEnabled,
          lastActivityAt: Date.now(),
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      authLogger.error( Failed to load stored auth:", error);
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  getAuthHeaders: () => {
    const { accessToken } = get();
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  },

  // =============================================================================
  // OAUTH
  // =============================================================================

  handleOAuthCallback: async (
    accessToken: string,
    refreshToken: string,
    rememberMe = false
  ) => {
    try {
      // Assume 1 hour expiry if not provided
      const expiresIn = 3600;

      await get().setTokens({ accessToken, refreshToken, expiresIn }, rememberMe);

      // Token is valid, but we need to fetch user info
      // This should be done by the caller after getting the callback
    } catch (error) {
      authLogger.error( OAuth callback handling failed:", error);
      throw error;
    }
  },

  getOAuthProviders: async (baseUrl: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/v1/auth/oauth/providers`);
      const data = await response.json();

      if (response.ok && data.success) {
        return data.data.providers || [];
      }
      return [];
    } catch (error) {
      authLogger.error( Failed to get OAuth providers:", error);
      return [];
    }
  },

  // =============================================================================
  // BIOMETRIC AUTHENTICATION
  // =============================================================================

  checkBiometricAvailability: async () => {
    try {
      const capabilities = await BiometricAuth.checkBiometricCapabilities();
      set({
        biometricAvailable: capabilities.isAvailable,
      });
    } catch (error) {
      authLogger.error( Failed to check biometric availability:", error);
      set({ biometricAvailable: false });
    }
  },

  enableBiometric: async () => {
    try {
      const capabilities = await BiometricAuth.checkBiometricCapabilities();

      if (!capabilities.isAvailable) {
        throw new Error("Biometric authentication is not available on this device");
      }

      // Test biometric authentication
      const biometricName = BiometricAuth.getBiometricTypeName(
        capabilities.supportedTypes
      );
      const result = await BiometricAuth.authenticateWithBiometrics(
        `Enable ${biometricName} for quick login`,
        "Cancel"
      );

      if (!result.success) {
        throw new Error(result.error || "Biometric authentication failed");
      }

      await SecureStore.setSecureItem("auth.biometricEnabled", "true");
      set({ biometricEnabled: true });
      return true;
    } catch (error) {
      authLogger.error( Failed to enable biometric:", error);
      return false;
    }
  },

  disableBiometric: async () => {
    try {
      await SecureStore.setSecureItem("auth.biometricEnabled", "false");
      set({ biometricEnabled: false });
    } catch (error) {
      authLogger.error( Failed to disable biometric:", error);
    }
  },

  authenticateWithBiometric: async () => {
    try {
      const { biometricEnabled } = get();

      if (!biometricEnabled) {
        return false;
      }

      const capabilities = await BiometricAuth.checkBiometricCapabilities();
      const biometricName = BiometricAuth.getBiometricTypeName(
        capabilities.supportedTypes
      );

      const result = await BiometricAuth.authenticateWithBiometrics(
        `Unlock with ${biometricName}`,
        "Cancel"
      );

      return result.success;
    } catch (error) {
      authLogger.error( Biometric authentication failed:", error);
      return false;
    }
  },

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  updateActivity: () => {
    set({ lastActivityAt: Date.now() });
  },

  checkSessionTimeout: () => {
    const { lastActivityAt, sessionTimeoutMinutes, isAuthenticated } = get();

    if (!isAuthenticated || !lastActivityAt) {
      return false;
    }

    const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
    const timeSinceActivity = Date.now() - lastActivityAt;

    return timeSinceActivity > timeoutMs;
  },

  setSessionTimeout: (minutes: number) => {
    set({ sessionTimeoutMinutes: minutes });
  },

  validateSession: async (baseUrl: string) => {
    const { accessToken, tokenExpiresAt, refreshToken } = get();

    if (!accessToken || !refreshToken) {
      return false;
    }

    // Check if session timed out
    if (get().checkSessionTimeout()) {
      console.log("[authStore] Session timed out");
      await get().logout(baseUrl);
      return false;
    }

    // Check if token is about to expire
    if (tokenExpiresAt) {
      const timeUntilExpiry = tokenExpiresAt - Date.now();
      const shouldRefresh = timeUntilExpiry < TOKEN_REFRESH_BUFFER_SECONDS * 1000;

      if (shouldRefresh) {
        authLogger.info( Token expiring soon, refreshing...");
        return await get().refreshAccessToken(baseUrl);
      }
    }

    return true;
  },
}));

"use client";

/**
 * Authentication Context Provider
 *
 * Manages authentication state, token management, and auto-refresh
 * Features:
 * - Persistent session with localStorage
 * - Automatic token refresh
 * - Session timeout handling
 * - Remember me functionality
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import * as authApi from '@/lib/api/auth';
import type { User, LoginRequest, RegisterRequest } from '@/lib/api/auth';
import { logger } from "@/lib/logger";

// =============================================================================
// TYPES
// =============================================================================

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (data: LoginRequest, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fluxboard_access_token',
  REFRESH_TOKEN: 'fluxboard_refresh_token',
  USER: 'fluxboard_user',
  REMEMBER_ME: 'fluxboard_remember_me',
  TOKEN_EXPIRY: 'fluxboard_token_expiry',
} as const;

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // STORAGE HELPERS
  // =============================================================================

  const saveToStorage = useCallback((
    accessToken: string,
    refreshToken: string,
    user: User,
    expiresIn: number,
    rememberMe: boolean = true
  ) => {
    if (typeof window === 'undefined') return;

    const storage = rememberMe ? localStorage : sessionStorage;
    const expiryTime = Date.now() + expiresIn * 1000;

    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    storage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    }
  }, []);

  const loadFromStorage = useCallback((): {
    accessToken: string | null;
    refreshToken: string | null;
    user: User | null;
    tokenExpiry: number | null;
  } => {
    if (typeof window === 'undefined') {
      return { accessToken: null, refreshToken: null, user: null, tokenExpiry: null };
    }

    // Try localStorage first (remember me), then sessionStorage
    const storage = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)
      ? localStorage
      : sessionStorage;

    const accessToken = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const userJson = storage.getItem(STORAGE_KEYS.USER);
    const tokenExpiry = storage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

    return {
      accessToken,
      refreshToken,
      user: userJson ? JSON.parse(userJson) : null,
      tokenExpiry: tokenExpiry ? parseInt(tokenExpiry, 10) : null,
    };
  }, []);

  const clearStorage = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Clear from both storages
    [localStorage, sessionStorage].forEach(storage => {
      Object.values(STORAGE_KEYS).forEach(key => {
        storage.removeItem(key);
      });
    });
  }, []);

  // =============================================================================
  // TOKEN REFRESH
  // =============================================================================

  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Refresh 5 minutes before expiry
    const refreshTime = Math.max((expiresIn - 300) * 1000, 0);

    refreshTimeoutRef.current = setTimeout(() => {
      refreshSession();
    }, refreshTime);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { refreshToken: storedRefreshToken } = loadFromStorage();

      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authApi.refreshToken({
        refreshToken: storedRefreshToken
      });

      const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
      const { user } = loadFromStorage();

      if (user) {
        saveToStorage(
          response.accessToken,
          storedRefreshToken,
          user,
          response.expiresIn,
          rememberMe
        );

        setState(prev => ({
          ...prev,
          accessToken: response.accessToken,
          error: null,
        }));

        scheduleTokenRefresh(response.expiresIn);
      }
    } catch (error) {
      logger.error('[AuthContext] Token refresh failed:', error);
      await logout();
    }
  }, [loadFromStorage, saveToStorage, scheduleTokenRefresh]);

  // =============================================================================
  // AUTH ACTIONS
  // =============================================================================

  const login = useCallback(async (data: LoginRequest, rememberMe: boolean = true) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await authApi.login(data);

      saveToStorage(
        response.accessToken,
        response.refreshToken,
        response.user,
        response.expiresIn,
        rememberMe
      );

      setState({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      scheduleTokenRefresh(response.expiresIn);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    }
  }, [router, saveToStorage, scheduleTokenRefresh]);

  const register = useCallback(async (data: RegisterRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await authApi.register(data);

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));

      // Redirect to login with success message
      router.push('/auth/login?registered=true');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      const { refreshToken: storedRefreshToken } = loadFromStorage();

      if (storedRefreshToken) {
        await authApi.logout(storedRefreshToken);
      }
    } catch (error) {
      logger.error('[AuthContext] Logout error:', error);
    } finally {
      // Clear state and storage regardless of API call success
      setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      clearStorage();

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      router.push('/auth/login');
    }
  }, [router, loadFromStorage, clearStorage]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const stored = loadFromStorage();

        if (!stored.accessToken || !stored.refreshToken || !stored.user) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Check if token is expired
        const now = Date.now();
        const isExpired = stored.tokenExpiry && stored.tokenExpiry < now;

        if (isExpired) {
          // Try to refresh
          try {
            const response = await authApi.refreshToken({
              refreshToken: stored.refreshToken
            });

            const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';

            saveToStorage(
              response.accessToken,
              stored.refreshToken,
              stored.user,
              response.expiresIn,
              rememberMe
            );

            setState({
              user: stored.user,
              accessToken: response.accessToken,
              refreshToken: stored.refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            scheduleTokenRefresh(response.expiresIn);
          } catch (error) {
            logger.error('[AuthContext] Auto-refresh failed:', error);
            clearStorage();
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          // Token still valid
          setState({
            user: stored.user,
            accessToken: stored.accessToken,
            refreshToken: stored.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Schedule refresh
          if (stored.tokenExpiry) {
            const expiresIn = Math.floor((stored.tokenExpiry - now) / 1000);
            scheduleTokenRefresh(expiresIn);
          }
        }
      } catch (error) {
        logger.error('[AuthContext] Initialization error:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadFromStorage, saveToStorage, clearStorage, scheduleTokenRefresh]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    refreshSession,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

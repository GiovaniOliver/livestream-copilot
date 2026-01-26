/**
 * Authentication API Client
 *
 * Handles all authentication-related API calls including:
 * - Registration, login, logout
 * - Token refresh and management
 * - Password reset flow
 * - OAuth integration
 * - Session management
 */

import { apiClient } from './client';

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
  platformRole: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  organizations?: Array<{
    id: string;
    name: string;
    slug?: string;
    role: string;
    joinedAt?: string;
  }>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface OAuthProvider {
  name: string;
  enabled: boolean;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Register a new user account
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<ApiResponse<RegisterResponse>>(
    '/api/v1/auth/register',
    data
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Registration failed');
  }

  return response.data;
}

/**
 * Login with email and password
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/v1/auth/login',
    data
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Login failed');
  }

  return response.data;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const response = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
    '/api/v1/auth/refresh',
    data
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Token refresh failed');
  }

  return response.data;
}

/**
 * Logout by revoking refresh token
 */
export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/api/v1/auth/logout', { refreshToken });
}

/**
 * Logout from all sessions
 */
export async function logoutAll(accessToken: string): Promise<void> {
  await apiClient.post(
    '/api/v1/auth/logout-all',
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(accessToken: string): Promise<User> {
  const response = await apiClient.get<ApiResponse<{ user: User }>>(
    '/api/v1/auth/me',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    } as any
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get user');
  }

  return response.data.user;
}

/**
 * Request password reset email
 */
export async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  await apiClient.post('/api/v1/auth/forgot-password', data);
}

/**
 * Reset password with token
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  const response = await apiClient.post<ApiResponse<{ message: string }>>(
    '/api/v1/auth/reset-password',
    data
  );

  if (!response.success) {
    throw new Error(response.error?.message || 'Password reset failed');
  }
}

/**
 * Verify email address with token
 */
export async function verifyEmail(data: VerifyEmailRequest): Promise<void> {
  const response = await apiClient.post<ApiResponse<{ message: string; user: User }>>(
    '/api/v1/auth/verify-email',
    data
  );

  if (!response.success) {
    throw new Error(response.error?.message || 'Email verification failed');
  }
}

/**
 * Resend verification email
 */
export async function resendVerification(email: string): Promise<void> {
  await apiClient.post('/api/v1/auth/resend-verification', { email });
}

/**
 * Get available OAuth providers
 */
export async function getOAuthProviders(): Promise<OAuthProvider[]> {
  const response = await apiClient.get<ApiResponse<{ providers: OAuthProvider[] }>>(
    '/api/v1/auth/oauth/providers'
  );

  if (!response.success || !response.data) {
    return [];
  }

  return response.data.providers;
}

/**
 * Get OAuth authorization URL for a provider
 */
export function getOAuthUrl(provider: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3123';
  return `${baseUrl}/api/v1/auth/oauth/${provider}`;
}

/**
 * Get user's linked OAuth connections
 */
export async function getOAuthConnections(accessToken: string): Promise<any[]> {
  const response = await apiClient.get<ApiResponse<{ connections: any[] }>>(
    '/api/v1/auth/oauth/connections',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    } as any
  );

  if (!response.success || !response.data) {
    return [];
  }

  return response.data.connections;
}

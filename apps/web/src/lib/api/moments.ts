/**
 * Moments API methods for FluxBoard
 *
 * Provides API methods for managing moment markers (hype moments, Q&A, sponsor reads, etc.)
 * Enhanced with comprehensive Zod schema validation for runtime type safety
 */

import { apiClient, type RequestOptions } from "./client";
import {
  momentsListResponseSchema,
  createMomentResponseSchema,
  type MomentType,
  type MomentInfo,
  type PaginationInfo,
} from "./schemas";

/**
 * Create request options with optional auth header
 */
function withAuth(accessToken?: string, options: RequestOptions = {}): RequestOptions {
  if (!accessToken) return options;

  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

/**
 * Get moments for a session
 * @param sessionId - Session ID
 * @param options - Query options
 * @param token - Optional auth token
 */
export async function getSessionMoments(
  sessionId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {},
  token?: string
): Promise<{ moments: MomentInfo[]; pagination: PaginationInfo }> {
  const { limit = 100, offset = 0 } = options;

  const response = await apiClient.get(
    `/api/sessions/${encodeURIComponent(sessionId)}/events/moments`,
    momentsListResponseSchema,
    withAuth(token, { params: { limit, offset } })
  );

  return response.data;
}

/**
 * Create a new moment marker
 * @param sessionId - Session ID
 * @param moment - Moment data
 * @param token - Optional auth token
 */
export async function createMoment(
  sessionId: string,
  moment: {
    type?: MomentType;
    label: string;
    description?: string;
    timestamp: number;
    clipId?: string;
  },
  token?: string
): Promise<MomentInfo> {
  const response = await apiClient.post(
    `/api/sessions/${encodeURIComponent(sessionId)}/events/moments`,
    createMomentResponseSchema,
    moment,
    withAuth(token)
  );

  return response.data.moment;
}

/**
 * Get all moments (across sessions) with optional filtering
 * @param options - Query options
 * @param token - Optional auth token
 */
export async function getMoments(
  options: {
    sessionId?: string;
    limit?: number;
    offset?: number;
  } = {},
  token?: string
): Promise<{ moments: MomentInfo[]; pagination: PaginationInfo }> {
  const { sessionId, limit = 100, offset = 0 } = options;

  const params: Record<string, string | number> = { limit, offset };
  if (sessionId) params.sessionId = sessionId;

  const response = await apiClient.get(
    "/api/events/moments",
    momentsListResponseSchema,
    withAuth(token, { params })
  );

  return response.data;
}

// Re-export types for convenience
export type { MomentType, MomentInfo, PaginationInfo };

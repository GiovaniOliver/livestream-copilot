/**
 * Moments API methods for FluxBoard
 *
 * Provides API methods for managing moment markers (hype moments, Q&A, sponsor reads, etc.)
 */

import { apiClient, type RequestOptions } from "./client";

/**
 * Moment type categories
 */
export type MomentType = "hype" | "qa" | "sponsor" | "clip" | "highlight" | "marker";

/**
 * Moment information from the API
 */
export interface MomentInfo {
  id: string;
  sessionId: string;
  type: MomentType;
  label: string;
  description?: string;
  timestamp: number; // in seconds from session start
  clipId?: string;
  createdAt: string;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
}

/**
 * Response from the moments list endpoint
 */
interface MomentsListResponse {
  success: boolean;
  data: {
    moments: MomentInfo[];
    pagination: PaginationInfo;
  };
}

/**
 * Response from the create moment endpoint
 */
interface CreateMomentResponse {
  success: boolean;
  data: {
    moment: MomentInfo;
  };
}

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

  const response = await apiClient.get<MomentsListResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/events/moments`,
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
  const response = await apiClient.post<CreateMomentResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/events/moments`,
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

  const response = await apiClient.get<MomentsListResponse>(
    "/api/events/moments",
    withAuth(token, { params })
  );

  return response.data;
}

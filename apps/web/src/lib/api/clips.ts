/**
 * Clip API methods for FluxBoard
 * Enhanced with comprehensive Zod schema validation for runtime type safety
 */

import { apiClient } from "./client";
import {
  clipsListResponseSchema,
  clipResponseSchema,
  clipIntentResponseSchema,
  exportClipResponseSchema,
  apiResponseSchema,
  type ClipInfo,
} from "./schemas";

/**
 * Clip intent start/end response
 */
export interface ClipIntentResponse {
  success: boolean;
  sessionId: string;
  t: number;
  source: "gesture" | "voice" | "button" | "api";
}

/**
 * Get all clips for a session
 * @param sessionId - Session ID
 * @param limit - Maximum number of clips to return (default: 100)
 * @param offset - Number of clips to skip (default: 0)
 * @param token - Optional auth token
 */
export async function getSessionClips(
  sessionId: string,
  limit = 100,
  offset = 0,
  token?: string
): Promise<{ clips: ClipInfo[]; pagination: { limit: number; offset: number; total: number } }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await apiClient.get(
    `/api/sessions/${sessionId}/clips`,
    clipsListResponseSchema,
    {
      params: { limit, offset },
      headers,
    }
  );

  return response.data;
}

/**
 * Get a single clip by ID or artifact ID
 * @param id - Clip ID or artifact ID
 * @param token - Optional auth token
 */
export async function getClip(id: string, token?: string): Promise<ClipInfo> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await apiClient.get(
    `/api/clips/${id}`,
    clipResponseSchema,
    { headers }
  );

  return response.data.clip;
}

/**
 * Start a clip (mark clip intent start)
 * @param t - Timestamp in seconds from session start
 * @param source - Source of the clip intent
 */
export async function startClip(
  t: number,
  source: "gesture" | "voice" | "button" | "api" = "api"
): Promise<ClipIntentResponse> {
  return apiClient.post(
    "/api/clips/start",
    clipIntentResponseSchema,
    { t, source }
  );
}

/**
 * End a clip (mark clip intent end)
 * @param t - Timestamp in seconds from session start
 * @param source - Source of the clip intent
 */
export async function endClip(
  t: number,
  source: "gesture" | "voice" | "button" | "api" = "api"
): Promise<ClipIntentResponse> {
  return apiClient.post(
    "/api/clips/end",
    clipIntentResponseSchema,
    { t, source }
  );
}

/**
 * Get the URL for a clip's media file
 * @param artifactId - Artifact ID of the clip
 */
export function getClipMediaUrl(artifactId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3123";
  return `${baseUrl}/api/clips/${artifactId}/media`;
}

/**
 * Get the URL for a clip's thumbnail
 * @param artifactId - Artifact ID of the clip
 */
export function getClipThumbnailUrl(artifactId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3123";
  return `${baseUrl}/api/clips/${artifactId}/thumbnail`;
}

/**
 * Delete a clip
 * @param id - Clip ID or artifact ID to delete
 * @param token - Optional auth token
 */
export async function deleteClip(
  id: string,
  token?: string
): Promise<{ success: boolean }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const deleteResponseSchema = apiResponseSchema(undefined);

  return apiClient.delete(
    `/api/clips/${id}`,
    deleteResponseSchema,
    { headers }
  );
}

/**
 * Export a clip to a specific format
 * @param artifactId - Artifact ID of the clip
 * @param format - Target format (mp4, webm, gif)
 */
export async function exportClip(
  artifactId: string,
  format: "mp4" | "webm" | "gif" = "mp4"
): Promise<{ exportId: string; status: string }> {
  return apiClient.post(
    `/api/clips/${artifactId}/export`,
    exportClipResponseSchema,
    { format }
  );
}

// Re-export types for convenience
export type { ClipInfo };

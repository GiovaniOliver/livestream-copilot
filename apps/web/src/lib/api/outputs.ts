/**
 * Outputs API methods for FluxBoard
 *
 * Provides API methods for managing outputs (AI-generated post drafts, content suggestions, etc.)
 * Enhanced with comprehensive Zod schema validation for runtime type safety
 */

import { apiClient, type RequestOptions } from "./client";
import {
  outputsListResponseSchema,
  outputResponseSchema,
  outputMutationResponseSchema,
  approveAllResponseSchema,
  type OutputStatus,
  type OutputInfo,
  type PaginationInfo,
} from "./schemas";

/**
 * Output with session information
 */
export interface OutputWithSession extends OutputInfo {
  session: {
    id: string;
    workflow: string;
    title: string | null;
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
 * Get outputs for a session
 * @param sessionId - Session ID
 * @param options - Query options
 * @param token - Optional auth token
 */
export async function getSessionOutputs(
  sessionId: string,
  options: {
    category?: string;
    status?: OutputStatus;
    limit?: number;
    offset?: number;
  } = {},
  token?: string
): Promise<{ outputs: OutputInfo[]; pagination: PaginationInfo }> {
  const { category, status, limit = 50, offset = 0 } = options;

  const params: Record<string, string | number> = {
    sessionId,
    limit,
    offset,
  };

  if (category) params.category = category;
  if (status) params.status = status;

  const response = await apiClient.get(
    "/api/outputs",
    outputsListResponseSchema,
    withAuth(token, { params })
  );

  return response.data;
}

/**
 * Get a single output by ID
 * @param id - Output ID
 * @param token - Optional auth token
 */
export async function getOutput(id: string, token?: string): Promise<OutputWithSession> {
  const response = await apiClient.get(
    `/api/outputs/${encodeURIComponent(id)}`,
    outputResponseSchema,
    withAuth(token)
  );

  return response.data.output;
}

/**
 * Update an output
 * @param id - Output ID
 * @param updates - Fields to update
 * @param token - Optional auth token
 */
export async function updateOutput(
  id: string,
  updates: {
    title?: string;
    text?: string;
    refs?: string[];
    meta?: Record<string, unknown>;
    status?: OutputStatus;
  },
  token?: string
): Promise<OutputInfo> {
  const response = await apiClient.patch(
    `/api/outputs/${encodeURIComponent(id)}`,
    outputMutationResponseSchema,
    updates,
    withAuth(token)
  );

  if (!response.data.output) {
    throw new Error("Output not returned from update");
  }

  return response.data.output;
}

/**
 * Update only the output status
 * @param id - Output ID
 * @param status - New status
 * @param token - Optional auth token
 */
export async function updateOutputStatus(
  id: string,
  status: OutputStatus,
  token?: string
): Promise<OutputInfo> {
  const response = await apiClient.patch(
    `/api/outputs/${encodeURIComponent(id)}/status`,
    outputMutationResponseSchema,
    { status },
    withAuth(token)
  );

  if (!response.data.output) {
    throw new Error("Output not returned from status update");
  }

  return response.data.output;
}

/**
 * Delete an output
 * @param id - Output ID
 * @param token - Optional auth token
 */
export async function deleteOutput(id: string, token?: string): Promise<void> {
  await apiClient.delete(
    `/api/outputs/${encodeURIComponent(id)}`,
    outputMutationResponseSchema,
    withAuth(token)
  );
}

/**
 * Approve all draft outputs for a session
 * @param sessionId - Session ID
 * @param token - Optional auth token
 */
export async function approveAllDrafts(
  sessionId: string,
  token?: string
): Promise<{ count: number }> {
  const response = await apiClient.post(
    `/api/sessions/${encodeURIComponent(sessionId)}/outputs/approve-all`,
    approveAllResponseSchema,
    {},
    withAuth(token)
  );

  return { count: response.data.count };
}

/**
 * Regenerate output content using AI
 * @param id - Output ID
 * @param options - Regeneration options
 * @param token - Optional auth token
 * @returns Updated output with regenerated content
 *
 * @example
 * ```ts
 * // Regenerate with default AI settings
 * const output = await regenerateOutput('output-123');
 *
 * // Regenerate with custom instructions
 * const output = await regenerateOutput('output-123', {
 *   instructions: 'Make it more casual and add emojis'
 * });
 * ```
 */
export async function regenerateOutput(
  id: string,
  options?: {
    instructions?: string;
  },
  token?: string
): Promise<OutputInfo> {
  const response = await apiClient.post(
    `/api/outputs/${encodeURIComponent(id)}/regenerate`,
    outputMutationResponseSchema,
    {
      instructions: options?.instructions,
    },
    withAuth(token, { timeout: 60000 }) // 60 second timeout for AI generation
  );

  if (!response.data.output) {
    throw new Error("Output not returned from regeneration");
  }

  return response.data.output;
}

// Re-export types for convenience
export type { OutputStatus, OutputInfo, PaginationInfo };

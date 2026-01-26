/**
 * Outputs API methods for FluxBoard
 *
 * Provides API methods for managing outputs (AI-generated post drafts, content suggestions, etc.)
 */

import { apiClient, type RequestOptions } from "./client";

/**
 * Output status types
 */
export type OutputStatus = "draft" | "approved" | "published" | "archived";

/**
 * Output information from the API
 */
export interface OutputInfo {
  id: string;
  sessionId: string;
  category: string;
  title: string | null;
  text: string;
  refs: string[];
  meta: Record<string, unknown> | null;
  status: OutputStatus;
  createdAt: string;
  updatedAt: string;
}

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
 * Pagination information
 */
export interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
}

/**
 * Response from the outputs list endpoint
 */
interface OutputsListResponse {
  success: boolean;
  data: {
    outputs: OutputInfo[];
    pagination: PaginationInfo;
  };
}

/**
 * Response from the get output endpoint
 */
interface OutputResponse {
  success: boolean;
  data: {
    output: OutputWithSession;
  };
}

/**
 * Response from update/delete operations
 */
interface OutputMutationResponse {
  success: boolean;
  data: {
    output?: OutputInfo;
    message?: string;
  };
}

/**
 * Response from approve all drafts
 */
interface ApproveAllResponse {
  success: boolean;
  data: {
    message: string;
    count: number;
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

  const response = await apiClient.get<OutputsListResponse>(
    "/api/outputs",
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
  const response = await apiClient.get<OutputResponse>(
    `/api/outputs/${encodeURIComponent(id)}`,
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
  const response = await apiClient.patch<OutputMutationResponse>(
    `/api/outputs/${encodeURIComponent(id)}`,
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
  const response = await apiClient.patch<OutputMutationResponse>(
    `/api/outputs/${encodeURIComponent(id)}/status`,
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
  await apiClient.delete<OutputMutationResponse>(
    `/api/outputs/${encodeURIComponent(id)}`,
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
  const response = await apiClient.post<ApproveAllResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/outputs/approve-all`,
    {},
    withAuth(token)
  );

  return { count: response.data.count };
}

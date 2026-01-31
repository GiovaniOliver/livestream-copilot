/**
 * Session API methods for FluxBoard
 *
 * All API calls support optional authentication via accessToken parameter.
 * When provided, the Authorization header will be included in requests.
 *
 * Enhanced with comprehensive Zod schema validation for runtime type safety.
 */

import { apiClient, type RequestOptions } from "./client";
import type { SessionConfig } from "@livestream-copilot/shared";
import {
  getSessionsResponseSchema,
  getSessionByIdResponseSchema,
  startSessionResponseSchema,
  endSessionResponseSchema,
  forceStopSessionResponseSchema,
  sessionStatusResponseSchema,
  getSessionOutputsResponseSchema,
  updateSessionResponseSchema,
  apiResponseSchema,
  sessionListItemSchema,
  sessionOutputSchema,
  type SessionListItem,
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
 * Full session details with events (for compatibility)
 */
export interface SessionDetails {
  sessionId: string;
  workflow: SessionConfig["workflow"];
  captureMode: SessionConfig["captureMode"];
  title?: string;
  startedAt: number;
  endedAt?: number;
  clipCount: number;
  outputCount: number;
  participants: SessionConfig["participants"];
  events?: Array<{
    id: string;
    type: string;
    ts: number;
    payload: unknown;
  }>;
}

/**
 * Configuration for starting a new session
 */
export interface StartSessionConfig {
  workflow: SessionConfig["workflow"];
  captureMode: SessionConfig["captureMode"];
  title?: string;
  participants?: Array<{ id: string; name: string }>;
}

/**
 * Response from starting a session
 */
export interface StartSessionResponse {
  sessionId: string;
  startedAt: number;
}

/**
 * Response from ending a session
 */
export interface EndSessionResponse {
  sessionId: string;
  endedAt: number;
  duration: number;
  clipCount: number;
  outputCount: number;
}

/**
 * Session output item
 */
export interface SessionOutput {
  id: string;
  sessionId: string;
  type: string;
  label: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Get all sessions from the backend API
 * @param limit - Maximum number of sessions to return (default: 50)
 * @param offset - Number of sessions to skip (default: 0)
 * @param accessToken - Optional access token for authentication
 */
export async function getSessions(
  limit = 50,
  offset = 0,
  accessToken?: string
): Promise<{ sessions: SessionListItem[]; pagination: PaginationInfo }> {
  const response = await apiClient.get(
    "/api/sessions",
    getSessionsResponseSchema,
    withAuth(accessToken, { params: { limit, offset } })
  );

  if (!response.success) {
    throw new Error("Failed to fetch sessions");
  }

  return response.data;
}

/**
 * Get a single session by ID from the backend API
 * @param id - Session ID
 * @param accessToken - Optional access token for authentication
 */
export async function getSessionById(
  id: string,
  accessToken?: string
): Promise<SessionListItem> {
  const response = await apiClient.get(
    `/api/sessions/${encodeURIComponent(id)}`,
    getSessionByIdResponseSchema,
    withAuth(accessToken)
  );

  if (!response.success) {
    throw new Error(`Failed to fetch session ${id}`);
  }

  return response.data.session;
}

/**
 * @deprecated Use getSessions instead
 * List all sessions (legacy function for compatibility)
 */
export async function listSessions(
  limit = 50,
  offset = 0
): Promise<SessionListItem[]> {
  const { sessions } = await getSessions(limit, offset);
  return sessions;
}

/**
 * @deprecated Use getSessionById instead
 * Get a single session by ID (legacy function for compatibility)
 */
export async function getSession(
  id: string,
  _includeEvents = false
): Promise<SessionDetails> {
  const session = await getSessionById(id);

  // Map new API format to legacy SessionDetails format
  return {
    sessionId: session.id,
    workflow: session.workflow,
    captureMode: session.captureMode,
    title: session.title || undefined,
    startedAt: new Date(session.startedAt).getTime(),
    endedAt: session.endedAt ? new Date(session.endedAt).getTime() : undefined,
    clipCount: session.counts.clips,
    outputCount: session.counts.outputs,
    participants: session.participants.map((name, index) => ({
      id: `participant-${index}`,
      name,
    })),
  };
}

/**
 * Start a new session
 * @param config - Session configuration
 * @param accessToken - Optional access token for authentication
 */
export async function startSession(
  config: StartSessionConfig,
  accessToken?: string
): Promise<StartSessionResponse> {
  // Map frontend config to backend format
  const backendConfig = {
    workflow: config.workflow,
    captureMode: config.captureMode,
    title: config.title || "Untitled Session",
    participants: config.participants || [],
  };

  return apiClient.post(
    "/session/start",
    startSessionResponseSchema,
    backendConfig,
    withAuth(accessToken)
  );
}

/**
 * End a session by ID
 * Calls POST /api/sessions/:id/end to mark the session as ended in the database.
 * @param id - Session ID to end
 * @param accessToken - Optional access token for authentication
 */
export async function endSession(
  id: string,
  accessToken?: string
): Promise<EndSessionResponse> {
  const response = await apiClient.post(
    `/api/sessions/${encodeURIComponent(id)}/end`,
    endSessionResponseSchema,
    {},
    withAuth(accessToken)
  );

  if (!response.success) {
    throw new Error("Failed to end session");
  }

  const { session, duration } = response.data;

  return {
    sessionId: session.id,
    endedAt: session.endedAt ? new Date(session.endedAt).getTime() : Date.now(),
    duration: duration || 0,
    clipCount: session.counts?.clips || 0,
    outputCount: session.counts?.outputs || 0,
  };
}

/**
 * Force-stop the active session in memory
 * @param accessToken - Optional access token for authentication
 */
export async function forceStopSession(
  accessToken?: string
): Promise<{ ok: boolean; message: string }> {
  return apiClient.post(
    "/session/force-stop",
    forceStopSessionResponseSchema,
    {},
    withAuth(accessToken)
  );
}

/**
 * Get the currently active session, if any
 * @param accessToken - Optional access token for authentication
 */
export async function getActiveSession(
  accessToken?: string
): Promise<SessionDetails | null> {
  try {
    const response = await apiClient.get(
      "/session/status",
      sessionStatusResponseSchema,
      withAuth(accessToken)
    );

    if (!response.ok || !response.active || !response.sessionId) {
      return null;
    }

    // Use the new top-level fields from the backend response
    // Fall back to legacy nested fields if needed
    const workflow = response.workflow || response.session?.workflow || "streamer";
    const captureMode = response.captureMode || response.session?.captureMode || "av";
    const title = response.title || response.session?.title || "Active Session";
    const startedAt = response.startedAt || response.t0 || Date.now();
    const participants = response.participants || response.session?.participants || [];

    return {
      sessionId: response.sessionId,
      workflow: workflow as SessionConfig["workflow"],
      captureMode: captureMode as SessionConfig["captureMode"],
      title,
      startedAt,
      clipCount: 0,
      outputCount: 0,
      participants: participants.map((p, index) =>
        typeof p === "string"
          ? { id: `participant-${index}`, name: p }
          : p
      ),
    };
  } catch (error) {
    // Network error or server down
    return null;
  }
}

/**
 * Get outputs for a specific session
 * @param id - Session ID
 * @param accessToken - Optional access token for authentication
 */
export async function getSessionOutputs(
  id: string,
  accessToken?: string
): Promise<SessionOutput[]> {
  const response = await apiClient.get(
    `/api/sessions/${encodeURIComponent(id)}/outputs`,
    getSessionOutputsResponseSchema,
    withAuth(accessToken)
  );

  if (!response.success) {
    throw new Error(`Failed to fetch outputs for session ${id}`);
  }

  return response.data.outputs;
}

/**
 * Update session metadata
 * @param id - Session ID
 * @param updates - Partial session updates (title, participants)
 * @param accessToken - Optional access token for authentication
 */
export async function updateSession(
  id: string,
  updates: { title?: string; participants?: string[] },
  accessToken?: string
): Promise<SessionListItem> {
  const response = await apiClient.patch(
    `/api/sessions/${encodeURIComponent(id)}`,
    updateSessionResponseSchema,
    updates,
    withAuth(accessToken)
  );

  if (!response.success) {
    throw new Error(`Failed to update session ${id}`);
  }

  return response.data.session;
}

/**
 * Delete a session
 * @param id - Session ID
 * @param accessToken - Optional access token for authentication
 */
export async function deleteSession(
  id: string,
  accessToken?: string
): Promise<void> {
  const deleteResponseSchema = apiResponseSchema(sessionListItemSchema.optional());

  const response = await apiClient.delete(
    `/api/sessions/${encodeURIComponent(id)}`,
    deleteResponseSchema,
    withAuth(accessToken)
  );

  if (!response.success) {
    throw new Error(`Failed to delete session ${id}`);
  }
}

// Re-export types from schemas for convenience
export type { SessionListItem, PaginationInfo };

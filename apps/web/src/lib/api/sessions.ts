/**
 * Session API methods for FluxBoard
 *
 * All API calls support optional authentication via accessToken parameter.
 * When provided, the Authorization header will be included in requests.
 */

import { apiClient, type RequestOptions } from "./client";
import type { SessionConfig } from "@livestream-copilot/shared";

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
 * Session list item returned from the API
 */
export interface SessionListItem {
  id: string;
  workflow: SessionConfig["workflow"];
  captureMode: SessionConfig["captureMode"];
  title: string | null;
  participants: string[];
  startedAt: string; // ISO date
  endedAt: string | null;
  isActive: boolean;
  counts: {
    events: number;
    outputs: number;
    clips: number;
  };
}

/**
 * Pagination info from API responses
 */
export interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
}

/**
 * Response from GET /api/sessions
 */
export interface GetSessionsResponse {
  success: boolean;
  data: {
    sessions: SessionListItem[];
    pagination: PaginationInfo;
  };
}

/**
 * Response from GET /api/sessions/:id
 */
export interface GetSessionByIdResponse {
  success: boolean;
  data: {
    session: SessionListItem;
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
  const response = await apiClient.get<GetSessionsResponse>(
    "/api/sessions",
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
  const response = await apiClient.get<GetSessionByIdResponse>(
    `/api/sessions/${encodeURIComponent(id)}`,
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

  return apiClient.post<StartSessionResponse>(
    "/session/start",
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
  const response = await apiClient.post<{
    success: boolean;
    data: {
      session: SessionListItem;
      duration?: number;
      message?: string;
    };
  }>(
    `/api/sessions/${encodeURIComponent(id)}/end`,
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
 * Get the currently active session, if any
 * @param accessToken - Optional access token for authentication
 */
export async function getActiveSession(
  accessToken?: string
): Promise<SessionDetails | null> {
  try {
    const response = await apiClient.get<{
      ok: boolean;
      sessionId?: string;
      workflow?: string;
      status?: string;
    }>("/session/status", withAuth(accessToken));

    if (!response.ok || !response.sessionId) {
      return null;
    }

    // Map backend response to SessionDetails format
    return {
      sessionId: response.sessionId,
      workflow: response.workflow as any || "streamer",
      captureMode: "av" as any, // Backend doesn't return this
      title: "Active Session",
      startedAt: Date.now(), // Backend doesn't return this
      clipCount: 0,
      outputCount: 0,
      participants: [],
    };
  } catch (error) {
    // Network error or server down
    return null;
  }
}

/**
 * Response from GET /api/sessions/:id/outputs
 */
export interface GetSessionOutputsResponse {
  success: boolean;
  data: {
    outputs: Array<{
      id: string;
      sessionId: string;
      type: string;
      label: string | null;
      content: string;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }>;
  };
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
 * Get outputs for a specific session
 * @param id - Session ID
 * @param accessToken - Optional access token for authentication
 */
export async function getSessionOutputs(
  id: string,
  accessToken?: string
): Promise<SessionOutput[]> {
  const response = await apiClient.get<GetSessionOutputsResponse>(
    `/api/sessions/${encodeURIComponent(id)}/outputs`,
    withAuth(accessToken)
  );

  if (!response.success) {
    throw new Error(`Failed to fetch outputs for session ${id}`);
  }

  return response.data.outputs;
}

/**
 * Update session response
 */
export interface UpdateSessionResponse {
  success: boolean;
  data: {
    session: SessionListItem;
  };
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
  const response = await apiClient.patch<UpdateSessionResponse>(
    `/api/sessions/${encodeURIComponent(id)}`,
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
  const response = await apiClient.delete<{ success: boolean }>(
    `/api/sessions/${encodeURIComponent(id)}`,
    withAuth(accessToken)
  );

  if (!response.success) {
    throw new Error(`Failed to delete session ${id}`);
  }
}

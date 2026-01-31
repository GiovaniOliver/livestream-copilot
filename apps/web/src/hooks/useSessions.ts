/**
 * Custom hook for managing sessions with API integration and real-time updates
 *
 * This hook:
 * - Fetches sessions from backend API on mount
 * - Connects to WebSocket for real-time events
 * - Automatically refreshes session data when new events arrive
 * - Integrates with auth context for authenticated API calls
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSessions,
  getSessionById,
  startSession as apiStartSession,
  endSession as apiEndSession,
  updateSession as apiUpdateSession,
  deleteSession as apiDeleteSession,
  getSessionOutputs as apiGetSessionOutputs,
  forceStopSession as apiForceStopSession,
  type SessionListItem,
  type StartSessionConfig,
  type StartSessionResponse,
  type SessionOutput,
} from "@/lib/api/sessions";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { type Session, formatDuration } from "@/lib/stores/sessions";
import { WORKFLOW_TYPES, CAPTURE_MODES, type WorkflowType, type CaptureMode } from "@/lib/constants";
import { logger } from "@/lib/logger";

export interface UseSessionsReturn {
  sessions: Session[];
  activeSession: Session | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  isAuthenticated: boolean;

  // Actions
  createSession: (config: StartSessionConfig) => Promise<StartSessionResponse>;
  endSession: (id: string) => Promise<void>;
  updateSession: (id: string, updates: { title?: string; participants?: string[] }) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  getSessionOutputs: (id: string) => Promise<SessionOutput[]>;
  refreshSessions: () => Promise<void>;
  forceStop: () => Promise<void>;
  clearError: () => void;
}

/**
 * Map API workflow values to frontend workflow types
 * The API uses shared package types which differ from frontend constants
 */
function mapApiWorkflow(apiWorkflow: string): WorkflowType {
  const workflowMap: Record<string, WorkflowType> = {
    streamer: WORKFLOW_TYPES.CONTENT_CREATOR,
    content_creator: WORKFLOW_TYPES.CONTENT_CREATOR,
    podcast: WORKFLOW_TYPES.PODCAST,
    writers_room: WORKFLOW_TYPES.WRITERS_CORNER,
    writers_corner: WORKFLOW_TYPES.WRITERS_CORNER,
    brainstorm: WORKFLOW_TYPES.MIND_MAP,
    mind_map: WORKFLOW_TYPES.MIND_MAP,
    debate: WORKFLOW_TYPES.DEBATE_ROOM,
    debate_room: WORKFLOW_TYPES.DEBATE_ROOM,
    court_session: WORKFLOW_TYPES.COURT_SESSION,
    script_studio: WORKFLOW_TYPES.SCRIPT_STUDIO,
  };
  return workflowMap[apiWorkflow] || WORKFLOW_TYPES.CONTENT_CREATOR;
}

/**
 * Map API capture mode values to frontend capture mode types
 */
function mapApiCaptureMode(apiCaptureMode: string): CaptureMode {
  const captureModeMap: Record<string, CaptureMode> = {
    av: CAPTURE_MODES.AUDIO_VIDEO,
    audio_video: CAPTURE_MODES.AUDIO_VIDEO,
    audio: CAPTURE_MODES.AUDIO,
    video: CAPTURE_MODES.VIDEO,
  };
  return captureModeMap[apiCaptureMode] || CAPTURE_MODES.AUDIO_VIDEO;
}

/**
 * Convert API SessionListItem to frontend Session format
 */
function mapApiSessionToSession(apiSession: SessionListItem): Session {
  const startedAt = new Date(apiSession.startedAt);
  const endedAt = apiSession.endedAt ? new Date(apiSession.endedAt) : null;

  // Calculate duration
  const durationMs = endedAt
    ? endedAt.getTime() - startedAt.getTime()
    : Date.now() - startedAt.getTime();

  return {
    id: apiSession.id,
    name: apiSession.title || "Untitled Session",
    workflow: mapApiWorkflow(apiSession.workflow),
    captureMode: mapApiCaptureMode(apiSession.captureMode),
    // "active" means session is in progress, but not necessarily streaming
    // The actual "live" streaming status comes from useLiveStream hook
    status: apiSession.isActive ? "active" : "ended",
    startedAt: apiSession.startedAt,
    endedAt: apiSession.endedAt || undefined,
    duration: formatDuration(durationMs),
    clipCount: apiSession.counts.clips,
    outputCount: apiSession.counts.outputs,
  };
}

/**
 * Hook for managing sessions with API integration
 *
 * Features:
 * - Fetches sessions from backend API
 * - Real-time WebSocket updates
 * - Automatic data refresh on events
 * - Error handling with user-friendly messages
 * - Authentication via AuthContext
 *
 * @param autoConnect - Whether to connect WebSocket on mount (default: true)
 */
export function useSessions(autoConnect = true): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  // Get auth context for access token
  const { accessToken, isAuthenticated } = useAuth();

  const {
    connect,
    disconnect,
    isConnected,
    events,
    clearEvents
  } = useWebSocket();

  /**
   * Load sessions from the backend API
   */
  const loadSessions = useCallback(async () => {
    // Prevent concurrent fetches
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setError(null);

      // Fetch sessions from the backend API (pass auth token if available)
      const { sessions: apiSessions } = await getSessions(50, 0, accessToken || undefined);

      // Map API response to frontend Session format
      const mappedSessions = apiSessions.map(mapApiSessionToSession);
      setSessions(mappedSessions);

      // Find the active session (if any)
      const active = mappedSessions.find((s) => s.status === "live") || null;
      setActiveSession(active);
    } catch (err) {
      logger.error("Failed to load sessions:", err);
      setError(err instanceof Error ? err.message : "Failed to load sessions");
      // Keep existing data on error
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [accessToken]);

  /**
   * Create a new session
   * Calls API /session/start and refreshes the session list
   */
  const createSession = useCallback(async (config: StartSessionConfig): Promise<StartSessionResponse> => {
    try {
      setError(null);

      // Call backend API with auth token
      const response = await apiStartSession(config, accessToken || undefined);

      // Refresh sessions list from API
      await loadSessions();

      return response;
    } catch (err: any) {
      const isConflict = (err instanceof ApiError && err.status === 409) || err.status === 409;

      if (isConflict) {
        // Special handling for 409 Conflict
        const body = err.body || {};
        const msg = body.error || "A session is already active. You must stop it before starting a new one.";
        setError(msg);
        throw new Error(msg);
      }

      const errorMsg = err instanceof Error ? err.message : "Failed to create session";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [loadSessions, accessToken]);

  /**
   * Force-stop the current session (clear in-memory state)
   * Calls API /session/force-stop
   */
  const forceStop = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);

      await apiForceStopSession(accessToken || undefined);

      // Refresh sessions list from API
      await loadSessions();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to force-stop session";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [loadSessions, accessToken]);

  /**
   * End a session
   * Calls API /session/stop and refreshes the session list
   */
  const endSession = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);

      // Call backend API with auth token (stops the active session)
      await apiEndSession(id, accessToken || undefined);

      // Refresh sessions list from API
      await loadSessions();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to end session";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [loadSessions, accessToken]);

  /**
   * Update a session's metadata
   * Calls API PATCH /api/sessions/:id and refreshes the session list
   */
  const updateSession = useCallback(async (
    id: string,
    updates: { title?: string; participants?: string[] }
  ): Promise<void> => {
    try {
      setError(null);

      // Call backend API with auth token
      await apiUpdateSession(id, updates, accessToken || undefined);

      // Refresh sessions list from API
      await loadSessions();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update session";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [loadSessions, accessToken]);

  /**
   * Delete a session
   * Calls API DELETE /api/sessions/:id and refreshes the session list
   */
  const deleteSession = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);

      // Call backend API with auth token
      await apiDeleteSession(id, accessToken || undefined);

      // Refresh sessions list from API
      await loadSessions();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete session";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [loadSessions, accessToken]);

  /**
   * Get outputs for a specific session
   * Calls API GET /api/sessions/:id/outputs
   */
  const getSessionOutputs = useCallback(async (id: string): Promise<SessionOutput[]> => {
    try {
      setError(null);

      // Call backend API with auth token
      return await apiGetSessionOutputs(id, accessToken || undefined);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get session outputs";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [accessToken]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Connect WebSocket on mount if autoConnect is true
   */
  useEffect(() => {
    if (autoConnect) {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3124";
      connect();

      return () => {
        disconnect();
        clearEvents();
      };
    }
  }, [autoConnect, connect, disconnect, clearEvents]);

  /**
   * Initial data load
   */
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /**
   * Auto-refresh when WebSocket events arrive
   * Debounced to avoid excessive refreshes
   */
  useEffect(() => {
    if (events.length > 0) {
      const timer = setTimeout(() => {
        loadSessions();
      }, 1000); // 1 second debounce

      return () => clearTimeout(timer);
    }
  }, [events.length, loadSessions]);

  return {
    sessions,
    activeSession,
    isLoading,
    error,
    isConnected,
    isAuthenticated,
    createSession,
    endSession,
    updateSession,
    deleteSession,
    getSessionOutputs,
    refreshSessions: loadSessions,
    forceStop,
    clearError,
  };
}

/**
 * Return type for useSession hook
 */
export interface UseSessionReturn {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching a single session by ID
 *
 * @param id - The session ID to fetch
 */
export function useSession(id: string): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get auth context for access token
  const { accessToken } = useAuth();

  const loadSession = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Pass auth token to API call
      const apiSession = await getSessionById(id, accessToken || undefined);
      setSession(mapApiSessionToSession(apiSession));
    } catch (err) {
      logger.error("Failed to load session:", err);
      setError(err instanceof Error ? err.message : "Failed to load session");
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return {
    session,
    isLoading,
    error,
    refresh: loadSession,
  };
}

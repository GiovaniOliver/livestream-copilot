/**
 * useSessions Hook Tests
 *
 * Tests for the useSessions and useSession hooks including:
 * - Initial data loading
 * - Session CRUD operations
 * - Error handling
 * - WebSocket integration
 * - Authentication context integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";
import { createMockApiSession } from "../setup";

// Mock environment variables first
vi.stubEnv("NEXT_PUBLIC_WS_URL", "ws://localhost:3124");
vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3123");

// Mock the API module
vi.mock("@/lib/api/sessions", () => ({
  getSessions: vi.fn(),
  getSessionById: vi.fn(),
  startSession: vi.fn(),
  endSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  getSessionOutputs: vi.fn(),
}));

// Import the mocked module
import * as sessionsApi from "@/lib/api/sessions";

// Mock values
const mockAccessToken = "test-access-token";

// Mock the auth context
vi.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    accessToken: mockAccessToken,
    isAuthenticated: true,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    error: null,
  })),
}));

import { useAuth } from "@/lib/contexts/AuthContext";

// Mock the WebSocket context
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockClearEvents = vi.fn();

vi.mock("@/contexts/WebSocketContext", () => ({
  useWebSocket: vi.fn(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    isConnected: true,
    events: [],
    clearEvents: mockClearEvents,
    send: vi.fn(),
    lastEvent: null,
  })),
}));

import { useWebSocket } from "@/contexts/WebSocketContext";

// Import hooks after mocks
import { useSessions, useSession } from "@/hooks/useSessions";

describe("useSessions Hook", () => {
  const mockApiSessions = [
    createMockApiSession({ id: "session-1", title: "Session 1" }),
    createMockApiSession({ id: "session-2", title: "Session 2", isActive: false, endedAt: new Date().toISOString() }),
  ];

  const mockPagination = { limit: 50, offset: 0, total: 2 };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset auth mock
    vi.mocked(useAuth).mockReturnValue({
      accessToken: mockAccessToken,
      isAuthenticated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null,
    });

    // Reset WebSocket mock
    vi.mocked(useWebSocket).mockReturnValue({
      connect: mockConnect,
      disconnect: mockDisconnect,
      isConnected: true,
      events: [],
      clearEvents: mockClearEvents,
      send: vi.fn(),
      lastEvent: null,
    });

    // Default mock for getSessions
    vi.mocked(sessionsApi.getSessions).mockResolvedValue({
      sessions: mockApiSessions,
      pagination: mockPagination,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("Initial Load", () => {
    it("should load sessions on mount", async () => {
      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.error).toBeNull();
      expect(sessionsApi.getSessions).toHaveBeenCalledWith(50, 0, mockAccessToken);
    });

    it("should identify active session from loaded sessions", async () => {
      const sessionsWithActive = [
        createMockApiSession({ id: "session-1", title: "Active Session", isActive: true }),
        createMockApiSession({ id: "session-2", title: "Ended Session", isActive: false, endedAt: new Date().toISOString() }),
      ];

      vi.mocked(sessionsApi.getSessions).mockResolvedValue({
        sessions: sessionsWithActive,
        pagination: mockPagination,
      });

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeSession).not.toBeNull();
      expect(result.current.activeSession?.id).toBe("session-1");
      expect(result.current.activeSession?.status).toBe("live");
    });

    it("should handle empty sessions list", async () => {
      vi.mocked(sessionsApi.getSessions).mockResolvedValue({
        sessions: [],
        pagination: { limit: 50, offset: 0, total: 0 },
      });

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(0);
      expect(result.current.activeSession).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should handle API error on initial load", async () => {
      vi.mocked(sessionsApi.getSessions).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
    });
  });

  describe("WebSocket Integration", () => {
    it("should connect to WebSocket on mount when autoConnect is true", async () => {
      const { result } = renderHook(() => useSessions(undefined, true));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockConnect).toHaveBeenCalled();
    });

    it("should not connect to WebSocket when autoConnect is false", async () => {
      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it("should disconnect and clear events on unmount", async () => {
      const { result, unmount } = renderHook(() => useSessions(undefined, true));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockClearEvents).toHaveBeenCalled();
    });
  });

  describe("Authentication", () => {
    it("should expose isAuthenticated from auth context", async () => {
      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should pass access token to API calls", async () => {
      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(sessionsApi.getSessions).toHaveBeenCalledWith(50, 0, mockAccessToken);
    });
  });

  describe("createSession", () => {
    it("should create a new session and refresh list", async () => {
      const newSessionResponse = { sessionId: "new-session-id", startedAt: Date.now() };

      vi.mocked(sessionsApi.startSession).mockResolvedValue(newSessionResponse);

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const config = {
        workflow: "streamer" as const,
        captureMode: "av" as const,
        title: "New Session",
      };

      let response;
      await act(async () => {
        response = await result.current.createSession(config);
      });

      expect(response).toEqual(newSessionResponse);
      expect(sessionsApi.startSession).toHaveBeenCalledWith(config, mockAccessToken);
      // Should have refreshed sessions after creation (initial load + refresh)
      expect(sessionsApi.getSessions).toHaveBeenCalledTimes(2);
    });

    it("should handle create session error", async () => {
      vi.mocked(sessionsApi.startSession).mockRejectedValue(
        new Error("Failed to create session")
      );

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const config = {
        workflow: "streamer" as const,
        captureMode: "av" as const,
      };

      await expect(result.current.createSession(config)).rejects.toThrow(
        "Failed to create session"
      );

      // Wait for error state to be updated
      await waitFor(() => {
        expect(result.current.error).toBe("Failed to create session");
      });
    });
  });

  describe("endSession", () => {
    it("should end a session and refresh list", async () => {
      vi.mocked(sessionsApi.endSession).mockResolvedValue({
        sessionId: "session-1",
        endedAt: Date.now(),
        duration: 3600000,
        clipCount: 5,
        outputCount: 10,
      });

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.endSession("session-1");
      });

      expect(sessionsApi.endSession).toHaveBeenCalledWith("session-1", mockAccessToken);
      expect(sessionsApi.getSessions).toHaveBeenCalledTimes(2);
    });

    it("should handle end session error", async () => {
      vi.mocked(sessionsApi.endSession).mockRejectedValue(
        new Error("Session not found")
      );

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.endSession("invalid-id")).rejects.toThrow(
        "Session not found"
      );

      // Wait for error state to be updated
      await waitFor(() => {
        expect(result.current.error).toBe("Session not found");
      });
    });
  });

  describe("updateSession", () => {
    it("should update session and refresh list", async () => {
      vi.mocked(sessionsApi.updateSession).mockResolvedValue(
        createMockApiSession({ id: "session-1", title: "Updated Title" })
      );

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSession("session-1", { title: "Updated Title" });
      });

      expect(sessionsApi.updateSession).toHaveBeenCalledWith(
        "session-1",
        { title: "Updated Title" },
        mockAccessToken
      );
      expect(sessionsApi.getSessions).toHaveBeenCalledTimes(2);
    });

    it("should update session participants", async () => {
      vi.mocked(sessionsApi.updateSession).mockResolvedValue(
        createMockApiSession({ id: "session-1", participants: ["Alice", "Bob"] })
      );

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSession("session-1", { participants: ["Alice", "Bob"] });
      });

      expect(sessionsApi.updateSession).toHaveBeenCalledWith(
        "session-1",
        { participants: ["Alice", "Bob"] },
        mockAccessToken
      );
    });
  });

  describe("deleteSession", () => {
    it("should delete session and refresh list", async () => {
      vi.mocked(sessionsApi.deleteSession).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteSession("session-2");
      });

      expect(sessionsApi.deleteSession).toHaveBeenCalledWith("session-2", mockAccessToken);
      expect(sessionsApi.getSessions).toHaveBeenCalledTimes(2);
    });

    it("should handle delete session error", async () => {
      vi.mocked(sessionsApi.deleteSession).mockRejectedValue(
        new Error("Cannot delete active session")
      );

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.deleteSession("session-1")).rejects.toThrow(
        "Cannot delete active session"
      );

      // Wait for error state to be updated
      await waitFor(() => {
        expect(result.current.error).toBe("Cannot delete active session");
      });
    });
  });

  describe("getSessionOutputs", () => {
    it("should fetch outputs for a session", async () => {
      const mockOutputs = [
        { id: "output-1", sessionId: "session-1", type: "highlight", label: null, content: "Content 1", metadata: null, createdAt: new Date().toISOString() },
        { id: "output-2", sessionId: "session-1", type: "summary", label: "Summary", content: "Content 2", metadata: null, createdAt: new Date().toISOString() },
      ];

      vi.mocked(sessionsApi.getSessionOutputs).mockResolvedValue(mockOutputs);

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let outputs;
      await act(async () => {
        outputs = await result.current.getSessionOutputs("session-1");
      });

      expect(outputs).toEqual(mockOutputs);
      expect(sessionsApi.getSessionOutputs).toHaveBeenCalledWith("session-1", mockAccessToken);
    });

    it("should handle getSessionOutputs error", async () => {
      vi.mocked(sessionsApi.getSessionOutputs).mockRejectedValue(
        new Error("Outputs not found")
      );

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.getSessionOutputs("invalid-id")).rejects.toThrow(
        "Outputs not found"
      );

      // Wait for error state to be updated
      await waitFor(() => {
        expect(result.current.error).toBe("Outputs not found");
      });
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      vi.mocked(sessionsApi.getSessions).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("refreshSessions", () => {
    it("should manually refresh sessions", async () => {
      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initial load
      expect(sessionsApi.getSessions).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refreshSessions();
      });

      // Manual refresh
      expect(sessionsApi.getSessions).toHaveBeenCalledTimes(2);
    });
  });

  describe("Session Data Mapping", () => {
    it("should map API workflow values to frontend types", async () => {
      const sessionsWithWorkflows = [
        createMockApiSession({ id: "s1", workflow: "streamer" }),
        createMockApiSession({ id: "s2", workflow: "podcast" }),
      ];

      vi.mocked(sessionsApi.getSessions).mockResolvedValue({
        sessions: sessionsWithWorkflows,
        pagination: { limit: 50, offset: 0, total: 2 },
      });

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions[0].workflow).toBe("content_creator");
      expect(result.current.sessions[1].workflow).toBe("podcast");
    });

    it("should map API capture mode values to frontend types", async () => {
      const sessionsWithCaptureModes = [
        createMockApiSession({ id: "s1", captureMode: "av" }),
        createMockApiSession({ id: "s2", captureMode: "audio" }),
      ];

      vi.mocked(sessionsApi.getSessions).mockResolvedValue({
        sessions: sessionsWithCaptureModes,
        pagination: { limit: 50, offset: 0, total: 2 },
      });

      const { result } = renderHook(() => useSessions(undefined, false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions[0].captureMode).toBe("audio_video");
      expect(result.current.sessions[1].captureMode).toBe("audio");
    });
  });
});

describe("useSession Hook", () => {
  const mockSession = createMockApiSession({ id: "single-session" });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      accessToken: "test-access-token",
      isAuthenticated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null,
    });

    vi.mocked(sessionsApi.getSessionById).mockResolvedValue(mockSession);
  });

  it("should load a single session by ID", async () => {
    const { result } = renderHook(() => useSession("single-session"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.id).toBe("single-session");
    expect(result.current.error).toBeNull();
    expect(sessionsApi.getSessionById).toHaveBeenCalledWith("single-session", "test-access-token");
  });

  it("should handle session not found error", async () => {
    vi.mocked(sessionsApi.getSessionById).mockRejectedValue(
      new Error("Session not found")
    );

    const { result } = renderHook(() => useSession("invalid-id"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.error).toBe("Session not found");
  });

  it("should not fetch when id is empty", async () => {
    const { result } = renderHook(() => useSession(""));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(sessionsApi.getSessionById).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
  });

  it("should provide refresh function", async () => {
    const { result } = renderHook(() => useSession("single-session"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(sessionsApi.getSessionById).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(sessionsApi.getSessionById).toHaveBeenCalledTimes(2);
  });
});

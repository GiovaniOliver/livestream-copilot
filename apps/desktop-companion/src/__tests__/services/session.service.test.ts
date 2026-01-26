/**
 * Session Service Unit Tests
 *
 * Tests for session CRUD operations using mocked Prisma client.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../db/index.js";
import { createMockSession } from "../setup.js";

// Import the service functions
import {
  createSession,
  getSessionById,
  listSessions,
  updateSession,
  deleteSession,
  getSessionWithCounts,
  endSession,
  getActiveSession,
  countSessions,
} from "../../db/services/session.service.js";

describe("Session Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSession", () => {
    it("should create a new session with required fields", async () => {
      const mockSession = createMockSession();
      vi.mocked(prisma.session.create).mockResolvedValue(mockSession);

      const result = await createSession({
        workflow: "streamer",
        captureMode: "av",
        startedAt: new Date(),
      });

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workflow: "streamer",
          captureMode: "av",
        }),
      });
      expect(result).toEqual(mockSession);
    });

    it("should create a session with custom title and participants", async () => {
      const mockSession = createMockSession({
        title: "Custom Title",
        participants: ["Host", "Guest"],
      });
      vi.mocked(prisma.session.create).mockResolvedValue(mockSession);

      const result = await createSession({
        workflow: "podcast",
        captureMode: "audio",
        title: "Custom Title",
        participants: ["Host", "Guest"],
        startedAt: new Date(),
      });

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Custom Title",
          participants: ["Host", "Guest"],
        }),
      });
      expect(result.title).toBe("Custom Title");
    });
  });

  describe("getSessionById", () => {
    it("should return a session when found", async () => {
      const mockSession = createMockSession();
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession);

      const result = await getSessionById("test-session-id");

      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: "test-session-id" },
      });
      expect(result).toEqual(mockSession);
    });

    it("should return null when session not found", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      const result = await getSessionById("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("listSessions", () => {
    it("should return all sessions with default pagination", async () => {
      const mockSessions = [
        { ...createMockSession({ id: "session-1" }), _count: { events: 10, outputs: 5, clips: 2 } },
        { ...createMockSession({ id: "session-2" }), _count: { events: 20, outputs: 10, clips: 4 } },
      ];
      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);

      const result = await listSessions({});

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      );
      expect(result).toHaveLength(2);
    });

    it("should filter sessions by workflow", async () => {
      const mockSessions = [
        { ...createMockSession({ workflow: "podcast" }), _count: { events: 10, outputs: 5, clips: 2 } },
      ];
      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);

      const result = await listSessions({ workflow: "podcast" });

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workflow: "podcast" }),
        })
      );
      expect(result[0].workflow).toBe("podcast");
    });

    it("should filter active sessions only", async () => {
      const mockSessions = [
        { ...createMockSession({ endedAt: null }), _count: { events: 10, outputs: 5, clips: 2 } },
      ];
      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);

      const result = await listSessions({ active: true });

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ endedAt: null }),
        })
      );
      expect(result[0].endedAt).toBeNull();
    });

    it("should apply custom pagination", async () => {
      const mockSessions: any[] = [];
      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);

      await listSessions({ limit: 10, offset: 20 });

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe("updateSession", () => {
    it("should update session title", async () => {
      const mockSession = createMockSession({ title: "Updated Title" });
      vi.mocked(prisma.session.update).mockResolvedValue(mockSession);

      const result = await updateSession("test-session-id", {
        title: "Updated Title",
      });

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: "test-session-id" },
        data: { title: "Updated Title" },
      });
      expect(result.title).toBe("Updated Title");
    });

    it("should update session participants", async () => {
      const mockSession = createMockSession({
        participants: ["Host", "Guest 1", "Guest 2"],
      });
      vi.mocked(prisma.session.update).mockResolvedValue(mockSession);

      const result = await updateSession("test-session-id", {
        participants: ["Host", "Guest 1", "Guest 2"],
      });

      expect(result.participants).toEqual(["Host", "Guest 1", "Guest 2"]);
    });
  });

  describe("endSession", () => {
    it("should set endedAt timestamp", async () => {
      const endDate = new Date();
      const mockSession = createMockSession({ endedAt: endDate });
      vi.mocked(prisma.session.update).mockResolvedValue(mockSession);

      const result = await endSession("test-session-id");

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: "test-session-id" },
        data: expect.objectContaining({
          endedAt: expect.any(Date),
        }),
      });
      expect(result.endedAt).not.toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("should delete session by ID", async () => {
      const mockSession = createMockSession();
      vi.mocked(prisma.session.delete).mockResolvedValue(mockSession);

      const result = await deleteSession("test-session-id");

      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: "test-session-id" },
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe("getSessionWithCounts", () => {
    it("should return session with counts", async () => {
      const mockSessionWithCounts = {
        ...createMockSession(),
        _count: {
          events: 100,
          outputs: 10,
          clips: 5,
        },
      };
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSessionWithCounts);

      const result = await getSessionWithCounts("test-session-id");

      expect(prisma.session.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "test-session-id" },
          include: {
            _count: {
              select: {
                events: true,
                outputs: true,
                clips: true,
              },
            },
          },
        })
      );
      expect(result?._count).toEqual({ events: 100, outputs: 10, clips: 5 });
    });

    it("should return null when session not found", async () => {
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      const result = await getSessionWithCounts("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("getActiveSession", () => {
    it("should return the most recent active session", async () => {
      const mockSession = createMockSession({ endedAt: null });
      vi.mocked(prisma.session.findFirst).mockResolvedValue(mockSession);

      const result = await getActiveSession();

      expect(prisma.session.findFirst).toHaveBeenCalledWith({
        where: { endedAt: null },
        orderBy: { startedAt: "desc" },
      });
      expect(result).toEqual(mockSession);
    });

    it("should return null when no active session", async () => {
      vi.mocked(prisma.session.findFirst).mockResolvedValue(null);

      const result = await getActiveSession();

      expect(result).toBeNull();
    });
  });

  describe("countSessions", () => {
    it("should count all sessions", async () => {
      vi.mocked(prisma.session.count).mockResolvedValue(42);

      const result = await countSessions();

      expect(prisma.session.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toBe(42);
    });

    it("should count sessions by workflow", async () => {
      vi.mocked(prisma.session.count).mockResolvedValue(10);

      const result = await countSessions({ workflow: "podcast" });

      expect(prisma.session.count).toHaveBeenCalledWith({
        where: { workflow: "podcast" },
      });
      expect(result).toBe(10);
    });

    it("should count active sessions only", async () => {
      vi.mocked(prisma.session.count).mockResolvedValue(5);

      const result = await countSessions({ active: true });

      expect(prisma.session.count).toHaveBeenCalledWith({
        where: { endedAt: null },
      });
      expect(result).toBe(5);
    });
  });
});

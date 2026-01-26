/**
 * Clip Service Unit Tests
 *
 * Tests for clip CRUD operations using mocked Prisma client.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../db/index.js";
import { createMockClip } from "../setup.js";

// Import the service functions
import {
  createClip,
  getClipById,
  getClipByArtifactId,
  getClipWithSession,
  updateClip,
  updateClipThumbnail,
  deleteClip,
  deleteClipByArtifactId,
  listClips,
  getSessionClips,
  countClips,
  getSessionClipsDuration,
  getClipsInTimeRange,
  clipExists,
} from "../../db/services/clip.service.js";

describe("Clip Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createClip", () => {
    it("should create a new clip with required fields", async () => {
      const mockClip = createMockClip();
      vi.mocked(prisma.clip.create).mockResolvedValue(mockClip);

      const result = await createClip({
        sessionId: "test-session-id",
        artifactId: "test-artifact-id",
        path: "/clips/test.mp4",
        t0: 0,
        t1: 30,
      });

      expect(prisma.clip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: "test-session-id",
          artifactId: "test-artifact-id",
          path: "/clips/test.mp4",
          t0: 0,
          t1: 30,
        }),
      });
      expect(result).toEqual(mockClip);
    });

    it("should create a clip with optional thumbnailId", async () => {
      const mockClip = createMockClip({ thumbnailId: "thumb-123" });
      vi.mocked(prisma.clip.create).mockResolvedValue(mockClip);

      const result = await createClip({
        sessionId: "test-session-id",
        artifactId: "test-artifact-id",
        path: "/clips/test.mp4",
        t0: 10,
        t1: 60,
        thumbnailId: "thumb-123",
      });

      expect(prisma.clip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          thumbnailId: "thumb-123",
        }),
      });
      expect(result.thumbnailId).toBe("thumb-123");
    });
  });

  describe("getClipById", () => {
    it("should return a clip when found", async () => {
      const mockClip = createMockClip();
      vi.mocked(prisma.clip.findUnique).mockResolvedValue(mockClip);

      const result = await getClipById("test-clip-id");

      expect(prisma.clip.findUnique).toHaveBeenCalledWith({
        where: { id: "test-clip-id" },
      });
      expect(result).toEqual(mockClip);
    });

    it("should return null when clip not found", async () => {
      vi.mocked(prisma.clip.findUnique).mockResolvedValue(null);

      const result = await getClipById("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("getClipByArtifactId", () => {
    it("should return a clip by artifact ID", async () => {
      const mockClip = createMockClip();
      vi.mocked(prisma.clip.findUnique).mockResolvedValue(mockClip);

      const result = await getClipByArtifactId("test-artifact-id");

      expect(prisma.clip.findUnique).toHaveBeenCalledWith({
        where: { artifactId: "test-artifact-id" },
      });
      expect(result).toEqual(mockClip);
    });
  });

  describe("getClipWithSession", () => {
    it("should return clip with session data", async () => {
      const mockClipWithSession = {
        ...createMockClip(),
        session: {
          id: "test-session-id",
          workflow: "streamer",
          title: "Test Session",
        },
      };
      vi.mocked(prisma.clip.findUnique).mockResolvedValue(mockClipWithSession);

      const result = await getClipWithSession("test-clip-id");

      expect(prisma.clip.findUnique).toHaveBeenCalledWith({
        where: { id: "test-clip-id" },
        include: {
          session: {
            select: {
              id: true,
              workflow: true,
              title: true,
            },
          },
        },
      });
      expect(result?.session.workflow).toBe("streamer");
    });
  });

  describe("updateClip", () => {
    it("should update clip path", async () => {
      const mockClip = createMockClip({ path: "/new/path.mp4" });
      vi.mocked(prisma.clip.update).mockResolvedValue(mockClip);

      const result = await updateClip("test-clip-id", {
        path: "/new/path.mp4",
      });

      expect(prisma.clip.update).toHaveBeenCalledWith({
        where: { id: "test-clip-id" },
        data: { path: "/new/path.mp4" },
      });
      expect(result.path).toBe("/new/path.mp4");
    });
  });

  describe("updateClipThumbnail", () => {
    it("should update clip thumbnail", async () => {
      const mockClip = createMockClip({ thumbnailId: "new-thumb-id" });
      vi.mocked(prisma.clip.update).mockResolvedValue(mockClip);

      const result = await updateClipThumbnail("test-clip-id", "new-thumb-id");

      expect(prisma.clip.update).toHaveBeenCalledWith({
        where: { id: "test-clip-id" },
        data: { thumbnailId: "new-thumb-id" },
      });
      expect(result.thumbnailId).toBe("new-thumb-id");
    });
  });

  describe("deleteClip", () => {
    it("should delete clip by ID", async () => {
      const mockClip = createMockClip();
      vi.mocked(prisma.clip.delete).mockResolvedValue(mockClip);

      const result = await deleteClip("test-clip-id");

      expect(prisma.clip.delete).toHaveBeenCalledWith({
        where: { id: "test-clip-id" },
      });
      expect(result).toEqual(mockClip);
    });
  });

  describe("deleteClipByArtifactId", () => {
    it("should delete clip by artifact ID", async () => {
      const mockClip = createMockClip();
      vi.mocked(prisma.clip.delete).mockResolvedValue(mockClip);

      const result = await deleteClipByArtifactId("test-artifact-id");

      expect(prisma.clip.delete).toHaveBeenCalledWith({
        where: { artifactId: "test-artifact-id" },
      });
      expect(result).toEqual(mockClip);
    });
  });

  describe("listClips", () => {
    it("should return clips with default pagination", async () => {
      const mockClips = [
        createMockClip({ id: "clip-1", t0: 0, t1: 30 }),
        createMockClip({ id: "clip-2", t0: 30, t1: 60 }),
      ];
      vi.mocked(prisma.clip.findMany).mockResolvedValue(mockClips);

      const result = await listClips({});

      expect(prisma.clip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
          orderBy: { t0: "asc" },
        })
      );
      expect(result).toHaveLength(2);
      expect(result[0].duration).toBe(30);
    });

    it("should filter by sessionId", async () => {
      const mockClips = [createMockClip({ t0: 0, t1: 30 })];
      vi.mocked(prisma.clip.findMany).mockResolvedValue(mockClips);

      await listClips({ sessionId: "specific-session" });

      expect(prisma.clip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sessionId: "specific-session" }),
        })
      );
    });

    it("should filter by minimum duration", async () => {
      const mockClips = [
        createMockClip({ id: "clip-1", t0: 0, t1: 10 }), // 10s duration
        createMockClip({ id: "clip-2", t0: 10, t1: 50 }), // 40s duration
      ];
      vi.mocked(prisma.clip.findMany).mockResolvedValue(mockClips);

      const result = await listClips({ minDuration: 20 });

      // Should filter out clip-1 (10s < 20s)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("clip-2");
    });

    it("should filter by maximum duration", async () => {
      const mockClips = [
        createMockClip({ id: "clip-1", t0: 0, t1: 10 }), // 10s duration
        createMockClip({ id: "clip-2", t0: 10, t1: 50 }), // 40s duration
      ];
      vi.mocked(prisma.clip.findMany).mockResolvedValue(mockClips);

      const result = await listClips({ maxDuration: 20 });

      // Should filter out clip-2 (40s > 20s)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("clip-1");
    });

    it("should apply custom pagination and ordering", async () => {
      vi.mocked(prisma.clip.findMany).mockResolvedValue([]);

      await listClips({
        limit: 10,
        offset: 5,
        orderBy: "createdAt",
        orderDir: "desc",
      });

      expect(prisma.clip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });

  describe("getSessionClips", () => {
    it("should return all clips for a session ordered by t0", async () => {
      const mockClips = [
        createMockClip({ id: "clip-1", t0: 0, t1: 30 }),
        createMockClip({ id: "clip-2", t0: 30, t1: 60 }),
      ];
      vi.mocked(prisma.clip.findMany).mockResolvedValue(mockClips);

      const result = await getSessionClips("session-1");

      expect(prisma.clip.findMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1" },
        orderBy: { t0: "asc" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].duration).toBe(30);
      expect(result[1].duration).toBe(30);
    });
  });

  describe("countClips", () => {
    it("should count all clips", async () => {
      vi.mocked(prisma.clip.count).mockResolvedValue(42);

      const result = await countClips();

      expect(prisma.clip.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toBe(42);
    });

    it("should count clips by sessionId", async () => {
      vi.mocked(prisma.clip.count).mockResolvedValue(10);

      const result = await countClips({ sessionId: "session-1" });

      expect(prisma.clip.count).toHaveBeenCalledWith({
        where: { sessionId: "session-1" },
      });
      expect(result).toBe(10);
    });
  });

  describe("getSessionClipsDuration", () => {
    it("should return total clip duration for a session", async () => {
      vi.mocked(prisma.clip.findMany).mockResolvedValue([
        { t0: 0, t1: 30 },
        { t0: 60, t1: 90 },
        { t0: 120, t1: 150 },
      ] as any);

      const result = await getSessionClipsDuration("session-1");

      expect(prisma.clip.findMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1" },
        select: { t0: true, t1: true },
      });
      expect(result).toBe(90); // 30 + 30 + 30
    });

    it("should return 0 for session with no clips", async () => {
      vi.mocked(prisma.clip.findMany).mockResolvedValue([]);

      const result = await getSessionClipsDuration("empty-session");

      expect(result).toBe(0);
    });
  });

  describe("getClipsInTimeRange", () => {
    it("should return clips that overlap with time range", async () => {
      const mockClips = [
        createMockClip({ id: "clip-1", t0: 10, t1: 30 }),
        createMockClip({ id: "clip-2", t0: 25, t1: 45 }),
      ];
      vi.mocked(prisma.clip.findMany).mockResolvedValue(mockClips);

      const result = await getClipsInTimeRange("session-1", 20, 40);

      expect(prisma.clip.findMany).toHaveBeenCalledWith({
        where: {
          sessionId: "session-1",
          OR: expect.any(Array),
        },
        orderBy: { t0: "asc" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].duration).toBe(20);
    });
  });

  describe("clipExists", () => {
    it("should return true when clip exists", async () => {
      vi.mocked(prisma.clip.findUnique).mockResolvedValue({ id: "test-clip-id" } as any);

      const result = await clipExists("test-artifact-id");

      expect(prisma.clip.findUnique).toHaveBeenCalledWith({
        where: { artifactId: "test-artifact-id" },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it("should return false when clip does not exist", async () => {
      vi.mocked(prisma.clip.findUnique).mockResolvedValue(null);

      const result = await clipExists("non-existent-artifact");

      expect(result).toBe(false);
    });
  });
});

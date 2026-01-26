/**
 * Output Service Unit Tests
 *
 * Tests for output CRUD operations using mocked Prisma client.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../db/index.js";
import { createMockOutput } from "../setup.js";

// Import the service functions
import {
  createOutput,
  createOutputs,
  getOutputById,
  getOutputWithSession,
  updateOutput,
  updateOutputStatus,
  deleteOutput,
  listOutputs,
  getSessionOutputsByCategory,
  getDraftOutputs,
  countOutputs,
  getOutputCategories,
  approveAllDrafts,
} from "../../db/services/output.service.js";

describe("Output Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createOutput", () => {
    it("should create a new output with required fields", async () => {
      const mockOutput = createMockOutput();
      vi.mocked(prisma.output.create).mockResolvedValue(mockOutput);

      const result = await createOutput({
        sessionId: "test-session-id",
        category: "social_post",
        text: "Test content",
      });

      expect(prisma.output.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: "test-session-id",
          category: "social_post",
          text: "Test content",
          status: "draft",
        }),
      });
      expect(result).toEqual(mockOutput);
    });

    it("should create an output with all optional fields", async () => {
      const mockOutput = createMockOutput({
        title: "My Title",
        refs: ["ref1", "ref2"],
        meta: { key: "value" },
        status: "approved",
      });
      vi.mocked(prisma.output.create).mockResolvedValue(mockOutput);

      const result = await createOutput({
        sessionId: "test-session-id",
        category: "chapter",
        text: "Chapter content",
        title: "My Title",
        refs: ["ref1", "ref2"],
        meta: { key: "value" },
        status: "approved",
      });

      expect(prisma.output.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "My Title",
          refs: ["ref1", "ref2"],
          meta: { key: "value" },
          status: "approved",
        }),
      });
      expect(result.title).toBe("My Title");
    });
  });

  describe("createOutputs", () => {
    it("should create multiple outputs in batch", async () => {
      vi.mocked(prisma.output.createMany).mockResolvedValue({ count: 3 });

      const inputs = [
        { sessionId: "s1", category: "tweet", text: "Tweet 1" },
        { sessionId: "s1", category: "tweet", text: "Tweet 2" },
        { sessionId: "s1", category: "tweet", text: "Tweet 3" },
      ];

      const result = await createOutputs(inputs);

      expect(prisma.output.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ sessionId: "s1", category: "tweet", text: "Tweet 1" }),
        ]),
      });
      expect(result).toBe(3);
    });
  });

  describe("getOutputById", () => {
    it("should return an output when found", async () => {
      const mockOutput = createMockOutput();
      vi.mocked(prisma.output.findUnique).mockResolvedValue(mockOutput);

      const result = await getOutputById("test-output-id");

      expect(prisma.output.findUnique).toHaveBeenCalledWith({
        where: { id: "test-output-id" },
      });
      expect(result).toEqual(mockOutput);
    });

    it("should return null when output not found", async () => {
      vi.mocked(prisma.output.findUnique).mockResolvedValue(null);

      const result = await getOutputById("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("getOutputWithSession", () => {
    it("should return output with session data", async () => {
      const mockOutputWithSession = {
        ...createMockOutput(),
        session: {
          id: "test-session-id",
          workflow: "streamer",
          title: "Test Session",
        },
      };
      vi.mocked(prisma.output.findUnique).mockResolvedValue(mockOutputWithSession);

      const result = await getOutputWithSession("test-output-id");

      expect(prisma.output.findUnique).toHaveBeenCalledWith({
        where: { id: "test-output-id" },
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

  describe("updateOutput", () => {
    it("should update output text", async () => {
      const mockOutput = createMockOutput({ text: "Updated content" });
      vi.mocked(prisma.output.update).mockResolvedValue(mockOutput);

      const result = await updateOutput("test-output-id", {
        text: "Updated content",
      });

      expect(prisma.output.update).toHaveBeenCalledWith({
        where: { id: "test-output-id" },
        data: { text: "Updated content" },
      });
      expect(result.text).toBe("Updated content");
    });

    it("should update multiple fields", async () => {
      const mockOutput = createMockOutput({
        title: "New Title",
        status: "approved",
        refs: ["new-ref"],
      });
      vi.mocked(prisma.output.update).mockResolvedValue(mockOutput);

      const result = await updateOutput("test-output-id", {
        title: "New Title",
        status: "approved",
        refs: ["new-ref"],
      });

      expect(prisma.output.update).toHaveBeenCalledWith({
        where: { id: "test-output-id" },
        data: {
          title: "New Title",
          status: "approved",
          refs: ["new-ref"],
        },
      });
      expect(result.status).toBe("approved");
    });
  });

  describe("updateOutputStatus", () => {
    it("should update output status", async () => {
      const mockOutput = createMockOutput({ status: "published" });
      vi.mocked(prisma.output.update).mockResolvedValue(mockOutput);

      const result = await updateOutputStatus("test-output-id", "published");

      expect(prisma.output.update).toHaveBeenCalledWith({
        where: { id: "test-output-id" },
        data: { status: "published" },
      });
      expect(result.status).toBe("published");
    });
  });

  describe("deleteOutput", () => {
    it("should delete output by ID", async () => {
      const mockOutput = createMockOutput();
      vi.mocked(prisma.output.delete).mockResolvedValue(mockOutput);

      const result = await deleteOutput("test-output-id");

      expect(prisma.output.delete).toHaveBeenCalledWith({
        where: { id: "test-output-id" },
      });
      expect(result).toEqual(mockOutput);
    });
  });

  describe("listOutputs", () => {
    it("should return outputs with default pagination", async () => {
      const mockOutputs = [
        createMockOutput({ id: "output-1" }),
        createMockOutput({ id: "output-2" }),
      ];
      vi.mocked(prisma.output.findMany).mockResolvedValue(mockOutputs);

      const result = await listOutputs({});

      expect(prisma.output.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
          orderBy: { createdAt: "desc" },
        })
      );
      expect(result).toHaveLength(2);
    });

    it("should filter by sessionId", async () => {
      const mockOutputs = [createMockOutput()];
      vi.mocked(prisma.output.findMany).mockResolvedValue(mockOutputs);

      await listOutputs({ sessionId: "specific-session" });

      expect(prisma.output.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sessionId: "specific-session" }),
        })
      );
    });

    it("should filter by category", async () => {
      const mockOutputs = [createMockOutput({ category: "tweet" })];
      vi.mocked(prisma.output.findMany).mockResolvedValue(mockOutputs);

      await listOutputs({ category: "tweet" });

      expect(prisma.output.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "tweet" }),
        })
      );
    });

    it("should filter by multiple categories", async () => {
      const mockOutputs = [createMockOutput()];
      vi.mocked(prisma.output.findMany).mockResolvedValue(mockOutputs);

      await listOutputs({ categories: ["tweet", "thread"] });

      expect(prisma.output.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: ["tweet", "thread"] },
          }),
        })
      );
    });

    it("should filter by status", async () => {
      const mockOutputs = [createMockOutput({ status: "approved" })];
      vi.mocked(prisma.output.findMany).mockResolvedValue(mockOutputs);

      await listOutputs({ status: "approved" });

      expect(prisma.output.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "approved" }),
        })
      );
    });

    it("should apply custom pagination and ordering", async () => {
      vi.mocked(prisma.output.findMany).mockResolvedValue([]);

      await listOutputs({
        limit: 10,
        offset: 20,
        orderBy: "updatedAt",
        orderDir: "asc",
      });

      expect(prisma.output.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
          orderBy: { updatedAt: "asc" },
        })
      );
    });
  });

  describe("getSessionOutputsByCategory", () => {
    it("should return outputs for a session by category", async () => {
      const mockOutputs = [
        createMockOutput({ category: "tweet" }),
        createMockOutput({ id: "output-2", category: "tweet" }),
      ];
      vi.mocked(prisma.output.findMany).mockResolvedValue(mockOutputs);

      const result = await getSessionOutputsByCategory("session-1", "tweet");

      expect(prisma.output.findMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1", category: "tweet" },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("getDraftOutputs", () => {
    it("should return all draft outputs for a session", async () => {
      const mockOutputs = [
        createMockOutput({ status: "draft" }),
        createMockOutput({ id: "output-2", status: "draft" }),
      ];
      vi.mocked(prisma.output.findMany).mockResolvedValue(mockOutputs);

      const result = await getDraftOutputs("session-1");

      expect(prisma.output.findMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1", status: "draft" },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("countOutputs", () => {
    it("should count all outputs", async () => {
      vi.mocked(prisma.output.count).mockResolvedValue(42);

      const result = await countOutputs();

      expect(prisma.output.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toBe(42);
    });

    it("should count outputs by sessionId", async () => {
      vi.mocked(prisma.output.count).mockResolvedValue(10);

      const result = await countOutputs({ sessionId: "session-1" });

      expect(prisma.output.count).toHaveBeenCalledWith({
        where: { sessionId: "session-1" },
      });
      expect(result).toBe(10);
    });

    it("should count outputs by category and status", async () => {
      vi.mocked(prisma.output.count).mockResolvedValue(5);

      const result = await countOutputs({ category: "tweet", status: "draft" });

      expect(prisma.output.count).toHaveBeenCalledWith({
        where: { category: "tweet", status: "draft" },
      });
      expect(result).toBe(5);
    });
  });

  describe("getOutputCategories", () => {
    it("should return distinct categories", async () => {
      vi.mocked(prisma.output.findMany).mockResolvedValue([
        { category: "tweet" },
        { category: "thread" },
        { category: "chapter" },
      ] as any);

      const result = await getOutputCategories();

      expect(prisma.output.findMany).toHaveBeenCalledWith({
        where: {},
        select: { category: true },
        distinct: ["category"],
      });
      expect(result).toEqual(["tweet", "thread", "chapter"]);
    });

    it("should filter categories by sessionId", async () => {
      vi.mocked(prisma.output.findMany).mockResolvedValue([
        { category: "tweet" },
      ] as any);

      await getOutputCategories("session-1");

      expect(prisma.output.findMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1" },
        select: { category: true },
        distinct: ["category"],
      });
    });
  });

  describe("approveAllDrafts", () => {
    it("should approve all draft outputs for a session", async () => {
      vi.mocked(prisma.output.updateMany).mockResolvedValue({ count: 5 });

      const result = await approveAllDrafts("session-1");

      expect(prisma.output.updateMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1", status: "draft" },
        data: { status: "approved" },
      });
      expect(result).toBe(5);
    });
  });
});

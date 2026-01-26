/**
 * Sessions API Routes Integration Tests
 *
 * Tests for the /api/sessions endpoints using supertest.
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { mockUser, mockAdminUser, generateTestToken } from "../utils/test-app.js";

// Mock the Prisma client
vi.mock("../../db/prisma.js", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    output: {
      findMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock the auth utils for token verification
vi.mock("../../auth/utils.js", () => ({
  verifyAccessToken: vi.fn(),
  hashApiKey: vi.fn(),
  validateApiKeyFormat: vi.fn(),
}));

import { prisma } from "../../db/prisma.js";
import * as authUtils from "../../auth/utils.js";
import { createMockSession } from "../setup.js";

describe("Sessions API Routes", () => {
  let app: Application;

  beforeAll(async () => {
    // Dynamically import and create the test app
    const express = (await import("express")).default;
    const { createSessionsRouter } = await import("../../api/sessions.js");

    app = express();
    app.use(express.json());
    app.use("/api/sessions", createSessionsRouter());
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/sessions", () => {
    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app)
        .get("/api/sessions")
        .expect(401);

      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("should return 401 when invalid token is provided", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue(null);

      const response = await request(app)
        .get("/api/sessions")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should return empty list when no sessions exist", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findMany).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toEqual([]);
      expect(response.body.data.pagination).toBeDefined();
    });

    it("should return list of sessions with default pagination", async () => {
      const mockSessions = [
        createMockSession({ id: "session-1", workflow: "streamer" }),
        createMockSession({ id: "session-2", workflow: "podcast" }),
      ];

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);

      const response = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toHaveLength(2);
      expect(response.body.data.sessions[0].id).toBe("session-1");
      expect(response.body.data.sessions[0].workflow).toBe("streamer");
    });

    it("should filter sessions by workflow", async () => {
      const mockSessions = [
        createMockSession({ id: "session-1", workflow: "podcast" }),
      ];

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);

      const response = await request(app)
        .get("/api/sessions?workflow=podcast")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workflow: "podcast" }),
        })
      );
    });

    it("should support custom pagination", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findMany).mockResolvedValue([]);

      await request(app)
        .get("/api/sessions?limit=10&offset=20")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it("should reject invalid limit values", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });

      const response = await request(app)
        .get("/api/sessions?limit=500")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/sessions/:id", () => {
    it("should return 401 without authorization", async () => {
      const response = await request(app)
        .get("/api/sessions/test-session-id")
        .expect(401);

      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("should return 404 when session not found", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      const response = await request(app)
        .get("/api/sessions/non-existent-id")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should return session when found", async () => {
      const mockSession = createMockSession({ id: "found-session" });

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession);

      const response = await request(app)
        .get("/api/sessions/found-session")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session.id).toBe("found-session");
    });
  });

  describe("GET /api/sessions/:id/outputs", () => {
    it("should return 401 without authorization", async () => {
      const response = await request(app)
        .get("/api/sessions/test-session-id/outputs")
        .expect(401);

      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("should return 404 when session not found", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      const response = await request(app)
        .get("/api/sessions/non-existent-id/outputs")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(404);

      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should return outputs for valid session", async () => {
      const mockSession = createMockSession({ id: "session-with-outputs" });
      const mockOutputs = [
        { id: "output-1", sessionId: "session-with-outputs", category: "highlight" },
        { id: "output-2", sessionId: "session-with-outputs", category: "summary" },
      ];

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession);
      vi.mocked(prisma.output.findMany).mockResolvedValue(mockOutputs as any);

      const response = await request(app)
        .get("/api/sessions/session-with-outputs/outputs")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.outputs).toHaveLength(2);
    });
  });

  describe("PATCH /api/sessions/:id", () => {
    it("should return 401 without authorization", async () => {
      const response = await request(app)
        .patch("/api/sessions/test-session-id")
        .send({ title: "Updated Title" })
        .expect(401);

      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("should return 404 when session not found", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      const response = await request(app)
        .patch("/api/sessions/non-existent-id")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .send({ title: "Updated Title" })
        .expect(404);

      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should update session title", async () => {
      const mockSession = createMockSession({ id: "session-to-update" });
      const updatedSession = { ...mockSession, title: "Updated Title" };

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession);
      vi.mocked(prisma.session.update).mockResolvedValue(updatedSession);

      const response = await request(app)
        .patch("/api/sessions/session-to-update")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .send({ title: "Updated Title" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session.title).toBe("Updated Title");
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: "session-to-update" },
        data: { title: "Updated Title" },
      });
    });

    it("should update session participants", async () => {
      const mockSession = createMockSession({ id: "session-to-update" });
      const updatedSession = { ...mockSession, participants: ["Alice", "Bob", "Charlie"] };

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession);
      vi.mocked(prisma.session.update).mockResolvedValue(updatedSession);

      const response = await request(app)
        .patch("/api/sessions/session-to-update")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .send({ participants: ["Alice", "Bob", "Charlie"] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session.participants).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should reject title that is too long", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });

      const longTitle = "x".repeat(250); // Exceeds 200 char limit

      const response = await request(app)
        .patch("/api/sessions/session-id")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .send({ title: longTitle })
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE /api/sessions/:id", () => {
    it("should return 401 without authorization", async () => {
      const response = await request(app)
        .delete("/api/sessions/test-session-id")
        .expect(401);

      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("should return 404 when session not found", async () => {
      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      const response = await request(app)
        .delete("/api/sessions/non-existent-id")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(404);

      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should return 400 when trying to delete active session", async () => {
      const activeSession = createMockSession({ id: "active-session", endedAt: null });

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(activeSession);

      const response = await request(app)
        .delete("/api/sessions/active-session")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(400);

      expect(response.body.error.code).toBe("SESSION_ACTIVE");
    });

    it("should delete completed session", async () => {
      const completedSession = createMockSession({
        id: "completed-session",
        endedAt: new Date(),
      });

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(completedSession);
      vi.mocked(prisma.session.delete).mockResolvedValue(completedSession);

      const response = await request(app)
        .delete("/api/sessions/completed-session")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Session deleted successfully.");
      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: "completed-session" },
      });
    });
  });
});

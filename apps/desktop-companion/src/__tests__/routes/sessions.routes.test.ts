/**
 * Sessions API Routes Integration Tests
 *
 * Tests for the /api/sessions endpoints using supertest.
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { mockUser, mockAdminUser, generateTestToken } from "../utils/test-app.js";

// Mock the session service (used by the route handlers)
vi.mock("../../db/services/session.service.js", () => ({
  listSessions: vi.fn(),
  getSessionById: vi.fn(),
  getSessionWithCounts: vi.fn(),
  getSessionWithRelations: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
}));

// Mock the output service (used by the outputs handler)
vi.mock("../../db/services/output.service.js", () => ({
  listOutputs: vi.fn(),
}));

// Mock the auth utils for token verification
vi.mock("../../auth/utils.js", () => ({
  verifyAccessToken: vi.fn(),
  hashApiKey: vi.fn(),
  validateApiKeyFormat: vi.fn(),
}));

import * as sessionService from "../../db/services/session.service.js";
import * as outputService from "../../db/services/output.service.js";
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
    it("should return empty list when no sessions exist", async () => {
      vi.mocked(sessionService.listSessions).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/sessions")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toEqual([]);
      expect(response.body.data.pagination).toBeDefined();
    });

    it("should return list of sessions with default pagination", async () => {
      const mockSessions = [
        createMockSession({ id: "csession10000000000000001", workflow: "streamer", _count: { events: 0, outputs: 0, clips: 0 } }),
        createMockSession({ id: "csession20000000000000001", workflow: "podcast", _count: { events: 0, outputs: 0, clips: 0 } }),
      ];

      vi.mocked(sessionService.listSessions).mockResolvedValue(mockSessions as any);

      const response = await request(app)
        .get("/api/sessions")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toHaveLength(2);
      expect(response.body.data.sessions[0].id).toBe("csession10000000000000001");
      expect(response.body.data.sessions[0].workflow).toBe("streamer");
    });

    it("should filter sessions by workflow", async () => {
      const mockSessions = [
        createMockSession({ id: "csession10000000000000001", workflow: "podcast", _count: { events: 0, outputs: 0, clips: 0 } }),
      ];

      vi.mocked(sessionService.listSessions).mockResolvedValue(mockSessions as any);

      const response = await request(app)
        .get("/api/sessions?workflow=podcast")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(sessionService.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ workflow: "podcast" })
      );
    });

    it("should support custom pagination", async () => {
      vi.mocked(sessionService.listSessions).mockResolvedValue([]);

      await request(app)
        .get("/api/sessions?limit=10&offset=20")
        .expect(200);

      expect(sessionService.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });

    it("should reject invalid limit values", async () => {
      const response = await request(app)
        .get("/api/sessions?limit=500")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/sessions/:id", () => {
    it("should return 404 when session not found", async () => {
      vi.mocked(sessionService.getSessionWithCounts).mockResolvedValue(null as any);

      const response = await request(app)
        .get("/api/sessions/cnonexistentid00000000001")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should return session when found", async () => {
      const mockSession = createMockSession({
        id: "cfoundsession000000000001",
        _count: { events: 0, outputs: 0, clips: 0 },
      });

      vi.mocked(sessionService.getSessionWithCounts).mockResolvedValue(mockSession as any);

      const response = await request(app)
        .get("/api/sessions/cfoundsession000000000001")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session.id).toBe("cfoundsession000000000001");
    });

    it("should return 400 for invalid session ID format", async () => {
      const response = await request(app)
        .get("/api/sessions/invalid-id-format")
        .expect(400);

      expect(response.body.error.code).toBe("INVALID_SESSION_ID");
    });
  });

  describe("GET /api/sessions/:id/outputs", () => {
    it("should return 404 when session not found", async () => {
      vi.mocked(sessionService.getSessionById).mockResolvedValue(null as any);

      const response = await request(app)
        .get("/api/sessions/cnonexistentid00000000001/outputs")
        .expect(404);

      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should return outputs for valid session", async () => {
      const mockSession = createMockSession({ id: "csessionwithoutputs000001" });
      const mockOutputs = [
        {
          id: "output-1",
          sessionId: "csessionwithoutputs000001",
          category: "highlight",
          title: "Output 1",
          text: "Content 1",
          refs: [],
          meta: null,
          status: "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "output-2",
          sessionId: "csessionwithoutputs000001",
          category: "summary",
          title: "Output 2",
          text: "Content 2",
          refs: [],
          meta: null,
          status: "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(sessionService.getSessionById).mockResolvedValue(mockSession as any);
      vi.mocked(outputService.listOutputs).mockResolvedValue(mockOutputs as any);

      const response = await request(app)
        .get("/api/sessions/csessionwithoutputs000001/outputs")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.outputs).toHaveLength(2);
    });
  });

  describe("PATCH /api/sessions/:id", () => {
    it("should return 401 without authorization", async () => {
      const response = await request(app)
        .patch("/api/sessions/ctestsessionid00000000001")
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
      vi.mocked(sessionService.getSessionById).mockResolvedValue(null as any);

      const response = await request(app)
        .patch("/api/sessions/cnonexistentid00000000001")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .send({ title: "Updated Title" })
        .expect(404);

      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should update session title", async () => {
      const mockSession = createMockSession({ id: "csessiontoupdate000000001" });
      const updatedSession = { ...mockSession, title: "Updated Title" };

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(sessionService.getSessionById).mockResolvedValue(mockSession as any);
      vi.mocked(sessionService.updateSession).mockResolvedValue(updatedSession as any);

      const response = await request(app)
        .patch("/api/sessions/csessiontoupdate000000001")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .send({ title: "Updated Title" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session.title).toBe("Updated Title");
      expect(sessionService.updateSession).toHaveBeenCalledWith(
        "csessiontoupdate000000001",
        { title: "Updated Title" }
      );
    });

    it("should update session participants", async () => {
      const mockSession = createMockSession({ id: "csessiontoupdate000000001" });
      const updatedSession = { ...mockSession, participants: ["Alice", "Bob", "Charlie"] };

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(sessionService.getSessionById).mockResolvedValue(mockSession as any);
      vi.mocked(sessionService.updateSession).mockResolvedValue(updatedSession as any);

      const response = await request(app)
        .patch("/api/sessions/csessiontoupdate000000001")
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
        .patch("/api/sessions/csessionid0000000000000001")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .send({ title: longTitle })
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE /api/sessions/:id", () => {
    it("should return 401 without authorization", async () => {
      const response = await request(app)
        .delete("/api/sessions/ctestsessionid00000000001")
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
      vi.mocked(sessionService.getSessionById).mockResolvedValue(null as any);

      const response = await request(app)
        .delete("/api/sessions/cnonexistentid00000000001")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(404);

      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should return 400 when trying to delete active session", async () => {
      const activeSession = createMockSession({ id: "cactivesession00000000001", endedAt: null });

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(sessionService.getSessionById).mockResolvedValue(activeSession as any);

      const response = await request(app)
        .delete("/api/sessions/cactivesession00000000001")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(400);

      expect(response.body.error.code).toBe("SESSION_ACTIVE");
    });

    it("should delete completed session", async () => {
      const completedSession = createMockSession({
        id: "ccompletedsession00000001",
        endedAt: new Date(),
      });

      vi.mocked(authUtils.verifyAccessToken).mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        platformRole: mockUser.platformRole,
        organizations: mockUser.organizations,
        type: "access",
      });
      vi.mocked(sessionService.getSessionById).mockResolvedValue(completedSession as any);
      vi.mocked(sessionService.deleteSession).mockResolvedValue(undefined as any);

      const response = await request(app)
        .delete("/api/sessions/ccompletedsession00000001")
        .set("Authorization", `Bearer ${generateTestToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Session deleted successfully.");
      expect(sessionService.deleteSession).toHaveBeenCalledWith("ccompletedsession00000001");
    });
  });
});

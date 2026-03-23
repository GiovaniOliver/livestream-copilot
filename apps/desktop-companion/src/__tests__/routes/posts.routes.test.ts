/**
 * Posts Routes Integration Tests
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Application } from "express";

vi.mock("../../auth/middleware.js", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = {
      id: "test-user-id",
      email: "test@example.com",
      platformRole: "USER",
      organizations: [{ id: "org-1", role: "MEMBER" }],
      authMethod: "jwt",
    };
    next();
  },
}));

vi.mock("../../db/services/output.service.js", () => ({
  getOutputById: vi.fn(),
  updateOutput: vi.fn(),
  updateOutputStatus: vi.fn(),
  deleteOutput: vi.fn(),
}));

vi.mock("../../social/service.js", () => ({
  getConnection: vi.fn(),
  createPost: vi.fn(),
}));

import {
  getOutputById,
  updateOutput,
  updateOutputStatus,
  deleteOutput,
} from "../../db/services/output.service.js";
import * as SocialService from "../../social/service.js";

describe("Posts API Routes", () => {
  let app: Application;

  beforeAll(async () => {
    const express = (await import("express")).default;
    const { createPostsRouter } = await import("../../api/posts.js");

    app = express();
    app.use(express.json());
    app.use("/api/posts", createPostsRouter());
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves a SOCIAL_POST output", async () => {
    vi.mocked(getOutputById).mockResolvedValue({
      id: "post-1",
      sessionId: "session-1",
      category: "SOCIAL_POST",
      title: null,
      text: "hello world",
      refs: [],
      meta: {},
      status: "draft",
      createdAt: new Date("2026-03-19T22:00:00.000Z"),
      updatedAt: new Date("2026-03-19T22:00:00.000Z"),
    } as any);

    vi.mocked(updateOutputStatus).mockResolvedValue({
      id: "post-1",
      sessionId: "session-1",
      category: "SOCIAL_POST",
      title: null,
      text: "hello world",
      refs: [],
      meta: {},
      status: "approved",
      createdAt: new Date("2026-03-19T22:00:00.000Z"),
      updatedAt: new Date("2026-03-19T22:05:00.000Z"),
    } as any);

    const response = await request(app).post("/api/posts/post-1/approve").send({}).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.output.status).toBe("approved");
    expect(updateOutputStatus).toHaveBeenCalledWith("post-1", "approved");
  });

  it("rejects non-social outputs", async () => {
    vi.mocked(getOutputById).mockResolvedValue({
      id: "output-1",
      sessionId: "session-1",
      category: "QUOTE",
      title: null,
      text: "quote text",
      refs: [],
      meta: {},
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).post("/api/posts/output-1/approve").send({}).expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("INVALID_POST_OUTPUT");
  });

  it("requires a connection when publishing", async () => {
    vi.mocked(getOutputById).mockResolvedValue({
      id: "post-1",
      sessionId: "session-1",
      category: "SOCIAL_POST",
      title: null,
      text: "hello world",
      refs: [],
      meta: {},
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).post("/api/posts/post-1/publish").send({}).expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.message).toContain("connectionId");
  });

  it("rejects a platform mismatch before publishing", async () => {
    vi.mocked(getOutputById).mockResolvedValue({
      id: "post-1",
      sessionId: "session-1",
      category: "SOCIAL_POST",
      title: "A post",
      text: "hello world",
      refs: [],
      meta: { platform: "linkedin" },
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    vi.mocked(SocialService.getConnection).mockResolvedValue({
      id: "connection-1",
      platform: "TWITTER",
      platformUserId: "twitter-user",
      isActive: true,
      scopes: [],
      createdAt: new Date(),
    } as any);

    const response = await request(app)
      .post("/api/posts/post-1/publish")
      .send({ connectionId: "connection-1" })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("PLATFORM_MISMATCH");
    expect(SocialService.createPost).not.toHaveBeenCalled();
  });

  it("publishes a SOCIAL_POST output through a connected platform", async () => {
    vi.mocked(getOutputById).mockResolvedValue({
      id: "post-1",
      sessionId: "session-1",
      category: "SOCIAL_POST",
      title: "Clip highlight",
      text: "Unreal finish to that match",
      refs: ["event-1"],
      meta: { platform: "twitter" },
      status: "approved",
      createdAt: new Date("2026-03-19T22:00:00.000Z"),
      updatedAt: new Date("2026-03-19T22:01:00.000Z"),
    } as any);

    vi.mocked(SocialService.getConnection).mockResolvedValue({
      id: "connection-1",
      platform: "TWITTER",
      platformUserId: "twitter-user",
      isActive: true,
      scopes: [],
      createdAt: new Date(),
    } as any);

    vi.mocked(SocialService.createPost).mockResolvedValue({
      success: true,
      platformPostId: "tweet-123",
      platformUrl: "https://x.com/example/status/123",
      publishedAt: new Date("2026-03-19T22:10:00.000Z"),
    } as any);

    vi.mocked(updateOutput).mockResolvedValue({
      id: "post-1",
      sessionId: "session-1",
      category: "SOCIAL_POST",
      title: "Clip highlight",
      text: "Unreal finish to that match",
      refs: ["event-1"],
      meta: {
        platform: "twitter",
        publish: {
          connectionId: "connection-1",
          platform: "twitter",
          platformPostId: "tweet-123",
          platformUrl: "https://x.com/example/status/123",
          publishedAt: "2026-03-19T22:10:00.000Z",
        },
      },
      status: "published",
      createdAt: new Date("2026-03-19T22:00:00.000Z"),
      updatedAt: new Date("2026-03-19T22:10:00.000Z"),
    } as any);

    const response = await request(app)
      .post("/api/posts/post-1/publish")
      .send({ connectionId: "connection-1" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.output.status).toBe("published");
    expect(SocialService.createPost).toHaveBeenCalledWith(
      "connection-1",
      "test-user-id",
      {
        text: "Unreal finish to that match",
        title: "Clip highlight",
        hashtags: undefined,
      },
      {
        visibility: undefined,
      }
    );
    expect(updateOutput).toHaveBeenCalledWith(
      "post-1",
      expect.objectContaining({
        status: "published",
      })
    );
  });

  it("deletes a SOCIAL_POST output", async () => {
    vi.mocked(getOutputById).mockResolvedValue({
      id: "post-1",
      sessionId: "session-1",
      category: "SOCIAL_POST",
      title: null,
      text: "delete me",
      refs: [],
      meta: {},
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    vi.mocked(deleteOutput).mockResolvedValue({ id: "post-1" } as any);

    const response = await request(app).delete("/api/posts/post-1").expect(200);

    expect(response.body.success).toBe(true);
    expect(deleteOutput).toHaveBeenCalledWith("post-1");
  });
});

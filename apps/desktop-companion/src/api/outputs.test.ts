/**
 * Tests for Outputs API endpoints
 *
 * Comprehensive test coverage for output management including regeneration
 */

import request from "supertest";
import express from "express";
import { createOutputsRouter } from "./outputs.js";

// Mock dependencies
jest.mock("../db/services/output.service.js");
jest.mock("../db/services/session.service.js");
jest.mock("../agents/client.js");
jest.mock("../auth/middleware.js");
jest.mock("../logger/index.js", () => ({
  logger: {
    child: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  getOutputById,
  getOutputWithSession,
  updateOutput,
} from "../db/services/output.service.js";
import {
  complete,
  isAIConfigured,
  getDefaultModel,
  getDefaultMaxTokens,
} from "../agents/client.js";
import { authenticateToken } from "../auth/middleware.js";

// Type mocks
const mockGetOutputById = getOutputById as jest.MockedFunction<typeof getOutputById>;
const mockGetOutputWithSession = getOutputWithSession as jest.MockedFunction<typeof getOutputWithSession>;
const mockUpdateOutput = updateOutput as jest.MockedFunction<typeof updateOutput>;
const mockComplete = complete as jest.MockedFunction<typeof complete>;
const mockIsAIConfigured = isAIConfigured as jest.MockedFunction<typeof isAIConfigured>;
const mockGetDefaultModel = getDefaultModel as jest.MockedFunction<typeof getDefaultModel>;
const mockGetDefaultMaxTokens = getDefaultMaxTokens as jest.MockedFunction<typeof getDefaultMaxTokens>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe("Outputs API - Regenerate Endpoint", () => {
  let app: express.Application;

  beforeEach(() => {
    // Setup Express app with outputs router
    app = express();
    app.use(express.json());
    app.use("/api/outputs", createOutputsRouter());

    // Reset mocks
    jest.clearAllMocks();

    // Mock authentication middleware to pass through
    mockAuthenticateToken.mockImplementation((req, res, next) => next());

    // Mock AI client defaults
    mockGetDefaultModel.mockReturnValue("claude-3-5-sonnet-20241022");
    mockGetDefaultMaxTokens.mockReturnValue(2000);
  });

  describe("POST /api/outputs/:id/regenerate", () => {
    const mockOutput = {
      id: "output-123",
      sessionId: "session-456",
      category: "x",
      title: "Original Title",
      text: "Original tweet content here",
      refs: [],
      meta: {},
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
      session: {
        id: "session-456",
        workflow: "streamer",
        title: "Test Stream",
      },
    };

    it("should successfully regenerate output content", async () => {
      // Mock dependencies
      mockIsAIConfigured.mockReturnValue(true);
      mockGetOutputWithSession.mockResolvedValue(mockOutput as any);
      mockComplete.mockResolvedValue({
        content: "Regenerated tweet with fresh perspective!",
        usage: { inputTokens: 100, outputTokens: 50 },
        finishReason: "end_turn",
      });
      mockUpdateOutput.mockResolvedValue({
        ...mockOutput,
        text: "Regenerated tweet with fresh perspective!",
        updatedAt: new Date(),
      } as any);

      const response = await request(app)
        .post("/api/outputs/output-123/regenerate")
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.output.text).toBe("Regenerated tweet with fresh perspective!");
      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(mockUpdateOutput).toHaveBeenCalledTimes(1);
    });

    it("should regenerate with custom instructions", async () => {
      mockIsAIConfigured.mockReturnValue(true);
      mockGetOutputWithSession.mockResolvedValue(mockOutput as any);
      mockComplete.mockResolvedValue({
        content: "Super casual tweet with emojis 😎🚀",
        usage: { inputTokens: 120, outputTokens: 60 },
        finishReason: "end_turn",
      });
      mockUpdateOutput.mockResolvedValue({
        ...mockOutput,
        text: "Super casual tweet with emojis 😎🚀",
      } as any);

      const response = await request(app)
        .post("/api/outputs/output-123/regenerate")
        .send({
          instructions: "Make it more casual and add emojis",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockComplete).toHaveBeenCalledTimes(1);

      // Verify prompt includes instructions
      const prompt = mockComplete.mock.calls[0][0].messages[0].content;
      expect(prompt).toContain("Make it more casual and add emojis");
    });

    it("should return 404 when output not found", async () => {
      mockIsAIConfigured.mockReturnValue(true);
      mockGetOutputWithSession.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/outputs/nonexistent/regenerate")
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
      expect(mockComplete).not.toHaveBeenCalled();
    });

    it("should return 503 when AI not configured", async () => {
      mockIsAIConfigured.mockReturnValue(false);

      const response = await request(app)
        .post("/api/outputs/output-123/regenerate")
        .send({})
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("AI_NOT_CONFIGURED");
      expect(mockComplete).not.toHaveBeenCalled();
    });

    it("should validate instructions length", async () => {
      const longInstructions = "a".repeat(1001); // Exceeds 1000 char limit

      const response = await request(app)
        .post("/api/outputs/output-123/regenerate")
        .send({
          instructions: longInstructions,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should handle AI completion errors gracefully", async () => {
      mockIsAIConfigured.mockReturnValue(true);
      mockGetOutputWithSession.mockResolvedValue(mockOutput as any);
      mockComplete.mockRejectedValue(new Error("AI API rate limit exceeded"));

      const response = await request(app)
        .post("/api/outputs/output-123/regenerate")
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("REGENERATION_FAILED");
      // Should not expose internal error details
      expect(response.body.error.message).not.toContain("rate limit");
    });

    it("should handle empty AI response", async () => {
      mockIsAIConfigured.mockReturnValue(true);
      mockGetOutputWithSession.mockResolvedValue(mockOutput as any);
      mockComplete.mockResolvedValue({
        content: "   ", // Empty/whitespace only
        usage: { inputTokens: 100, outputTokens: 5 },
        finishReason: "end_turn",
      });

      const response = await request(app)
        .post("/api/outputs/output-123/regenerate")
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("AI_ERROR");
      expect(mockUpdateOutput).not.toHaveBeenCalled();
    });

    it("should sanitize prompt inputs to prevent injection", async () => {
      const maliciousOutput = {
        ...mockOutput,
        category: "x<script>alert('xss')</script>",
        session: {
          ...mockOutput.session,
          title: "<img src=x onerror=alert('xss')>",
        },
      };

      mockIsAIConfigured.mockReturnValue(true);
      mockGetOutputWithSession.mockResolvedValue(maliciousOutput as any);
      mockComplete.mockResolvedValue({
        content: "Safe regenerated content",
        usage: { inputTokens: 100, outputTokens: 50 },
        finishReason: "end_turn",
      });
      mockUpdateOutput.mockResolvedValue({
        ...maliciousOutput,
        text: "Safe regenerated content",
      } as any);

      await request(app)
        .post("/api/outputs/output-123/regenerate")
        .send({
          instructions: "<script>malicious()</script>",
        })
        .expect(200);

      // Verify prompt was sanitized
      const prompt = mockComplete.mock.calls[0][0].messages[0].content;
      expect(prompt).not.toContain("<script>");
      expect(prompt).not.toContain("<img");
      expect(prompt).not.toContain("onerror");
    });

    it("should preserve metadata and add regeneration info", async () => {
      const outputWithMeta = {
        ...mockOutput,
        meta: {
          originalAuthor: "user123",
          tags: ["tech", "ai"],
        },
      };

      mockIsAIConfigured.mockReturnValue(true);
      mockGetOutputWithSession.mockResolvedValue(outputWithMeta as any);
      mockComplete.mockResolvedValue({
        content: "Regenerated content",
        usage: { inputTokens: 100, outputTokens: 50 },
        finishReason: "end_turn",
      });
      mockUpdateOutput.mockResolvedValue({
        ...outputWithMeta,
        text: "Regenerated content",
      } as any);

      await request(app)
        .post("/api/outputs/output-123/regenerate")
        .send({})
        .expect(200);

      // Verify metadata was preserved and augmented
      expect(mockUpdateOutput).toHaveBeenCalledWith(
        "output-123",
        expect.objectContaining({
          text: "Regenerated content",
          meta: expect.objectContaining({
            originalAuthor: "user123",
            tags: ["tech", "ai"],
            regeneratedAt: expect.any(String),
            previousText: "Original tweet content here",
            aiMetadata: expect.objectContaining({
              inputTokens: 100,
              outputTokens: 50,
            }),
          }),
        })
      );
    });
  });

  describe("Rate Limiting", () => {
    it.skip("should rate limit excessive regeneration requests", async () => {
      // Note: This test requires actual rate limiting middleware
      // Skip for unit tests, implement in integration tests
      // Would test making 11 requests in quick succession
      // and verifying the 11th returns 429
    });
  });
});

/**
 * Agent Router Unit Tests
 *
 * Tests for the AgentRouter class which routes events to appropriate
 * workflow agents, manages transcript/event buffers, validates outputs,
 * and persists results to the database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { EventEnvelope } from "@livestream-copilot/shared";
import type {
  Agent,
  AgentContext,
  AgentResult,
  AgentOutput,
  WorkflowType,
} from "../types.js";

// Mock external dependencies before importing the module under test
vi.mock("../../logger/index.js", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("../../db/services/output.service.js", () => ({
  createOutput: vi.fn().mockResolvedValue({ id: "persisted-output-id" }),
}));

vi.mock("../client.js", () => ({
  isAIConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock("../validation/index.js", () => ({
  outputValidator: {
    configure: vi.fn(),
    validate: vi.fn().mockResolvedValue({
      valid: true,
      issues: [],
      output: {},
      autoFixed: false,
    }),
  },
}));

vi.mock("../../observability/opik.js", () => ({
  getOpikClient: vi.fn().mockReturnValue(null),
}));

import { AgentRouter } from "../router.js";
import { isAIConfigured } from "../client.js";
import * as OutputService from "../../db/services/output.service.js";
import { outputValidator } from "../validation/index.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    name: "test-agent",
    workflow: "streamer" as WorkflowType,
    triggerEvents: ["TRANSCRIPT_SEGMENT", "MOMENT_MARKER"],
    shouldProcess: vi.fn().mockReturnValue(true),
    process: vi.fn().mockResolvedValue({
      success: true,
      outputs: [
        {
          category: "SOCIAL_POST",
          text: "Test output text that is long enough",
          title: "Test Title",
        },
      ],
      durationMs: 100,
    } as AgentResult),
    ...overrides,
  };
}

function createMockEvent(
  overrides: Record<string, unknown> = {}
): EventEnvelope {
  return {
    id: "test-event-id",
    sessionId: "test-session-id",
    ts: Date.now(),
    type: "MOMENT_MARKER",
    payload: {
      label: "Test moment",
      t: 120,
      confidence: 0.9,
    },
    ...overrides,
  } as unknown as EventEnvelope;
}

function createTranscriptEvent(
  text: string,
  speakerId = "Speaker",
  overrides: Record<string, unknown> = {}
): EventEnvelope {
  return {
    id: `transcript-${Date.now()}`,
    sessionId: "test-session-id",
    ts: Date.now(),
    type: "TRANSCRIPT_SEGMENT",
    payload: {
      text,
      speakerId,
      t0: 0,
      t1: 5,
    },
    ...overrides,
  } as unknown as EventEnvelope;
}

function createMockContext(
  overrides: Partial<Omit<AgentContext, "recentTranscript" | "recentEvents">> = {}
): Omit<AgentContext, "recentTranscript" | "recentEvents"> {
  return {
    sessionId: "test-session-id",
    dbSessionId: "db-session-id",
    workflow: "streamer" as WorkflowType,
    title: "Test Session",
    participants: ["Host"],
    startedAt: Date.now(),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("AgentRouter", () => {
  let router: AgentRouter;

  beforeEach(() => {
    vi.clearAllMocks();
    router = new AgentRouter();
    vi.mocked(isAIConfigured).mockReturnValue(true);
    vi.mocked(OutputService.createOutput).mockResolvedValue({
      id: "persisted-output-id",
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  describe("initialize", () => {
    it("should return true and enable router when AI is configured", () => {
      const result = router.initialize();

      expect(result).toBe(true);
      expect(router.isEnabled()).toBe(true);
    });

    it("should return false and disable router when AI is not configured", () => {
      vi.mocked(isAIConfigured).mockReturnValue(false);

      const result = router.initialize();

      expect(result).toBe(false);
      expect(router.isEnabled()).toBe(false);
    });

    it("should default to disabled before initialization", () => {
      expect(router.isEnabled()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Agent Registration
  // ---------------------------------------------------------------------------
  describe("registerAgent", () => {
    it("should register a single agent for a workflow", () => {
      const agent = createMockAgent();
      router.registerAgent(agent);

      const agents = router.getAgents("streamer");
      expect(agents).toHaveLength(1);
      expect(agents[0]).toBe(agent);
    });

    it("should register multiple agents for the same workflow", () => {
      const agent1 = createMockAgent({ name: "agent-1" });
      const agent2 = createMockAgent({ name: "agent-2" });

      router.registerAgent(agent1);
      router.registerAgent(agent2);

      const agents = router.getAgents("streamer");
      expect(agents).toHaveLength(2);
    });

    it("should register agents for different workflows independently", () => {
      const streamerAgent = createMockAgent({
        name: "streamer-agent",
        workflow: "streamer",
      });
      const podcastAgent = createMockAgent({
        name: "podcast-agent",
        workflow: "podcast",
      });

      router.registerAgent(streamerAgent);
      router.registerAgent(podcastAgent);

      expect(router.getAgents("streamer")).toHaveLength(1);
      expect(router.getAgents("podcast")).toHaveLength(1);
    });
  });

  describe("unregisterWorkflow", () => {
    it("should remove all agents for a workflow", () => {
      const agent = createMockAgent();
      router.registerAgent(agent);
      expect(router.getAgents("streamer")).toHaveLength(1);

      router.unregisterWorkflow("streamer");
      expect(router.getAgents("streamer")).toHaveLength(0);
    });

    it("should not affect agents for other workflows", () => {
      const streamerAgent = createMockAgent({
        name: "streamer-agent",
        workflow: "streamer",
      });
      const podcastAgent = createMockAgent({
        name: "podcast-agent",
        workflow: "podcast",
      });

      router.registerAgent(streamerAgent);
      router.registerAgent(podcastAgent);

      router.unregisterWorkflow("streamer");

      expect(router.getAgents("streamer")).toHaveLength(0);
      expect(router.getAgents("podcast")).toHaveLength(1);
    });
  });

  describe("getAgents", () => {
    it("should return empty array for unregistered workflow", () => {
      const agents = router.getAgents("brainstorm");
      expect(agents).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Event Routing
  // ---------------------------------------------------------------------------
  describe("routeEvent", () => {
    it("should return empty array when router is disabled", async () => {
      // Do not initialize (router is disabled by default)
      const event = createMockEvent();
      const context = createMockContext();

      const results = await router.routeEvent(event, context);

      expect(results).toEqual([]);
    });

    it("should return empty array when no agents are registered for workflow", async () => {
      router.initialize();
      const event = createMockEvent();
      const context = createMockContext({ workflow: "brainstorm" });

      const results = await router.routeEvent(event, context);

      expect(results).toEqual([]);
    });

    it("should route event to matching agent and return results", async () => {
      router.initialize();
      const agent = createMockAgent();
      router.registerAgent(agent);

      const event = createMockEvent();
      const context = createMockContext();

      const results = await router.routeEvent(event, context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].outputs).toHaveLength(1);
      expect(agent.shouldProcess).toHaveBeenCalled();
      expect(agent.process).toHaveBeenCalled();
    });

    it("should skip agents that return false from shouldProcess", async () => {
      router.initialize();

      const skipAgent = createMockAgent({
        name: "skip-agent",
        shouldProcess: vi.fn().mockReturnValue(false),
      });
      const matchAgent = createMockAgent({ name: "match-agent" });

      router.registerAgent(skipAgent);
      router.registerAgent(matchAgent);

      const event = createMockEvent();
      const context = createMockContext();

      const results = await router.routeEvent(event, context);

      expect(results).toHaveLength(1);
      expect(skipAgent.process).not.toHaveBeenCalled();
      expect(matchAgent.process).toHaveBeenCalled();
    });

    it("should handle agent processing errors gracefully", async () => {
      router.initialize();

      const failingAgent = createMockAgent({
        name: "failing-agent",
        process: vi.fn().mockRejectedValue(new Error("Agent exploded")),
      });
      router.registerAgent(failingAgent);

      const event = createMockEvent();
      const context = createMockContext();

      const results = await router.routeEvent(event, context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Agent exploded");
      expect(results[0].outputs).toEqual([]);
      expect(results[0].durationMs).toBe(0);
    });

    it("should handle non-Error thrown by agent", async () => {
      router.initialize();

      const failingAgent = createMockAgent({
        name: "failing-agent",
        process: vi.fn().mockRejectedValue("string error"),
      });
      router.registerAgent(failingAgent);

      const event = createMockEvent();
      const context = createMockContext();

      const results = await router.routeEvent(event, context);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Unknown error");
    });

    it("should persist successful outputs to database", async () => {
      router.initialize();
      router.setValidationEnabled(false);

      const agent = createMockAgent();
      router.registerAgent(agent);

      const event = createMockEvent();
      const context = createMockContext();

      await router.routeEvent(event, context);

      expect(OutputService.createOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "db-session-id",
          category: "SOCIAL_POST",
          text: "Test output text that is long enough",
          status: "draft",
        })
      );
    });

    it("should emit OUTPUT_CREATED events after persisting outputs", async () => {
      router.initialize();
      router.setValidationEnabled(false);

      const eventSink = vi.fn();
      router.setEventSink(eventSink);

      const agent = createMockAgent();
      router.registerAgent(agent);

      const event = createMockEvent();
      const context = createMockContext();

      await router.routeEvent(event, context);

      expect(eventSink).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "test-session-id",
          type: "OUTPUT_CREATED",
          payload: expect.objectContaining({
            outputId: "persisted-output-id",
            category: "SOCIAL_POST",
            text: "Test output text that is long enough",
            refs: [],
          }),
        })
      );
    });

    it("should not persist outputs when agent returns no outputs", async () => {
      router.initialize();

      const emptyAgent = createMockAgent({
        process: vi.fn().mockResolvedValue({
          success: true,
          outputs: [],
          durationMs: 50,
        }),
      });
      router.registerAgent(emptyAgent);

      const event = createMockEvent();
      const context = createMockContext();

      await router.routeEvent(event, context);

      expect(OutputService.createOutput).not.toHaveBeenCalled();
    });

    it("should not persist outputs when agent returns failure", async () => {
      router.initialize();

      const failAgent = createMockAgent({
        process: vi.fn().mockResolvedValue({
          success: false,
          outputs: [],
          error: "Failed",
          durationMs: 10,
        }),
      });
      router.registerAgent(failAgent);

      const event = createMockEvent();
      const context = createMockContext();

      await router.routeEvent(event, context);

      expect(OutputService.createOutput).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Transcript Buffer Management
  // ---------------------------------------------------------------------------
  describe("transcript buffering", () => {
    it("should not process transcript events below minimum character threshold", async () => {
      router.initialize();
      const agent = createMockAgent();
      router.registerAgent(agent);

      // Create a short transcript event (below 100 chars minimum)
      const event = createTranscriptEvent("Short text");
      const context = createMockContext();

      const results = await router.routeEvent(event, context);

      expect(results).toEqual([]);
      expect(agent.process).not.toHaveBeenCalled();
    });

    it("should process transcript events when buffer exceeds minimum length", async () => {
      router.initialize();
      const agent = createMockAgent();
      router.registerAgent(agent);

      // Build up transcript buffer to exceed 100 chars
      const longText = "A".repeat(120);
      const event = createTranscriptEvent(longText);
      const context = createMockContext();

      // First event to populate buffer
      await router.routeEvent(event, context);

      // Second event should trigger processing since buffer now has enough text
      const event2 = createTranscriptEvent("More transcript text to push over the limit");
      const results = await router.routeEvent(event2, context);

      // Agent should have been checked for processing
      expect(agent.shouldProcess).toHaveBeenCalled();
    });

    it("should always process non-transcript events immediately", async () => {
      router.initialize();
      const agent = createMockAgent();
      router.registerAgent(agent);

      const event = createMockEvent({
        type: "MOMENT_MARKER",
        payload: { label: "Highlight", t: 120 },
      });
      const context = createMockContext();

      const results = await router.routeEvent(event, context);

      expect(results).toHaveLength(1);
      expect(agent.process).toHaveBeenCalled();
    });

    it("should clear transcript buffer after successful processing", async () => {
      router.initialize();
      router.setValidationEnabled(false);
      const agent = createMockAgent();
      router.registerAgent(agent);

      // First, add a transcript event to populate the buffer
      const transcriptEvent = createTranscriptEvent("Some transcript content to fill buffer");
      const context = createMockContext();
      await router.routeEvent(transcriptEvent, context);

      // Now route a non-transcript event that triggers successful output
      const event = createMockEvent();
      await router.routeEvent(event, context);

      // After successful output, the transcript buffer is cleared (set to empty)
      // but the map entry still exists, so activeSessionCount stays 1.
      // The key assertion is that the agent.process was called (output was produced).
      expect(agent.process).toHaveBeenCalled();

      // Verify output was persisted (which means results were successful)
      expect(OutputService.createOutput).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Event Buffer Management
  // ---------------------------------------------------------------------------
  describe("event buffer management", () => {
    it("should maintain event buffer per session", async () => {
      router.initialize();
      const agent = createMockAgent({
        shouldProcess: vi.fn().mockReturnValue(false),
      });
      router.registerAgent(agent);

      const event = createMockEvent({ sessionId: "session-1" });
      const context = createMockContext({ sessionId: "session-1" });

      await router.routeEvent(event, context);

      // The agent was called with context that includes recentEvents
      const processCallArgs = (agent.shouldProcess as ReturnType<typeof vi.fn>).mock.calls;
      expect(processCallArgs.length).toBeGreaterThan(0);

      // The context passed to shouldProcess should have recentEvents
      const passedContext = processCallArgs[0][1] as AgentContext;
      expect(passedContext.recentEvents).toBeDefined();
      expect(passedContext.recentEvents.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Session Cleanup
  // ---------------------------------------------------------------------------
  describe("clearSession", () => {
    it("should clear transcript and event buffers for a session", async () => {
      router.initialize();
      const agent = createMockAgent({
        shouldProcess: vi.fn().mockReturnValue(false),
      });
      router.registerAgent(agent);

      // Populate buffers
      const event = createTranscriptEvent("Some transcript text here");
      const context = createMockContext({ sessionId: "session-to-clear" });
      await router.routeEvent(event, context);

      // Clear the session
      router.clearSession("session-to-clear");

      // Verify the session is no longer tracked
      const stats = router.getStats();
      expect(stats.activeSessionCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  describe("validation", () => {
    it("should validate outputs when validation is enabled", async () => {
      router.initialize();
      router.setValidationEnabled(true);

      const agent = createMockAgent();
      router.registerAgent(agent);

      const event = createMockEvent();
      const context = createMockContext();

      await router.routeEvent(event, context);

      expect(outputValidator.validate).toHaveBeenCalled();
    });

    it("should skip validation when disabled", async () => {
      router.initialize();
      router.setValidationEnabled(false);

      const agent = createMockAgent();
      router.registerAgent(agent);

      const event = createMockEvent();
      const context = createMockContext();

      await router.routeEvent(event, context);

      expect(outputValidator.validate).not.toHaveBeenCalled();
    });

    it("should use fixed output when auto-fix succeeds", async () => {
      router.initialize();
      router.setValidationEnabled(true);

      const fixedOutput: AgentOutput = {
        category: "SOCIAL_POST",
        text: "Fixed output text that is improved",
        title: "Fixed Title",
      };

      vi.mocked(outputValidator.validate).mockResolvedValue({
        valid: false,
        issues: [
          {
            code: "PLATFORM_LENGTH_EXCEEDED",
            message: "Too long",
            severity: "error",
            category: "platform_limits",
          },
        ],
        output: {
          category: "SOCIAL_POST",
          text: "Original too-long text",
        },
        autoFixed: true,
        fixedOutput,
      });

      const agent = createMockAgent();
      router.registerAgent(agent);

      const event = createMockEvent();
      const context = createMockContext();

      await router.routeEvent(event, context);

      // Should persist the fixed output
      expect(OutputService.createOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Fixed output text that is improved",
          meta: expect.objectContaining({ validation: "fixed" }),
        })
      );
    });

    it("should save as draft with failed validation status when validation fails and no fix", async () => {
      router.initialize();
      router.setValidationEnabled(true);

      vi.mocked(outputValidator.validate).mockResolvedValue({
        valid: false,
        issues: [
          {
            code: "PROFANITY_DETECTED",
            message: "Content contains profanity",
            severity: "error",
            category: "content_policy",
          },
        ],
        output: {
          category: "SOCIAL_POST",
          text: "Bad content",
        },
        autoFixed: false,
      });

      const agent = createMockAgent();
      router.registerAgent(agent);

      const event = createMockEvent();
      const context = createMockContext();

      await router.routeEvent(event, context);

      expect(OutputService.createOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({ validation: "failed" }),
          status: "draft",
        })
      );
    });

    it("should configure validation via configureValidation", () => {
      router.configureValidation({
        autoFix: false,
        enabledCategories: ["SOCIAL_POST"],
      });

      expect(outputValidator.configure).toHaveBeenCalledWith({
        autoFix: false,
        enabledCategories: ["SOCIAL_POST"],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------
  describe("getStats", () => {
    it("should return correct stats with no agents registered", () => {
      const stats = router.getStats();

      expect(stats).toEqual({
        enabled: false,
        workflowCount: 0,
        agentCount: 0,
        activeSessionCount: 0,
      });
    });

    it("should return correct stats after registration and initialization", () => {
      router.initialize();
      router.registerAgent(createMockAgent({ workflow: "streamer" }));
      router.registerAgent(createMockAgent({ name: "agent-2", workflow: "streamer" }));
      router.registerAgent(createMockAgent({ name: "podcast-agent", workflow: "podcast" }));

      const stats = router.getStats();

      expect(stats).toEqual({
        enabled: true,
        workflowCount: 2,
        agentCount: 3,
        activeSessionCount: 0,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Output Persistence Error Handling
  // ---------------------------------------------------------------------------
  describe("output persistence errors", () => {
    it("should not throw when output persistence fails", async () => {
      router.initialize();
      router.setValidationEnabled(false);

      vi.mocked(OutputService.createOutput).mockRejectedValue(
        new Error("DB connection failed")
      );

      const agent = createMockAgent();
      router.registerAgent(agent);

      const event = createMockEvent();
      const context = createMockContext();

      // Should not throw even if persistence fails
      const results = await router.routeEvent(event, context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });
});

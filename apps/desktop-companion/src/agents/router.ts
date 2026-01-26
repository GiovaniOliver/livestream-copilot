/**
 * Agent Router
 *
 * Routes events to appropriate workflow agents.
 * Manages the event subscription and agent dispatch lifecycle.
 */

import type { EventEnvelope } from "@livestream-copilot/shared";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import * as OutputService from "../db/services/output.service.js";
import { isAIConfigured } from "./client.js";
import { outputValidator } from "./validation/index.js";
import { getOpikClient } from "../observability/opik.js";
import type { Agent, AgentContext, AgentResult, AgentOutput, WorkflowType } from "./types.js";
import type { ValidationConfig } from "./validation/types.js";

const routerLogger = logger.child({ module: "agent-router" });

/**
 * Transcript buffer configuration.
 */
const TRANSCRIPT_BUFFER_SIZE = 10; // Number of segments to keep
const TRANSCRIPT_MIN_CHARS = 100; // Minimum chars before triggering agent

/**
 * Agent router instance.
 */
export class AgentRouter {
  private agents: Map<WorkflowType, Agent[]> = new Map();
  private transcriptBuffer: Map<string, string[]> = new Map();
  private eventBuffer: Map<string, EventEnvelope[]> = new Map();
  private enabled: boolean = false;
  private validationEnabled: boolean = true;

  /**
   * Initialize the router.
   */
  initialize(): boolean {
    if (!isAIConfigured()) {
      routerLogger.warn(
        "AI not configured - agent processing will be disabled"
      );
      this.enabled = false;
      return false;
    }

    this.enabled = true;
    routerLogger.info("Agent router initialized");
    return true;
  }

  /**
   * Register an agent for a workflow.
   */
  registerAgent(agent: Agent): void {
    const existing = this.agents.get(agent.workflow) ?? [];
    existing.push(agent);
    this.agents.set(agent.workflow, existing);

    routerLogger.info(
      {
        agentName: agent.name,
        workflow: agent.workflow,
        triggerEvents: agent.triggerEvents,
      },
      "Agent registered"
    );
  }

  /**
   * Unregister all agents for a workflow.
   */
  unregisterWorkflow(workflow: WorkflowType): void {
    this.agents.delete(workflow);
    routerLogger.info({ workflow }, "Workflow agents unregistered");
  }

  /**
   * Get agents for a workflow.
   */
  getAgents(workflow: WorkflowType): Agent[] {
    return this.agents.get(workflow) ?? [];
  }

  /**
   * Configure validation settings.
   */
  configureValidation(config: ValidationConfig): void {
    outputValidator.configure(config);
    routerLogger.info("Validation configured");
  }

  /**
   * Enable or disable output validation.
   */
  setValidationEnabled(enabled: boolean): void {
    this.validationEnabled = enabled;
    routerLogger.info({ validationEnabled: enabled }, "Validation toggled");
  }

  /**
   * Route an event to appropriate agents.
   * Includes Opik tracing when configured.
   */
  async routeEvent(
    event: EventEnvelope,
    context: Omit<AgentContext, "recentTranscript" | "recentEvents">
  ): Promise<AgentResult[]> {
    if (!this.enabled) {
      return [];
    }

    const agents = this.agents.get(context.workflow);
    if (!agents || agents.length === 0) {
      return [];
    }

    // Create Opik trace if configured
    const opikClient = getOpikClient();
    const trace = opikClient?.trace({
      name: "agent.router.routeEvent",
      input: {
        eventType: event.type,
        eventId: event.id,
        workflow: context.workflow,
        sessionId: context.sessionId,
        agentCount: agents.length,
      },
      metadata: {
        workflow: context.workflow,
        eventType: event.type,
      },
    });

    try {
      // Update buffers
      this.updateBuffers(event, context.sessionId);

      // Build full context with transcript history
      const fullContext: AgentContext = {
        ...context,
        recentTranscript: this.getRecentTranscript(context.sessionId),
        recentEvents: this.getRecentEvents(context.sessionId),
      };

      // Check if we have enough content to process
      if (!this.shouldProcessEvent(event, fullContext)) {
        trace?.end();
        return [];
      }

      // Route to matching agents
      const results: AgentResult[] = [];

      for (const agent of agents) {
        if (agent.shouldProcess(event, fullContext)) {
          routerLogger.debug(
            {
              agentName: agent.name,
              eventType: event.type,
              eventId: event.id,
            },
            "Routing event to agent"
          );

          try {
            const result = await agent.process(event, fullContext);
            results.push(result);

            // Persist successful outputs to database
            if (result.success && result.outputs.length > 0) {
              await this.persistOutputs(result, fullContext);
            }
          } catch (error) {
            routerLogger.error(
              {
                err: error,
                agentName: agent.name,
                eventType: event.type,
              },
              "Agent processing failed"
            );

            results.push({
              success: false,
              outputs: [],
              error: error instanceof Error ? error.message : "Unknown error",
              durationMs: 0,
            });
          }
        }
      }

      // Clear transcript buffer after successful processing
      if (results.some((r) => r.success && r.outputs.length > 0)) {
        this.clearTranscriptBuffer(context.sessionId);
      }

      // End trace with output
      if (trace && (trace as any).update) {
        (trace as any).update({
          output: {
            resultsCount: results.length,
            successfulAgents: results.filter(r => r.success).length,
            totalOutputs: results.reduce((sum, r) => sum + r.outputs.length, 0),
          },
        });
      }
      trace?.end();

      // Flush traces for immediate visibility
      await (opikClient as any)?.flush?.();

      return results;
    } catch (error) {
      // End trace with error
      if (trace && (trace as any).update) {
        (trace as any).update({
          output: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
      trace?.end();
      await (opikClient as any)?.flush?.();

      throw error;
    }
  }

  /**
   * Update transcript and event buffers.
   */
  private updateBuffers(event: EventEnvelope, sessionId: string): void {
    // Update event buffer
    const events = this.eventBuffer.get(sessionId) ?? [];
    events.push(event);
    if (events.length > TRANSCRIPT_BUFFER_SIZE * 2) {
      events.splice(0, events.length - TRANSCRIPT_BUFFER_SIZE * 2);
    }
    this.eventBuffer.set(sessionId, events);

    // Update transcript buffer for transcript segments
    if (event.type === "TRANSCRIPT_SEGMENT" && "payload" in event) {
      const payload = event.payload as { text?: string; speakerId?: string };
      if (payload.text) {
        const segments = this.transcriptBuffer.get(sessionId) ?? [];
        const speaker = payload.speakerId || "Speaker";
        segments.push(`${speaker}: ${payload.text}`);

        if (segments.length > TRANSCRIPT_BUFFER_SIZE) {
          segments.splice(0, segments.length - TRANSCRIPT_BUFFER_SIZE);
        }

        this.transcriptBuffer.set(sessionId, segments);
      }
    }
  }

  /**
   * Get recent transcript for a session.
   */
  private getRecentTranscript(sessionId: string): string {
    const segments = this.transcriptBuffer.get(sessionId) ?? [];
    return segments.join("\n");
  }

  /**
   * Get recent events for a session.
   */
  private getRecentEvents(sessionId: string): EventEnvelope[] {
    return this.eventBuffer.get(sessionId) ?? [];
  }

  /**
   * Check if we should process this event.
   */
  private shouldProcessEvent(
    event: EventEnvelope,
    context: AgentContext
  ): boolean {
    // Always process non-transcript events immediately
    if (event.type !== "TRANSCRIPT_SEGMENT") {
      return true;
    }

    // For transcript events, wait until we have enough content
    const transcriptLength = context.recentTranscript.length;
    return transcriptLength >= TRANSCRIPT_MIN_CHARS;
  }

  /**
   * Clear transcript buffer after processing.
   */
  private clearTranscriptBuffer(sessionId: string): void {
    this.transcriptBuffer.set(sessionId, []);
  }

  /**
   * Persist agent outputs to the database after validation.
   */
  private async persistOutputs(
    result: AgentResult,
    context: AgentContext
  ): Promise<void> {
    for (const output of result.outputs) {
      try {
        let finalOutput: AgentOutput = output;
        let validationStatus: "passed" | "failed" | "fixed" | "skipped" = "skipped";

        // Validate output if validation is enabled
        if (this.validationEnabled) {
          const validationResult = await outputValidator.validate(output);

          if (!validationResult.valid && !validationResult.autoFixed) {
            // Log validation failure but still save as draft
            routerLogger.warn(
              {
                category: output.category,
                issues: validationResult.issues.map((i) => i.code),
              },
              "Output failed validation"
            );
            validationStatus = "failed";
          } else if (validationResult.autoFixed && validationResult.fixedOutput) {
            // Use the fixed output
            finalOutput = validationResult.fixedOutput;
            validationStatus = "fixed";
          } else {
            validationStatus = "passed";
          }
        }

        const dbOutput = await OutputService.createOutput({
          sessionId: context.dbSessionId,
          category: finalOutput.category,
          title: finalOutput.title,
          text: finalOutput.text,
          refs: finalOutput.refs,
          meta: {
            ...finalOutput.meta,
            validation: validationStatus,
          },
          status: "draft",
        });

        routerLogger.debug(
          {
            outputId: dbOutput.id,
            category: finalOutput.category,
            validationStatus,
          },
          "Output persisted to database"
        );
      } catch (error) {
        routerLogger.error(
          {
            err: error,
            category: output.category,
          },
          "Failed to persist output"
        );
      }
    }
  }

  /**
   * Clear all buffers for a session.
   */
  clearSession(sessionId: string): void {
    this.transcriptBuffer.delete(sessionId);
    this.eventBuffer.delete(sessionId);
    routerLogger.debug({ sessionId }, "Session buffers cleared");
  }

  /**
   * Check if the router is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get router stats.
   */
  getStats(): {
    enabled: boolean;
    workflowCount: number;
    agentCount: number;
    activeSessionCount: number;
  } {
    let agentCount = 0;
    for (const agents of this.agents.values()) {
      agentCount += agents.length;
    }

    return {
      enabled: this.enabled,
      workflowCount: this.agents.size,
      agentCount,
      activeSessionCount: this.transcriptBuffer.size,
    };
  }
}

/**
 * Global router instance.
 */
export const agentRouter = new AgentRouter();

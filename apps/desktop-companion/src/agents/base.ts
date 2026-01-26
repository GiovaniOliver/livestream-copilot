/**
 * Base Agent
 *
 * Abstract base class for workflow agents.
 * Provides common functionality for AI-powered content generation.
 */

import type { EventEnvelope } from "@livestream-copilot/shared";
import { logger } from "../logger/index.js";
import { complete, getDefaultModel, getDefaultMaxTokens } from "./client.js";
import { getSystemPrompt, getWorkflowOutputCategories, getTranscriptAnalysisPrompt } from "./prompts.js";
import { getOpikClient } from "../observability/opik.js";
import type {
  Agent,
  AgentConfig,
  AgentContext,
  AgentOutput,
  AgentResult,
  WorkflowType,
  OutputCategory,
} from "./types.js";

/**
 * Abstract base agent class.
 * Workflow-specific agents extend this class.
 */
export abstract class BaseAgent implements Agent {
  abstract readonly name: string;
  abstract readonly workflow: WorkflowType;
  abstract readonly triggerEvents: string[];

  protected readonly config: AgentConfig;
  private _agentLogger: ReturnType<typeof logger.child> | null = null;

  protected get agentLogger() {
    if (!this._agentLogger) {
      this._agentLogger = logger.child({ module: "agent", agent: this.name });
    }
    return this._agentLogger;
  }

  constructor(config?: Partial<AgentConfig>) {
    this.config = {
      model: config?.model ?? getDefaultModel(),
      maxTokens: config?.maxTokens ?? getDefaultMaxTokens(),
      temperature: config?.temperature ?? 0.7,
      systemPrompt: config?.systemPrompt,
    };
  }

  /**
   * Check if this agent should process the given event.
   * Default implementation checks trigger events.
   */
  shouldProcess(event: EventEnvelope, context: AgentContext): boolean {
    // Check workflow match
    if (context.workflow !== this.workflow) {
      return false;
    }

    // Check event type
    return this.triggerEvents.includes(event.type);
  }

  /**
   * Process an event and generate outputs.
   * Includes Opik tracing when configured.
   */
  async process(
    event: EventEnvelope,
    context: AgentContext
  ): Promise<AgentResult> {
    const startTime = Date.now();

    this.agentLogger.debug(
      {
        eventType: event.type,
        eventId: event.id,
        sessionId: context.sessionId,
      },
      "Processing event"
    );

    // Create Opik trace if configured
    const opikClient = getOpikClient();
    const trace = opikClient?.trace({
      name: `agent.${this.workflow}.${this.name}`,
      input: {
        agentName: this.name,
        workflow: this.workflow,
        eventType: event.type,
        eventId: event.id,
        sessionId: context.sessionId,
      },
      metadata: {
        agent: this.name,
        workflow: this.workflow,
        eventType: event.type,
      },
    });

    try {
      const outputs = await this.generateOutputs(event, context);
      const durationMs = Date.now() - startTime;

      this.agentLogger.info(
        {
          eventType: event.type,
          outputCount: outputs.length,
          durationMs,
        },
        "Event processed successfully"
      );

      // End trace with output
      if (trace && (trace as any).update) {
        (trace as any).update({
          output: {
            outputCount: outputs.length,
            categories: outputs.map(o => o.category),
            durationMs,
          },
        });
      }
      trace?.end();

      // Flush traces for immediate visibility
      await (opikClient as any)?.flush?.();

      return {
        success: true,
        outputs,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.agentLogger.error(
        {
          err: error,
          eventType: event.type,
          eventId: event.id,
          durationMs,
        },
        "Event processing failed"
      );

      // End trace with error
      if (trace && (trace as any).update) {
        (trace as any).update({
          output: {
            error: errorMessage,
            durationMs,
          },
        });
      }
      trace?.end();
      await (opikClient as any)?.flush?.();

      return {
        success: false,
        outputs: [],
        error: errorMessage,
        durationMs,
      };
    }
  }

  /**
   * Generate outputs for an event.
   * Override in subclasses for custom generation logic.
   */
  protected async generateOutputs(
    event: EventEnvelope,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    // Default implementation for transcript events
    if (event.type === "TRANSCRIPT_SEGMENT") {
      return this.processTranscript(event, context);
    }

    // Subclasses should override for other event types
    return [];
  }

  /**
   * Process a transcript segment and generate outputs.
   */
  protected async processTranscript(
    event: EventEnvelope,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    // Build transcript from recent context + current event
    const transcript = this.buildTranscriptContext(event, context);

    if (!transcript || transcript.trim().length < 50) {
      // Skip very short segments
      return [];
    }

    const categories = getWorkflowOutputCategories(context.workflow);
    const systemPrompt =
      this.config.systemPrompt ?? getSystemPrompt(context);
    const userPrompt = getTranscriptAnalysisPrompt(transcript, categories);

    try {
      const response = await complete({
        messages: [{ role: "user", content: userPrompt }],
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        systemPrompt,
      });

      const outputs = this.parseOutputs(response.content, categories);

      // Add event reference to all outputs
      return outputs.map((output) => ({
        ...output,
        refs: [...(output.refs ?? []), event.id],
      }));
    } catch (error) {
      this.agentLogger.error(
        { err: error },
        "Failed to generate outputs from AI"
      );
      return [];
    }
  }

  /**
   * Build transcript context from recent events.
   */
  protected buildTranscriptContext(
    currentEvent: EventEnvelope,
    context: AgentContext
  ): string {
    const segments: string[] = [];

    // Add recent transcript from context
    if (context.recentTranscript) {
      segments.push(context.recentTranscript);
    }

    // Add current event transcript
    if (
      currentEvent.type === "TRANSCRIPT_SEGMENT" &&
      "payload" in currentEvent
    ) {
      const payload = currentEvent.payload as { text?: string; speakerId?: string };
      if (payload.text) {
        const speaker = payload.speakerId || "Speaker";
        segments.push(`${speaker}: ${payload.text}`);
      }
    }

    return segments.join("\n");
  }

  /**
   * Parse AI response into structured outputs.
   */
  protected parseOutputs(
    content: string,
    validCategories: OutputCategory[]
  ): AgentOutput[] {
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.agentLogger.warn("No JSON found in AI response");
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const outputs: AgentOutput[] = [];

      if (Array.isArray(parsed.outputs)) {
        for (const output of parsed.outputs) {
          // Validate category
          if (!validCategories.includes(output.category)) {
            this.agentLogger.warn(
              { category: output.category },
              "Invalid output category, skipping"
            );
            continue;
          }

          // Validate required fields
          if (!output.text || typeof output.text !== "string") {
            continue;
          }

          outputs.push({
            category: output.category,
            text: output.text,
            title: output.title,
            meta: output.meta,
            refs: output.refs,
          });
        }
      }

      return outputs;
    } catch (error) {
      this.agentLogger.error(
        { err: error, content: content.substring(0, 200) },
        "Failed to parse AI response"
      );
      return [];
    }
  }
}

/**
 * Create a simple agent for a workflow.
 * Useful for workflows that don't need custom logic.
 */
export function createSimpleAgent(
  workflow: WorkflowType,
  config?: Partial<AgentConfig>
): Agent {
  class SimpleAgent extends BaseAgent {
    readonly name = `${workflow}-agent`;
    readonly workflow = workflow;
    readonly triggerEvents = ["TRANSCRIPT_SEGMENT", "MOMENT_MARKER"];
  }

  return new SimpleAgent(config);
}

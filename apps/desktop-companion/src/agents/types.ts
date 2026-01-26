/**
 * Agent Types
 *
 * Core types and interfaces for the AI agent system.
 * Agents process session events and generate outputs.
 */

import type { EventEnvelope } from "@livestream-copilot/shared";

/**
 * Workflow types that agents can handle.
 */
export type WorkflowType =
  | "streamer"
  | "writers_room"
  | "brainstorm"
  | "debate"
  | "podcast";

/**
 * Output categories that agents can produce.
 */
export type OutputCategory =
  | "SOCIAL_POST"
  | "CLIP_TITLE"
  | "BEAT"
  | "SCRIPT_INSERT"
  | "CLAIM"
  | "EVIDENCE_CARD"
  | "CHAPTER_MARKER"
  | "QUOTE"
  | "ACTION_ITEM"
  | "EPISODE_META"
  | "MODERATOR_PROMPT"
  | "IDEA_NODE";

/**
 * Context provided to agents for processing.
 */
export interface AgentContext {
  /** Session ID */
  sessionId: string;
  /** Database session ID */
  dbSessionId: string;
  /** Active workflow */
  workflow: WorkflowType;
  /** Session title if set */
  title?: string;
  /** Participant names */
  participants: string[];
  /** Session start time (Unix ms) */
  startedAt: number;
  /** Recent transcript text (rolling window) */
  recentTranscript: string;
  /** Recent events for context */
  recentEvents: EventEnvelope[];
}

/**
 * Agent output result.
 */
export interface AgentOutput {
  /** Output category */
  category: OutputCategory;
  /** Optional title */
  title?: string;
  /** Main content text */
  text: string;
  /** References (event IDs, artifact IDs, etc.) */
  refs?: string[];
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Result from agent processing.
 */
export interface AgentResult {
  /** Whether processing was successful */
  success: boolean;
  /** Generated outputs */
  outputs: AgentOutput[];
  /** Error message if failed */
  error?: string;
  /** Processing duration in ms */
  durationMs: number;
  /** Token usage stats */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Agent interface that all workflow agents must implement.
 */
export interface Agent {
  /** Agent name for logging */
  readonly name: string;
  /** Workflow this agent handles */
  readonly workflow: WorkflowType;
  /** Event types this agent responds to */
  readonly triggerEvents: string[];

  /**
   * Process an event and generate outputs.
   * @param event - The event to process
   * @param context - Agent context with session info
   * @returns Agent result with outputs or error
   */
  process(event: EventEnvelope, context: AgentContext): Promise<AgentResult>;

  /**
   * Check if this agent should process the given event.
   * @param event - The event to check
   * @param context - Agent context
   * @returns True if agent should process this event
   */
  shouldProcess(event: EventEnvelope, context: AgentContext): boolean;
}

/**
 * Agent configuration options.
 */
export interface AgentConfig {
  /** AI model to use */
  model: string;
  /** Max tokens for response */
  maxTokens: number;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** System prompt override */
  systemPrompt?: string;
}

/**
 * AI provider types.
 */
export type AIProvider = "anthropic" | "openai";

/**
 * Message role for chat completions.
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * Chat message structure.
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * AI client completion request.
 */
export interface CompletionRequest {
  messages: ChatMessage[];
  model: string;
  maxTokens: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * AI client completion response.
 */
export interface CompletionResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: "end_turn" | "max_tokens" | "stop" | string;
}

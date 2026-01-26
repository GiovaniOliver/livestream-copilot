/**
 * Agents Module
 *
 * AI-powered agents for processing session events and generating outputs.
 * Each workflow type has specialized agents that understand its context.
 */

// Core types
export type {
  Agent,
  AgentConfig,
  AgentContext,
  AgentOutput,
  AgentResult,
  WorkflowType,
  OutputCategory,
  AIProvider,
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
} from "./types.js";

// AI client
export {
  complete,
  isAIConfigured,
  getDefaultModel,
  getDefaultMaxTokens,
} from "./client.js";

// Base agent class
export { BaseAgent, createSimpleAgent } from "./base.js";

// Prompt utilities
export {
  getSystemPrompt,
  getWorkflowOutputCategories,
  getTranscriptAnalysisPrompt,
  getMomentDetectionPrompt,
} from "./prompts.js";

// Router
export { AgentRouter, agentRouter } from "./router.js";

// Workflow-specific agents
export { StreamerAgent } from "./workflows/streamer.agent.js";
export { PodcastAgent } from "./workflows/podcast.agent.js";
export { WritersRoomAgent } from "./workflows/writersroom.agent.js";
export { DebateAgent } from "./workflows/debate.agent.js";
export { BrainstormAgent } from "./workflows/brainstorm.agent.js";

// Validation
export {
  OutputValidator,
  outputValidator,
  createValidator,
  DEFAULT_PLATFORM_LIMITS,
} from "./validation/index.js";

export type {
  ValidationConfig,
  ValidationResult,
  ValidationIssue,
  BrandVoiceConfig,
  ContentPolicyConfig,
} from "./validation/index.js";

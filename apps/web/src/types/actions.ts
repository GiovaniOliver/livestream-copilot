/**
 * AI Agent Actions Type Definitions
 *
 * This file defines the TypeScript interfaces for the AI Action system
 * used across all workflow types in the FluxBoard livestream-copilot application.
 */

/**
 * Trigger type for actions
 * - manual: User-initiated only
 * - auto: Automatically triggered based on conditions
 * - both: Can be triggered manually or automatically
 */
export type TriggerType = "manual" | "auto" | "both";

/**
 * Token usage estimate levels
 * - low: ~100-300 tokens - Simple extraction, classification, short generation
 * - medium: ~300-800 tokens - Analysis, summarization, multi-step generation
 * - high: ~800-2000 tokens - Comprehensive analysis, long-form content, synthesis
 */
export type TokenEstimate = "low" | "medium" | "high";

/**
 * Input types for actions
 * - transcript: Speech-to-text transcript data
 * - context: Session metadata, participants, settings
 * - selection: User-selected text or content
 * - artifact: Reference to clip, document, or other output
 * - user_input: Direct user-provided input
 */
export type ActionInputType =
  | "transcript"
  | "context"
  | "selection"
  | "artifact"
  | "user_input";

/**
 * Output categories that actions can produce
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
 * Workflow types in the application
 */
export type WorkflowType =
  | "content_creator"
  | "podcast"
  | "script_studio"
  | "writers_corner"
  | "mind_map"
  | "court_session"
  | "debate_room"
  | "common";

/**
 * Action execution states
 */
export type ActionState =
  | "idle"
  | "queued"
  | "processing"
  | "reviewing"
  | "success"
  | "failed"
  | "cancelled"
  | "committed"
  | "discarded";

/**
 * Input specification for an action
 */
export interface ActionInput {
  /** Input parameter name */
  name: string;
  /** Type of input required */
  type: ActionInputType;
  /** Whether this input is required */
  required: boolean;
  /** Human-readable description of the input */
  description: string;
}

/**
 * Agent Action definition
 */
export interface AgentAction {
  /** Unique identifier: workflow.action_name */
  actionId: string;
  /** Display name for UI */
  label: string;
  /** What this action does */
  description: string;
  /** How the action can be triggered */
  triggerType: TriggerType;
  /** Condition for auto-triggering (optional) */
  autoTriggerCondition?: string;
  /** Required data/context for the action */
  inputs: ActionInput[];
  /** What the action produces */
  outputs: OutputCategory[];
  /** Approximate token usage */
  estimatedTokens: TokenEstimate;
  /** Icon identifier for UI display */
  icon: string;
  /** Minimum time between triggers in milliseconds */
  cooldownMs?: number;
  /** Whether this action requires transcript data */
  requiresTranscript?: boolean;
  /** Minimum transcript length required (in characters) */
  minTranscriptLength?: number;
}

/**
 * Result from executing an action
 */
export interface ActionResult {
  /** Unique identifier for this result */
  id: string;
  /** Reference to the action that produced this result */
  actionId: string;
  /** Category of the output */
  category: OutputCategory;
  /** The generated content */
  content: string;
  /** Confidence score (0-1) for the result */
  confidence: number;
  /** Timestamp when the result was created */
  createdAt: Date;
  /** Current state of the result */
  state: "pending" | "committed" | "discarded";
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Session timestamp reference (in seconds) */
  sessionTimestamp?: number;
  /** Actual tokens used */
  tokensUsed?: number;
}

/**
 * Action execution request
 */
export interface ActionExecutionRequest {
  /** The action to execute */
  actionId: string;
  /** Session ID */
  sessionId: string;
  /** Input data for the action */
  inputs: Record<string, unknown>;
  /** Whether this was triggered automatically */
  isAutoTrigger: boolean;
}

/**
 * Action runtime state for UI tracking
 */
export interface ActionRuntimeState {
  /** The action definition */
  action: AgentAction;
  /** Current execution state */
  state: ActionState;
  /** Whether auto-trigger is enabled (for 'both' and 'auto' types) */
  autoTriggerEnabled: boolean;
  /** Last execution timestamp */
  lastExecutedAt?: Date;
  /** Cooldown remaining in milliseconds */
  cooldownRemaining?: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Last result from execution */
  lastResult?: ActionResult;
}

/**
 * Action group for organizing actions by workflow
 */
export interface ActionGroup {
  /** Workflow type */
  workflowType: WorkflowType;
  /** Display name for the group */
  label: string;
  /** Description of the workflow */
  description: string;
  /** Actions in this group */
  actions: AgentAction[];
}

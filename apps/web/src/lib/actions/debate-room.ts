/**
 * Debate Room Actions
 *
 * Purpose: Facilitate structured debates with claim tracking, evidence scoring, and moderation.
 */

import type { AgentAction } from "@/types/actions";

/**
 * Track Claim
 * Logs assertions and arguments
 */
export const trackClaim: AgentAction = {
  actionId: "debate.track_claim",
  label: "Track Claim",
  description: "Logs assertions and arguments from speakers",
  triggerType: "auto",
  autoTriggerCondition: "When assertion language detected",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript segment with claim",
    },
    {
      name: "speaker",
      type: "context",
      required: true,
      description: "Speaker making the claim",
    },
  ],
  outputs: ["CLAIM"],
  estimatedTokens: "low",
  icon: "chat-bubble-left",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Link Counterclaim
 * Connects claims to rebuttals
 */
export const linkCounterclaim: AgentAction = {
  actionId: "debate.link_counterclaim",
  label: "Link Counterclaim",
  description: "Connects claims to their rebuttals and counterarguments",
  triggerType: "auto",
  autoTriggerCondition: "When rebuttal language following existing claim",
  inputs: [
    {
      name: "new_claim",
      type: "transcript",
      required: true,
      description: "The new counterclaim",
    },
    {
      name: "existing_claims",
      type: "artifact",
      required: true,
      description: "Previously tracked claims",
    },
  ],
  outputs: ["CLAIM"],
  estimatedTokens: "medium",
  icon: "arrows-right-left",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Score Evidence
 * Evaluates evidence quality
 */
export const scoreEvidence: AgentAction = {
  actionId: "debate.score_evidence",
  label: "Score Evidence",
  description: "Evaluates evidence quality and relevance",
  triggerType: "both",
  inputs: [
    {
      name: "evidence_text",
      type: "transcript",
      required: true,
      description: "Evidence to evaluate",
    },
    {
      name: "claim_ref",
      type: "artifact",
      required: true,
      description: "Claim the evidence supports",
    },
  ],
  outputs: ["EVIDENCE_CARD"],
  estimatedTokens: "medium",
  icon: "calculator",
  cooldownMs: 30000,
  requiresTranscript: true,
};

/**
 * Detect Fallacy
 * Identifies logical fallacies
 */
export const detectFallacy: AgentAction = {
  actionId: "debate.detect_fallacy",
  label: "Detect Fallacy",
  description: "Identifies logical fallacies in arguments",
  triggerType: "auto",
  autoTriggerCondition: "When logical structure analyzed, confidence > 0.6",
  inputs: [
    {
      name: "argument_text",
      type: "transcript",
      required: true,
      description: "Argument to analyze for fallacies",
    },
  ],
  outputs: ["CLAIM"],
  estimatedTokens: "medium",
  icon: "exclamation-circle",
  cooldownMs: 30000,
  requiresTranscript: true,
  minTranscriptLength: 50,
};

/**
 * Queue Rebuttal
 * Suggests rebuttal points
 */
export const queueRebuttal: AgentAction = {
  actionId: "debate.queue_rebuttal",
  label: "Queue Rebuttal",
  description: "Suggests rebuttal points for a claim",
  triggerType: "manual",
  inputs: [
    {
      name: "claim",
      type: "artifact",
      required: true,
      description: "Claim to rebut",
    },
    {
      name: "counter_evidence",
      type: "artifact",
      required: false,
      description: "Evidence to use in rebuttal",
    },
  ],
  outputs: ["MODERATOR_PROMPT"],
  estimatedTokens: "medium",
  icon: "arrow-uturn-left",
  cooldownMs: undefined,
};

/**
 * Rate Argument Strength
 * Scores argument effectiveness
 */
export const rateDebateArgumentStrength: AgentAction = {
  actionId: "debate.rate_argument_strength",
  label: "Rate Argument",
  description: "Scores argument effectiveness and logical strength",
  triggerType: "both",
  inputs: [
    {
      name: "argument_text",
      type: "transcript",
      required: true,
      description: "Argument to rate",
    },
    {
      name: "evidence",
      type: "artifact",
      required: false,
      description: "Supporting evidence",
    },
  ],
  outputs: ["CLAIM"],
  estimatedTokens: "medium",
  icon: "chart-bar",
  cooldownMs: 30000,
  requiresTranscript: true,
};

/**
 * Suggest Fact Check
 * Flags claims needing verification
 */
export const suggestFactCheck: AgentAction = {
  actionId: "debate.suggest_fact_check",
  label: "Suggest Fact Check",
  description: "Flags claims that need factual verification",
  triggerType: "both",
  inputs: [
    {
      name: "claim_text",
      type: "transcript",
      required: true,
      description: "Claim to fact-check",
    },
  ],
  outputs: ["ACTION_ITEM"],
  estimatedTokens: "low",
  icon: "magnifying-glass",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Generate Moderator Prompt
 * Creates questions for moderator
 */
export const generateModeratorPrompt: AgentAction = {
  actionId: "debate.generate_moderator_prompt",
  label: "Moderator Prompt",
  description: "Creates questions or prompts for the moderator",
  triggerType: "both",
  autoTriggerCondition: "Every 5 claims, or on moderator request",
  inputs: [
    {
      name: "debate_state",
      type: "context",
      required: true,
      description: "Current state of the debate",
    },
    {
      name: "topics",
      type: "artifact",
      required: false,
      description: "Topics to explore",
    },
  ],
  outputs: ["MODERATOR_PROMPT"],
  estimatedTokens: "medium",
  icon: "user-group",
  cooldownMs: 60000,
};

/**
 * Summarize Position
 * Creates summary of speaker's stance
 */
export const summarizePosition: AgentAction = {
  actionId: "debate.summarize_position",
  label: "Summarize Position",
  description: "Creates summary of a speaker's overall position",
  triggerType: "manual",
  inputs: [
    {
      name: "speaker_claims",
      type: "artifact",
      required: true,
      description: "All claims made by the speaker",
    },
  ],
  outputs: ["CLAIM"],
  estimatedTokens: "medium",
  icon: "document-text",
  cooldownMs: undefined,
};

/**
 * Track Topic Coverage
 * Monitors topics discussed
 */
export const trackTopicCoverage: AgentAction = {
  actionId: "debate.track_topic_coverage",
  label: "Track Coverage",
  description: "Monitors which topics have been discussed",
  triggerType: "auto",
  autoTriggerCondition: "Every 2 minutes",
  inputs: [
    {
      name: "transcript",
      type: "transcript",
      required: true,
      description: "Recent transcript",
    },
    {
      name: "topic_list",
      type: "artifact",
      required: true,
      description: "List of expected topics",
    },
  ],
  outputs: ["CHAPTER_MARKER"],
  estimatedTokens: "low",
  icon: "check-circle",
  cooldownMs: 120000,
  requiresTranscript: true,
};

/**
 * Generate Closing Summary
 * Creates debate summary
 */
export const generateClosingSummary: AgentAction = {
  actionId: "debate.generate_closing_summary",
  label: "Closing Summary",
  description: "Creates comprehensive summary of the debate",
  triggerType: "manual",
  inputs: [
    {
      name: "all_claims",
      type: "artifact",
      required: true,
      description: "All claims from the debate",
    },
    {
      name: "evidence",
      type: "artifact",
      required: false,
      description: "Evidence presented",
    },
  ],
  outputs: ["EPISODE_META"],
  estimatedTokens: "high",
  icon: "document-chart-bar",
  cooldownMs: undefined,
};

/**
 * Extract Key Quotes
 * Pulls impactful debate quotes
 */
export const extractKeyQuotes: AgentAction = {
  actionId: "debate.extract_key_quotes",
  label: "Extract Key Quotes",
  description: "Pulls impactful and memorable debate quotes",
  triggerType: "both",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript to extract quotes from",
    },
  ],
  outputs: ["QUOTE"],
  estimatedTokens: "low",
  icon: "chat-bubble-bottom-center-text",
  cooldownMs: 30000,
  requiresTranscript: true,
};

/**
 * All Debate Room actions
 */
export const debateRoomActions: AgentAction[] = [
  trackClaim,
  linkCounterclaim,
  scoreEvidence,
  detectFallacy,
  queueRebuttal,
  rateDebateArgumentStrength,
  suggestFactCheck,
  generateModeratorPrompt,
  summarizePosition,
  trackTopicCoverage,
  generateClosingSummary,
  extractKeyQuotes,
];

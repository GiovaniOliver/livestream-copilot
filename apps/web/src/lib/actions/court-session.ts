/**
 * Court Session (Legal/Mock Trial) Actions
 *
 * Purpose: Support legal proceedings and mock trials with evidence tracking and argument analysis.
 */

import type { AgentAction } from "@/types/actions";

/**
 * Log Evidence
 * Records evidence presented
 */
export const logEvidence: AgentAction = {
  actionId: "court.log_evidence",
  label: "Log Evidence",
  description: "Records evidence presented during proceedings",
  triggerType: "both",
  autoTriggerCondition: "When evidentiary language detected",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript segment with evidence reference",
    },
    {
      name: "exhibit_ref",
      type: "user_input",
      required: false,
      description: "Exhibit number or reference",
    },
  ],
  outputs: ["EVIDENCE_CARD"],
  estimatedTokens: "low",
  icon: "document-text",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Track Objection
 * Logs objections and rulings
 */
export const trackObjection: AgentAction = {
  actionId: "court.track_objection",
  label: "Track Objection",
  description: "Logs objections and their rulings",
  triggerType: "auto",
  autoTriggerCondition: "When \"objection\" detected in transcript",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript with objection",
    },
  ],
  outputs: ["CLAIM"],
  estimatedTokens: "low",
  icon: "hand-raised",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Assess Witness Credibility
 * Evaluates witness testimony
 */
export const assessWitnessCredibility: AgentAction = {
  actionId: "court.assess_witness_credibility",
  label: "Assess Credibility",
  description: "Evaluates witness testimony for credibility indicators",
  triggerType: "manual",
  inputs: [
    {
      name: "testimony_text",
      type: "transcript",
      required: true,
      description: "Witness testimony transcript",
    },
    {
      name: "context",
      type: "context",
      required: false,
      description: "Case context and background",
    },
  ],
  outputs: ["EVIDENCE_CARD"],
  estimatedTokens: "medium",
  icon: "user-circle",
  cooldownMs: undefined,
  requiresTranscript: true,
  minTranscriptLength: 100,
};

/**
 * Rate Argument Strength
 * Scores argument effectiveness
 */
export const rateCourtArgumentStrength: AgentAction = {
  actionId: "court.rate_argument_strength",
  label: "Rate Argument",
  description: "Scores argument effectiveness and persuasiveness",
  triggerType: "manual",
  inputs: [
    {
      name: "argument_text",
      type: "transcript",
      required: true,
      description: "The argument to evaluate",
    },
    {
      name: "evidence",
      type: "artifact",
      required: false,
      description: "Supporting evidence referenced",
    },
  ],
  outputs: ["CLAIM"],
  estimatedTokens: "medium",
  icon: "scale",
  cooldownMs: undefined,
  requiresTranscript: true,
};

/**
 * Identify Precedent
 * Suggests relevant case precedents
 */
export const identifyPrecedent: AgentAction = {
  actionId: "court.identify_precedent",
  label: "Identify Precedent",
  description: "Suggests relevant case precedents for arguments",
  triggerType: "both",
  inputs: [
    {
      name: "argument_text",
      type: "transcript",
      required: true,
      description: "Legal argument or issue",
    },
    {
      name: "jurisdiction",
      type: "user_input",
      required: false,
      description: "Applicable jurisdiction",
    },
  ],
  outputs: ["EVIDENCE_CARD"],
  estimatedTokens: "high",
  icon: "book-open",
  cooldownMs: 60000,
  requiresTranscript: true,
};

/**
 * Construct Timeline
 * Builds case timeline from testimony
 */
export const constructTimeline: AgentAction = {
  actionId: "court.construct_timeline",
  label: "Construct Timeline",
  description: "Builds chronological timeline from testimony and evidence",
  triggerType: "both",
  inputs: [
    {
      name: "testimonies",
      type: "artifact",
      required: true,
      description: "Collected testimonies",
    },
    {
      name: "evidence",
      type: "artifact",
      required: false,
      description: "Evidence with dates/times",
    },
  ],
  outputs: ["EVIDENCE_CARD"],
  estimatedTokens: "high",
  icon: "clock",
  cooldownMs: 120000,
};

/**
 * Generate Ruling Notes
 * Drafts notes for ruling
 */
export const generateRulingNotes: AgentAction = {
  actionId: "court.generate_ruling_notes",
  label: "Ruling Notes",
  description: "Drafts notes to support ruling decisions",
  triggerType: "manual",
  inputs: [
    {
      name: "arguments",
      type: "artifact",
      required: true,
      description: "Arguments from both sides",
    },
    {
      name: "evidence",
      type: "artifact",
      required: true,
      description: "Relevant evidence",
    },
    {
      name: "law",
      type: "context",
      required: true,
      description: "Applicable law or rules",
    },
  ],
  outputs: ["MODERATOR_PROMPT"],
  estimatedTokens: "high",
  icon: "document-check",
  cooldownMs: undefined,
};

/**
 * Summarize Testimony
 * Creates witness testimony summary
 */
export const summarizeTestimony: AgentAction = {
  actionId: "court.summarize_testimony",
  label: "Summarize Testimony",
  description: "Creates concise summary of witness testimony",
  triggerType: "both",
  inputs: [
    {
      name: "testimony_transcript",
      type: "transcript",
      required: true,
      description: "Full testimony transcript",
    },
  ],
  outputs: ["QUOTE"],
  estimatedTokens: "medium",
  icon: "document-text",
  cooldownMs: 60000,
  requiresTranscript: true,
  minTranscriptLength: 200,
};

/**
 * Track Exhibits
 * Logs and organizes exhibits
 */
export const trackExhibits: AgentAction = {
  actionId: "court.track_exhibits",
  label: "Track Exhibits",
  description: "Logs and organizes presented exhibits",
  triggerType: "auto",
  autoTriggerCondition: "When \"exhibit\" or \"evidence\" mentioned",
  inputs: [
    {
      name: "exhibit_mention",
      type: "transcript",
      required: true,
      description: "Transcript mentioning exhibit",
    },
    {
      name: "description",
      type: "context",
      required: false,
      description: "Description of the exhibit",
    },
  ],
  outputs: ["EVIDENCE_CARD"],
  estimatedTokens: "low",
  icon: "folder",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Identify Contradictions
 * Flags contradictory statements
 */
export const identifyContradictions: AgentAction = {
  actionId: "court.identify_contradictions",
  label: "Find Contradictions",
  description: "Flags contradictory statements in testimony",
  triggerType: "both",
  autoTriggerCondition: "Every 5 minutes, comparing recent testimony",
  inputs: [
    {
      name: "testimonies_list",
      type: "artifact",
      required: true,
      description: "List of testimonies to compare",
    },
  ],
  outputs: ["CLAIM"],
  estimatedTokens: "medium",
  icon: "exclamation-triangle",
  cooldownMs: 60000,
};

/**
 * Generate Cross Questions
 * Suggests cross-examination questions
 */
export const generateCrossQuestions: AgentAction = {
  actionId: "court.generate_cross_questions",
  label: "Cross-Exam Questions",
  description: "Suggests cross-examination questions based on testimony",
  triggerType: "manual",
  inputs: [
    {
      name: "testimony",
      type: "transcript",
      required: true,
      description: "Witness testimony to question",
    },
    {
      name: "case_theory",
      type: "context",
      required: true,
      description: "Examination strategy/theory",
    },
  ],
  outputs: ["MODERATOR_PROMPT"],
  estimatedTokens: "medium",
  icon: "question-mark-circle",
  cooldownMs: undefined,
  requiresTranscript: true,
};

/**
 * Draft Closing Points
 * Outlines key closing argument points
 */
export const draftClosingPoints: AgentAction = {
  actionId: "court.draft_closing_points",
  label: "Closing Points",
  description: "Outlines key points for closing arguments",
  triggerType: "manual",
  inputs: [
    {
      name: "full_case_record",
      type: "artifact",
      required: true,
      description: "Complete case record with all testimony and evidence",
    },
  ],
  outputs: ["CLAIM"],
  estimatedTokens: "high",
  icon: "presentation-chart-bar",
  cooldownMs: undefined,
};

/**
 * All Court Session actions
 */
export const courtSessionActions: AgentAction[] = [
  logEvidence,
  trackObjection,
  assessWitnessCredibility,
  rateCourtArgumentStrength,
  identifyPrecedent,
  constructTimeline,
  generateRulingNotes,
  summarizeTestimony,
  trackExhibits,
  identifyContradictions,
  generateCrossQuestions,
  draftClosingPoints,
];

// Court Session AI Agent Actions
import type { AgentAction, ActionStatus, OutputCategory } from "@/components/actions/types";

/**
 * Court Session Actions based on the AI Agent Actions specification
 */
export const COURT_ACTIONS: AgentAction[] = [
  {
    actionId: "court.extract_claim",
    label: "Extract Claim",
    description: "Pull legal claims, allegations, and key assertions from testimony or arguments",
    triggerType: "both",
    autoTriggerCondition: "When assertion language detected in transcript",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Recent transcript segment" },
      { name: "context", type: "context", required: false, description: "Case context and existing claims" },
    ],
    outputs: ["CLAIM"],
    estimatedTokens: "medium",
    icon: "claim",
    cooldownMs: 15000,
    requiresTranscript: true,
    minTranscriptLength: 50,
  },
  {
    actionId: "court.log_evidence",
    label: "Log Evidence",
    description: "Record evidence presented with exhibit reference and status",
    triggerType: "both",
    autoTriggerCondition: "When 'exhibit' or 'evidence' mentioned in transcript",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Transcript mentioning evidence" },
      { name: "exhibit_ref", type: "user_input", required: false, description: "Exhibit reference number" },
    ],
    outputs: ["EVIDENCE_CARD"],
    estimatedTokens: "low",
    icon: "evidence",
    cooldownMs: 10000,
    requiresTranscript: true,
  },
  {
    actionId: "court.tag_witness_statement",
    label: "Tag Witness Statement",
    description: "Categorize and tag key points from witness testimony",
    triggerType: "both",
    autoTriggerCondition: "During active testimony segments",
    inputs: [
      { name: "testimony_text", type: "transcript", required: true, description: "Witness testimony transcript" },
      { name: "witness_id", type: "context", required: false, description: "Current witness identifier" },
    ],
    outputs: ["QUOTE", "EVIDENCE_CARD"],
    estimatedTokens: "medium",
    icon: "tag",
    cooldownMs: 20000,
    requiresTranscript: true,
    minTranscriptLength: 100,
  },
  {
    actionId: "court.detect_contradiction",
    label: "Detect Contradiction",
    description: "Find inconsistencies between testimonies, statements, or evidence",
    triggerType: "both",
    autoTriggerCondition: "Every 5 minutes, comparing recent testimony with prior statements",
    inputs: [
      { name: "testimonies_list", type: "artifact", required: true, description: "All recorded testimonies" },
      { name: "current_testimony", type: "transcript", required: false, description: "Current testimony segment" },
    ],
    outputs: ["CLAIM"],
    estimatedTokens: "high",
    icon: "contradiction",
    cooldownMs: 300000, // 5 minutes
    requiresTranscript: true,
  },
  {
    actionId: "court.link_precedent",
    label: "Link Precedent",
    description: "Connect current arguments to relevant case law and precedents",
    triggerType: "both",
    autoTriggerCondition: "When legal principles or case references mentioned",
    inputs: [
      { name: "argument_text", type: "transcript", required: true, description: "Legal argument being made" },
      { name: "jurisdiction", type: "context", required: false, description: "Applicable jurisdiction" },
    ],
    outputs: ["EVIDENCE_CARD"],
    estimatedTokens: "high",
    icon: "precedent",
    cooldownMs: 60000,
    requiresTranscript: true,
  },
  {
    actionId: "court.summarize_testimony",
    label: "Summarize Testimony",
    description: "Create concise summary of witness testimony with key points",
    triggerType: "both",
    autoTriggerCondition: "When witness testimony segment ends",
    inputs: [
      { name: "testimony_transcript", type: "transcript", required: true, description: "Full testimony transcript" },
      { name: "witness_info", type: "context", required: false, description: "Witness information" },
    ],
    outputs: ["QUOTE", "EPISODE_META"],
    estimatedTokens: "medium",
    icon: "summary",
    cooldownMs: 30000,
    requiresTranscript: true,
    minTranscriptLength: 200,
  },
  {
    actionId: "court.generate_timeline",
    label: "Generate Timeline",
    description: "Build chronological view of case events from testimony and evidence",
    triggerType: "manual",
    inputs: [
      { name: "testimonies", type: "artifact", required: true, description: "All testimonies" },
      { name: "evidence", type: "artifact", required: true, description: "All evidence items" },
    ],
    outputs: ["EVIDENCE_CARD"],
    estimatedTokens: "high",
    icon: "timeline",
    cooldownMs: 120000,
  },
  {
    actionId: "court.analyze_credibility",
    label: "Analyze Credibility",
    description: "Assess witness reliability based on consistency, demeanor, and corroboration",
    triggerType: "manual",
    inputs: [
      { name: "testimony_text", type: "transcript", required: true, description: "Witness testimony" },
      { name: "context", type: "context", required: true, description: "Case context and other testimonies" },
    ],
    outputs: ["EVIDENCE_CARD"],
    estimatedTokens: "high",
    icon: "credibility",
    cooldownMs: 60000,
    requiresTranscript: true,
  },
  {
    actionId: "court.generate_verdict_factors",
    label: "Generate Verdict Factors",
    description: "List key decision points supporting or opposing the verdict",
    triggerType: "manual",
    inputs: [
      { name: "full_case_record", type: "artifact", required: true, description: "Complete case record" },
      { name: "arguments", type: "artifact", required: false, description: "All arguments presented" },
    ],
    outputs: ["CLAIM", "MODERATOR_PROMPT"],
    estimatedTokens: "high",
    icon: "verdict",
    cooldownMs: 120000,
  },
  {
    actionId: "court.track_objection",
    label: "Track Objection",
    description: "Log objections and their rulings during proceedings",
    triggerType: "auto",
    autoTriggerCondition: "When 'objection' detected in transcript",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Objection context" },
    ],
    outputs: ["CLAIM"],
    estimatedTokens: "low",
    icon: "objection",
    cooldownMs: 5000,
    requiresTranscript: true,
  },
  {
    actionId: "court.rate_argument_strength",
    label: "Rate Argument",
    description: "Score the effectiveness of legal arguments based on evidence and logic",
    triggerType: "manual",
    inputs: [
      { name: "argument_text", type: "transcript", required: true, description: "Argument to evaluate" },
      { name: "evidence", type: "artifact", required: false, description: "Supporting evidence" },
    ],
    outputs: ["CLAIM"],
    estimatedTokens: "medium",
    icon: "strength",
    cooldownMs: 30000,
    requiresTranscript: true,
  },
  {
    actionId: "court.generate_cross_questions",
    label: "Cross-Exam Questions",
    description: "Suggest effective cross-examination questions based on testimony",
    triggerType: "manual",
    inputs: [
      { name: "testimony", type: "transcript", required: true, description: "Witness testimony" },
      { name: "case_theory", type: "context", required: false, description: "Case theory and goals" },
    ],
    outputs: ["MODERATOR_PROMPT"],
    estimatedTokens: "medium",
    icon: "questions",
    cooldownMs: 30000,
    requiresTranscript: true,
  },
  {
    actionId: "court.draft_closing_points",
    label: "Closing Points",
    description: "Outline key points for closing arguments",
    triggerType: "manual",
    inputs: [
      { name: "full_case_record", type: "artifact", required: true, description: "Complete case record" },
    ],
    outputs: ["CLAIM", "MODERATOR_PROMPT"],
    estimatedTokens: "high",
    icon: "closing",
    cooldownMs: 120000,
  },
  {
    actionId: "court.generate_ruling_notes",
    label: "Ruling Notes",
    description: "Draft notes for judicial ruling with key findings",
    triggerType: "manual",
    inputs: [
      { name: "arguments", type: "artifact", required: true, description: "All arguments" },
      { name: "evidence", type: "artifact", required: true, description: "All evidence" },
      { name: "law", type: "context", required: false, description: "Applicable law" },
    ],
    outputs: ["MODERATOR_PROMPT"],
    estimatedTokens: "high",
    icon: "ruling",
    cooldownMs: 120000,
  },
];

/**
 * Action groups for UI organization
 */
export const COURT_ACTION_GROUPS = {
  evidence: {
    label: "Evidence Analysis",
    description: "Actions for managing and analyzing evidence",
    actionIds: ["court.log_evidence", "court.link_precedent"],
  },
  testimony: {
    label: "Testimony Analysis",
    description: "Actions for analyzing witness testimony",
    actionIds: [
      "court.tag_witness_statement",
      "court.summarize_testimony",
      "court.analyze_credibility",
      "court.generate_cross_questions",
    ],
  },
  claims: {
    label: "Claims & Arguments",
    description: "Actions for tracking claims and evaluating arguments",
    actionIds: [
      "court.extract_claim",
      "court.rate_argument_strength",
      "court.detect_contradiction",
    ],
  },
  proceedings: {
    label: "Proceedings",
    description: "Actions for tracking trial progress",
    actionIds: [
      "court.track_objection",
      "court.generate_timeline",
    ],
  },
  verdict: {
    label: "Verdict Preparation",
    description: "Actions for preparing verdict and closing",
    actionIds: [
      "court.generate_verdict_factors",
      "court.draft_closing_points",
      "court.generate_ruling_notes",
    ],
  },
};

/**
 * Get action by ID
 */
export function getCourtActionById(actionId: string): AgentAction | undefined {
  return COURT_ACTIONS.find((a) => a.actionId === actionId);
}

/**
 * Get auto-trigger actions
 */
export function getCourtAutoTriggerActions(): AgentAction[] {
  return COURT_ACTIONS.filter((a) => a.triggerType === "auto" || a.triggerType === "both");
}

/**
 * Get actions by group
 */
export function getCourtActionsByGroup(groupKey: keyof typeof COURT_ACTION_GROUPS): AgentAction[] {
  const group = COURT_ACTION_GROUPS[groupKey];
  return COURT_ACTIONS.filter((a) => group.actionIds.includes(a.actionId));
}

/**
 * Action icons mapping for Court actions
 */
export const COURT_ACTION_ICONS: Record<string, string> = {
  claim: "ClipboardDocumentListIcon",
  evidence: "DocumentTextIcon",
  tag: "TagIcon",
  contradiction: "ExclamationTriangleIcon",
  precedent: "BookOpenIcon",
  summary: "DocumentMagnifyingGlassIcon",
  timeline: "ClockIcon",
  credibility: "ShieldCheckIcon",
  verdict: "ScaleIcon",
  objection: "HandRaisedIcon",
  strength: "ChartBarIcon",
  questions: "QuestionMarkCircleIcon",
  closing: "FlagIcon",
  ruling: "DocumentCheckIcon",
};

/**
 * Get icon for action
 */
export function getCourtActionIcon(iconKey: string): string {
  return COURT_ACTION_ICONS[iconKey] || "CommandLineIcon";
}

/**
 * Action runtime state
 */
export interface CourtActionState {
  currentAction: string | null;
  status: ActionStatus;
  progress?: number;
  queuedActions: string[];
  completedActions: Array<{
    actionId: string;
    status: ActionStatus;
    timestamp: number;
    data?: unknown;
  }>;
  autoTriggerEnabled: Record<string, boolean>;
  cooldowns: Record<string, number>;
}

/**
 * Initial action state
 */
export const initialCourtActionState: CourtActionState = {
  currentAction: null,
  status: "idle",
  queuedActions: [],
  completedActions: [],
  autoTriggerEnabled: {
    "court.extract_claim": true,
    "court.log_evidence": true,
    "court.track_objection": true,
    "court.tag_witness_statement": false,
    "court.detect_contradiction": true,
    "court.link_precedent": false,
    "court.summarize_testimony": false,
  },
  cooldowns: {},
};

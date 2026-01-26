/**
 * AI Agent Actions Index
 *
 * Central export for all action definitions organized by workflow.
 */

import type { AgentAction, WorkflowType, ActionGroup } from "@/types/actions";

// Import action definitions
import {
  contentCreatorActions,
  detectClipMoment,
  generateClipTitle,
  generateSocialPost,
  generateHashtags,
  generateThumbnailText,
  highlightMoments,
  generateEngagementHook,
  generateCTA,
  rateClipWorthiness,
  generateThread,
} from "./content-creator";

import {
  podcastActions,
  detectChapter,
  extractQuote,
  generateShowNotes,
  generateEpisodeDescription,
  detectSoundbite,
  generateGuestIntro,
  summarizeTopic,
  detectSponsorRead,
  extractActionItems,
  generatePromoClipText,
  generateTimestamps,
} from "./podcast";

import {
  scriptStudioActions,
  generateSlugline,
  analyzeSceneStructure,
  polishDialogue,
  checkCharacterVoice,
  detectPlotPoint,
  suggestActBreak,
  identifyConflict,
  analyzeSubtext,
  generateActionLine,
  suggestTransition,
  trackCharacterArc,
  detectMontage,
  generateStageDirection,
  estimatePageTiming,
  checkFormatCompliance,
} from "./script-studio";

import {
  writersCornerActions,
  summarizeChapter,
  captureCharacterNote,
  trackPlotThread,
  captureWorldbuilding,
  attributeDialogue,
  identifyTheme,
  checkContinuity,
  generateCharacterSheet,
  trackTimeline,
  suggestForeshadowing,
  logOpenLoop,
} from "./writers-corner";

import {
  mindMapActions,
  captureIdea,
  clusterIdeas,
  findConnections,
  expandIdea,
  prioritizeIdeas,
  extractMindMapActionItems,
  detectDuplicate,
  synthesizeIdeas,
  generateVariations,
  identifyEureka,
  categorizeIdea,
  generateSessionSummary,
} from "./mind-map";

import {
  courtSessionActions,
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
} from "./court-session";

import {
  debateRoomActions,
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
} from "./debate-room";

// Re-export all individual actions
export {
  // Content Creator
  detectClipMoment,
  generateClipTitle,
  generateSocialPost,
  generateHashtags,
  generateThumbnailText,
  highlightMoments,
  generateEngagementHook,
  generateCTA,
  rateClipWorthiness,
  generateThread,
  // Podcast
  detectChapter,
  extractQuote,
  generateShowNotes,
  generateEpisodeDescription,
  detectSoundbite,
  generateGuestIntro,
  summarizeTopic,
  detectSponsorRead,
  extractActionItems,
  generatePromoClipText,
  generateTimestamps,
  // Script Studio
  generateSlugline,
  analyzeSceneStructure,
  polishDialogue,
  checkCharacterVoice,
  detectPlotPoint,
  suggestActBreak,
  identifyConflict,
  analyzeSubtext,
  generateActionLine,
  suggestTransition,
  trackCharacterArc,
  detectMontage,
  generateStageDirection,
  estimatePageTiming,
  checkFormatCompliance,
  // Writers Corner
  summarizeChapter,
  captureCharacterNote,
  trackPlotThread,
  captureWorldbuilding,
  attributeDialogue,
  identifyTheme,
  checkContinuity,
  generateCharacterSheet,
  trackTimeline,
  suggestForeshadowing,
  logOpenLoop,
  // Mind Map
  captureIdea,
  clusterIdeas,
  findConnections,
  expandIdea,
  prioritizeIdeas,
  extractMindMapActionItems,
  detectDuplicate,
  synthesizeIdeas,
  generateVariations,
  identifyEureka,
  categorizeIdea,
  generateSessionSummary,
  // Court Session
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
  // Debate Room
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
};

// Re-export action groups
export { contentCreatorActions } from "./content-creator";
export { podcastActions } from "./podcast";
export { scriptStudioActions } from "./script-studio";
export { writersCornerActions } from "./writers-corner";
export { mindMapActions } from "./mind-map";
export { courtSessionActions } from "./court-session";
export { debateRoomActions } from "./debate-room";

/**
 * Action groups organized by workflow
 */
export const actionGroups: ActionGroup[] = [
  {
    workflowType: "content_creator",
    label: "Content Creator",
    description:
      "Help streamers create clips, social content, and engagement during live sessions.",
    actions: contentCreatorActions,
  },
  {
    workflowType: "podcast",
    label: "Podcast Console",
    description:
      "Assist podcast production with chapters, notes, quotes, and promotional content.",
    actions: podcastActions,
  },
  {
    workflowType: "script_studio",
    label: "Script Studio",
    description:
      "Support screenwriters and playwrights in developing scripts for film, television, and theater.",
    actions: scriptStudioActions,
  },
  {
    workflowType: "writers_corner",
    label: "Writers Corner",
    description:
      "Support novel and book authors with chapter tracking, character notes, and continuity.",
    actions: writersCornerActions,
  },
  {
    workflowType: "mind_map",
    label: "Mind Map Room",
    description:
      "Capture, cluster, and develop ideas during brainstorming sessions.",
    actions: mindMapActions,
  },
  {
    workflowType: "court_session",
    label: "Court Session",
    description:
      "Support legal proceedings and mock trials with evidence tracking and argument analysis.",
    actions: courtSessionActions,
  },
  {
    workflowType: "debate_room",
    label: "Debate Room",
    description:
      "Facilitate structured debates with claim tracking, evidence scoring, and moderation.",
    actions: debateRoomActions,
  },
];

/**
 * Get all actions for a specific workflow type
 */
export function getActionsForWorkflow(
  workflowType: WorkflowType
): AgentAction[] {
  const group = actionGroups.find((g) => g.workflowType === workflowType);
  return group?.actions ?? [];
}

/**
 * Get an action by its ID
 */
export function getActionById(actionId: string): AgentAction | undefined {
  for (const group of actionGroups) {
    const action = group.actions.find((a) => a.actionId === actionId);
    if (action) return action;
  }
  return undefined;
}

/**
 * Get all auto-trigger actions for a workflow
 */
export function getAutoTriggerActions(
  workflowType: WorkflowType
): AgentAction[] {
  const actions = getActionsForWorkflow(workflowType);
  return actions.filter(
    (action) => action.triggerType === "auto" || action.triggerType === "both"
  );
}

/**
 * Get all manual-only actions for a workflow
 */
export function getManualActions(workflowType: WorkflowType): AgentAction[] {
  const actions = getActionsForWorkflow(workflowType);
  return actions.filter((action) => action.triggerType === "manual");
}

/**
 * Filter actions by trigger type
 */
export function filterActionsByTrigger(
  actions: AgentAction[],
  triggerType: "manual" | "auto" | "both" | "all"
): AgentAction[] {
  if (triggerType === "all") return actions;
  if (triggerType === "auto") {
    return actions.filter(
      (a) => a.triggerType === "auto" || a.triggerType === "both"
    );
  }
  if (triggerType === "manual") {
    return actions.filter(
      (a) => a.triggerType === "manual" || a.triggerType === "both"
    );
  }
  return actions.filter((a) => a.triggerType === triggerType);
}

/**
 * Get token estimate range in actual tokens
 */
export function getTokenRange(
  estimate: "low" | "medium" | "high"
): { min: number; max: number } {
  const ranges = {
    low: { min: 100, max: 300 },
    medium: { min: 300, max: 800 },
    high: { min: 800, max: 2000 },
  };
  return ranges[estimate];
}

/**
 * Get recommended cooldown for action type
 */
export function getRecommendedCooldown(
  triggerType: "manual" | "auto" | "both",
  tokenEstimate: "low" | "medium" | "high"
): number {
  if (triggerType === "manual") return 0;
  if (tokenEstimate === "high") return 120000;
  if (tokenEstimate === "medium") return 60000;
  return 15000;
}

/**
 * All actions across all workflows
 */
export const allActions: AgentAction[] = [
  ...contentCreatorActions,
  ...podcastActions,
  ...scriptStudioActions,
  ...writersCornerActions,
  ...mindMapActions,
  ...courtSessionActions,
  ...debateRoomActions,
];

/**
 * Total action count
 */
export const totalActionCount = allActions.length;

/**
 * Writers Corner (Authors/Novelists) Actions
 *
 * Purpose: Support novel/book authors with chapter tracking, character notes, and continuity.
 */

import type { AgentAction } from "@/types/actions";

/**
 * Summarize Chapter
 * Creates chapter summary
 */
export const summarizeChapter: AgentAction = {
  actionId: "writers_corner.summarize_chapter",
  label: "Summarize Chapter",
  description: "Creates chapter summary from discussion",
  triggerType: "both",
  inputs: [
    {
      name: "chapter_transcript",
      type: "transcript",
      required: true,
      description: "Transcript of chapter discussion",
    },
    {
      name: "context",
      type: "context",
      required: false,
      description: "Story context and previous chapters",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "medium",
  icon: "document-text",
  cooldownMs: 60000,
  requiresTranscript: true,
  minTranscriptLength: 200,
};

/**
 * Capture Character Note
 * Records character development notes
 */
export const captureCharacterNote: AgentAction = {
  actionId: "writers_corner.capture_character_note",
  label: "Capture Character Note",
  description: "Records character development notes from discussion",
  triggerType: "both",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript segment with character details",
    },
    {
      name: "character",
      type: "user_input",
      required: true,
      description: "Character name or reference",
    },
  ],
  outputs: ["QUOTE"],
  estimatedTokens: "low",
  icon: "user",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Track Plot Thread
 * Identifies and logs plot threads
 */
export const trackPlotThread: AgentAction = {
  actionId: "writers_corner.track_plot_thread",
  label: "Track Plot Thread",
  description: "Identifies and logs plot threads from discussion",
  triggerType: "auto",
  autoTriggerCondition: "When plot-related discussion detected",
  inputs: [
    {
      name: "transcript",
      type: "transcript",
      required: true,
      description: "Current transcript segment",
    },
    {
      name: "existing_threads",
      type: "artifact",
      required: false,
      description: "Previously identified plot threads",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "medium",
  icon: "arrows-pointing-out",
  cooldownMs: 30000,
  requiresTranscript: true,
  minTranscriptLength: 100,
};

/**
 * Capture Worldbuilding
 * Records world/setting details
 */
export const captureWorldbuilding: AgentAction = {
  actionId: "writers_corner.capture_worldbuilding",
  label: "Capture Worldbuilding",
  description: "Records world/setting details from discussion",
  triggerType: "both",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript segment with world details",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "low",
  icon: "globe-alt",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Attribute Dialogue
 * Assigns dialogue to characters
 */
export const attributeDialogue: AgentAction = {
  actionId: "writers_corner.attribute_dialogue",
  label: "Attribute Dialogue",
  description: "Assigns dialogue lines to specific characters",
  triggerType: "auto",
  autoTriggerCondition: "When dialogue is being drafted",
  inputs: [
    {
      name: "dialogue_text",
      type: "transcript",
      required: true,
      description: "Dialogue text to attribute",
    },
    {
      name: "characters",
      type: "artifact",
      required: true,
      description: "List of characters in the scene",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "low",
  icon: "chat-bubble-left-right",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Identify Theme
 * Recognizes thematic elements
 */
export const identifyTheme: AgentAction = {
  actionId: "writers_corner.identify_theme",
  label: "Identify Theme",
  description: "Recognizes thematic elements in the narrative",
  triggerType: "both",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript segment to analyze",
    },
    {
      name: "context",
      type: "context",
      required: false,
      description: "Story context and established themes",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "medium",
  icon: "light-bulb",
  cooldownMs: 60000,
  requiresTranscript: true,
  minTranscriptLength: 150,
};

/**
 * Check Continuity
 * Flags potential continuity issues
 */
export const checkContinuity: AgentAction = {
  actionId: "writers_corner.check_continuity",
  label: "Check Continuity",
  description: "Flags potential continuity issues with story bible",
  triggerType: "manual",
  inputs: [
    {
      name: "current_content",
      type: "transcript",
      required: true,
      description: "Current content being discussed",
    },
    {
      name: "story_bible",
      type: "artifact",
      required: true,
      description: "Story bible with established facts",
    },
  ],
  outputs: ["ACTION_ITEM"],
  estimatedTokens: "high",
  icon: "exclamation-triangle",
  cooldownMs: undefined,
  requiresTranscript: true,
  minTranscriptLength: 100,
};

/**
 * Generate Character Sheet
 * Creates character profile template
 */
export const generateCharacterSheet: AgentAction = {
  actionId: "writers_corner.generate_character_sheet",
  label: "Character Sheet",
  description: "Creates character profile from notes and appearances",
  triggerType: "manual",
  inputs: [
    {
      name: "character_notes",
      type: "artifact",
      required: true,
      description: "Collected character notes",
    },
    {
      name: "appearances",
      type: "artifact",
      required: false,
      description: "Character appearance descriptions",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "medium",
  icon: "identification",
  cooldownMs: undefined,
};

/**
 * Track Timeline
 * Monitors story chronology
 */
export const trackTimeline: AgentAction = {
  actionId: "writers_corner.track_timeline",
  label: "Track Timeline",
  description: "Monitors story chronology and event sequence",
  triggerType: "both",
  inputs: [
    {
      name: "events_list",
      type: "artifact",
      required: true,
      description: "List of story events",
    },
    {
      name: "dates",
      type: "context",
      required: false,
      description: "Story timeline dates/references",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "medium",
  icon: "calendar",
  cooldownMs: 60000,
};

/**
 * Suggest Foreshadowing
 * Proposes foreshadowing opportunities
 */
export const suggestForeshadowing: AgentAction = {
  actionId: "writers_corner.suggest_foreshadowing",
  label: "Suggest Foreshadowing",
  description: "Proposes foreshadowing opportunities for plot threads",
  triggerType: "manual",
  inputs: [
    {
      name: "plot_threads",
      type: "artifact",
      required: true,
      description: "Active plot threads",
    },
    {
      name: "current_position",
      type: "context",
      required: true,
      description: "Current position in the story",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "medium",
  icon: "eye",
  cooldownMs: undefined,
};

/**
 * Log Open Loop
 * Captures unresolved story elements
 */
export const logOpenLoop: AgentAction = {
  actionId: "writers_corner.log_open_loop",
  label: "Log Open Loop",
  description: "Captures unresolved story elements that need resolution",
  triggerType: "auto",
  autoTriggerCondition: "When \"need to resolve\" or similar phrases detected",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript mentioning unresolved element",
    },
  ],
  outputs: ["ACTION_ITEM"],
  estimatedTokens: "low",
  icon: "arrow-path",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * All Writers Corner actions
 */
export const writersCornerActions: AgentAction[] = [
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
];

/**
 * Script Studio (Film/TV/Theater Writers) Actions
 *
 * Purpose: Support screenwriters and playwrights in developing scripts
 * for film, television, and theater productions.
 */

import type { AgentAction } from "@/types/actions";

/**
 * Generate Slugline
 * Creates properly formatted scene heading (INT/EXT, LOCATION - TIME)
 */
export const generateSlugline: AgentAction = {
  actionId: "script_studio.generate_slugline",
  label: "Generate Slugline",
  description:
    "Creates properly formatted scene heading (INT/EXT, LOCATION - TIME)",
  triggerType: "manual",
  inputs: [
    {
      name: "location_description",
      type: "user_input",
      required: true,
      description: "Description of the scene location",
    },
    {
      name: "time_of_day",
      type: "user_input",
      required: false,
      description: "Time of day (DAY, NIGHT, DAWN, DUSK, etc.)",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "low",
  icon: "map-pin",
  cooldownMs: undefined,
};

/**
 * Analyze Scene Structure
 * Breaks down scene into setup, conflict, resolution
 */
export const analyzeSceneStructure: AgentAction = {
  actionId: "script_studio.analyze_scene_structure",
  label: "Analyze Scene",
  description: "Breaks down scene into setup, conflict, and resolution",
  triggerType: "manual",
  inputs: [
    {
      name: "scene_text",
      type: "selection",
      required: true,
      description: "The scene text to analyze",
    },
    {
      name: "context",
      type: "context",
      required: false,
      description: "Story context and character information",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "high",
  icon: "puzzle-piece",
  cooldownMs: undefined,
};

/**
 * Polish Dialogue
 * Refines dialogue for character voice and subtext
 */
export const polishDialogue: AgentAction = {
  actionId: "script_studio.polish_dialogue",
  label: "Polish Dialogue",
  description: "Refines dialogue for character voice and subtext",
  triggerType: "manual",
  inputs: [
    {
      name: "dialogue_text",
      type: "selection",
      required: true,
      description: "Dialogue to polish",
    },
    {
      name: "character_profile",
      type: "context",
      required: false,
      description: "Character profile and voice notes",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "medium",
  icon: "chat-bubble-bottom-center-text",
  cooldownMs: undefined,
};

/**
 * Check Character Voice
 * Verifies dialogue consistency with character
 */
export const checkCharacterVoice: AgentAction = {
  actionId: "script_studio.check_character_voice",
  label: "Character Voice Check",
  description: "Verifies dialogue consistency with established character voice",
  triggerType: "manual",
  inputs: [
    {
      name: "dialogue_text",
      type: "selection",
      required: true,
      description: "Dialogue to check",
    },
    {
      name: "character_bible",
      type: "artifact",
      required: true,
      description: "Character bible or voice reference",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "medium",
  icon: "user-circle",
  cooldownMs: undefined,
};

/**
 * Detect Plot Point
 * Identifies major story turning points
 */
export const detectPlotPoint: AgentAction = {
  actionId: "script_studio.detect_plot_point",
  label: "Detect Plot Point",
  description:
    "Identifies major story turning points (inciting incident, midpoint, climax)",
  triggerType: "auto",
  autoTriggerCondition:
    'When major story event discussed (keywords: "turning point", "twist", "revelation")',
  inputs: [
    {
      name: "transcript",
      type: "transcript",
      required: true,
      description: "Current discussion transcript",
    },
    {
      name: "story_context",
      type: "context",
      required: false,
      description: "Story outline and context",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "medium",
  icon: "bolt",
  cooldownMs: 30000,
  requiresTranscript: true,
};

/**
 * Suggest Act Break
 * Proposes act break placement
 */
export const suggestActBreak: AgentAction = {
  actionId: "script_studio.suggest_act_break",
  label: "Suggest Act Break",
  description: "Proposes act break placement (3-act film, 5-act play)",
  triggerType: "both",
  inputs: [
    {
      name: "story_outline",
      type: "artifact",
      required: true,
      description: "Current story outline",
    },
    {
      name: "format_type",
      type: "user_input",
      required: true,
      description: "Format type (feature film, TV episode, stage play, etc.)",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "medium",
  icon: "scissors",
  cooldownMs: undefined,
};

/**
 * Identify Conflict
 * Finds conflict/tension points in scenes
 */
export const identifyConflict: AgentAction = {
  actionId: "script_studio.identify_conflict",
  label: "Identify Conflict",
  description: "Finds conflict and tension points in scenes",
  triggerType: "both",
  autoTriggerCondition: "When tension/obstacle language detected",
  inputs: [
    {
      name: "scene_text",
      type: "selection",
      required: true,
      description: "Scene text to analyze",
    },
    {
      name: "characters",
      type: "context",
      required: false,
      description: "Characters in the scene",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "medium",
  icon: "fire",
  cooldownMs: 30000,
};

/**
 * Analyze Subtext
 * Reveals underlying meaning in dialogue
 */
export const analyzeSubtext: AgentAction = {
  actionId: "script_studio.analyze_subtext",
  label: "Analyze Subtext",
  description: "Reveals underlying meaning in dialogue",
  triggerType: "manual",
  inputs: [
    {
      name: "dialogue_text",
      type: "selection",
      required: true,
      description: "Dialogue to analyze",
    },
    {
      name: "scene_context",
      type: "context",
      required: false,
      description: "Scene context and character relationships",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "medium",
  icon: "eye",
  cooldownMs: undefined,
};

/**
 * Generate Action Line
 * Creates visual action description (show don't tell)
 */
export const generateActionLine: AgentAction = {
  actionId: "script_studio.generate_action_line",
  label: "Generate Action Line",
  description: "Creates visual action description (show don't tell)",
  triggerType: "manual",
  inputs: [
    {
      name: "action_description",
      type: "user_input",
      required: true,
      description: "Description of the action to visualize",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "low",
  icon: "play",
  cooldownMs: undefined,
};

/**
 * Suggest Transition
 * Proposes scene transition (CUT TO, FADE, DISSOLVE)
 */
export const suggestTransition: AgentAction = {
  actionId: "script_studio.suggest_transition",
  label: "Suggest Transition",
  description: "Proposes scene transition (CUT TO, FADE, DISSOLVE)",
  triggerType: "manual",
  inputs: [
    {
      name: "from_scene",
      type: "context",
      required: true,
      description: "Current/ending scene context",
    },
    {
      name: "to_scene",
      type: "context",
      required: true,
      description: "Next/incoming scene context",
    },
    {
      name: "tone",
      type: "user_input",
      required: false,
      description: "Desired emotional tone of transition",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "low",
  icon: "arrows-right-left",
  cooldownMs: undefined,
};

/**
 * Track Character Arc
 * Monitors character transformation through story
 */
export const trackCharacterArc: AgentAction = {
  actionId: "script_studio.track_character_arc",
  label: "Track Character Arc",
  description: "Monitors character transformation through the story",
  triggerType: "both",
  autoTriggerCondition: "When character development/change discussed",
  inputs: [
    {
      name: "character",
      type: "context",
      required: true,
      description: "Character to track",
    },
    {
      name: "scenes_list",
      type: "artifact",
      required: true,
      description: "List of scenes featuring the character",
    },
  ],
  outputs: ["BEAT"],
  estimatedTokens: "medium",
  icon: "arrow-trending-up",
  cooldownMs: 60000,
};

/**
 * Detect Montage
 * Identifies montage sequence opportunities
 */
export const detectMontage: AgentAction = {
  actionId: "script_studio.detect_montage",
  label: "Detect Montage",
  description: "Identifies montage sequence opportunities",
  triggerType: "auto",
  autoTriggerCondition: "When sequence/passage of time discussed",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Current discussion transcript",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "low",
  icon: "film",
  cooldownMs: 30000,
  requiresTranscript: true,
};

/**
 * Generate Stage Direction (Theater)
 * Creates blocking and stage direction notes
 */
export const generateStageDirection: AgentAction = {
  actionId: "script_studio.generate_stage_direction",
  label: "Stage Direction (Theater)",
  description: "Creates blocking and stage direction notes for theater",
  triggerType: "manual",
  inputs: [
    {
      name: "action_context",
      type: "user_input",
      required: true,
      description: "Description of the action/movement",
    },
    {
      name: "stage_layout",
      type: "context",
      required: false,
      description: "Stage layout and set information",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "medium",
  icon: "users",
  cooldownMs: undefined,
};

/**
 * Estimate Page Timing
 * Calculates approximate runtime (1 page ~ 1 min)
 */
export const estimatePageTiming: AgentAction = {
  actionId: "script_studio.estimate_page_timing",
  label: "Estimate Timing",
  description:
    "Calculates approximate runtime based on page count (1 page ~ 1 min)",
  triggerType: "manual",
  inputs: [
    {
      name: "scene_pages",
      type: "user_input",
      required: true,
      description: "Number of script pages",
    },
    {
      name: "action_density",
      type: "user_input",
      required: false,
      description: "Action density (heavy action scenes may play faster)",
    },
  ],
  outputs: ["SCRIPT_INSERT"],
  estimatedTokens: "low",
  icon: "clock",
  cooldownMs: undefined,
};

/**
 * Check Format Compliance
 * Verifies script follows industry format standards
 */
export const checkFormatCompliance: AgentAction = {
  actionId: "script_studio.check_format_compliance",
  label: "Check Format",
  description: "Verifies script follows industry format standards",
  triggerType: "manual",
  inputs: [
    {
      name: "script_segment",
      type: "selection",
      required: true,
      description: "Script segment to check",
    },
    {
      name: "format_type",
      type: "user_input",
      required: true,
      description: "Format type (screenplay, teleplay, stage play)",
    },
  ],
  outputs: ["ACTION_ITEM"],
  estimatedTokens: "medium",
  icon: "document-check",
  cooldownMs: undefined,
};

/**
 * All Script Studio actions
 */
export const scriptStudioActions: AgentAction[] = [
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
];

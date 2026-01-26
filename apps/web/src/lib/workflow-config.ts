/**
 * Workflow Configuration Types and Utilities
 */

import { WORKFLOW_TYPES, type WorkflowType } from "./constants";

// ============================================================================
// Model Settings
// ============================================================================

export const AI_MODELS = {
  GPT_4: { id: "gpt-4", label: "GPT-4", provider: "OpenAI" },
  GPT_4_TURBO: { id: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI" },
  GPT_35_TURBO: { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "OpenAI" },
  CLAUDE_3_OPUS: { id: "claude-3-opus", label: "Claude 3 Opus", provider: "Anthropic" },
  CLAUDE_3_SONNET: { id: "claude-3-sonnet", label: "Claude 3 Sonnet", provider: "Anthropic" },
  CLAUDE_3_HAIKU: { id: "claude-3-haiku", label: "Claude 3 Haiku", provider: "Anthropic" },
  GEMINI_PRO: { id: "gemini-pro", label: "Gemini Pro", provider: "Google" },
} as const;

export type AIModelId = (typeof AI_MODELS)[keyof typeof AI_MODELS]["id"];

export interface ModelSettings {
  modelId: AIModelId;
  temperature: number;
  maxTokens: number;
  responseFormat: "text" | "json";
}

// ============================================================================
// Action Configuration
// ============================================================================

export interface ActionConfig {
  actionId: string;
  label: string;
  description: string;
  enabled: boolean;
  autoTrigger: boolean;
  cooldownMs: number;
  priority: number;
}

// ============================================================================
// Output Settings
// ============================================================================

export const OUTPUT_CATEGORIES = {
  CHAPTER_MARKER: { id: "chapter_marker", label: "Chapter Markers" },
  QUOTE: { id: "quote", label: "Quotes" },
  SOCIAL_POST: { id: "social_post", label: "Social Posts" },
  CLIP_TITLE: { id: "clip_title", label: "Clip Titles" },
  EPISODE_META: { id: "episode_meta", label: "Episode Metadata" },
  ACTION_ITEM: { id: "action_item", label: "Action Items" },
  BEAT: { id: "beat", label: "Story Beats" },
  SCRIPT_INSERT: { id: "script_insert", label: "Script Inserts" },
  IDEA_NODE: { id: "idea_node", label: "Idea Nodes" },
  EVIDENCE_CARD: { id: "evidence_card", label: "Evidence Cards" },
  CLAIM: { id: "claim", label: "Claims" },
  MODERATOR_PROMPT: { id: "moderator_prompt", label: "Moderator Prompts" },
} as const;

export type OutputCategoryId = (typeof OUTPUT_CATEGORIES)[keyof typeof OUTPUT_CATEGORIES]["id"];

export interface OutputSettings {
  enabledCategories: OutputCategoryId[];
  formatting: {
    includeTimestamps: boolean;
    includeConfidenceScores: boolean;
    autoNumberItems: boolean;
  };
  autoSave: {
    enabled: boolean;
    intervalMinutes: number;
  };
}

// ============================================================================
// Integration Settings
// ============================================================================

export const EXPORT_FORMATS = {
  JSON: { id: "json", label: "JSON", extension: ".json" },
  MARKDOWN: { id: "markdown", label: "Markdown", extension: ".md" },
  CSV: { id: "csv", label: "CSV", extension: ".csv" },
  TXT: { id: "txt", label: "Plain Text", extension: ".txt" },
} as const;

export type ExportFormatId = (typeof EXPORT_FORMATS)[keyof typeof EXPORT_FORMATS]["id"];

export interface IntegrationSettings {
  webhookUrl: string;
  apiKey: string;
  exportFormat: ExportFormatId;
}

// ============================================================================
// Complete Workflow Configuration
// ============================================================================

export interface WorkflowConfig {
  systemPrompt: string;
  model: ModelSettings;
  actions: ActionConfig[];
  outputs: OutputSettings;
  integrations: IntegrationSettings;
  updatedAt: string;
}

// ============================================================================
// Workflow-specific Actions from ai-agent-actions.md
// ============================================================================

export const WORKFLOW_ACTIONS: Record<string, ActionConfig[]> = {
  "content-creator": [
    { actionId: "content_creator.detect_clip_moment", label: "Detect Clip Moment", description: "Analyzes transcript for clip-worthy moments", enabled: true, autoTrigger: true, cooldownMs: 30000, priority: 1 },
    { actionId: "content_creator.generate_clip_title", label: "Generate Clip Title", description: "Creates catchy, clickable title for a clip", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 2 },
    { actionId: "content_creator.generate_social_post", label: "Generate Social Post", description: "Creates platform-optimized social media post", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 3 },
    { actionId: "content_creator.generate_hashtags", label: "Generate Hashtags", description: "Generates trending/relevant hashtags for content", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 4 },
    { actionId: "content_creator.generate_thumbnail_text", label: "Thumbnail Text", description: "Creates text overlay suggestions for thumbnails", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 5 },
    { actionId: "content_creator.highlight_moments", label: "Highlight Moments", description: "Identifies and ranks best moments from session", enabled: true, autoTrigger: true, cooldownMs: 900000, priority: 6 },
    { actionId: "content_creator.generate_engagement_hook", label: "Engagement Hook", description: "Creates opening hooks for clips/posts", enabled: true, autoTrigger: true, cooldownMs: 0, priority: 7 },
    { actionId: "content_creator.generate_cta", label: "Generate CTA", description: "Creates call-to-action text for posts", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 8 },
    { actionId: "content_creator.rate_clip_worthiness", label: "Rate Clip Worthiness", description: "Scores transcript segment for viral potential", enabled: true, autoTrigger: true, cooldownMs: 0, priority: 9 },
    { actionId: "content_creator.generate_thread", label: "Generate Thread", description: "Creates multi-post thread from content", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 10 },
  ],
  podcast: [
    { actionId: "podcast.detect_chapter", label: "Detect Chapter", description: "Identifies topic changes for chapter markers", enabled: true, autoTrigger: true, cooldownMs: 60000, priority: 1 },
    { actionId: "podcast.extract_quote", label: "Extract Quote", description: "Pulls notable, shareable quotes", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 2 },
    { actionId: "podcast.generate_show_notes", label: "Generate Show Notes", description: "Creates structured show notes", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 3 },
    { actionId: "podcast.generate_episode_description", label: "Episode Description", description: "Writes compelling episode description", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 4 },
    { actionId: "podcast.detect_soundbite", label: "Detect Soundbite", description: "Identifies compelling audio clips", enabled: true, autoTrigger: true, cooldownMs: 60000, priority: 5 },
    { actionId: "podcast.generate_guest_intro", label: "Guest Introduction", description: "Creates guest bio/introduction text", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 6 },
    { actionId: "podcast.summarize_topic", label: "Summarize Topic", description: "Creates summary of discussed topic", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 7 },
    { actionId: "podcast.detect_sponsor_read", label: "Detect Sponsor Read", description: "Identifies sponsor segments for timestamps", enabled: true, autoTrigger: true, cooldownMs: 30000, priority: 8 },
    { actionId: "podcast.extract_action_items", label: "Extract Action Items", description: "Pulls mentioned tasks, links, recommendations", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 9 },
    { actionId: "podcast.generate_promo_clip_text", label: "Promo Clip Text", description: "Creates promotional text for clip teasers", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 10 },
    { actionId: "podcast.generate_timestamps", label: "Generate Timestamps", description: "Creates YouTube-style timestamp list", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 11 },
  ],
  "script-studio": [
    { actionId: "script_studio.generate_slugline", label: "Generate Slugline", description: "Creates properly formatted scene heading", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 1 },
    { actionId: "script_studio.analyze_scene_structure", label: "Analyze Scene", description: "Breaks down scene into setup, conflict, resolution", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 2 },
    { actionId: "script_studio.polish_dialogue", label: "Polish Dialogue", description: "Refines dialogue for character voice and subtext", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 3 },
    { actionId: "script_studio.check_character_voice", label: "Character Voice Check", description: "Verifies dialogue consistency with character", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 4 },
    { actionId: "script_studio.detect_plot_point", label: "Detect Plot Point", description: "Identifies major story turning points", enabled: true, autoTrigger: true, cooldownMs: 60000, priority: 5 },
    { actionId: "script_studio.suggest_act_break", label: "Suggest Act Break", description: "Proposes act break placement", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 6 },
    { actionId: "script_studio.identify_conflict", label: "Identify Conflict", description: "Finds conflict/tension points in scenes", enabled: true, autoTrigger: true, cooldownMs: 60000, priority: 7 },
    { actionId: "script_studio.analyze_subtext", label: "Analyze Subtext", description: "Reveals underlying meaning in dialogue", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 8 },
    { actionId: "script_studio.generate_action_line", label: "Generate Action Line", description: "Creates visual action description", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 9 },
    { actionId: "script_studio.suggest_transition", label: "Suggest Transition", description: "Proposes scene transition", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 10 },
    { actionId: "script_studio.track_character_arc", label: "Track Character Arc", description: "Monitors character transformation through story", enabled: true, autoTrigger: true, cooldownMs: 120000, priority: 11 },
    { actionId: "script_studio.detect_montage", label: "Detect Montage", description: "Identifies montage sequence opportunities", enabled: true, autoTrigger: true, cooldownMs: 60000, priority: 12 },
    { actionId: "script_studio.generate_stage_direction", label: "Stage Direction", description: "Creates blocking and stage direction notes", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 13 },
    { actionId: "script_studio.estimate_page_timing", label: "Estimate Timing", description: "Calculates approximate runtime", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 14 },
    { actionId: "script_studio.check_format_compliance", label: "Check Format", description: "Verifies script follows industry format standards", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 15 },
  ],
  "writers-corner": [
    { actionId: "writers_corner.summarize_chapter", label: "Summarize Chapter", description: "Creates chapter summary", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 1 },
    { actionId: "writers_corner.capture_character_note", label: "Capture Character Note", description: "Records character development notes", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 2 },
    { actionId: "writers_corner.track_plot_thread", label: "Track Plot Thread", description: "Identifies and logs plot threads", enabled: true, autoTrigger: true, cooldownMs: 60000, priority: 3 },
    { actionId: "writers_corner.capture_worldbuilding", label: "Capture Worldbuilding", description: "Records world/setting details", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 4 },
    { actionId: "writers_corner.attribute_dialogue", label: "Attribute Dialogue", description: "Assigns dialogue to characters", enabled: true, autoTrigger: true, cooldownMs: 30000, priority: 5 },
    { actionId: "writers_corner.identify_theme", label: "Identify Theme", description: "Recognizes thematic elements", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 6 },
    { actionId: "writers_corner.check_continuity", label: "Check Continuity", description: "Flags potential continuity issues", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 7 },
    { actionId: "writers_corner.generate_character_sheet", label: "Character Sheet", description: "Creates character profile template", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 8 },
    { actionId: "writers_corner.track_timeline", label: "Track Timeline", description: "Monitors story chronology", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 9 },
    { actionId: "writers_corner.suggest_foreshadowing", label: "Suggest Foreshadowing", description: "Proposes foreshadowing opportunities", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 10 },
    { actionId: "writers_corner.log_open_loop", label: "Log Open Loop", description: "Captures unresolved story elements", enabled: true, autoTrigger: true, cooldownMs: 30000, priority: 11 },
  ],
  "mind-map": [
    { actionId: "mind_map.capture_idea", label: "Capture Idea", description: "Extracts new ideas from discussion", enabled: true, autoTrigger: true, cooldownMs: 15000, priority: 1 },
    { actionId: "mind_map.cluster_ideas", label: "Cluster Ideas", description: "Groups related ideas together", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 2 },
    { actionId: "mind_map.find_connections", label: "Find Connections", description: "Identifies relationships between ideas", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 3 },
    { actionId: "mind_map.expand_idea", label: "Expand Idea", description: "Develops an idea with sub-points", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 4 },
    { actionId: "mind_map.prioritize_ideas", label: "Prioritize Ideas", description: "Ranks ideas by criteria", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 5 },
    { actionId: "mind_map.extract_action_items", label: "Extract Actions", description: "Converts ideas to action items", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 6 },
    { actionId: "mind_map.detect_duplicate", label: "Detect Duplicate", description: "Flags similar/duplicate ideas", enabled: true, autoTrigger: true, cooldownMs: 0, priority: 7 },
    { actionId: "mind_map.synthesize_ideas", label: "Synthesize Ideas", description: "Combines ideas into new concept", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 8 },
    { actionId: "mind_map.generate_variations", label: "Generate Variations", description: "Creates variations of an idea", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 9 },
    { actionId: "mind_map.identify_eureka", label: "Identify Eureka", description: "Flags breakthrough moments", enabled: true, autoTrigger: true, cooldownMs: 30000, priority: 10 },
    { actionId: "mind_map.categorize_idea", label: "Categorize Idea", description: "Assigns category to new idea", enabled: true, autoTrigger: true, cooldownMs: 0, priority: 11 },
    { actionId: "mind_map.generate_session_summary", label: "Session Summary", description: "Creates overview of brainstorm session", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 12 },
  ],
  "court-session": [
    { actionId: "court.log_evidence", label: "Log Evidence", description: "Records evidence presented", enabled: true, autoTrigger: true, cooldownMs: 30000, priority: 1 },
    { actionId: "court.track_objection", label: "Track Objection", description: "Logs objections and rulings", enabled: true, autoTrigger: true, cooldownMs: 0, priority: 2 },
    { actionId: "court.assess_witness_credibility", label: "Assess Credibility", description: "Evaluates witness testimony", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 3 },
    { actionId: "court.rate_argument_strength", label: "Rate Argument", description: "Scores argument effectiveness", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 4 },
    { actionId: "court.identify_precedent", label: "Identify Precedent", description: "Suggests relevant case precedents", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 5 },
    { actionId: "court.construct_timeline", label: "Construct Timeline", description: "Builds case timeline from testimony", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 6 },
    { actionId: "court.generate_ruling_notes", label: "Ruling Notes", description: "Drafts notes for ruling", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 7 },
    { actionId: "court.summarize_testimony", label: "Summarize Testimony", description: "Creates witness testimony summary", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 8 },
    { actionId: "court.track_exhibits", label: "Track Exhibits", description: "Logs and organizes exhibits", enabled: true, autoTrigger: true, cooldownMs: 15000, priority: 9 },
    { actionId: "court.identify_contradictions", label: "Find Contradictions", description: "Flags contradictory statements", enabled: true, autoTrigger: true, cooldownMs: 300000, priority: 10 },
    { actionId: "court.generate_cross_questions", label: "Cross-Exam Questions", description: "Suggests cross-examination questions", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 11 },
    { actionId: "court.draft_closing_points", label: "Closing Points", description: "Outlines key closing argument points", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 12 },
  ],
  "debate-room": [
    { actionId: "debate.track_claim", label: "Track Claim", description: "Logs assertions and arguments", enabled: true, autoTrigger: true, cooldownMs: 15000, priority: 1 },
    { actionId: "debate.link_counterclaim", label: "Link Counterclaim", description: "Connects claims to rebuttals", enabled: true, autoTrigger: true, cooldownMs: 30000, priority: 2 },
    { actionId: "debate.score_evidence", label: "Score Evidence", description: "Evaluates evidence quality", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 3 },
    { actionId: "debate.detect_fallacy", label: "Detect Fallacy", description: "Identifies logical fallacies", enabled: true, autoTrigger: true, cooldownMs: 30000, priority: 4 },
    { actionId: "debate.queue_rebuttal", label: "Queue Rebuttal", description: "Suggests rebuttal points", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 5 },
    { actionId: "debate.rate_argument_strength", label: "Rate Argument", description: "Scores argument effectiveness", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 6 },
    { actionId: "debate.suggest_fact_check", label: "Suggest Fact Check", description: "Flags claims needing verification", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 7 },
    { actionId: "debate.generate_moderator_prompt", label: "Moderator Prompt", description: "Creates questions for moderator", enabled: true, autoTrigger: true, cooldownMs: 300000, priority: 8 },
    { actionId: "debate.summarize_position", label: "Summarize Position", description: "Creates summary of speaker's stance", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 9 },
    { actionId: "debate.track_topic_coverage", label: "Track Coverage", description: "Monitors topics discussed", enabled: true, autoTrigger: true, cooldownMs: 120000, priority: 10 },
    { actionId: "debate.generate_closing_summary", label: "Closing Summary", description: "Creates debate summary", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 11 },
    { actionId: "debate.extract_key_quotes", label: "Extract Key Quotes", description: "Pulls impactful debate quotes", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 12 },
  ],
};

// Cross-workflow (common) actions
export const COMMON_ACTIONS: ActionConfig[] = [
  { actionId: "common.summarize_segment", label: "Summarize Segment", description: "Summarizes last N minutes", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 100 },
  { actionId: "common.extract_key_points", label: "Extract Key Points", description: "Pulls main points from discussion", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 101 },
  { actionId: "common.identify_speakers", label: "Identify Speakers", description: "Attributes speech to speakers", enabled: true, autoTrigger: true, cooldownMs: 30000, priority: 102 },
  { actionId: "common.generate_title", label: "Generate Title", description: "Creates session title", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 103 },
  { actionId: "common.tag_content", label: "Tag Content", description: "Generates tags/keywords", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 104 },
  { actionId: "common.mark_timestamp", label: "Mark Timestamp", description: "Creates bookmark at current time", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 105 },
  { actionId: "common.generate_session_recap", label: "Session Recap", description: "Creates end-of-session summary", enabled: true, autoTrigger: false, cooldownMs: 0, priority: 106 },
];

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  modelId: "gpt-4",
  temperature: 0.7,
  maxTokens: 2048,
  responseFormat: "text",
};

export const DEFAULT_OUTPUT_SETTINGS: OutputSettings = {
  enabledCategories: ["chapter_marker", "quote", "action_item"],
  formatting: {
    includeTimestamps: true,
    includeConfidenceScores: false,
    autoNumberItems: true,
  },
  autoSave: {
    enabled: true,
    intervalMinutes: 5,
  },
};

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  webhookUrl: "",
  apiKey: "",
  exportFormat: "json",
};

// Output categories by workflow
export const WORKFLOW_OUTPUT_CATEGORIES: Record<string, OutputCategoryId[]> = {
  "content-creator": ["social_post", "clip_title", "chapter_marker", "quote"],
  podcast: ["chapter_marker", "quote", "episode_meta", "action_item"],
  "script-studio": ["beat", "script_insert", "quote"],
  "writers-corner": ["beat", "quote", "script_insert", "action_item"],
  "mind-map": ["idea_node", "action_item", "quote"],
  "court-session": ["evidence_card", "claim", "quote", "moderator_prompt"],
  "debate-room": ["claim", "evidence_card", "quote", "moderator_prompt"],
};

export const getDefaultWorkflowConfig = (workflowPath: string, defaultPrompt: string): WorkflowConfig => {
  const workflowActions = WORKFLOW_ACTIONS[workflowPath] || [];
  const outputCategories = WORKFLOW_OUTPUT_CATEGORIES[workflowPath] || ["chapter_marker", "quote", "action_item"];

  return {
    systemPrompt: defaultPrompt,
    model: { ...DEFAULT_MODEL_SETTINGS },
    actions: [...workflowActions, ...COMMON_ACTIONS],
    outputs: {
      ...DEFAULT_OUTPUT_SETTINGS,
      enabledCategories: outputCategories,
    },
    integrations: { ...DEFAULT_INTEGRATION_SETTINGS },
    updatedAt: new Date().toISOString(),
  };
};

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export const validateWorkflowConfig = (config: WorkflowConfig): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Model settings validation
  if (config.model.temperature < 0 || config.model.temperature > 1) {
    errors.push({ field: "model.temperature", message: "Temperature must be between 0 and 1" });
  }
  if (config.model.maxTokens < 1 || config.model.maxTokens > 128000) {
    errors.push({ field: "model.maxTokens", message: "Max tokens must be between 1 and 128000" });
  }

  // System prompt validation
  if (!config.systemPrompt.trim()) {
    errors.push({ field: "systemPrompt", message: "System prompt cannot be empty" });
  }

  // Actions validation
  const priorities = config.actions.map(a => a.priority);
  const hasDuplicatePriorities = priorities.length !== new Set(priorities).size;
  if (hasDuplicatePriorities) {
    errors.push({ field: "actions", message: "Action priorities must be unique" });
  }

  // Cooldown validation
  config.actions.forEach((action, index) => {
    if (action.cooldownMs < 0) {
      errors.push({ field: `actions[${index}].cooldownMs`, message: `Cooldown for ${action.label} cannot be negative` });
    }
  });

  // Output settings validation
  if (config.outputs.autoSave.enabled && config.outputs.autoSave.intervalMinutes < 1) {
    errors.push({ field: "outputs.autoSave.intervalMinutes", message: "Auto-save interval must be at least 1 minute" });
  }

  // Integration settings validation
  if (config.integrations.webhookUrl && !isValidUrl(config.integrations.webhookUrl)) {
    errors.push({ field: "integrations.webhookUrl", message: "Invalid webhook URL format" });
  }

  return errors;
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// Storage Utilities
// ============================================================================

export const getStorageKey = (workflowPath: string) =>
  `workflow-config-${workflowPath}`;

export const loadWorkflowConfig = (workflowPath: string): WorkflowConfig | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(getStorageKey(workflowPath));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const saveWorkflowConfig = (workflowPath: string, config: WorkflowConfig): void => {
  if (typeof window === "undefined") return;
  const configWithTimestamp = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(getStorageKey(workflowPath), JSON.stringify(configWithTimestamp));
};

export const clearWorkflowConfig = (workflowPath: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey(workflowPath));
};

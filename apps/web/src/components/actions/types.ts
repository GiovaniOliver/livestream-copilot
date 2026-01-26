// AI Agent Action Types

export type ActionStatus = "idle" | "queued" | "processing" | "success" | "failed" | "cancelled" | "reviewing";

export type TriggerType = "manual" | "auto" | "both";

export type TokenEstimate = "low" | "medium" | "high";

export type OutputCategory =
  | "CHAPTER_MARKER"
  | "QUOTE"
  | "EPISODE_META"
  | "ACTION_ITEM"
  | "SOCIAL_POST"
  | "CLIP_TITLE"
  | "BEAT"
  | "SCRIPT_INSERT"
  | "IDEA_NODE"
  | "EVIDENCE_CARD"
  | "CLAIM"
  | "MODERATOR_PROMPT";

export interface ActionInput {
  name: string;
  type: "transcript" | "context" | "selection" | "artifact" | "user_input";
  required: boolean;
  description: string;
}

export interface AgentAction {
  actionId: string;
  label: string;
  description: string;
  triggerType: TriggerType;
  autoTriggerCondition?: string;
  inputs: ActionInput[];
  outputs: OutputCategory[];
  estimatedTokens: TokenEstimate;
  icon: string;
  cooldownMs?: number;
  requiresTranscript?: boolean;
  minTranscriptLength?: number;
}

export interface ActionResult {
  actionId: string;
  status: ActionStatus;
  timestamp: number;
  data?: unknown;
  error?: string;
  confidence?: number;
}

// Podcast-specific action types

export interface ChapterMarkerResult {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  confidence: number;
  isAiGenerated: boolean;
  topicKeywords?: string[];
}

export interface QuoteResult {
  id: string;
  text: string;
  speaker: string;
  timestamp: number;
  confidence: number;
  isAiGenerated: boolean;
  isSoundbite?: boolean;
  emotionalTone?: string;
}

export interface ShowNotesResult {
  id: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
  guests?: {
    name: string;
    bio?: string;
  }[];
  resources?: {
    title: string;
    url?: string;
  }[];
  generatedAt: number;
}

export interface ActionItemResult {
  id: string;
  text: string;
  timestamp: number;
  assignee?: string;
  priority?: "low" | "medium" | "high";
  completed: boolean;
  isAiGenerated: boolean;
}

export interface SponsorSegmentResult {
  id: string;
  sponsorName: string;
  startTime: number;
  endTime: number;
  isAiGenerated: boolean;
}

// Action state for managing UI

export interface ActionState {
  currentAction: string | null;
  status: ActionStatus;
  progress?: number;
  queuedActions: string[];
  completedActions: ActionResult[];
  autoTriggerEnabled: Record<string, boolean>;
  cooldowns: Record<string, number>;
}

// Podcast Actions Definition

export const PODCAST_ACTIONS: AgentAction[] = [
  {
    actionId: "podcast.detect_chapter",
    label: "Detect Chapter",
    description: "Identifies topic changes for chapter markers",
    triggerType: "auto",
    autoTriggerCondition: "When topic shift detected (semantic similarity < 0.5)",
    inputs: [
      { name: "transcript", type: "transcript", required: true, description: "Current transcript segment" },
      { name: "previous_topics", type: "context", required: false, description: "Previously detected topics" },
    ],
    outputs: ["CHAPTER_MARKER"],
    estimatedTokens: "medium",
    icon: "chapters",
    cooldownMs: 15000,
    requiresTranscript: true,
    minTranscriptLength: 100,
  },
  {
    actionId: "podcast.extract_quote",
    label: "Extract Quote",
    description: "Pulls notable, shareable quotes",
    triggerType: "both",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Transcript segment to analyze" },
    ],
    outputs: ["QUOTE"],
    estimatedTokens: "low",
    icon: "quote",
    cooldownMs: 10000,
    requiresTranscript: true,
  },
  {
    actionId: "podcast.generate_show_notes",
    label: "Generate Show Notes",
    description: "Creates structured show notes from the full transcript",
    triggerType: "manual",
    inputs: [
      { name: "full_transcript", type: "transcript", required: true, description: "Complete episode transcript" },
      { name: "topics", type: "context", required: false, description: "Detected topics list" },
      { name: "guests", type: "context", required: false, description: "Guest information" },
    ],
    outputs: ["EPISODE_META"],
    estimatedTokens: "high",
    icon: "notes",
    requiresTranscript: true,
    minTranscriptLength: 500,
  },
  {
    actionId: "podcast.generate_episode_description",
    label: "Episode Description",
    description: "Writes compelling episode description",
    triggerType: "manual",
    inputs: [
      { name: "transcript_summary", type: "transcript", required: true, description: "Episode summary" },
      { name: "topics", type: "context", required: false, description: "Main topics" },
      { name: "guests", type: "context", required: false, description: "Guest list" },
    ],
    outputs: ["EPISODE_META"],
    estimatedTokens: "medium",
    icon: "description",
  },
  {
    actionId: "podcast.detect_soundbite",
    label: "Detect Soundbite",
    description: "Identifies compelling audio clips",
    triggerType: "auto",
    autoTriggerCondition: "Every 60s, when quote confidence > 0.6",
    inputs: [
      { name: "transcript", type: "transcript", required: true, description: "Recent transcript" },
      { name: "audio_energy", type: "context", required: false, description: "Audio energy levels" },
    ],
    outputs: ["CHAPTER_MARKER"],
    estimatedTokens: "medium",
    icon: "soundbite",
    cooldownMs: 60000,
    requiresTranscript: true,
  },
  {
    actionId: "podcast.detect_sponsor_read",
    label: "Detect Sponsor Read",
    description: "Identifies sponsor segments for timestamps",
    triggerType: "auto",
    autoTriggerCondition: "When sponsor-related keywords detected",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Transcript to analyze" },
    ],
    outputs: ["CHAPTER_MARKER"],
    estimatedTokens: "low",
    icon: "sponsor",
    cooldownMs: 30000,
    requiresTranscript: true,
  },
  {
    actionId: "podcast.extract_action_items",
    label: "Extract Action Items",
    description: "Pulls mentioned tasks, links, recommendations",
    triggerType: "both",
    autoTriggerCondition: "When action-oriented language detected",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Transcript segment" },
    ],
    outputs: ["ACTION_ITEM"],
    estimatedTokens: "medium",
    icon: "action",
    cooldownMs: 30000,
    requiresTranscript: true,
  },
  {
    actionId: "podcast.generate_timestamps",
    label: "Generate Timestamps",
    description: "Creates YouTube-style timestamp list",
    triggerType: "manual",
    inputs: [
      { name: "chapters", type: "artifact", required: true, description: "Detected chapters" },
      { name: "full_transcript", type: "transcript", required: false, description: "Full transcript" },
    ],
    outputs: ["CHAPTER_MARKER"],
    estimatedTokens: "medium",
    icon: "timestamps",
  },
  {
    actionId: "podcast.summarize_topic",
    label: "Summarize Topic",
    description: "Creates summary of discussed topic",
    triggerType: "both",
    inputs: [
      { name: "topic_transcript_segment", type: "transcript", required: true, description: "Topic transcript" },
    ],
    outputs: ["EPISODE_META"],
    estimatedTokens: "medium",
    icon: "summary",
    requiresTranscript: true,
  },
  {
    actionId: "podcast.generate_promo_clip_text",
    label: "Promo Clip Text",
    description: "Creates promotional text for clip teasers",
    triggerType: "manual",
    inputs: [
      { name: "clip_context", type: "context", required: true, description: "Clip context" },
      { name: "episode_title", type: "context", required: false, description: "Episode title" },
    ],
    outputs: ["SOCIAL_POST"],
    estimatedTokens: "low",
    icon: "promo",
  },
];

// Helper to get action by ID
export function getActionById(actionId: string): AgentAction | undefined {
  return PODCAST_ACTIONS.find((a) => a.actionId === actionId);
}

// Helper to get auto-trigger actions
export function getAutoTriggerActions(): AgentAction[] {
  return PODCAST_ACTIONS.filter((a) => a.triggerType === "auto" || a.triggerType === "both");
}

// Helper to format timestamp
export function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Helper to parse timestamp string to seconds
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// ============================================================
// Content Creator Actions Definition
// ============================================================

export interface ClipTitleResult {
  id: string;
  title: string;
  alternatives: string[];
  clipId: string;
  confidence: number;
  isAiGenerated: boolean;
}

export interface SocialPostResult {
  id: string;
  platform: "x" | "linkedin" | "instagram" | "youtube";
  content: string;
  hashtags: string[];
  clipId?: string;
  characterCount: number;
  isAiGenerated: boolean;
  status: "draft" | "approved" | "published";
}

export interface ClipMomentResult {
  id: string;
  timestamp: number;
  duration: number;
  score: number;
  type: "hype" | "funny" | "epic" | "fail" | "highlight";
  description: string;
  tags: string[];
  isAiGenerated: boolean;
}

export const CONTENT_CREATOR_ACTIONS: AgentAction[] = [
  {
    actionId: "content_creator.detect_clip_moment",
    label: "Detect Clip Moment",
    description: "Analyzes transcript for clip-worthy moments (funny, epic, fails)",
    triggerType: "auto",
    autoTriggerCondition: "Every 30s of new transcript, or on high-energy audio detection",
    inputs: [
      { name: "transcript", type: "transcript", required: true, description: "Recent transcript segment" },
      { name: "mood_context", type: "context", required: false, description: "Current stream mood/context" },
    ],
    outputs: ["CHAPTER_MARKER"],
    estimatedTokens: "medium",
    icon: "film",
    cooldownMs: 30000,
    requiresTranscript: true,
    minTranscriptLength: 50,
  },
  {
    actionId: "content_creator.generate_clip_title",
    label: "Generate Clip Title",
    description: "Creates catchy, clickable title for a clip",
    triggerType: "both",
    autoTriggerCondition: "When new clip is detected with score > 0.7",
    inputs: [
      { name: "clip_context", type: "context", required: true, description: "Context about the clip" },
      { name: "transcript_segment", type: "transcript", required: true, description: "Transcript of the clip" },
    ],
    outputs: ["CLIP_TITLE"],
    estimatedTokens: "low",
    icon: "sparkles",
    requiresTranscript: true,
  },
  {
    actionId: "content_creator.generate_social_post",
    label: "Generate Social Post",
    description: "Creates platform-optimized social media post",
    triggerType: "both",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Content to base post on" },
      { name: "platform", type: "user_input", required: true, description: "Target platform (x, linkedin, instagram, youtube)" },
      { name: "clip_ref", type: "artifact", required: false, description: "Reference to associated clip" },
    ],
    outputs: ["SOCIAL_POST"],
    estimatedTokens: "low",
    icon: "share",
  },
  {
    actionId: "content_creator.generate_hashtags",
    label: "Generate Hashtags",
    description: "Generates trending/relevant hashtags for content",
    triggerType: "manual",
    inputs: [
      { name: "transcript", type: "transcript", required: true, description: "Content to analyze" },
      { name: "platform", type: "user_input", required: true, description: "Target platform" },
      { name: "content_type", type: "user_input", required: false, description: "Type of content (gaming, tech, etc.)" },
    ],
    outputs: ["SOCIAL_POST"],
    estimatedTokens: "low",
    icon: "hash",
  },
  {
    actionId: "content_creator.highlight_moments",
    label: "Highlight Moments",
    description: "Identifies and ranks best moments from session",
    triggerType: "auto",
    autoTriggerCondition: "At session end, or every 15 minutes",
    inputs: [
      { name: "full_transcript", type: "transcript", required: true, description: "Full session transcript" },
      { name: "moments_list", type: "artifact", required: false, description: "Existing moments list" },
    ],
    outputs: ["CHAPTER_MARKER"],
    estimatedTokens: "high",
    icon: "star",
    cooldownMs: 900000,
    requiresTranscript: true,
    minTranscriptLength: 500,
  },
  {
    actionId: "content_creator.generate_engagement_hook",
    label: "Engagement Hook",
    description: "Creates opening hooks for clips/posts",
    triggerType: "both",
    autoTriggerCondition: "When clip_worthiness > 0.7",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Clip content" },
      { name: "target_platform", type: "user_input", required: true, description: "Target platform for the hook" },
    ],
    outputs: ["SOCIAL_POST"],
    estimatedTokens: "low",
    icon: "zap",
  },
  {
    actionId: "content_creator.rate_clip_worthiness",
    label: "Rate Clip Worthiness",
    description: "Scores transcript segment for viral potential",
    triggerType: "auto",
    autoTriggerCondition: "When clip is created or moment is marked",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Segment to rate" },
    ],
    outputs: ["CHAPTER_MARKER"],
    estimatedTokens: "low",
    icon: "trending-up",
    cooldownMs: 15000,
    requiresTranscript: true,
  },
  {
    actionId: "content_creator.generate_thread",
    label: "Generate Thread",
    description: "Creates multi-post thread from content",
    triggerType: "manual",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Content to thread" },
      { name: "platform", type: "user_input", required: true, description: "Platform for thread" },
    ],
    outputs: ["SOCIAL_POST"],
    estimatedTokens: "medium",
    icon: "list",
  },
  {
    actionId: "content_creator.generate_cta",
    label: "Generate CTA",
    description: "Creates call-to-action text for posts",
    triggerType: "manual",
    inputs: [
      { name: "content_context", type: "context", required: true, description: "Context for the CTA" },
      { name: "goal", type: "user_input", required: true, description: "Goal of the CTA (subscribe, follow, etc.)" },
      { name: "platform", type: "user_input", required: true, description: "Target platform" },
    ],
    outputs: ["SOCIAL_POST"],
    estimatedTokens: "low",
    icon: "megaphone",
  },
  {
    actionId: "content_creator.generate_thumbnail_text",
    label: "Thumbnail Text",
    description: "Creates text overlay suggestions for thumbnails",
    triggerType: "manual",
    inputs: [
      { name: "clip_context", type: "context", required: true, description: "Clip context" },
      { name: "title", type: "artifact", required: false, description: "Clip title" },
    ],
    outputs: ["CLIP_TITLE"],
    estimatedTokens: "low",
    icon: "image",
  },
];

// ============================================================
// Common Cross-Workflow Actions
// ============================================================

export const COMMON_ACTIONS: AgentAction[] = [
  {
    actionId: "common.summarize_segment",
    label: "Summarize Segment",
    description: "Summarizes last N minutes",
    triggerType: "manual",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Segment to summarize" },
      { name: "duration", type: "user_input", required: false, description: "Duration to summarize (default: 5 min)" },
    ],
    outputs: ["EPISODE_META"],
    estimatedTokens: "medium",
    icon: "file-text",
    requiresTranscript: true,
  },
  {
    actionId: "common.extract_key_points",
    label: "Extract Key Points",
    description: "Pulls main points from discussion",
    triggerType: "both",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Segment to analyze" },
    ],
    outputs: ["ACTION_ITEM"],
    estimatedTokens: "medium",
    icon: "list-checks",
    requiresTranscript: true,
  },
  {
    actionId: "common.mark_timestamp",
    label: "Mark Timestamp",
    description: "Creates bookmark at current time",
    triggerType: "manual",
    inputs: [
      { name: "label", type: "user_input", required: true, description: "Label for the bookmark" },
      { name: "notes", type: "user_input", required: false, description: "Additional notes" },
    ],
    outputs: ["CHAPTER_MARKER"],
    estimatedTokens: "low",
    icon: "bookmark",
  },
];

// ============================================================
// Action State Management
// ============================================================

export interface ActionExecution {
  id: string;
  actionId: string;
  status: ActionStatus;
  startedAt: number;
  completedAt?: number;
  progress?: number;
  result?: ActionResult;
  error?: string;
}

export interface ContentCreatorActionState {
  executions: ActionExecution[];
  autoTriggerEnabled: Record<string, boolean>;
  cooldowns: Record<string, number>;
  clipTitles: ClipTitleResult[];
  socialPosts: SocialPostResult[];
  clipMoments: ClipMomentResult[];
}

// ============================================================
// Helper Functions
// ============================================================

export function getContentCreatorActions(): AgentAction[] {
  return [...CONTENT_CREATOR_ACTIONS, ...COMMON_ACTIONS];
}

export function getContentCreatorActionById(actionId: string): AgentAction | undefined {
  return getContentCreatorActions().find((a) => a.actionId === actionId);
}

export function getContentCreatorAutoActions(): AgentAction[] {
  return getContentCreatorActions().filter(
    (a) => a.triggerType === "auto" || a.triggerType === "both"
  );
}

export function getContentCreatorManualActions(): AgentAction[] {
  return getContentCreatorActions().filter(
    (a) => a.triggerType === "manual" || a.triggerType === "both"
  );
}

export function getActionsByOutput(
  actions: AgentAction[],
  outputCategory: OutputCategory
): AgentAction[] {
  return actions.filter((a) => a.outputs.includes(outputCategory));
}

// Token estimate ranges for display
export const TOKEN_ESTIMATE_RANGES = {
  low: { min: 100, max: 300, label: "Low" },
  medium: { min: 300, max: 800, label: "Medium" },
  high: { min: 800, max: 2000, label: "High" },
} as const;

// ============================================================================
// Script Studio Specific Types
// ============================================================================

export type PlotPointType =
  | "inciting_incident"
  | "first_plot_point"
  | "midpoint"
  | "second_plot_point"
  | "climax"
  | "resolution";

export type ActBreakType =
  | "act_1_start"
  | "act_1_end"
  | "act_2a_end"
  | "act_2b_end"
  | "act_3_start"
  | "act_3_end";

export type ScriptFormatType = "film" | "tv_hour" | "tv_half" | "theater_3act" | "theater_5act";

export interface PlotPointIndicator {
  id: string;
  type: PlotPointType;
  label: string;
  beatId?: string;
  pageNumber?: number;
  description: string;
}

export interface ActBreakIndicator {
  id: string;
  type: ActBreakType;
  label: string;
  pageNumber?: number;
  beatId?: string;
}

// ============================================================================
// Plot Point & Act Break Color Mappings
// ============================================================================

export const PLOT_POINT_COLORS: Record<
  PlotPointType,
  { bg: string; border: string; text: string; icon: string }
> = {
  inciting_incident: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    icon: "lightning",
  },
  first_plot_point: {
    bg: "bg-purple/10",
    border: "border-purple/30",
    text: "text-purple",
    icon: "arrow-turn",
  },
  midpoint: {
    bg: "bg-teal/10",
    border: "border-teal/30",
    text: "text-teal",
    icon: "scale",
  },
  second_plot_point: {
    bg: "bg-purple/10",
    border: "border-purple/30",
    text: "text-purple",
    icon: "arrow-turn",
  },
  climax: {
    bg: "bg-error/10",
    border: "border-error/30",
    text: "text-error",
    icon: "fire",
  },
  resolution: {
    bg: "bg-success/10",
    border: "border-success/30",
    text: "text-success",
    icon: "check-circle",
  },
};

export const PLOT_POINT_LABELS: Record<PlotPointType, string> = {
  inciting_incident: "Inciting Incident",
  first_plot_point: "Plot Point 1",
  midpoint: "Midpoint",
  second_plot_point: "Plot Point 2",
  climax: "Climax",
  resolution: "Resolution",
};

export const ACT_BREAK_LABELS: Record<ActBreakType, string> = {
  act_1_start: "Act I Begin",
  act_1_end: "Act I End",
  act_2a_end: "Act II-A End",
  act_2b_end: "Act II-B End",
  act_3_start: "Act III Begin",
  act_3_end: "Act III End",
};

// ============================================================================
// Script Studio Actions Definition
// ============================================================================

export const SCRIPT_STUDIO_ACTIONS: AgentAction[] = [
  {
    actionId: "script_studio.generate_slugline",
    label: "Generate Slugline",
    description: "Creates properly formatted scene heading (INT/EXT, LOCATION - TIME)",
    triggerType: "manual",
    inputs: [
      { name: "location_description", type: "user_input", required: true, description: "Description of the location" },
      { name: "time_of_day", type: "user_input", required: false, description: "Time of day (DAY, NIGHT, etc.)" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "low",
    icon: "scene-heading",
  },
  {
    actionId: "script_studio.analyze_scene_structure",
    label: "Analyze Scene",
    description: "Breaks down scene into setup, conflict, resolution",
    triggerType: "manual",
    inputs: [
      { name: "scene_text", type: "selection", required: true, description: "The scene to analyze" },
      { name: "context", type: "context", required: false, description: "Story context" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "high",
    icon: "analyze",
  },
  {
    actionId: "script_studio.polish_dialogue",
    label: "Polish Dialogue",
    description: "Refines dialogue for character voice and subtext",
    triggerType: "manual",
    inputs: [
      { name: "dialogue_text", type: "selection", required: true, description: "Dialogue to polish" },
      { name: "character_profile", type: "context", required: false, description: "Character information" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "medium",
    icon: "dialogue",
  },
  {
    actionId: "script_studio.check_character_voice",
    label: "Character Voice Check",
    description: "Verifies dialogue consistency with character",
    triggerType: "manual",
    inputs: [
      { name: "dialogue_text", type: "selection", required: true, description: "Dialogue to check" },
      { name: "character_bible", type: "context", required: false, description: "Character bible reference" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "medium",
    icon: "character",
  },
  {
    actionId: "script_studio.detect_plot_point",
    label: "Detect Plot Point",
    description: "Identifies major story turning points (inciting incident, midpoint, climax)",
    triggerType: "auto",
    autoTriggerCondition: "When major story event discussed",
    inputs: [
      { name: "transcript", type: "transcript", required: true, description: "Current discussion" },
      { name: "story_context", type: "context", required: false, description: "Story context" },
    ],
    outputs: ["BEAT"],
    estimatedTokens: "medium",
    icon: "plot-point",
    cooldownMs: 30000,
    requiresTranscript: true,
  },
  {
    actionId: "script_studio.suggest_act_break",
    label: "Suggest Act Break",
    description: "Proposes act break placement (3-act film, 5-act play)",
    triggerType: "both",
    inputs: [
      { name: "story_outline", type: "context", required: true, description: "Story outline or beats" },
      { name: "format_type", type: "user_input", required: false, description: "Film or theater format" },
    ],
    outputs: ["BEAT"],
    estimatedTokens: "medium",
    icon: "act-break",
  },
  {
    actionId: "script_studio.identify_conflict",
    label: "Identify Conflict",
    description: "Finds conflict/tension points in scenes",
    triggerType: "both",
    autoTriggerCondition: "When tension/obstacle language detected",
    inputs: [
      { name: "scene_text", type: "selection", required: true, description: "Scene to analyze" },
      { name: "characters", type: "context", required: false, description: "Characters involved" },
    ],
    outputs: ["BEAT"],
    estimatedTokens: "medium",
    icon: "conflict",
    cooldownMs: 30000,
  },
  {
    actionId: "script_studio.analyze_subtext",
    label: "Analyze Subtext",
    description: "Reveals underlying meaning in dialogue",
    triggerType: "manual",
    inputs: [
      { name: "dialogue_text", type: "selection", required: true, description: "Dialogue to analyze" },
      { name: "scene_context", type: "context", required: false, description: "Scene context" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "medium",
    icon: "subtext",
  },
  {
    actionId: "script_studio.generate_action_line",
    label: "Generate Action Line",
    description: "Creates visual action description (show don't tell)",
    triggerType: "manual",
    inputs: [
      { name: "action_description", type: "user_input", required: true, description: "What happens in the scene" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "low",
    icon: "action-line",
  },
  {
    actionId: "script_studio.suggest_transition",
    label: "Suggest Transition",
    description: "Proposes scene transition (CUT TO, FADE, DISSOLVE)",
    triggerType: "manual",
    inputs: [
      { name: "from_scene", type: "context", required: true, description: "Current scene context" },
      { name: "to_scene", type: "context", required: false, description: "Next scene context" },
      { name: "tone", type: "user_input", required: false, description: "Desired emotional tone" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "low",
    icon: "transition",
  },
  {
    actionId: "script_studio.track_character_arc",
    label: "Track Character Arc",
    description: "Monitors character transformation through story",
    triggerType: "both",
    inputs: [
      { name: "character", type: "context", required: true, description: "Character to track" },
      { name: "scenes_list", type: "context", required: false, description: "List of scenes" },
    ],
    outputs: ["BEAT"],
    estimatedTokens: "medium",
    icon: "arc",
  },
  {
    actionId: "script_studio.detect_montage",
    label: "Detect Montage",
    description: "Identifies montage sequence opportunities",
    triggerType: "auto",
    autoTriggerCondition: "When sequence/passage of time discussed",
    inputs: [
      { name: "transcript_segment", type: "transcript", required: true, description: "Recent discussion" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "low",
    icon: "montage",
    cooldownMs: 60000,
    requiresTranscript: true,
  },
  {
    actionId: "script_studio.generate_stage_direction",
    label: "Stage Direction (Theater)",
    description: "Creates blocking and stage direction notes",
    triggerType: "manual",
    inputs: [
      { name: "action_context", type: "user_input", required: true, description: "What needs to happen on stage" },
      { name: "stage_layout", type: "context", required: false, description: "Stage configuration" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "medium",
    icon: "stage",
  },
  {
    actionId: "script_studio.estimate_page_timing",
    label: "Estimate Timing",
    description: "Calculates approximate runtime (1 page = 1 min)",
    triggerType: "manual",
    inputs: [
      { name: "scene_pages", type: "context", required: true, description: "Page count" },
      { name: "action_density", type: "context", required: false, description: "Amount of action vs. dialogue" },
    ],
    outputs: ["SCRIPT_INSERT"],
    estimatedTokens: "low",
    icon: "timer",
  },
  {
    actionId: "script_studio.check_format_compliance",
    label: "Check Format",
    description: "Verifies script follows industry format standards",
    triggerType: "manual",
    inputs: [
      { name: "script_segment", type: "selection", required: true, description: "Script to check" },
      { name: "format_type", type: "user_input", required: false, description: "Film, TV, or theater format" },
    ],
    outputs: ["ACTION_ITEM"],
    estimatedTokens: "medium",
    icon: "format-check",
  },
];

// ============================================================================
// Script Studio Helper Functions
// ============================================================================

export function getScriptStudioActions(): AgentAction[] {
  return [...SCRIPT_STUDIO_ACTIONS, ...COMMON_ACTIONS];
}

export function getScriptStudioActionById(actionId: string): AgentAction | undefined {
  return getScriptStudioActions().find((a) => a.actionId === actionId);
}

export function getScriptStudioAutoActions(): AgentAction[] {
  return getScriptStudioActions().filter(
    (a) => a.triggerType === "auto" || a.triggerType === "both"
  );
}

export function getScriptStudioManualActions(): AgentAction[] {
  return getScriptStudioActions().filter(
    (a) => a.triggerType === "manual" || a.triggerType === "both"
  );
}

// Calculate estimated runtime from page count (1 page = 1 minute)
export function calculateRuntime(pageCount: number): string {
  const hours = Math.floor(pageCount / 60);
  const minutes = pageCount % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

// Get expected page ranges for standard format types
export const SCRIPT_FORMAT_PAGE_RANGES: Record<ScriptFormatType, { min: number; max: number; label: string }> = {
  film: { min: 90, max: 120, label: "Feature Film (90-120 pages)" },
  tv_hour: { min: 45, max: 60, label: "TV Hour (45-60 pages)" },
  tv_half: { min: 22, max: 30, label: "TV Half-Hour (22-30 pages)" },
  theater_3act: { min: 80, max: 120, label: "Theater 3-Act (80-120 pages)" },
  theater_5act: { min: 100, max: 150, label: "Theater 5-Act (100-150 pages)" },
};

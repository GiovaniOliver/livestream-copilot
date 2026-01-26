// ============================================================================
// Writers Corner - TypeScript Interfaces and Types
// Author/Novelist workflow for FluxBoard web app
// ============================================================================

// ============================================================================
// AI Action Types
// ============================================================================

export type WritersCornerActionId =
  | "writers_corner.summarize_chapter"
  | "writers_corner.capture_character_note"
  | "writers_corner.track_plot_thread"
  | "writers_corner.capture_worldbuilding"
  | "writers_corner.attribute_dialogue"
  | "writers_corner.identify_theme"
  | "writers_corner.check_continuity"
  | "writers_corner.generate_character_sheet"
  | "writers_corner.track_timeline"
  | "writers_corner.suggest_foreshadowing"
  | "writers_corner.log_open_loop";

export type ActionTriggerType = "manual" | "auto" | "both";
export type ActionStatus = "idle" | "queued" | "processing" | "success" | "failed" | "cancelled";
export type TokenLevel = "low" | "medium" | "high";

export interface ActionInput {
  name: string;
  type: "transcript" | "context" | "selection" | "artifact" | "user_input";
  required: boolean;
  description: string;
}

export interface AgentAction {
  actionId: WritersCornerActionId;
  label: string;
  description: string;
  triggerType: ActionTriggerType;
  autoTriggerCondition?: string;
  inputs: ActionInput[];
  outputs: OutputCategory[];
  estimatedTokens: TokenLevel;
  icon: string;
  cooldownMs?: number;
  requiresTranscript?: boolean;
  minTranscriptLength?: number;
}

export interface ActionState {
  actionId: WritersCornerActionId;
  status: ActionStatus;
  progress?: number;
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// Output Categories
// ============================================================================

export type OutputCategory =
  | "BEAT"
  | "QUOTE"
  | "SCRIPT_INSERT"
  | "ACTION_ITEM"
  | "CHAPTER_MARKER"
  | "CHARACTER_NOTE"
  | "PLOT_THREAD"
  | "WORLDBUILDING_DETAIL"
  | "THEME"
  | "TIMELINE_EVENT"
  | "CONTINUITY_WARNING"
  | "FORESHADOWING_SUGGESTION"
  | "OPEN_LOOP";

// ============================================================================
// Chapter Types
// ============================================================================

export type ChapterStatus = "outline" | "draft" | "revision" | "complete";

export interface ChapterSummary {
  id: string;
  chapterId: string;
  content: string;
  wordCount: number;
  keyEvents: string[];
  charactersInvolved: string[];
  generatedAt: Date;
  aiGenerated: boolean;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  status: ChapterStatus;
  wordCount: number;
  summary?: ChapterSummary;
  plotThreadIds: string[];
  timelineEventIds: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Character Types
// ============================================================================

export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "minor" | "mentioned";

export interface CharacterNote {
  id: string;
  characterId: string;
  content: string;
  category: "appearance" | "personality" | "backstory" | "motivation" | "arc" | "relationship" | "dialogue_style" | "other";
  chapterReference?: string;
  aiGenerated: boolean;
  createdAt: Date;
}

export interface CharacterSheet {
  id: string;
  name: string;
  aliases?: string[];
  role: CharacterRole;
  description: string;
  appearance?: string;
  personality?: string;
  backstory?: string;
  motivations?: string[];
  relationships: CharacterRelationship[];
  notes: CharacterNote[];
  firstAppearanceChapter?: number;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterRelationship {
  characterId: string;
  relationType: string;
  description: string;
}

// ============================================================================
// Plot Thread Types
// ============================================================================

export type PlotThreadStatus = "active" | "dormant" | "resolved" | "abandoned";
export type PlotThreadPriority = "main" | "major" | "minor" | "subplot";

export interface PlotThread {
  id: string;
  title: string;
  description: string;
  status: PlotThreadStatus;
  priority: PlotThreadPriority;
  introducedChapter: number;
  resolvedChapter?: number;
  relatedCharacterIds: string[];
  relatedThemeIds: string[];
  events: PlotEvent[];
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlotEvent {
  id: string;
  chapterNumber: number;
  description: string;
  significance: "setup" | "development" | "twist" | "climax" | "resolution";
}

// ============================================================================
// Worldbuilding Types
// ============================================================================

export type WorldbuildingCategory =
  | "geography"
  | "culture"
  | "history"
  | "magic_system"
  | "technology"
  | "politics"
  | "religion"
  | "economy"
  | "language"
  | "flora_fauna"
  | "other";

export interface WorldbuildingDetail {
  id: string;
  category: WorldbuildingCategory;
  title: string;
  content: string;
  chapterReferences: number[];
  relatedDetails: string[];
  tags: string[];
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Theme Types
// ============================================================================

export interface Theme {
  id: string;
  name: string;
  description: string;
  instances: ThemeInstance[];
  relatedPlotThreadIds: string[];
  createdAt: Date;
}

export interface ThemeInstance {
  id: string;
  chapterNumber: number;
  quote?: string;
  description: string;
  aiGenerated: boolean;
}

// ============================================================================
// Timeline Types
// ============================================================================

export type TimelineEventType = "story" | "backstory" | "flashback" | "flash_forward";

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  eventType: TimelineEventType;
  storyDate?: string;
  chapterNumber: number;
  charactersInvolved: string[];
  plotThreadIds: string[];
  order: number;
  aiGenerated: boolean;
  createdAt: Date;
}

// ============================================================================
// Continuity Types
// ============================================================================

export type ContinuitySeverity = "error" | "warning" | "info";

export interface ContinuityWarning {
  id: string;
  severity: ContinuitySeverity;
  title: string;
  description: string;
  chapterReferences: number[];
  characterIds?: string[];
  plotThreadIds?: string[];
  suggestedFix?: string;
  isResolved: boolean;
  aiGenerated: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

// ============================================================================
// Open Loop Types
// ============================================================================

export type OpenLoopPriority = "critical" | "important" | "normal" | "low";

export interface OpenLoop {
  id: string;
  title: string;
  description: string;
  priority: OpenLoopPriority;
  introducedChapter: number;
  resolvedChapter?: number;
  relatedCharacterIds: string[];
  relatedPlotThreadIds: string[];
  isResolved: boolean;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Foreshadowing Types
// ============================================================================

export interface ForeshadowingSuggestion {
  id: string;
  description: string;
  targetPayoff: string;
  suggestedChapter?: number;
  relatedPlotThreadId?: string;
  relatedCharacterId?: string;
  isImplemented: boolean;
  aiGenerated: boolean;
  createdAt: Date;
}

// ============================================================================
// Dialogue Attribution Types
// ============================================================================

export interface DialogueAttribution {
  id: string;
  dialogueText: string;
  characterId: string;
  chapterNumber: number;
  context?: string;
  aiGenerated: boolean;
  createdAt: Date;
}

// ============================================================================
// Manuscript Document
// ============================================================================

export interface ManuscriptDocument {
  id: string;
  title: string;
  subtitle?: string;
  genre?: string;
  targetWordCount?: number;
  currentWordCount: number;
  chapters: Chapter[];
  characters: CharacterSheet[];
  plotThreads: PlotThread[];
  worldbuildingDetails: WorldbuildingDetail[];
  themes: Theme[];
  timelineEvents: TimelineEvent[];
  continuityWarnings: ContinuityWarning[];
  openLoops: OpenLoop[];
  foreshadowingSuggestions: ForeshadowingSuggestion[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Component Props
// ============================================================================

export interface WritersCornerDashboardProps {
  sessionId?: string;
  manuscript?: ManuscriptDocument;
  onSave?: (manuscript: ManuscriptDocument) => void;
}

export interface ActionPanelProps {
  actions: AgentAction[];
  actionStates: Record<string, ActionState>;
  onTriggerAction: (actionId: WritersCornerActionId, inputs?: Record<string, unknown>) => void;
  onCancelAction: (actionId: WritersCornerActionId) => void;
  isTranscriptAvailable: boolean;
}

export interface ChapterOutlinePanelProps {
  chapters: Chapter[];
  onChapterUpdate?: (chapter: Chapter) => void;
  onChapterAdd?: (chapter: Omit<Chapter, "id" | "createdAt" | "updatedAt">) => void;
  onChapterDelete?: (chapterId: string) => void;
  onSummarizeChapter?: (chapterId: string) => void;
}

export interface CharacterNotesPanelProps {
  characters: CharacterSheet[];
  onCharacterUpdate?: (character: CharacterSheet) => void;
  onCharacterAdd?: (character: Omit<CharacterSheet, "id" | "createdAt" | "updatedAt">) => void;
  onCharacterDelete?: (characterId: string) => void;
  onGenerateSheet?: (characterId: string) => void;
  onCaptureNote?: (characterId: string, content: string) => void;
}

export interface PlotThreadsTrackerProps {
  plotThreads: PlotThread[];
  chapters: Chapter[];
  onPlotThreadUpdate?: (thread: PlotThread) => void;
  onPlotThreadAdd?: (thread: Omit<PlotThread, "id" | "createdAt" | "updatedAt">) => void;
  onPlotThreadDelete?: (threadId: string) => void;
}

export interface WorldbuildingPanelProps {
  details: WorldbuildingDetail[];
  onDetailUpdate?: (detail: WorldbuildingDetail) => void;
  onDetailAdd?: (detail: Omit<WorldbuildingDetail, "id" | "createdAt" | "updatedAt">) => void;
  onDetailDelete?: (detailId: string) => void;
  onCaptureWorldbuilding?: () => void;
}

export interface OpenLoopsPanelProps {
  openLoops: OpenLoop[];
  onLoopUpdate?: (loop: OpenLoop) => void;
  onLoopAdd?: (loop: Omit<OpenLoop, "id" | "createdAt" | "updatedAt">) => void;
  onLoopResolve?: (loopId: string, resolvedChapter: number) => void;
  onLoopDelete?: (loopId: string) => void;
}

export interface StoryTimelineProps {
  events: TimelineEvent[];
  chapters: Chapter[];
  onEventUpdate?: (event: TimelineEvent) => void;
  onEventAdd?: (event: Omit<TimelineEvent, "id" | "createdAt">) => void;
  onEventDelete?: (eventId: string) => void;
}

export interface ContinuityWarningsProps {
  warnings: ContinuityWarning[];
  onWarningResolve?: (warningId: string) => void;
  onWarningDismiss?: (warningId: string) => void;
  onCheckContinuity?: () => void;
}

// ============================================================================
// Color Mappings
// ============================================================================

export const CHAPTER_STATUS_COLORS: Record<ChapterStatus, { bg: string; border: string; text: string }> = {
  outline: {
    bg: "bg-text-muted/10",
    border: "border-text-muted/30",
    text: "text-text-muted",
  },
  draft: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
  },
  revision: {
    bg: "bg-purple/10",
    border: "border-purple/30",
    text: "text-purple",
  },
  complete: {
    bg: "bg-success/10",
    border: "border-success/30",
    text: "text-success",
  },
};

export const PLOT_THREAD_STATUS_COLORS: Record<PlotThreadStatus, { bg: string; border: string; text: string }> = {
  active: {
    bg: "bg-teal/10",
    border: "border-teal/30",
    text: "text-teal",
  },
  dormant: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
  },
  resolved: {
    bg: "bg-success/10",
    border: "border-success/30",
    text: "text-success",
  },
  abandoned: {
    bg: "bg-text-muted/10",
    border: "border-text-muted/30",
    text: "text-text-muted",
  },
};

export const PRIORITY_COLORS: Record<OpenLoopPriority, { bg: string; border: string; text: string }> = {
  critical: {
    bg: "bg-error/10",
    border: "border-error/30",
    text: "text-error",
  },
  important: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
  },
  normal: {
    bg: "bg-teal/10",
    border: "border-teal/30",
    text: "text-teal",
  },
  low: {
    bg: "bg-text-muted/10",
    border: "border-text-muted/30",
    text: "text-text-muted",
  },
};

export const CONTINUITY_SEVERITY_COLORS: Record<ContinuitySeverity, { bg: string; border: string; text: string; icon: string }> = {
  error: {
    bg: "bg-error/10",
    border: "border-error/30",
    text: "text-error",
    icon: "text-error",
  },
  warning: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    icon: "text-warning",
  },
  info: {
    bg: "bg-teal/10",
    border: "border-teal/30",
    text: "text-teal",
    icon: "text-teal",
  },
};

export const WORLDBUILDING_CATEGORY_LABELS: Record<WorldbuildingCategory, string> = {
  geography: "Geography",
  culture: "Culture",
  history: "History",
  magic_system: "Magic System",
  technology: "Technology",
  politics: "Politics",
  religion: "Religion",
  economy: "Economy",
  language: "Language",
  flora_fauna: "Flora & Fauna",
  other: "Other",
};

export const CHARACTER_ROLE_LABELS: Record<CharacterRole, string> = {
  protagonist: "Protagonist",
  antagonist: "Antagonist",
  supporting: "Supporting",
  minor: "Minor",
  mentioned: "Mentioned",
};

// ============================================================================
// Script Studio - TypeScript Interfaces and Types
// Writers Room workflow for FluxBoard web app
// ============================================================================

// ============================================================================
// Script Elements
// ============================================================================

export type ScriptElementType =
  | "scene-heading"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition";

export interface ScriptElement {
  id: string;
  type: ScriptElementType;
  content: string;
  speakerLabel?: string;
  isInsert?: boolean;
  insertStatus?: "pending" | "accepted" | "rejected";
  proposedBy?: string;
  timestamp?: Date;
}

export interface ScriptInsertData {
  id: string;
  elements: ScriptElement[];
  proposedBy: string;
  proposedAt: Date;
  status: "pending" | "accepted" | "rejected";
  reason?: string;
}

// ============================================================================
// Beat Board
// ============================================================================

export type ActNumber = 1 | 2 | 3;

export type BeatStatus = "draft" | "in-progress" | "complete" | "cut";

export interface Beat {
  id: string;
  title: string;
  summary: string;
  act: ActNumber;
  order: number;
  status: BeatStatus;
  sceneNumber?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BeatColumn {
  id: string;
  title: string;
  act: ActNumber;
  beats: Beat[];
}

// ============================================================================
// Notes Stack
// ============================================================================

export type NoteCategory = "open-loop" | "character" | "attribution" | "general";

export type NotePriority = "low" | "medium" | "high" | "urgent";

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  priority: NotePriority;
  proposedBy: string;
  assignedTo?: string;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  relatedBeatId?: string;
  relatedSceneId?: string;
  tags?: string[];
}

// ============================================================================
// Contributors / Attribution
// ============================================================================

export interface Contributor {
  id: string;
  name: string;
  avatarUrl?: string;
  role: "writer" | "editor" | "producer" | "director" | "ai-assistant";
  color: string;
}

// ============================================================================
// Script Document
// ============================================================================

export interface ScriptDocument {
  id: string;
  title: string;
  subtitle?: string;
  version: string;
  elements: ScriptElement[];
  beats: Beat[];
  notes: Note[];
  contributors: Contributor[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Component Props
// ============================================================================

export interface ScriptStudioProps {
  documentId?: string;
  initialDocument?: ScriptDocument;
  onSave?: (document: ScriptDocument) => void;
}

export interface ScriptPageProps {
  elements: ScriptElement[];
  onElementUpdate?: (element: ScriptElement) => void;
  onInsertAccept?: (insertId: string) => void;
  onInsertReject?: (insertId: string) => void;
}

export interface BeatBoardProps {
  beats: Beat[];
  onBeatReorder?: (beatId: string, newOrder: number, newAct?: ActNumber) => void;
  onBeatUpdate?: (beat: Beat) => void;
  onBeatAdd?: (beat: Omit<Beat, "id" | "createdAt" | "updatedAt">) => void;
  onBeatDelete?: (beatId: string) => void;
}

export interface NotesStackProps {
  notes: Note[];
  contributors: Contributor[];
  onNoteUpdate?: (note: Note) => void;
  onNoteAdd?: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  onNoteResolve?: (noteId: string) => void;
  onNoteDelete?: (noteId: string) => void;
}

export interface ScriptInsertProps {
  insert: ScriptInsertData;
  contributor?: Contributor;
  onAccept: (insertId: string) => void;
  onReject: (insertId: string) => void;
}

export interface BeatCardProps {
  beat: Beat;
  isDragging?: boolean;
  onEdit?: (beat: Beat) => void;
  onDelete?: (beatId: string) => void;
}

export interface NoteCardProps {
  note: Note;
  contributor?: Contributor;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onResolve?: (noteId: string) => void;
  onEdit?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
}

// ============================================================================
// Act Color Mapping
// ============================================================================

export const ACT_COLORS: Record<ActNumber, { bg: string; border: string; text: string }> = {
  1: {
    bg: "bg-purple/10",
    border: "border-purple/30",
    text: "text-purple",
  },
  2: {
    bg: "bg-teal/10",
    border: "border-teal/30",
    text: "text-teal",
  },
  3: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
  },
};

// ============================================================================
// Priority Color Mapping
// ============================================================================

export const PRIORITY_COLORS: Record<NotePriority, { bg: string; border: string; text: string }> = {
  low: {
    bg: "bg-text-muted/10",
    border: "border-text-muted/30",
    text: "text-text-muted",
  },
  medium: {
    bg: "bg-teal/10",
    border: "border-teal/30",
    text: "text-teal",
  },
  high: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
  },
  urgent: {
    bg: "bg-error/10",
    border: "border-error/30",
    text: "text-error",
  },
};

// ============================================================================
// Category Labels
// ============================================================================

export const CATEGORY_LABELS: Record<NoteCategory, string> = {
  "open-loop": "Open Loop",
  character: "Character Note",
  attribution: "Attribution",
  general: "General",
};

// ============================================================================
// Script Studio - Writers Room Dashboard
// Barrel export for all components
// ============================================================================

// Main dashboard
export { ScriptStudio } from "./ScriptStudio";

// Panel components
export { ScriptPage } from "./ScriptPage";
export { BeatBoard } from "./BeatBoard";
export { NotesStack } from "./NotesStack";

// Card components
export { ScriptInsert } from "./ScriptInsert";
export { BeatCard } from "./BeatCard";
export { NoteCard } from "./NoteCard";

// Types and interfaces
export type {
  // Script elements
  ScriptElementType,
  ScriptElement,
  ScriptInsertData,
  // Beats
  ActNumber,
  BeatStatus,
  Beat,
  BeatColumn,
  // Notes
  NoteCategory,
  NotePriority,
  Note,
  // Contributors
  Contributor,
  // Document
  ScriptDocument,
  // Component props
  ScriptStudioProps,
  ScriptPageProps,
  BeatBoardProps,
  NotesStackProps,
  ScriptInsertProps,
  BeatCardProps,
  NoteCardProps,
} from "./types";

// Constants
export { ACT_COLORS, PRIORITY_COLORS, CATEGORY_LABELS } from "./types";

// Mock data (for development/testing)
export {
  MOCK_CONTRIBUTORS,
  MOCK_SCRIPT_ELEMENTS,
  MOCK_INSERTS,
  MOCK_BEATS,
  MOCK_NOTES,
  MOCK_SCRIPT_DOCUMENT,
} from "./mockData";

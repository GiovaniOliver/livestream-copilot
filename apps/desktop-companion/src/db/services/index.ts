/**
 * Database Services Index
 *
 * Central export point for all database service modules.
 * Each service provides CRUD operations and business logic for its respective entity.
 */

// Session service - livestream capture sessions
export * as SessionService from "./session.service.js";
export type {
  CreateSessionInput,
  UpdateSessionInput,
  SessionWithCounts,
} from "./session.service.js";

// Event service - timestamped session events
export * as EventService from "./event.service.js";
export type { CreateEventInput, EventFilters } from "./event.service.js";

// Output service - generated content (drafts, titles, etc.)
export * as OutputService from "./output.service.js";
export type {
  CreateOutputInput,
  UpdateOutputInput,
  OutputFilters,
  OutputStatus,
} from "./output.service.js";

// Clip service - video clip segments
export * as ClipService from "./clip.service.js";
export type {
  CreateClipInput,
  UpdateClipInput,
  ClipFilters,
  ClipWithDuration,
} from "./clip.service.js";

// Export service - social media exports
export * as ExportService from "./export.service.js";
export type {
  CreateExportInput,
  UpdateExportInput,
  ExportFilters,
  ExportWithRelations,
  ExportStats,
} from "./export.service.js";

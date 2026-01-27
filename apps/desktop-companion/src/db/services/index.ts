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

// Trigger config service - auto-trigger configurations
export * as TriggerConfigService from "./trigger-config.service.js";
export type {
  TriggerConfig,
  AudioTrigger,
  VisualTrigger,
  CreateTriggerConfigInput,
  UpdateTriggerConfigInput,
} from "./trigger-config.service.js";

// Reference image service - visual trigger reference images
export * as ReferenceImageService from "./reference-image.service.js";
export type {
  ReferenceImage,
  CreateReferenceImageInput,
  UpdateReferenceImageInput,
  ReferenceImageFilters,
} from "./reference-image.service.js";

// Clip queue service - clip processing queue
export * as ClipQueueService from "./clip-queue.service.js";
export type {
  ClipQueueItem,
  ClipQueueItemWithDuration,
  ClipQueueStatus,
  TriggerType,
  CreateClipQueueItemInput,
  UpdateClipQueueItemInput,
  ClipQueueFilters,
} from "./clip-queue.service.js";

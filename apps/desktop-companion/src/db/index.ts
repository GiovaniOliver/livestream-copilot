/**
 * Database Module Exports
 *
 * Central export point for all database-related functionality.
 */

export { prisma, disconnectPrisma, checkDatabaseHealth } from "./prisma.js";

// Re-export Prisma types for convenient access
export type {
  Session,
  Event,
  Output,
  Clip,
} from "../generated/prisma/client.js";

export { Prisma } from "../generated/prisma/client.js";

// Export all database services
export {
  SessionService,
  EventService,
  OutputService,
  ClipService,
  TriggerConfigService,
  ReferenceImageService,
  ClipQueueService,
} from "./services/index.js";

// Re-export service types
export type {
  CreateSessionInput,
  UpdateSessionInput,
  SessionWithCounts,
  CreateEventInput,
  EventFilters,
  CreateOutputInput,
  UpdateOutputInput,
  OutputFilters,
  OutputStatus,
  CreateClipInput,
  UpdateClipInput,
  ClipFilters,
  ClipWithDuration,
  TriggerConfig,
  AudioTrigger,
  VisualTrigger,
  CreateTriggerConfigInput,
  UpdateTriggerConfigInput,
  ReferenceImage,
  CreateReferenceImageInput,
  UpdateReferenceImageInput,
  ReferenceImageFilters,
  ClipQueueItem,
  ClipQueueItemWithDuration,
  ClipQueueStatus,
  TriggerType,
  CreateClipQueueItemInput,
  UpdateClipQueueItemInput,
  ClipQueueFilters,
} from "./services/index.js";

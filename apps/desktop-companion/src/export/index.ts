/**
 * Export Module
 *
 * Central export point for social media export functionality.
 * Provides routes, services, and utilities for exporting content
 * to various social media platforms with platform-specific optimizations.
 */

// Routes
export { exportRouter, createExportRouter } from './routes.js';

// Service functions
export {
  exportPost,
  exportClip,
  exportBatch,
  getExportHistory,
  getExportStats,
  deleteExport,
  previewPost,
  formatForMultiplePlatforms,
  ExportError,
} from './service.js';

// Formatters
export {
  formatForPlatform,
  splitIntoThread,
  optimizeHashtags,
} from './formatters.js';

// Video converter
export {
  convertVideo,
  optimizeForPlatform,
  batchConvertVideo,
  getVideoInfo,
  VideoConversionError,
} from './video-converter.js';

// Branding service
export {
  applyBranding,
  previewBranding,
  validateBrandingConfig,
  BrandingError,
} from './branding-service.js';

// Branding types
export type {
  OverlayPosition,
  LogoOverlay,
  BrandClip,
  LowerThird,
  TextOverlay,
  BrandingConfig,
  BrandingPreset,
  BrandedExportRequest,
  BrandingJobStatus,
  BrandingJob,
} from './branding-types.js';

export {
  getPositionCoordinates,
  DEFAULT_BRANDING_CONFIG,
} from './branding-types.js';

// Types
export type {
  ExportType,
  ExportStatus,
  SocialPlatform,
  ExportFormat,
  PlatformConstraints,
  ExportPostRequest,
  ExportClipRequest,
  ExportBatchRequest,
  FormattedPost,
  ExportResult,
  FormatOptions,
  ThreadSplitOptions,
  VideoConversionOptions,
} from './types.js';

export { PLATFORM_CONSTRAINTS } from './types.js';

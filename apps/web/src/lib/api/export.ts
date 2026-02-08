/**
 * Export API methods for FluxBoard
 *
 * Handles video/content export operations including:
 * - Starting export jobs
 * - Polling for export progress
 * - Retrieving download URLs
 */

import { apiClient } from "./client";
import type {
  SocialPlatform,
  ExportFormatOptions,
} from "@/components/export/types";
import { logger } from "@/lib/logger";

// ============================================================
// API Request/Response Types
// ============================================================

/**
 * Backend platform enum values (uppercase)
 * Maps frontend lowercase platform IDs to backend UPPERCASE enum values
 */
const PLATFORM_API_MAP: Record<SocialPlatform, string> = {
  x: "TWITTER",
  linkedin: "LINKEDIN",
  instagram: "INSTAGRAM",
  tiktok: "TIKTOK",
  youtube: "YOUTUBE",
} as const;

/**
 * Backend format enum values (uppercase)
 */
const FORMAT_API_MAP: Record<string, string> = {
  mp4: "MP4",
  mov: "MOV",
  webm: "WEBM",
} as const;

/**
 * Transform frontend platform ID to backend API enum value
 */
function toApiPlatform(platform: SocialPlatform): string {
  return PLATFORM_API_MAP[platform] || platform.toUpperCase();
}

/**
 * Transform frontend format to backend API enum value
 */
function toApiFormat(format: string): string {
  return FORMAT_API_MAP[format.toLowerCase()] || format.toUpperCase();
}

/**
 * Request body for starting an export job
 */
export interface StartExportRequest {
  sessionId: string;
  contentId?: string;
  clipId?: string;
  platforms: SocialPlatform[];
  caption?: string;
  hashtags?: string[];
  formatOptions: ExportFormatOptions;
  customFilename?: string;
}

/**
 * Backend API request format (with transformed enums)
 */
interface ApiExportClipRequest {
  clipId: string;
  format: string; // "MP4" | "WEBM" | "MOV"
  platform?: string; // "TWITTER" | "LINKEDIN" | etc.
  options?: {
    quality?: "low" | "medium" | "high" | "original";
    generateThumbnail?: boolean;
    addWatermark?: boolean;
    optimizeForPlatform?: boolean;
    targetAspectRatio?: string;
  };
}

/**
 * Backend API request format for posts
 */
interface ApiExportPostRequest {
  text: string;
  platform: string; // "TWITTER" | "LINKEDIN" | etc.
  sessionId?: string;
  clipId?: string;
  options?: {
    copyToClipboard?: boolean;
    saveToFile?: boolean;
    optimizeHashtags?: boolean;
    addTimestamps?: boolean;
    createThread?: boolean;
  };
}

/**
 * Response from starting an export job
 */
export interface StartExportResponse {
  exportId: string;
  status: ExportJobStatus;
  createdAt: string;
}

/**
 * Export job status enum
 */
export type ExportJobStatus =
  | "pending"
  | "preparing"
  | "processing"
  | "encoding"
  | "completed"
  | "failed";

/**
 * Export status response from the API
 */
export interface ExportStatusResponse {
  exportId: string;
  status: ExportJobStatus;
  progress: number; // 0-100
  message?: string;
  error?: string;
  downloadUrl?: string;
  filename?: string;
  fileSize?: number;
  completedAt?: string;
}

/**
 * Download URL response
 */
export interface ExportDownloadResponse {
  downloadUrl: string;
  filename: string;
  fileSize: number;
  expiresAt?: string;
}

/**
 * Standard response shape from the export API endpoints
 */
interface ExportApiResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    createdAt?: string;
    progress?: number;
    filePath?: string;
    fileSize?: number;
    completedAt?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  };
}

// ============================================================
// API Methods
// ============================================================

/**
 * Start a new export job
 *
 * @param sessionId - The session ID containing the content to export
 * @param options - Export configuration options
 * @returns The export job ID and initial status
 *
 * @example
 * ```ts
 * const { exportId } = await startExport("session-123", {
 *   platforms: ["youtube", "tiktok"],
 *   formatOptions: { format: "mp4", quality: "1080p", aspectRatio: "9:16" },
 * });
 * ```
 */
export async function startExport(
  contentId: string,
  options: Omit<StartExportRequest, "sessionId" | "contentId">
): Promise<StartExportResponse> {
  const { platforms, caption, hashtags, formatOptions, customFilename } = options;

  // TODO: Implement post export support when content type detection is added.
  // Currently only clip exports are supported.

  // Prepare clip export request with enum transformations
  const apiRequest: ApiExportClipRequest = {
    clipId: contentId,
    format: toApiFormat(formatOptions.format),
    platform: platforms.length > 0 ? toApiPlatform(platforms[0]) : undefined,
    options: {
      quality: formatOptions.quality === "1080p" ? "high" :
               formatOptions.quality === "720p" ? "medium" : "high",
      generateThumbnail: true,
      addWatermark: formatOptions.includeWatermark,
      optimizeForPlatform: true,
      targetAspectRatio: formatOptions.aspectRatio,
    },
  };

  logger.debug("[export API] Sending clip export request:", apiRequest);

  // Call backend clip export endpoint
  const response = await apiClient.post<ExportApiResponse>(
    "/api/export/clip",
    apiRequest
  );

  // Transform response to match expected format
  return {
    exportId: response.data.id,
    status: mapBackendStatus(response.data.status),
    createdAt: response.data.createdAt || new Date().toISOString(),
  };
}

/**
 * Map backend status enum to frontend status type
 */
function mapBackendStatus(status: string): ExportJobStatus {
  const statusMap: Record<string, ExportJobStatus> = {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
  };
  return statusMap[status] || "pending";
}

/**
 * Get the current status and progress of an export job
 *
 * @param exportId - The export job ID returned from startExport
 * @returns Current status, progress percentage, and optional download URL if completed
 *
 * @example
 * ```ts
 * const status = await getExportStatus("export-456");
 * if (status.status === "completed") {
 *   logger.debug("Download URL:", status.downloadUrl);
 * }
 * ```
 */
export async function getExportStatus(
  exportId: string
): Promise<ExportStatusResponse> {
  const response = await apiClient.get<ExportApiResponse>(
    `/api/export/${exportId}/status`
  );

  const data = response.data;

  // Calculate progress based on status
  let progress = 0;
  const status = mapBackendStatus(data.status);

  if (status === "completed") {
    progress = 100;
  } else if (status === "processing" || status === "encoding") {
    progress = data.progress || 50;
  } else if (status === "preparing") {
    progress = 25;
  }

  return {
    exportId: data.id,
    status,
    progress,
    message: data.metadata?.message as string | undefined,
    error: data.errorMessage,
    downloadUrl: data.filePath ? `/api/export/${exportId}/download` : undefined,
    filename: data.filePath ? data.filePath.split("/").pop() : undefined,
    fileSize: data.fileSize != null ? Number(data.fileSize) : undefined,
    completedAt: data.completedAt,
  };
}

/**
 * Get the download URL for a completed export
 *
 * @param exportId - The export job ID
 * @returns Download URL, filename, and file size
 * @throws ApiError if the export is not completed or has failed
 *
 * @example
 * ```ts
 * const { downloadUrl, filename } = await getExportDownloadUrl("export-456");
 * window.open(downloadUrl, "_blank");
 * ```
 */
export async function getExportDownloadUrl(
  exportId: string
): Promise<ExportDownloadResponse> {
  // Get export status first to validate completion
  const status = await getExportStatus(exportId);

  if (status.status !== "completed") {
    throw new Error("Export is not ready for download");
  }

  if (!status.downloadUrl) {
    throw new Error("Download URL not available");
  }

  return {
    downloadUrl: status.downloadUrl,
    filename: status.filename || "export.mp4",
    fileSize: status.fileSize || 0,
  };
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Map API status to user-friendly message
 */
export function getStatusMessage(status: ExportJobStatus): string {
  const messages: Record<ExportJobStatus, string> = {
    pending: "Export queued...",
    preparing: "Preparing content...",
    processing: "Processing video...",
    encoding: "Encoding for platforms...",
    completed: "Export complete!",
    failed: "Export failed",
  };
  return messages[status];
}

/**
 * Check if the export status indicates completion (success or failure)
 */
export function isExportFinished(status: ExportJobStatus): boolean {
  return status === "completed" || status === "failed";
}

/**
 * Check if the export was successful
 */
export function isExportSuccessful(status: ExportJobStatus): boolean {
  return status === "completed";
}

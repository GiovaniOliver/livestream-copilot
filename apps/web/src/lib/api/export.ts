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
 * Request body for starting an export job
 */
export interface StartExportRequest {
  sessionId: string;
  contentId?: string;
  platforms: SocialPlatform[];
  caption?: string;
  hashtags?: string[];
  formatOptions: ExportFormatOptions;
  customFilename?: string;
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
  sessionId: string,
  options: Omit<StartExportRequest, "sessionId">
): Promise<StartExportResponse> {
  const request: StartExportRequest = {
    sessionId,
    ...options,
  };

  return apiClient.post<StartExportResponse>("/api/v1/export", request);
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
  return apiClient.get<ExportStatusResponse>(`/api/v1/export/${exportId}`);
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
  return apiClient.get<ExportDownloadResponse>(
    `/api/v1/export/${exportId}/download`
  );
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

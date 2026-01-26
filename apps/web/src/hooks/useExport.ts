"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ExportContent,
  ExportRequest,
  ExportProgress,
  ExportResult,
  ExportHistoryItem,
  HashtagSuggestion,
  ExportStatus,
} from "@/components/export/types";
import {
  startExport as apiStartExport,
  getExportStatus,
  getExportDownloadUrl,
  getStatusMessage,
  isExportFinished,
  isExportSuccessful,
  type ExportJobStatus,
} from "@/lib/api/export";
import { ApiError } from "@/lib/api/client";

// ============================================================
// useExport Hook
// Custom hook for managing export functionality with real backend API
// ============================================================

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 2000;

/** Maximum number of poll attempts before giving up */
const MAX_POLL_ATTEMPTS = 150; // 5 minutes at 2 second intervals

export interface UseExportOptions {
  onSuccess?: (result: ExportResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Map backend job status to frontend export status
 */
function mapJobStatusToExportStatus(jobStatus: ExportJobStatus): ExportStatus {
  const statusMap: Record<ExportJobStatus, ExportStatus> = {
    pending: "preparing",
    preparing: "preparing",
    processing: "exporting",
    encoding: "exporting",
    completed: "completed",
    failed: "error",
  };
  return statusMap[jobStatus];
}

export function useExport(options: UseExportOptions = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState<ExportContent | null>(null);
  const [progress, setProgress] = useState<ExportProgress>({
    status: "idle",
    progress: 0,
  });
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);

  // Refs for cleanup
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  /**
   * Stop any active polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollAttemptsRef.current = 0;
  }, []);

  // Open export modal for specific content
  const openExport = useCallback((content: ExportContent) => {
    setCurrentContent(content);
    setIsModalOpen(true);
  }, []);

  // Close export modal
  const closeExport = useCallback(() => {
    setIsModalOpen(false);
    stopPolling();
    // Reset after animation
    setTimeout(() => {
      setCurrentContent(null);
      setProgress({
        status: "idle",
        progress: 0,
      });
    }, 300);
  }, [stopPolling]);

  /**
   * Generate hashtag suggestions based on content
   * NOTE: This is client-side only - not from API
   */
  const generateHashtagSuggestions = useCallback(
    (content: ExportContent): HashtagSuggestion[] => {
      // Client-side hashtag suggestions based on content type
      // These are static suggestions, not AI-generated
      const suggestions: HashtagSuggestion[] = [];

      if (content.type === "clip") {
        suggestions.push(
          { tag: "viral", relevance: 0.9, popularity: "high", platforms: ["x", "instagram", "tiktok"] },
          { tag: "contentcreator", relevance: 0.85, popularity: "high", platforms: ["instagram", "youtube"] },
          { tag: "trending", relevance: 0.8, popularity: "high", platforms: ["tiktok", "instagram"] }
        );
      } else if (content.type === "post") {
        suggestions.push(
          { tag: "socialmedia", relevance: 0.9, popularity: "medium", platforms: ["linkedin", "x"] },
          { tag: "content", relevance: 0.85, popularity: "high", platforms: ["linkedin", "instagram"] }
        );
      }

      // Add generic suggestions
      suggestions.push(
        { tag: "fyp", relevance: 0.7, popularity: "high", platforms: ["tiktok"] },
        { tag: "explore", relevance: 0.75, popularity: "high", platforms: ["instagram"] },
        { tag: "foryou", relevance: 0.7, popularity: "high", platforms: ["tiktok", "instagram"] }
      );

      return suggestions;
    },
    []
  );

  /**
   * Poll for export status updates
   */
  const pollExportStatus = useCallback(
    async (
      exportId: string,
      request: ExportRequest,
      resolve: (result: ExportResult) => void,
      reject: (error: Error) => void
    ) => {
      try {
        pollAttemptsRef.current += 1;

        // Check if we've exceeded max attempts
        if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
          stopPolling();
          const timeoutError = new Error("Export timed out. Please try again.");
          setProgress({
            status: "error",
            progress: 0,
            error: timeoutError.message,
          });
          options.onError?.(timeoutError);
          reject(timeoutError);
          return;
        }

        const status = await getExportStatus(exportId);

        // Update progress
        setProgress({
          status: mapJobStatusToExportStatus(status.status),
          progress: status.progress,
          message: status.message || getStatusMessage(status.status),
          error: status.error,
        });

        // Check if export is finished
        if (isExportFinished(status.status)) {
          stopPolling();

          if (isExportSuccessful(status.status)) {
            // Get download URL if not already in status response
            let downloadUrl = status.downloadUrl;
            let filename = status.filename;
            let fileSize = status.fileSize;

            if (!downloadUrl) {
              try {
                const downloadInfo = await getExportDownloadUrl(exportId);
                downloadUrl = downloadInfo.downloadUrl;
                filename = downloadInfo.filename;
                fileSize = downloadInfo.fileSize;
              } catch (downloadError) {
                // Use a placeholder if download URL fetch fails
                console.error("Failed to get download URL:", downloadError);
                downloadUrl = `/api/v1/export/${exportId}/download`;
              }
            }

            const result: ExportResult = {
              id: exportId,
              contentId: request.contentId,
              platform: request.platforms[0],
              downloadUrl: downloadUrl || "",
              filename: filename || `${request.customFilename || "export"}.${request.formatOptions.format}`,
              fileSize: fileSize || 0,
              createdAt: new Date(),
            };

            setProgress({
              status: "completed",
              progress: 100,
              message: "Export complete!",
            });

            // Add to history
            const historyItem: ExportHistoryItem = {
              id: result.id,
              contentTitle: request.customFilename || "Untitled",
              platforms: request.platforms,
              exportedAt: new Date(),
              downloads: 0,
            };
            setExportHistory((prev) => [historyItem, ...prev]);

            options.onSuccess?.(result);
            resolve(result);
          } else {
            // Export failed
            const failedError = new Error(status.error || "Export failed. Please try again.");
            setProgress({
              status: "error",
              progress: 0,
              error: failedError.message,
            });
            options.onError?.(failedError);
            reject(failedError);
          }
        }
      } catch (error) {
        // Handle polling errors
        const apiError = error instanceof ApiError
          ? new Error(`API Error (${error.status}): ${error.message}`)
          : error instanceof Error
            ? error
            : new Error("Unknown error occurred while checking export status");

        // Don't stop polling on transient errors, just log them
        console.error("Export status poll error:", apiError);

        // If we've had too many consecutive errors, give up
        if (pollAttemptsRef.current > 5) {
          stopPolling();
          setProgress({
            status: "error",
            progress: 0,
            error: apiError.message,
          });
          options.onError?.(apiError);
          reject(apiError);
        }
      }
    },
    [options, stopPolling]
  );

  // Handle export request
  const handleExport = useCallback(
    async (request: ExportRequest): Promise<ExportResult> => {
      // Reset state
      stopPolling();
      pollAttemptsRef.current = 0;

      setProgress({
        status: "preparing",
        progress: 0,
        message: "Starting export...",
      });

      return new Promise<ExportResult>(async (resolve, reject) => {
        try {
          // Step 1: Start the export job
          const response = await apiStartExport(request.contentId, {
            platforms: request.platforms,
            caption: request.caption,
            hashtags: request.hashtags,
            formatOptions: request.formatOptions,
            customFilename: request.customFilename,
          });

          const exportId = response.exportId;

          setProgress({
            status: "preparing",
            progress: 5,
            message: "Export job created. Processing...",
          });

          // Step 2: Start polling for status updates
          pollIntervalRef.current = setInterval(() => {
            pollExportStatus(exportId, request, resolve, reject);
          }, POLL_INTERVAL_MS);

          // Also do an immediate poll
          pollExportStatus(exportId, request, resolve, reject);
        } catch (error) {
          stopPolling();

          const apiError = error instanceof ApiError
            ? new Error(`Failed to start export (${error.status}): ${error.statusText}`)
            : error instanceof Error
              ? error
              : new Error("Failed to start export");

          setProgress({
            status: "error",
            progress: 0,
            error: apiError.message,
          });

          options.onError?.(apiError);
          reject(apiError);
        }
      });
    },
    [options, pollExportStatus, stopPolling]
  );

  // Batch export multiple items
  const batchExport = useCallback(
    async (contents: ExportContent[], baseRequest: Omit<ExportRequest, "contentId">) => {
      const results: ExportResult[] = [];
      const errors: Array<{ content: ExportContent; error: Error }> = [];

      for (let i = 0; i < contents.length; i++) {
        const content = contents[i];
        setProgress({
          status: "exporting",
          progress: Math.round((i / contents.length) * 100),
          message: `Exporting ${i + 1} of ${contents.length}...`,
        });

        try {
          const result = await handleExport({
            ...baseRequest,
            contentId: content.id,
          });
          results.push(result);
        } catch (error) {
          errors.push({
            content,
            error: error instanceof Error ? error : new Error("Export failed"),
          });
        }
      }

      setProgress({
        status: "completed",
        progress: 100,
        message: `Exported ${results.length} of ${contents.length} items`,
      });

      return { results, errors };
    },
    [handleExport]
  );

  return {
    // State
    isModalOpen,
    currentContent,
    progress,
    exportHistory,

    // Actions
    openExport,
    closeExport,
    handleExport,
    batchExport,
    generateHashtagSuggestions,

    // Utility
    stopPolling,
  };
}

export default useExport;

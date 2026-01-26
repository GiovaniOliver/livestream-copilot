/**
 * useExport Hook Tests
 *
 * Tests for the useExport hook including:
 * - Export modal state management
 * - Export job creation
 * - Progress tracking
 * - Error handling
 * - Hashtag suggestion generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useExport } from "@/hooks/useExport";
import * as exportApi from "@/lib/api/export";
import type { ExportContent, ExportRequest } from "@/components/export/types";

// Mock the export API module
vi.mock("@/lib/api/export", () => ({
  startExport: vi.fn(),
  getExportStatus: vi.fn(),
  getExportDownloadUrl: vi.fn(),
  getStatusMessage: vi.fn((status: string) => {
    const messages: Record<string, string> = {
      pending: "Export queued...",
      preparing: "Preparing content...",
      processing: "Processing video...",
      encoding: "Encoding for platforms...",
      completed: "Export complete!",
      failed: "Export failed",
    };
    return messages[status] || "Unknown status";
  }),
  isExportFinished: vi.fn((status: string) => status === "completed" || status === "failed"),
  isExportSuccessful: vi.fn((status: string) => status === "completed"),
}));

describe("useExport Hook", () => {
  const mockContent: ExportContent = {
    id: "content-123",
    type: "clip",
    title: "Test Clip",
    thumbnail: "https://example.com/thumb.jpg",
    duration: 30,
  };

  const mockExportRequest: ExportRequest = {
    contentId: "content-123",
    platforms: ["youtube", "tiktok"],
    caption: "Test caption",
    hashtags: ["test", "viral"],
    formatOptions: {
      format: "mp4",
      quality: "1080p",
      aspectRatio: "9:16",
    },
    customFilename: "my-export",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Modal State", () => {
    it("should initialize with modal closed", () => {
      const { result } = renderHook(() => useExport());

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.currentContent).toBeNull();
    });

    it("should open modal with content", () => {
      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.openExport(mockContent);
      });

      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.currentContent).toEqual(mockContent);
    });

    it("should close modal", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.openExport(mockContent);
      });

      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.closeExport();
      });

      expect(result.current.isModalOpen).toBe(false);

      // Content resets after 300ms animation delay
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.currentContent).toBeNull();
      expect(result.current.progress.status).toBe("idle");
    });
  });

  describe("Progress State", () => {
    it("should initialize with idle progress", () => {
      const { result } = renderHook(() => useExport());

      expect(result.current.progress).toEqual({
        status: "idle",
        progress: 0,
      });
    });
  });

  describe("handleExport - Success Flow", () => {
    it("should start export and complete successfully", async () => {
      vi.useFakeTimers();

      const mockStartResponse = {
        exportId: "export-456",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };

      const mockStatusCompleted = {
        exportId: "export-456",
        status: "completed" as const,
        progress: 100,
        message: "Export complete!",
        downloadUrl: "https://example.com/download/export-456",
        filename: "my-export.mp4",
        fileSize: 1024000,
      };

      vi.mocked(exportApi.startExport).mockResolvedValue(mockStartResponse);
      vi.mocked(exportApi.getExportStatus).mockResolvedValue(mockStatusCompleted);

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useExport({ onSuccess }));

      let exportPromise: Promise<any>;

      await act(async () => {
        exportPromise = result.current.handleExport(mockExportRequest);
        // Advance to allow startExport to resolve
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(exportApi.startExport).toHaveBeenCalledWith("content-123", {
        platforms: ["youtube", "tiktok"],
        caption: "Test caption",
        hashtags: ["test", "viral"],
        formatOptions: {
          format: "mp4",
          quality: "1080p",
          aspectRatio: "9:16",
        },
        customFilename: "my-export",
      });

      // Advance through poll interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });

      const exportResult = await exportPromise!;

      expect(exportResult.id).toBe("export-456");
      expect(exportResult.downloadUrl).toBe("https://example.com/download/export-456");
      expect(result.current.progress.status).toBe("completed");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("handleExport - Error Flow", () => {
    it("should handle export start error", async () => {
      vi.mocked(exportApi.startExport).mockRejectedValue(
        new Error("Failed to start export")
      );

      const onError = vi.fn();
      const { result } = renderHook(() => useExport({ onError }));

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.handleExport(mockExportRequest);
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error?.message).toBe("Failed to start export");

      // Wait for error state to be updated
      await waitFor(() => {
        expect(result.current.progress.status).toBe("error");
      });

      expect(result.current.progress.error).toBe("Failed to start export");
      expect(onError).toHaveBeenCalled();
    });

    it("should handle export failure status", async () => {
      vi.useFakeTimers();

      const mockStartResponse = {
        exportId: "export-789",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };

      const mockStatusFailed = {
        exportId: "export-789",
        status: "failed" as const,
        progress: 0,
        error: "Encoding failed",
      };

      vi.mocked(exportApi.startExport).mockResolvedValue(mockStartResponse);
      vi.mocked(exportApi.getExportStatus).mockResolvedValue(mockStatusFailed);

      const onError = vi.fn();
      const { result } = renderHook(() => useExport({ onError }));

      let exportError: Error | null = null;
      let exportPromise: Promise<any>;

      await act(async () => {
        // Start export and immediately attach catch handler to prevent unhandled rejection
        exportPromise = result.current.handleExport(mockExportRequest);
        exportPromise.catch((e) => {
          exportError = e as Error;
        });
        // Advance to allow startExport to resolve
        await vi.advanceTimersByTimeAsync(100);
      });

      // Advance through poll to trigger the failure and wait for promise to settle
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
        // Allow the promise rejection to be handled
        await vi.runAllTimersAsync();
      });

      expect(exportError?.message).toBe("Encoding failed");
      expect(result.current.progress.status).toBe("error");
      expect(onError).toHaveBeenCalled();
    });
  });

  describe("stopPolling", () => {
    it("should stop active polling when called", async () => {
      vi.useFakeTimers();

      const mockStartResponse = {
        exportId: "export-stop",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };

      const mockStatusProcessing = {
        exportId: "export-stop",
        status: "processing" as const,
        progress: 30,
      };

      vi.mocked(exportApi.startExport).mockResolvedValue(mockStartResponse);
      vi.mocked(exportApi.getExportStatus).mockResolvedValue(mockStatusProcessing);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        result.current.handleExport(mockExportRequest);
        await vi.advanceTimersByTimeAsync(100);
      });

      // First poll
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });

      const callCount = vi.mocked(exportApi.getExportStatus).mock.calls.length;

      act(() => {
        result.current.stopPolling();
      });

      // Advance time - polling should not continue
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });

      // Call count should not have increased significantly
      expect(vi.mocked(exportApi.getExportStatus).mock.calls.length).toBeLessThanOrEqual(
        callCount + 1
      );
    });
  });

  describe("generateHashtagSuggestions", () => {
    it("should generate hashtag suggestions for clip content", () => {
      const { result } = renderHook(() => useExport());

      const clipContent: ExportContent = {
        id: "clip-1",
        type: "clip",
        title: "Test Clip",
      };

      const suggestions = result.current.generateHashtagSuggestions(clipContent);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.tag === "viral")).toBe(true);
      expect(suggestions.some((s) => s.tag === "contentcreator")).toBe(true);
      expect(suggestions.some((s) => s.platforms.includes("tiktok"))).toBe(true);
    });

    it("should generate hashtag suggestions for post content", () => {
      const { result } = renderHook(() => useExport());

      const postContent: ExportContent = {
        id: "post-1",
        type: "post",
        title: "Test Post",
      };

      const suggestions = result.current.generateHashtagSuggestions(postContent);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.tag === "socialmedia")).toBe(true);
      expect(suggestions.some((s) => s.platforms.includes("linkedin"))).toBe(true);
    });

    it("should include generic suggestions for all content types", () => {
      const { result } = renderHook(() => useExport());

      const content: ExportContent = {
        id: "any-1",
        type: "clip",
        title: "Any Content",
      };

      const suggestions = result.current.generateHashtagSuggestions(content);

      expect(suggestions.some((s) => s.tag === "fyp")).toBe(true);
      expect(suggestions.some((s) => s.tag === "explore")).toBe(true);
      expect(suggestions.some((s) => s.tag === "foryou")).toBe(true);
    });
  });

  describe("Export History", () => {
    it("should add completed exports to history", async () => {
      vi.useFakeTimers();

      const mockStartResponse = {
        exportId: "history-export-1",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };

      const mockStatusCompleted = {
        exportId: "history-export-1",
        status: "completed" as const,
        progress: 100,
        downloadUrl: "https://example.com/download",
        filename: "export.mp4",
        fileSize: 1024000,
      };

      vi.mocked(exportApi.startExport).mockResolvedValue(mockStartResponse);
      vi.mocked(exportApi.getExportStatus).mockResolvedValue(mockStatusCompleted);

      const { result } = renderHook(() => useExport());

      expect(result.current.exportHistory).toHaveLength(0);

      let exportPromise: Promise<any>;

      await act(async () => {
        exportPromise = result.current.handleExport(mockExportRequest);
        // Advance to allow startExport to resolve
        await vi.advanceTimersByTimeAsync(100);
      });

      // Advance through poll interval and wait for promise to resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
        await exportPromise!;
      });

      expect(result.current.exportHistory).toHaveLength(1);
      expect(result.current.exportHistory[0].id).toBe("history-export-1");
      expect(result.current.exportHistory[0].platforms).toEqual(["youtube", "tiktok"]);
    });
  });

  describe("Cleanup", () => {
    it("should cleanup polling on unmount", async () => {
      vi.useFakeTimers();

      const mockStartResponse = {
        exportId: "cleanup-export",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };

      const mockStatusProcessing = {
        exportId: "cleanup-export",
        status: "processing" as const,
        progress: 50,
      };

      vi.mocked(exportApi.startExport).mockResolvedValue(mockStartResponse);
      vi.mocked(exportApi.getExportStatus).mockResolvedValue(mockStatusProcessing);

      const { result, unmount } = renderHook(() => useExport());

      await act(async () => {
        result.current.handleExport(mockExportRequest);
        await vi.advanceTimersByTimeAsync(100);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });

      const callCount = vi.mocked(exportApi.getExportStatus).mock.calls.length;

      unmount();

      // Advance time after unmount
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });

      // No additional calls should have been made after unmount
      expect(vi.mocked(exportApi.getExportStatus).mock.calls.length).toBeLessThanOrEqual(
        callCount + 1
      );
    });
  });

  describe("Batch Export", () => {
    it("should export multiple items and collect results", async () => {
      vi.useFakeTimers();

      const contents: ExportContent[] = [
        { id: "content-1", type: "clip", title: "Clip 1" },
        { id: "content-2", type: "clip", title: "Clip 2" },
      ];

      const baseRequest: Omit<ExportRequest, "contentId"> = {
        platforms: ["youtube"],
        formatOptions: { format: "mp4", quality: "1080p", aspectRatio: "16:9" },
      };

      let exportIdCounter = 0;
      vi.mocked(exportApi.startExport).mockImplementation(async () => ({
        exportId: `batch-export-${++exportIdCounter}`,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      }));

      vi.mocked(exportApi.getExportStatus).mockImplementation(async (exportId) => ({
        exportId,
        status: "completed" as const,
        progress: 100,
        downloadUrl: `https://example.com/download/${exportId}`,
        filename: `${exportId}.mp4`,
        fileSize: 1024000,
      }));

      const { result } = renderHook(() => useExport());

      let batchPromise: Promise<any>;

      await act(async () => {
        batchPromise = result.current.batchExport(contents, baseRequest);
        // Process first export
        await vi.advanceTimersByTimeAsync(3000);
      });

      await act(async () => {
        // Process second export
        await vi.advanceTimersByTimeAsync(3000);
      });

      const batchResult = await batchPromise!;

      expect(batchResult.results).toHaveLength(2);
      expect(batchResult.errors).toHaveLength(0);
      expect(exportApi.startExport).toHaveBeenCalledTimes(2);
    });
  });
});

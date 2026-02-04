/**
 * Custom hook for managing live video stream status and server control
 *
 * This hook:
 * - Fetches video server status from the backend API
 * - Polls status every 5 seconds when component is mounted
 * - Provides start/stop server controls
 * - Handles error states and loading indicators
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { API_CONFIG } from '@/lib/config';

// ============================================================
// Types
// ============================================================

export interface VideoServerStatus {
  /** Whether the video server is running */
  isRunning: boolean;
  /** Whether a stream is currently active */
  isStreaming: boolean;
  /** RTMP ingest URL for OBS */
  rtmpUrl: string;
  /** Stream key for OBS */
  streamKey: string;
  /** WebRTC playback URL for low-latency preview */
  webrtcUrl: string;
  /** HLS playback URL for fallback */
  hlsUrl: string;
  /** Stream statistics when active */
  stats?: {
    /** Current bitrate in kbps */
    bitrate: number;
    /** Frames per second */
    fps: number;
    /** Resolution (e.g., "1920x1080") */
    resolution: string;
    /** Uptime in seconds */
    uptime: number;
  };
}

export interface UseLiveStreamReturn {
  /** Current video server status */
  status: VideoServerStatus | null;
  /** Whether the status is currently loading */
  isLoading: boolean;
  /** Error message if status fetch failed */
  error: string | null;
  /** Refetch the status immediately */
  refetch: () => Promise<void>;
  /** Start the video server */
  startServer: () => Promise<void>;
  /** Stop the video server */
  stopServer: () => Promise<void>;
  /** Whether a server action is in progress */
  isActionPending: boolean;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_API_BASE = API_CONFIG.baseUrl;
const POLL_INTERVAL_MS = 5000;

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Hook for fetching video server status and controlling the server
 *
 * @param options - Configuration options
 * @param options.apiBase - Base URL for the video API (default: http://localhost:3123)
 * @param options.pollInterval - Interval for polling status in ms (default: 5000)
 * @param options.enabled - Whether polling is enabled (default: true)
 */
export function useLiveStream(options: {
  apiBase?: string;
  pollInterval?: number;
  enabled?: boolean;
} = {}): UseLiveStreamReturn {
  const {
    apiBase = DEFAULT_API_BASE,
    pollInterval = POLL_INTERVAL_MS,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<VideoServerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  const isMountedRef = useRef(true);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch the current video server status
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/video/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // If server is not running, return default offline status
        if (response.status === 404 || response.status === 503) {
          if (isMountedRef.current) {
            setStatus({
              isRunning: false,
              isStreaming: false,
              rtmpUrl: "rtmp://localhost:1935/live/stream",
              streamKey: "stream",
              webrtcUrl: "http://localhost:8889/live/stream",
              hlsUrl: "http://localhost:8888/live/stream/index.m3u8",
            });
            setError(null);
          }
          return;
        }
        throw new Error(`Failed to fetch video status: ${response.statusText}`);
      }

      const data = await response.json();

      if (isMountedRef.current) {
        // Map backend field names to frontend interface
        // Backend uses: serverRunning, streamActive, webrtcPlaybackUrl, hlsPlaybackUrl, rtmpIngestUrl
        // Frontend expects: isRunning, isStreaming, webrtcUrl, hlsUrl, rtmpUrl
        setStatus({
          isRunning: data.serverRunning ?? data.isRunning ?? false,
          isStreaming: data.streamActive ?? data.isStreaming ?? false,
          rtmpUrl: data.rtmpIngestUrl ?? data.rtmpUrl ?? "rtmp://localhost:1935/live/stream",
          streamKey: data.streamKey ?? "stream",
          webrtcUrl: data.webrtcPlaybackUrl ?? data.webrtcUrl ?? "http://localhost:8889/live/stream",
          hlsUrl: data.hlsPlaybackUrl ?? data.hlsUrl ?? "http://localhost:8888/live/stream/index.m3u8",
          stats: data.stats,
        });
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        // On error, set default offline status instead of showing error
        // This handles the case when the backend is not running
        setStatus({
          isRunning: false,
          isStreaming: false,
          rtmpUrl: "rtmp://localhost:1935/live/stream",
          streamKey: "stream",
          webrtcUrl: "http://localhost:8889/live/stream",
          hlsUrl: "http://localhost:8888/live/stream/index.m3u8",
        });
        setError(
          err instanceof Error ? err.message : "Failed to fetch video status"
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [apiBase]);

  /**
   * Start the video server
   */
  const startServer = useCallback(async () => {
    setIsActionPending(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/video/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ?? `Failed to start server: ${response.statusText}`
        );
      }

      // Refresh status after starting
      await fetchStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start video server"
      );
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [apiBase, fetchStatus]);

  /**
   * Stop the video server
   */
  const stopServer = useCallback(async () => {
    setIsActionPending(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/video/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ?? `Failed to stop server: ${response.statusText}`
        );
      }

      // Refresh status after stopping
      await fetchStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to stop video server"
      );
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [apiBase, fetchStatus]);

  /**
   * Set up polling for status updates
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    if (enabled) {
      fetchStatus();
    }

    // Set up polling
    const startPolling = () => {
      if (!enabled) return;

      pollTimeoutRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchStatus();
        }
      }, pollInterval);
    };

    startPolling();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (pollTimeoutRef.current) {
        clearInterval(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [enabled, pollInterval, fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
    startServer,
    stopServer,
    isActionPending,
  };
}

export default useLiveStream;

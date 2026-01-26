"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";
type StreamMode = "webrtc" | "hls" | "none";

export interface LiveVideoPreviewProps {
  /** WebRTC playback URL for low-latency streaming */
  webrtcUrl?: string;
  /** HLS playback URL for fallback streaming */
  hlsUrl?: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback when connection state changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Whether the stream is expected to be active */
  isStreamActive?: boolean;
}

// ============================================================
// Icons
// ============================================================

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
      />
      <line
        x1="3"
        y1="3"
        x2="21"
        y2="21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

// ============================================================
// Live Video Preview Component
// ============================================================

export function LiveVideoPreview({
  webrtcUrl = "ws://localhost:8889/stream",
  hlsUrl = "http://localhost:8888/stream/index.m3u8",
  className,
  onConnectionChange,
  onError,
  isStreamActive = false,
}: LiveVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [streamMode, setStreamMode] = useState<StreamMode>("none");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const MAX_RECONNECT_ATTEMPTS = 3;

  /**
   * Update connection state and notify parent
   */
  const updateConnectionState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state);
      onConnectionChange?.(state === "connected");
    },
    [onConnectionChange]
  );

  /**
   * Handle errors
   */
  const handleError = useCallback(
    (error: Error, message?: string) => {
      setErrorMessage(message ?? error.message);
      updateConnectionState("error");
      onError?.(error);
    },
    [onError, updateConnectionState]
  );

  /**
   * Clean up WebRTC connection
   */
  const cleanupWebRTC = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, []);

  /**
   * Clean up HLS instance
   */
  const cleanupHLS = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  /**
   * Clean up all connections
   */
  const cleanup = useCallback(() => {
    cleanupWebRTC();
    cleanupHLS();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }
  }, [cleanupWebRTC, cleanupHLS]);

  /**
   * Connect via WebRTC for lowest latency
   */
  const connectWebRTC = useCallback(async (): Promise<boolean> => {
    if (!videoRef.current) return false;

    try {
      updateConnectionState("connecting");
      setStreamMode("webrtc");

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConnectionRef.current = pc;

      // Add transceiver for receiving video
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      // Handle incoming tracks
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(() => {
            // Autoplay may be blocked
          });
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
        }
      });

      // Send offer to WHEP endpoint
      const response = await fetch(webrtcUrl.replace("ws://", "http://").replace("wss://", "https://"), {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: pc.localDescription?.sdp,
      });

      if (!response.ok) {
        throw new Error(`WebRTC signaling failed: ${response.statusText}`);
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            updateConnectionState("connected");
            setLatencyMs(100); // WebRTC typically <500ms latency
            setReconnectAttempts(0);
            break;
          case "disconnected":
          case "failed":
            updateConnectionState("disconnected");
            break;
          case "closed":
            updateConnectionState("disconnected");
            break;
        }
      };

      return true;
    } catch (error) {
      cleanupWebRTC();
      return false;
    }
  }, [webrtcUrl, updateConnectionState, cleanupWebRTC]);

  /**
   * Connect via HLS as fallback
   */
  const connectHLS = useCallback(async (): Promise<boolean> => {
    if (!videoRef.current) return false;

    try {
      updateConnectionState("connecting");
      setStreamMode("hls");

      // Check if HLS is supported natively (Safari)
      if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = hlsUrl;
        videoRef.current.addEventListener(
          "loadedmetadata",
          () => {
            updateConnectionState("connected");
            setLatencyMs(2000); // HLS typically 2-5s latency
            setReconnectAttempts(0);
            videoRef.current?.play().catch(() => {});
          },
          { once: true }
        );
        videoRef.current.addEventListener(
          "error",
          () => {
            updateConnectionState("error");
            setErrorMessage("Failed to load HLS stream");
          },
          { once: true }
        );
        return true;
      }

      // Use hls.js for other browsers - dynamic import to avoid SSR issues
      try {
        const HlsModule = await import("hls.js");
        const Hls = HlsModule.default;

        if (!Hls.isSupported()) {
          throw new Error("HLS is not supported in this browser");
        }

        const hls = new Hls({
          lowLatencyMode: true,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          enableWorker: true,
        });
        hlsRef.current = hls;

        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          updateConnectionState("connected");
          setLatencyMs(2000);
          setReconnectAttempts(0);
          videoRef.current?.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Try to recover
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                handleError(
                  new Error("HLS fatal error"),
                  "Failed to play HLS stream"
                );
                break;
            }
          }
        });

        return true;
      } catch (importError) {
        // HLS.js not available, fall back to error state
        throw new Error("HLS library not available");
      }
    } catch (error) {
      cleanupHLS();
      return false;
    }
  }, [hlsUrl, updateConnectionState, cleanupHLS, handleError]);

  /**
   * Attempt to connect, trying WebRTC first, then falling back to HLS
   */
  const connect = useCallback(async () => {
    cleanup();
    setErrorMessage(null);

    // Only attempt connection if stream is expected to be active
    if (!isStreamActive) {
      updateConnectionState("disconnected");
      setStreamMode("none");
      return;
    }

    // Try WebRTC first for lowest latency
    const webrtcSuccess = await connectWebRTC();
    if (webrtcSuccess) {
      return;
    }

    // Fall back to HLS
    const hlsSuccess = await connectHLS();
    if (hlsSuccess) {
      return;
    }

    // Both failed
    handleError(
      new Error("Unable to connect to stream"),
      "Could not establish connection to the video stream"
    );
  }, [
    cleanup,
    isStreamActive,
    updateConnectionState,
    connectWebRTC,
    connectHLS,
    handleError,
  ]);

  /**
   * Retry connection
   */
  const retry = useCallback(() => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setReconnectAttempts((prev) => prev + 1);
      connect();
    } else {
      handleError(
        new Error("Max reconnect attempts reached"),
        "Unable to connect after multiple attempts. Please check your stream settings."
      );
    }
  }, [reconnectAttempts, connect, handleError]);

  /**
   * Effect to handle connection when stream becomes active
   */
  useEffect(() => {
    if (isStreamActive) {
      connect();
    } else {
      cleanup();
      updateConnectionState("disconnected");
      setStreamMode("none");
    }

    return () => {
      cleanup();
    };
  }, [isStreamActive, connect, cleanup, updateConnectionState]);

  /**
   * Render content based on connection state
   */
  const renderContent = () => {
    switch (connectionState) {
      case "connecting":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
              </div>
              <p className="text-sm text-text-muted">Connecting to stream...</p>
              <p className="mt-1 text-xs text-text-dim">
                {streamMode === "webrtc"
                  ? "Attempting WebRTC connection"
                  : "Attempting HLS connection"}
              </p>
            </div>
          </div>
        );

      case "disconnected":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                {isStreamActive ? (
                  <WifiOffIcon className="h-6 w-6 text-text-muted" />
                ) : (
                  <PlayIcon className="h-6 w-6 text-text-muted" />
                )}
              </div>
              <p className="text-sm text-text-muted">
                {isStreamActive
                  ? "Stream disconnected"
                  : "Waiting for stream connection..."}
              </p>
              <p className="mt-1 text-xs text-text-dim">
                {isStreamActive
                  ? "The stream connection was lost"
                  : "Video preview will appear when OBS is streaming"}
              </p>
              {isStreamActive && (
                <button
                  type="button"
                  onClick={retry}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface px-4 py-2 text-sm font-medium text-teal transition-colors hover:bg-surface-hover"
                >
                  <RefreshIcon className="h-4 w-4" />
                  Reconnect
                </button>
              )}
            </div>
          </div>
        );

      case "error":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
                <ExclamationIcon className="h-6 w-6 text-error" />
              </div>
              <p className="text-sm text-error">Connection Error</p>
              <p className="mt-1 max-w-xs text-xs text-text-dim">
                {errorMessage ?? "An unknown error occurred"}
              </p>
              <button
                type="button"
                onClick={retry}
                disabled={reconnectAttempts >= MAX_RECONNECT_ATTEMPTS}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface px-4 py-2 text-sm font-medium text-teal transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshIcon className="h-4 w-4" />
                {reconnectAttempts >= MAX_RECONNECT_ATTEMPTS
                  ? "Max retries reached"
                  : "Retry Connection"}
              </button>
            </div>
          </div>
        );

      case "connected":
        return null; // Video element handles display
    }
  };

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl bg-bg-2",
        className
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className={cn(
          "h-full w-full object-contain",
          connectionState !== "connected" && "hidden"
        )}
        autoPlay
        playsInline
        muted
        controls={false}
      />

      {/* State-based Content */}
      {renderContent()}

      {/* LIVE Badge */}
      <div className="absolute left-4 top-4">
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
            connectionState === "connected"
              ? "border-transparent bg-red-600 text-white"
              : "border-stroke bg-surface text-text-muted opacity-50"
          )}
        >
          <span className="relative flex h-2 w-2">
            {connectionState === "connected" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                connectionState === "connected" ? "bg-white" : "bg-text-muted"
              )}
            />
          </span>
          {connectionState === "connected" ? "LIVE" : "OFFLINE"}
        </div>
      </div>

      {/* Latency Indicator */}
      {connectionState === "connected" && latencyMs !== null && (
        <div className="absolute right-4 top-4">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-stroke/50 bg-bg-0/80 px-2.5 py-1 text-xs font-medium backdrop-blur-sm",
              streamMode === "webrtc" ? "text-teal" : "text-warning"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                streamMode === "webrtc" ? "bg-teal" : "bg-warning"
              )}
            />
            {streamMode === "webrtc" ? "WebRTC" : "HLS"} ~{latencyMs}ms
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveVideoPreview;

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

// ============================================================
// Types
// ============================================================

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export interface LiveAudioPreviewProps {
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
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

// ============================================================
// Icons
// ============================================================

function MicrophoneIcon({ className }: { className?: string }) {
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
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
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

// ============================================================
// Audio Visualizer Component
// ============================================================

function AudioVisualizer({
  audioContext,
  analyser,
  isActive,
  barCount = 32,
}: {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  isActive: boolean;
  barCount?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (!analyser || !isActive) {
        // Draw idle state with subtle bars
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = canvas.width / barCount;
        const centerY = canvas.height / 2;

        for (let i = 0; i < barCount; i++) {
          const height = 2 + Math.random() * 4;
          ctx.fillStyle = "rgba(94, 234, 212, 0.3)";
          ctx.fillRect(
            i * barWidth + 1,
            centerY - height / 2,
            barWidth - 2,
            height
          );
        }
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / barCount;
      const centerY = canvas.height / 2;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        const value = dataArray[dataIndex];
        const barHeight = (value / 255) * (canvas.height * 0.8);

        // Create gradient effect
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "rgb(94, 234, 212)");
        gradient.addColorStop(1, "rgb(45, 212, 191)");
        ctx.fillStyle = gradient;

        // Draw bar from center
        ctx.fillRect(
          i * barWidth + 1,
          centerY - barHeight / 2,
          barWidth - 2,
          barHeight
        );
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isActive, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      width={400}
      height={100}
    />
  );
}

// ============================================================
// Live Audio Preview Component
// ============================================================

export function LiveAudioPreview({
  webrtcUrl = "http://localhost:8889/live/stream",
  hlsUrl = "http://localhost:8888/live/stream/index.m3u8",
  className,
  onConnectionChange,
  onError,
  isStreamActive = false,
  size = "md",
}: LiveAudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const sizeClasses = {
    sm: "h-16",
    md: "h-24",
    lg: "h-32",
  };

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
   * Set up audio analyzer
   */
  const setupAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      setAudioContext(ctx);
      setAnalyser(analyserNode);
    } catch (err) {
      logger.error("Failed to set up audio analyzer:", err);
    }
  }, []);

  /**
   * Clean up WebRTC connection
   */
  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
      setAnalyser(null);
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.src = "";
    }
  }, [audioContext]);

  /**
   * Connect via WebRTC for lowest latency
   */
  const connectWebRTC = useCallback(async (): Promise<boolean> => {
    if (!audioRef.current) return false;

    try {
      updateConnectionState("connecting");

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConnectionRef.current = pc;

      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (audioRef.current && event.streams[0]) {
          audioRef.current.srcObject = event.streams[0];
          audioRef.current.play().catch(() => {});
          setupAudioAnalyzer(event.streams[0]);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

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

      const response = await fetch(
        webrtcUrl.replace("ws://", "http://").replace("wss://", "https://"),
        {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp,
        }
      );

      if (!response.ok) {
        throw new Error(`WebRTC signaling failed: ${response.statusText}`);
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            updateConnectionState("connected");
            break;
          case "disconnected":
          case "failed":
          case "closed":
            updateConnectionState("disconnected");
            break;
        }
      };

      return true;
    } catch (error) {
      cleanup();
      return false;
    }
  }, [webrtcUrl, updateConnectionState, cleanup, setupAudioAnalyzer]);

  /**
   * Connect to stream
   */
  const connect = useCallback(async () => {
    cleanup();
    setErrorMessage(null);

    if (!isStreamActive) {
      updateConnectionState("disconnected");
      return;
    }

    const webrtcSuccess = await connectWebRTC();
    if (!webrtcSuccess) {
      setErrorMessage("Unable to connect to audio stream");
      updateConnectionState("error");
      onError?.(new Error("Unable to connect to audio stream"));
    }
  }, [cleanup, isStreamActive, updateConnectionState, connectWebRTC, onError]);

  useEffect(() => {
    if (isStreamActive) {
      connect();
    } else {
      cleanup();
      updateConnectionState("disconnected");
    }

    return () => {
      cleanup();
    };
  }, [isStreamActive]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-bg-2 flex flex-col items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" autoPlay playsInline muted />

      {/* Audio Visualizer */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <AudioVisualizer
          audioContext={audioContext}
          analyser={analyser}
          isActive={connectionState === "connected"}
          barCount={size === "sm" ? 16 : size === "md" ? 24 : 32}
        />
      </div>

      {/* Status overlay when not connected */}
      {connectionState !== "connected" && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-2/90">
          <div className="text-center">
            {connectionState === "connecting" ? (
              <>
                <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                <p className="text-xs text-text-muted">Connecting...</p>
              </>
            ) : connectionState === "error" ? (
              <>
                <WifiOffIcon className="mx-auto mb-2 h-6 w-6 text-error" />
                <p className="text-xs text-error">{errorMessage}</p>
              </>
            ) : (
              <>
                <MicrophoneIcon className="mx-auto mb-2 h-6 w-6 text-text-muted" />
                <p className="text-xs text-text-muted">Waiting for audio...</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* LIVE Badge */}
      <div className="absolute left-2 top-2">
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            connectionState === "connected"
              ? "border-transparent bg-red-600 text-white"
              : "border-stroke bg-surface text-text-muted opacity-50"
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            {connectionState === "connected" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex h-1.5 w-1.5 rounded-full",
                connectionState === "connected" ? "bg-white" : "bg-text-muted"
              )}
            />
          </span>
          {connectionState === "connected" ? "LIVE" : "AUDIO"}
        </div>
      </div>
    </div>
  );
}

export default LiveAudioPreview;

"use client";

import { LiveVideoPreview, type LiveVideoPreviewProps } from "./LiveVideoPreview";
import { LiveAudioPreview, type LiveAudioPreviewProps } from "./LiveAudioPreview";
import { cn } from "@/lib/utils";
import { CAPTURE_MODES, type CaptureMode } from "@/lib/constants";

// ============================================================
// Types
// ============================================================

export interface LivePreviewProps {
  /** Capture mode determines which preview to show */
  captureMode?: CaptureMode;
  /** WebRTC playback URL */
  webrtcUrl?: string;
  /** HLS playback URL */
  hlsUrl?: string;
  /** Whether the stream is active */
  isStreamActive?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "full";
  /** Additional CSS classes */
  className?: string;
  /** Callback when connection state changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

// ============================================================
// Live Preview Component
// ============================================================

/**
 * Combined preview component that shows video or audio based on capture mode.
 * - audio_video / video: Shows LiveVideoPreview
 * - audio: Shows LiveAudioPreview
 */
export function LivePreview({
  captureMode = CAPTURE_MODES.AUDIO_VIDEO,
  webrtcUrl,
  hlsUrl,
  isStreamActive = false,
  size = "md",
  className,
  onConnectionChange,
  onError,
}: LivePreviewProps) {
  // Determine if this is audio-only
  const isAudioOnly = captureMode === CAPTURE_MODES.AUDIO;

  // Size mappings
  const sizeClasses = {
    sm: isAudioOnly ? "h-16" : "aspect-video max-h-48",
    md: isAudioOnly ? "h-24" : "aspect-video max-h-64",
    lg: isAudioOnly ? "h-32" : "aspect-video max-h-96",
    full: isAudioOnly ? "h-32" : "aspect-video",
  };

  const audioSizeMap: Record<string, "sm" | "md" | "lg"> = {
    sm: "sm",
    md: "md",
    lg: "lg",
    full: "lg",
  };

  if (isAudioOnly) {
    return (
      <LiveAudioPreview
        webrtcUrl={webrtcUrl}
        hlsUrl={hlsUrl}
        isStreamActive={isStreamActive}
        size={audioSizeMap[size]}
        className={cn(sizeClasses[size], className)}
        onConnectionChange={onConnectionChange}
        onError={onError}
      />
    );
  }

  return (
    <LiveVideoPreview
      webrtcUrl={webrtcUrl}
      hlsUrl={hlsUrl}
      isStreamActive={isStreamActive}
      className={cn(sizeClasses[size], className)}
      onConnectionChange={onConnectionChange}
      onError={onError}
    />
  );
}

export default LivePreview;

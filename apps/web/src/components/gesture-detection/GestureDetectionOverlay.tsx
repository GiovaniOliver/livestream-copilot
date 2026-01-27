"use client";

/**
 * Gesture Detection Overlay
 *
 * Shows real-time gesture detection status on the video preview.
 * Displays detected gestures and provides visual feedback.
 */

import { useState, useRef, useEffect } from "react";
import {
  useMediaPipeWithBackend,
  type GestureDetection,
} from "@/hooks/useMediaPipeGestures";

interface GestureDetectionOverlayProps {
  /** Session ID for sending detections to backend */
  sessionId: string | null;
  /** Video element ref to analyze */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Gestures to detect */
  enabledGestures: string[];
  /** Whether detection is enabled */
  enabled: boolean;
  /** Callback when a gesture triggers a clip */
  onGestureTrigger?: (gesture: GestureDetection) => void;
}

export function GestureDetectionOverlay({
  sessionId,
  videoRef,
  enabledGestures,
  enabled,
  onGestureTrigger,
}: GestureDetectionOverlayProps) {
  const [showTriggerFlash, setShowTriggerFlash] = useState(false);

  const { isLoading, isReady, error, currentGesture, lastDetection, detectionCount } =
    useMediaPipeWithBackend(sessionId, {
      videoRef,
      enabledGestures,
      enabled,
      confidenceThreshold: 0.7,
      processingInterval: 100,
    });

  // Flash effect when gesture triggers
  useEffect(() => {
    if (lastDetection && onGestureTrigger) {
      setShowTriggerFlash(true);
      onGestureTrigger(lastDetection);

      const timer = setTimeout(() => {
        setShowTriggerFlash(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [lastDetection, detectionCount, onGestureTrigger]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Trigger flash overlay */}
      {showTriggerFlash && (
        <div className="absolute inset-0 bg-teal/30 animate-pulse pointer-events-none z-10" />
      )}

      {/* Status indicator */}
      <div className="absolute top-3 left-3 z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
          {/* Status dot */}
          <div
            className={`w-2 h-2 rounded-full ${
              isLoading
                ? "bg-yellow-500 animate-pulse"
                : isReady
                  ? "bg-green-500"
                  : "bg-red-500"
            }`}
          />

          {/* Status text */}
          <span className="text-xs text-white font-medium">
            {isLoading
              ? "Loading MediaPipe..."
              : error
                ? "Detection Error"
                : isReady
                  ? "Gesture Detection Active"
                  : "Initializing..."}
          </span>
        </div>
      </div>

      {/* Current gesture display */}
      {currentGesture && (
        <div className="absolute bottom-3 left-3 z-20">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-teal/90 backdrop-blur-sm text-white">
            <span className="text-2xl">
              {getGestureEmoji(currentGesture.gesture)}
            </span>
            <div>
              <p className="text-sm font-semibold">{currentGesture.label}</p>
              <p className="text-xs opacity-80">
                {(currentGesture.confidence * 100).toFixed(0)}% confidence
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detection count */}
      {detectionCount > 0 && (
        <div className="absolute top-3 right-3 z-20">
          <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
            <span className="text-xs text-white">
              {detectionCount} trigger{detectionCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-3 right-3 z-20">
          <div className="px-3 py-2 rounded-lg bg-red-500/90 backdrop-blur-sm">
            <p className="text-xs text-white">{error}</p>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Get emoji for gesture type
 */
function getGestureEmoji(gesture: string): string {
  const emojis: Record<string, string> = {
    Thumbs_Up: "👍",
    Thumbs_Down: "👎",
    Open_Palm: "🖐️",
    Victory: "✌️",
    Closed_Fist: "✊",
    Pointing_Up: "☝️",
    ILoveYou: "🤟",
  };
  return emojis[gesture] || "👋";
}

/**
 * Compact gesture indicator for minimal UI
 */
export function GestureIndicator({
  enabled,
  isActive,
  currentGesture,
}: {
  enabled: boolean;
  isActive: boolean;
  currentGesture: string | null;
}) {
  if (!enabled) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-surface border border-stroke">
      <div
        className={`w-2 h-2 rounded-full ${
          isActive ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      <span className="text-xs text-text-muted">
        {currentGesture || "Watching for gestures..."}
      </span>
    </div>
  );
}

export default GestureDetectionOverlay;

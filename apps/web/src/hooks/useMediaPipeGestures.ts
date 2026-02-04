"use client";

/**
 * MediaPipe Gesture Detection Hook
 *
 * Runs Google's MediaPipe gesture recognition locally in the browser.
 * Detects hand gestures (thumbs up, peace sign, etc.) from video feed
 * and sends detections to the backend for clip triggering.
 *
 * This is completely FREE - no API calls, runs 100% locally!
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
import { API_CONFIG } from '@/lib/config';

// Gesture categories that MediaPipe can detect
export type GestureCategory =
  | "Thumbs_Up"
  | "Thumbs_Down"
  | "Open_Palm"
  | "Victory" // Peace sign
  | "Closed_Fist"
  | "Pointing_Up"
  | "ILoveYou"
  | "None";

// Map MediaPipe gesture names to user-friendly labels
const GESTURE_LABELS: Record<string, string> = {
  Thumbs_Up: "Thumbs Up",
  Thumbs_Down: "Thumbs Down",
  Open_Palm: "Open Palm",
  Victory: "Peace Sign",
  Closed_Fist: "Fist",
  Pointing_Up: "Pointing Up",
  ILoveYou: "I Love You",
};

export interface GestureDetection {
  gesture: GestureCategory;
  label: string;
  confidence: number;
  handedness: "Left" | "Right";
}

export interface UseMediaPipeGesturesOptions {
  /** Video element to analyze */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Gestures to detect (if empty, detects all) */
  enabledGestures?: string[];
  /** Minimum confidence threshold (0-1) */
  confidenceThreshold?: number;
  /** How often to process frames (ms) */
  processingInterval?: number;
  /** Callback when gesture is detected */
  onGestureDetected?: (detection: GestureDetection) => void;
  /** Whether detection is enabled */
  enabled?: boolean;
}

export interface UseMediaPipeGesturesResult {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  currentGesture: GestureDetection | null;
  lastDetection: GestureDetection | null;
  detectionCount: number;
}

// MediaPipe CDN URLs
const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe";
const GESTURE_RECOGNIZER_TASK = `${MEDIAPIPE_CDN}/tasks-vision@0.10.8/wasm`;

export function useMediaPipeGestures(
  options: UseMediaPipeGesturesOptions
): UseMediaPipeGesturesResult {
  const {
    videoRef,
    enabledGestures = [],
    confidenceThreshold = 0.7,
    processingInterval = 100,
    onGestureDetected,
    enabled = true,
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<GestureDetection | null>(null);
  const [lastDetection, setLastDetection] = useState<GestureDetection | null>(null);
  const [detectionCount, setDetectionCount] = useState(0);

  // Refs for MediaPipe instances
  const gestureRecognizerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const lastGestureRef = useRef<string | null>(null);
  const gestureHoldStartRef = useRef<number | null>(null);

  // Minimum hold time to confirm gesture (prevents accidental triggers)
  const GESTURE_HOLD_TIME_MS = 500;

  // Load MediaPipe
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    async function loadMediaPipe() {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import MediaPipe tasks-vision
        const vision = await import("@mediapipe/tasks-vision");
        const { GestureRecognizer, FilesetResolver } = vision;

        // Load the vision WASM files
        const wasmFileset = await FilesetResolver.forVisionTasks(GESTURE_RECOGNIZER_TASK);

        // Create gesture recognizer
        const gestureRecognizer = await GestureRecognizer.createFromOptions(wasmFileset, {
          baseOptions: {
            modelAssetPath: `${MEDIAPIPE_CDN}/tasks-vision@0.10.8/gesture_recognizer.task`,
            delegate: "GPU", // Use GPU for better performance
          },
          runningMode: "VIDEO",
          numHands: 2,
        });

        if (mounted) {
          gestureRecognizerRef.current = gestureRecognizer;
          setIsReady(true);
          setIsLoading(false);
          logger.debug("[MediaPipe] Gesture recognizer loaded successfully");
        }
      } catch (err) {
        logger.error("[MediaPipe] Failed to load:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load MediaPipe");
          setIsLoading(false);
        }
      }
    }

    loadMediaPipe();

    return () => {
      mounted = false;
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
        gestureRecognizerRef.current = null;
      }
    };
  }, [enabled]);

  // Process video frames
  const processFrame = useCallback(() => {
    if (!gestureRecognizerRef.current || !videoRef.current || !enabled) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    const now = performance.now();

    // Throttle processing
    if (now - lastProcessTimeRef.current < processingInterval) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Check if video is ready
    if (video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    lastProcessTimeRef.current = now;

    try {
      // Run gesture recognition
      const results = gestureRecognizerRef.current.recognizeForVideo(video, now);

      if (results.gestures && results.gestures.length > 0) {
        // Get the most confident gesture
        const gesture = results.gestures[0][0];
        const handedness = results.handedness[0][0];

        const gestureName = gesture.categoryName as GestureCategory;
        const confidence = gesture.score;

        // Check if gesture meets threshold
        if (confidence >= confidenceThreshold && gestureName !== "None") {
          // Check if gesture is enabled (if filter is set)
          const label = GESTURE_LABELS[gestureName] || gestureName;
          const isEnabled =
            enabledGestures.length === 0 ||
            enabledGestures.some(
              (g) => g.toLowerCase() === label.toLowerCase() || g === gestureName
            );

          if (isEnabled) {
            // Track gesture hold time
            if (lastGestureRef.current === gestureName) {
              // Same gesture - check hold time
              if (gestureHoldStartRef.current) {
                const holdTime = now - gestureHoldStartRef.current;
                if (holdTime >= GESTURE_HOLD_TIME_MS) {
                  // Gesture held long enough - trigger!
                  const detection: GestureDetection = {
                    gesture: gestureName,
                    label,
                    confidence,
                    handedness: handedness.categoryName as "Left" | "Right",
                  };

                  setCurrentGesture(detection);
                  setLastDetection(detection);
                  setDetectionCount((c) => c + 1);

                  // Notify callback
                  if (onGestureDetected) {
                    onGestureDetected(detection);
                  }

                  // Reset hold tracking to prevent repeat triggers
                  gestureHoldStartRef.current = null;
                  lastGestureRef.current = null;

                  logger.debug(
                    `[MediaPipe] Gesture detected: ${label} (${(confidence * 100).toFixed(1)}%)`
                  );
                }
              }
            } else {
              // New gesture - start hold timer
              lastGestureRef.current = gestureName;
              gestureHoldStartRef.current = now;
            }
          }
        } else {
          // No valid gesture - reset
          setCurrentGesture(null);
          lastGestureRef.current = null;
          gestureHoldStartRef.current = null;
        }
      } else {
        // No hands detected
        setCurrentGesture(null);
        lastGestureRef.current = null;
        gestureHoldStartRef.current = null;
      }
    } catch (err) {
      logger.error("[MediaPipe] Processing error:", err);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [
    videoRef,
    enabled,
    processingInterval,
    confidenceThreshold,
    enabledGestures,
    onGestureDetected,
  ]);

  // Start/stop processing loop
  useEffect(() => {
    if (isReady && enabled) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isReady, enabled, processFrame]);

  return {
    isLoading,
    isReady,
    error,
    currentGesture,
    lastDetection,
    detectionCount,
  };
}

/**
 * Hook to send MediaPipe detections to backend via WebSocket
 */
export function useMediaPipeWithBackend(
  sessionId: string | null,
  options: Omit<UseMediaPipeGesturesOptions, "onGestureDetected">
) {
  const wsRef = useRef<WebSocket | null>(null);
  const wsBase = API_CONFIG.desktopWsUrl;

  // Connect to WebSocket
  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(wsBase);

    ws.onopen = () => {
      logger.debug("[MediaPipe] WebSocket connected for gesture events");
    };

    ws.onerror = (err) => {
      logger.error("[MediaPipe] WebSocket error:", err);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, wsBase]);

  // Handle gesture detection
  const handleGestureDetected = useCallback(
    (detection: GestureDetection) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      // Send detection to backend
      const message = {
        type: "MEDIAPIPE_DETECTION",
        sessionId,
        payload: {
          detections: [
            {
              label: detection.label,
              confidence: detection.confidence,
            },
          ],
        },
      };

      wsRef.current.send(JSON.stringify(message));
      logger.debug(`[MediaPipe] Sent detection to backend: ${detection.label}`);
    },
    [sessionId]
  );

  return useMediaPipeGestures({
    ...options,
    onGestureDetected: handleGestureDetected,
  });
}

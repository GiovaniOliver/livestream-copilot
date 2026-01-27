/**
 * Gesture Detection Components
 *
 * MediaPipe-powered gesture detection for livestream clip triggers.
 * Runs 100% locally in the browser - completely FREE!
 */

export { GestureDetectionOverlay, GestureIndicator } from "./GestureDetectionOverlay";
export {
  useMediaPipeGestures,
  useMediaPipeWithBackend,
  type GestureCategory,
  type GestureDetection,
  type UseMediaPipeGesturesOptions,
  type UseMediaPipeGesturesResult,
} from "@/hooks/useMediaPipeGestures";

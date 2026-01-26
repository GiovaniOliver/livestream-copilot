/**
 * Stores Module
 *
 * Zustand stores for mobile app state management.
 */

import { useConnectionStore } from "./connectionStore";
import { useSessionStore } from "./sessionStore";
import { useEventsStore } from "./eventsStore";
import { useOutputsStore } from "./outputsStore";
import { useCaptureStore } from "./captureStore";
import { useOBSStore } from "./obsStore";
import { useVideoSourceStore } from "./videoSourceStore";

// Connection state
export {
  useConnectionStore,
  type ConnectionStatus,
} from "./connectionStore";

// Session state
export {
  useSessionStore,
  type WorkflowType,
  type SessionStatus,
} from "./sessionStore";

// Event stream
export {
  useEventsStore,
  selectLatestTranscript,
  selectOutputsByCategory,
} from "./eventsStore";

// Outputs with filtering
export {
  useOutputsStore,
  selectFilteredOutputs,
  selectFavoriteOutputs,
  selectCategories,
  type Output,
} from "./outputsStore";

// Capture state
export {
  useCaptureStore,
  selectIsRecording,
  selectCanRecord,
  type CaptureMode,
  type CaptureStatus,
  type CaptureQuality,
} from "./captureStore";

// OBS Control state
export {
  useOBSStore,
  type OBSConnectionStatus,
} from "./obsStore";

// Video Source state
export {
  useVideoSourceStore,
  type VideoSourceMode,
  type CameraFacing,
  type StreamQuality,
  type ConnectionStatus as VideoSourceConnectionStatus,
} from "./videoSourceStore";

// WebSocket manager
export { useWebSocketManager } from "./useWebSocketManager";

/**
 * Reset all stores - call when ending session or logging out.
 */
export function resetAllStores(): void {
  useConnectionStore.getState().reset();
  useSessionStore.getState().reset();
  useEventsStore.getState().reset();
  useOutputsStore.getState().reset();
  useCaptureStore.getState().reset();
  useOBSStore.getState().reset();
  useVideoSourceStore.getState().reset();
}

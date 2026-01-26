/**
 * FluxBoard API Client Module
 *
 * Provides typed API methods for communicating with the desktop companion service.
 *
 * @example
 * ```ts
 * import { sessions, clips, stt, health, websocket, outputs, moments } from "@/lib/api";
 *
 * // Start a session
 * const session = await sessions.startSession({
 *   workflow: "streamer",
 *   captureMode: "av",
 *   title: "My Stream",
 * });
 *
 * // Connect to WebSocket for real-time events
 * const ws = websocket.getWebSocketManager();
 * ws.connect();
 * ws.on("transcript_segment", (segment) => {
 *   console.log("New transcript:", segment);
 * });
 *
 * // Get outputs for a session
 * const outputs = await outputs.getSessionOutputs(sessionId);
 *
 * // Get moments for a session
 * const moments = await moments.getSessionMoments(sessionId);
 * ```
 */

// Base client
export { apiClient, ApiError, getBaseUrl } from "./client";
export type { RequestOptions } from "./client";

// Sessions API
export * as sessions from "./sessions";
export type {
  SessionListItem,
  SessionDetails,
  StartSessionConfig,
  StartSessionResponse,
  EndSessionResponse,
  SessionOutput,
  PaginationInfo,
  UpdateSessionResponse,
  GetSessionOutputsResponse,
} from "./sessions";

// Clips API
export * as clips from "./clips";
export type { ClipInfo, ClipIntentResponse } from "./clips";

// Outputs API
export * as outputs from "./outputs";
export type {
  OutputInfo,
  OutputWithSession,
  OutputStatus,
} from "./outputs";

// Moments API
export * as moments from "./moments";
export type {
  MomentInfo,
  MomentType,
} from "./moments";

// STT API
export * as stt from "./stt";
export type {
  STTProvider,
  STTConfig,
  STTStatus,
  STTStartResponse,
  STTStopResponse,
  TranscriptSegment,
} from "./stt";

// Health API
export * as health from "./health";
export type {
  HealthStatus,
  ComponentHealth,
  HealthResponse,
  AgentStatus,
  AgentsStatusResponse,
  FFmpegStatusResponse,
} from "./health";

// WebSocket
export * as websocket from "./websocket";
export {
  WebSocketManager,
  getWebSocketManager,
  createWebSocketManager,
} from "./websocket";
export type {
  ConnectionState,
  EventHandler,
  WebSocketEventType,
  WebSocketConfig,
} from "./websocket";

// Export API
export * as exportApi from "./export";
export type {
  StartExportRequest,
  StartExportResponse,
  ExportJobStatus,
  ExportStatusResponse,
  ExportDownloadResponse,
} from "./export";

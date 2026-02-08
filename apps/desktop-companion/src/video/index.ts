import { logger } from '../logger/index.js';

/**
 * Video Streaming Module
 *
 * Provides MediaMTX integration for live video streaming:
 * - RTMP ingest for OBS
 * - WebRTC playback for browsers
 * - HLS fallback playback
 *
 * @example
 * ```typescript
 * import { getMediaMTXManager, videoRouter } from './video';
 *
 * // Initialize manager
 * const manager = getMediaMTXManager();
 *
 * // Start server (optional - can also be started via API)
 * await manager.start();
 *
 * // Get status
 * const status = await manager.getStatus();
 * logger.info('RTMP URL:', status.rtmpIngestUrl);
 *
 * // Mount router
 * app.use('/api/video', videoRouter);
 *
 * // Cleanup on shutdown
 * await manager.cleanup();
 * ```
 *
 * @module video
 */

// Export types
export type {
  MediaMTXConfig,
  VideoStreamStatus,
  MediaMTXPathsResponse,
  MediaMTXPathItem,
  MediaMTXPathSource,
  MediaMTXTrack,
  MediaMTXReader,
  MediaMTXYamlConfig,
} from "./types.js";

// Export manager class and singleton getter
export { MediaMTXManager, getMediaMTXManager } from "./mediamtx-manager.js";

// Export router
export { videoRouter, createVideoRouter } from "./routes.js";

/**
 * Video Streaming Routes
 *
 * Express router for video streaming management:
 * - GET /api/video/status - Get video streaming status
 * - POST /api/video/start - Start MediaMTX server
 * - POST /api/video/stop - Stop MediaMTX server
 * - GET /api/video/paths - Get active stream paths
 */

import { Router, type Request, type Response } from "express";
import { getMediaMTXManager } from "./mediamtx-manager.js";
import { createLogger } from "../logger/index.js";

const videoLogger = createLogger("video");

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ ok: true, ...data });
}

function sendError(res: Response, statusCode: number, error: string): void {
  res.status(statusCode).json({ ok: false, error });
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/video/status
 * Returns the current video streaming status
 */
async function getStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const manager = getMediaMTXManager();
    const status = await manager.getStatus();

    videoLogger.debug({ status }, "Video status requested");
    sendSuccess(res, status);
  } catch (err: any) {
    videoLogger.error({ err }, "Failed to get video status");
    sendError(res, 500, err.message || "Failed to get video status");
  }
}

/**
 * POST /api/video/start
 * Starts the MediaMTX server
 */
async function startHandler(req: Request, res: Response): Promise<void> {
  try {
    const manager = getMediaMTXManager();

    if (!manager.isBinaryAvailable()) {
      videoLogger.warn("MediaMTX binary not available");
      sendError(res, 503, "MediaMTX binary not found. Video streaming is not available.");
      return;
    }

    if (manager.isRunning()) {
      videoLogger.info("MediaMTX server already running");
      const status = await manager.getStatus();
      sendSuccess(res, { message: "Server already running", ...status });
      return;
    }

    await manager.start();
    const status = await manager.getStatus();

    videoLogger.info("MediaMTX server started via API");
    sendSuccess(res, { message: "Server started", ...status });
  } catch (err: any) {
    videoLogger.error({ err }, "Failed to start MediaMTX server");
    sendError(res, 500, err.message || "Failed to start video server");
  }
}

/**
 * POST /api/video/stop
 * Stops the MediaMTX server
 */
async function stopHandler(req: Request, res: Response): Promise<void> {
  try {
    const manager = getMediaMTXManager();

    if (!manager.isRunning()) {
      videoLogger.info("MediaMTX server not running");
      sendSuccess(res, { message: "Server not running", serverRunning: false });
      return;
    }

    await manager.stop();

    videoLogger.info("MediaMTX server stopped via API");
    sendSuccess(res, { message: "Server stopped", serverRunning: false });
  } catch (err: any) {
    videoLogger.error({ err }, "Failed to stop MediaMTX server");
    sendError(res, 500, err.message || "Failed to stop video server");
  }
}

/**
 * GET /api/video/paths
 * Returns active stream paths from MediaMTX
 */
async function getPathsHandler(req: Request, res: Response): Promise<void> {
  try {
    const manager = getMediaMTXManager();

    if (!manager.isRunning()) {
      sendError(res, 503, "MediaMTX server is not running");
      return;
    }

    const paths = await manager.getActivePaths();

    if (paths === null) {
      sendError(res, 503, "Failed to communicate with MediaMTX API");
      return;
    }

    videoLogger.debug({ pathCount: paths.itemCount }, "Active paths requested");
    sendSuccess(res, { paths });
  } catch (err: any) {
    videoLogger.error({ err }, "Failed to get active paths");
    sendError(res, 500, err.message || "Failed to get active paths");
  }
}

/**
 * GET /api/video/config
 * Returns the current MediaMTX configuration
 */
async function getConfigHandler(req: Request, res: Response): Promise<void> {
  try {
    const manager = getMediaMTXManager();
    const config = manager.getConfig();

    sendSuccess(res, { config });
  } catch (err: any) {
    videoLogger.error({ err }, "Failed to get video config");
    sendError(res, 500, err.message || "Failed to get video config");
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

/**
 * Creates and configures the video streaming router
 */
export function createVideoRouter(): Router {
  const router = Router();

  // Status and info endpoints
  router.get("/status", getStatusHandler);
  router.get("/config", getConfigHandler);
  router.get("/paths", getPathsHandler);

  // Control endpoints
  router.post("/start", startHandler);
  router.post("/stop", stopHandler);

  return router;
}

/**
 * Pre-configured video router
 */
export const videoRouter = createVideoRouter();

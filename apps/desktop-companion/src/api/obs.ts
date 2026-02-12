/**
 * OBS Control Routes
 *
 * Comprehensive OBS WebSocket control endpoints:
 * - Status, reconnect
 * - Scene management (list, switch)
 * - Source management (list, toggle visibility)
 * - Streaming start/stop/toggle
 * - Recording start/stop/toggle
 * - Replay buffer save
 * - Quicklaunch / quickstop orchestration
 *
 * @module api/obs
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z, ZodError } from "zod";
import { obsLogger, apiLogger } from "../logger/index.js";
import type { ObsRouteDeps } from "./obs.types.js";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const switchSceneSchema = z.object({
  sceneName: z.string().min(1, "sceneName is required"),
});

const toggleSourceSchema = z.object({
  sceneName: z.string().min(1, "sceneName is required"),
  sourceName: z.string().min(1, "sourceName is required"),
  visible: z.boolean().optional(),
});

const quicklaunchSchema = z.object({
  workflow: z.string().default("solo"),
  title: z.string().default("Untitled Stream"),
  captureMode: z.string().default("obs"),
  participants: z.array(z.object({ name: z.string() })).default([{ name: "Host" }]),
  startStream: z.boolean().default(true),
  startRecord: z.boolean().default(true),
  startReplay: z.boolean().default(true),
});

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ ok: true, success: true, data });
}

function sendError(
  res: Response,
  statusCode: number,
  message: string
): void {
  res.status(statusCode).json({ ok: false, success: false, error: message });
}

function handleValidationError(res: Response, error: ZodError): void {
  const messages = error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  sendError(res, 400, messages.join("; "));
}

// =============================================================================
// HELPERS
// =============================================================================

function buildWsUrl(req: Request, wsPort: number): string {
  const host = req.hostname || "localhost";
  const protocol = req.secure ? "wss" : "ws";
  return `${protocol}://${host}:${wsPort}`;
}

async function getObsStatusData(obs: import("obs-websocket-js").default) {
  const connected = obs.identified;
  let streaming = false;
  let recording = false;
  let replayBufferActive = false;
  let currentScene: string | null = null;
  let scenes: string[] = [];

  if (connected) {
    try {
      const streamStatus = await obs.call("GetStreamStatus");
      streaming = streamStatus.outputActive;
    } catch { /* not available */ }

    try {
      const recordStatus = await obs.call("GetRecordStatus");
      recording = recordStatus.outputActive;
    } catch { /* not available */ }

    try {
      const replayStatus = await obs.call("GetReplayBufferStatus");
      replayBufferActive = replayStatus.outputActive;
    } catch { /* not available */ }

    try {
      const sceneList = await obs.call("GetSceneList");
      currentScene = sceneList.currentProgramSceneName;
      scenes = sceneList.scenes.map((s: any) => s.sceneName);
    } catch { /* not available */ }
  }

  return { connected, streaming, recording, replayBufferActive, currentScene, scenes };
}

async function startReplayBuffer(obs: import("obs-websocket-js").default): Promise<boolean> {
  try {
    const status = await obs.call("GetReplayBufferStatus");
    if (!status.outputActive) {
      await obs.call("StartReplayBuffer");
      obsLogger.info("Replay buffer started");
    }
    return true;
  } catch (err) {
    obsLogger.warn({ err }, "Failed to start replay buffer");
    return false;
  }
}

// =============================================================================
// ROUTER FACTORY
// =============================================================================

export function createObsRouter(deps: ObsRouteDeps): Router {
  const router = Router();
  const { obs, config: cfg } = deps;

  // Middleware: require OBS connected
  function ensureObsConnected(req: Request, res: Response, next: NextFunction): void {
    if (!obs.identified) {
      sendError(res, 503, "OBS WebSocket is not connected");
      return;
    }
    next();
  }

  // ─── Status ────────────────────────────────────────────────────────────────
  router.get("/status", async (_req: Request, res: Response) => {
    try {
      const status = await getObsStatusData(obs);

      res.json({
        ok: true,
        success: true,
        data: {
          ...status,
          wsUrl: cfg.OBS_WS_URL,
          hasPassword: !!cfg.OBS_WS_PASSWORD,
          help: !status.connected ? {
            message: "OBS WebSocket is not connected. Make sure:",
            steps: [
              "1. OBS Studio is running",
              "2. WebSocket Server is enabled in OBS (Tools > WebSocket Server Settings)",
              "3. Check the port matches OBS_WS_URL (default: ws://127.0.0.1:4455)",
              "4. If authentication is enabled in OBS, set OBS_WS_PASSWORD in your .env file",
            ],
          } : null,
        },
      });
    } catch (err) {
      obsLogger.error({ err }, "Failed to get OBS status");
      sendError(res, 500, "Failed to get OBS status");
    }
  });

  // ─── Reconnect ─────────────────────────────────────────────────────────────
  router.post("/reconnect", async (_req: Request, res: Response) => {
    try {
      if (obs.identified) {
        await obs.disconnect();
      }
      await obs.connect(cfg.OBS_WS_URL, cfg.OBS_WS_PASSWORD || undefined);
      obsLogger.info({ url: cfg.OBS_WS_URL }, "Reconnected to OBS WebSocket");
      sendSuccess(res, { message: "Reconnected to OBS" });
    } catch (err) {
      obsLogger.error({ err, url: cfg.OBS_WS_URL }, "Failed to reconnect to OBS");
      res.status(500).json({
        ok: false,
        success: false,
        error: err instanceof Error ? err.message : "Failed to connect to OBS",
        help: {
          message: "Connection failed. Verify:",
          steps: [
            "1. OBS is running with WebSocket Server enabled",
            `2. WebSocket URL is correct: ${cfg.OBS_WS_URL}`,
            "3. Password matches if authentication is enabled",
          ],
        },
      });
    }
  });

  // ─── Scenes ────────────────────────────────────────────────────────────────
  router.get("/scenes", ensureObsConnected, async (_req: Request, res: Response) => {
    try {
      const sceneList = await obs.call("GetSceneList");
      sendSuccess(res, {
        currentScene: sceneList.currentProgramSceneName,
        scenes: sceneList.scenes.map((s: any) => ({
          name: s.sceneName,
          index: s.sceneIndex,
        })),
      });
    } catch (err) {
      obsLogger.error({ err }, "Failed to get scenes");
      sendError(res, 500, "Failed to get scenes");
    }
  });

  router.post("/scenes/switch", ensureObsConnected, async (req: Request, res: Response) => {
    try {
      const { sceneName } = switchSceneSchema.parse(req.body);
      await obs.call("SetCurrentProgramScene", { sceneName });
      obsLogger.info({ sceneName }, "Switched scene");
      sendSuccess(res, { sceneName });
    } catch (err) {
      if (err instanceof ZodError) return handleValidationError(res, err);
      obsLogger.error({ err }, "Failed to switch scene");
      sendError(res, 500, "Failed to switch scene");
    }
  });

  // ─── Sources ───────────────────────────────────────────────────────────────
  router.get("/sources", ensureObsConnected, async (req: Request, res: Response) => {
    try {
      const sceneName = (req.query.sceneName as string) || undefined;
      let targetScene = sceneName;

      if (!targetScene) {
        const sceneList = await obs.call("GetSceneList");
        targetScene = sceneList.currentProgramSceneName;
      }

      const items = await obs.call("GetSceneItemList", { sceneName: targetScene });
      sendSuccess(res, {
        sceneName: targetScene,
        sources: items.sceneItems.map((item: any) => ({
          id: item.sceneItemId,
          name: item.sourceName,
          type: item.inputKind || item.sourceType,
          visible: item.sceneItemEnabled,
        })),
      });
    } catch (err) {
      obsLogger.error({ err }, "Failed to get sources");
      sendError(res, 500, "Failed to get sources");
    }
  });

  router.post("/sources/toggle", ensureObsConnected, async (req: Request, res: Response) => {
    try {
      const { sceneName, sourceName, visible } = toggleSourceSchema.parse(req.body);

      // Find source ID by name
      const items = await obs.call("GetSceneItemList", { sceneName });
      const item = items.sceneItems.find((i: any) => i.sourceName === sourceName);
      if (!item) {
        return sendError(res, 404, `Source "${sourceName}" not found in scene "${sceneName}"`);
      }

      const newVisible = visible !== undefined ? visible : !item.sceneItemEnabled;
      await obs.call("SetSceneItemEnabled", {
        sceneName,
        sceneItemId: Number(item.sceneItemId),
        sceneItemEnabled: newVisible,
      });

      obsLogger.info({ sceneName, sourceName, visible: newVisible }, "Toggled source");
      sendSuccess(res, { sceneName, sourceName, visible: newVisible });
    } catch (err) {
      if (err instanceof ZodError) return handleValidationError(res, err);
      obsLogger.error({ err }, "Failed to toggle source");
      sendError(res, 500, "Failed to toggle source");
    }
  });

  // ─── Streaming ─────────────────────────────────────────────────────────────
  router.post("/stream/start", ensureObsConnected, async (_req: Request, res: Response) => {
    try {
      await obs.call("StartStream");
      obsLogger.info("Streaming started");
      sendSuccess(res, { streaming: true });
    } catch (err) {
      obsLogger.error({ err }, "Failed to start stream");
      sendError(res, 500, "Failed to start stream");
    }
  });

  router.post("/stream/stop", ensureObsConnected, async (_req: Request, res: Response) => {
    try {
      await obs.call("StopStream");
      obsLogger.info("Streaming stopped");
      sendSuccess(res, { streaming: false });
    } catch (err) {
      obsLogger.error({ err }, "Failed to stop stream");
      sendError(res, 500, "Failed to stop stream");
    }
  });

  router.post("/stream/toggle", ensureObsConnected, async (_req: Request, res: Response) => {
    try {
      await obs.call("ToggleStream");
      const status = await obs.call("GetStreamStatus");
      obsLogger.info({ streaming: status.outputActive }, "Stream toggled");
      sendSuccess(res, { streaming: status.outputActive });
    } catch (err) {
      obsLogger.error({ err }, "Failed to toggle stream");
      sendError(res, 500, "Failed to toggle stream");
    }
  });

  // ─── Recording ─────────────────────────────────────────────────────────────
  router.post("/record/start", ensureObsConnected, async (_req: Request, res: Response) => {
    try {
      await obs.call("StartRecord");
      obsLogger.info("Recording started");
      sendSuccess(res, { recording: true });
    } catch (err) {
      obsLogger.error({ err }, "Failed to start recording");
      sendError(res, 500, "Failed to start recording");
    }
  });

  router.post("/record/stop", ensureObsConnected, async (_req: Request, res: Response) => {
    try {
      const result = await obs.call("StopRecord");
      obsLogger.info("Recording stopped");
      sendSuccess(res, { recording: false, outputPath: (result as any).outputPath });
    } catch (err) {
      obsLogger.error({ err }, "Failed to stop recording");
      sendError(res, 500, "Failed to stop recording");
    }
  });

  router.post("/record/toggle", ensureObsConnected, async (_req: Request, res: Response) => {
    try {
      await obs.call("ToggleRecord");
      const status = await obs.call("GetRecordStatus");
      obsLogger.info({ recording: status.outputActive }, "Recording toggled");
      sendSuccess(res, { recording: status.outputActive });
    } catch (err) {
      obsLogger.error({ err }, "Failed to toggle recording");
      sendError(res, 500, "Failed to toggle recording");
    }
  });

  // ─── Replay ────────────────────────────────────────────────────────────────
  router.post("/replay/save", ensureObsConnected, async (_req: Request, res: Response) => {
    try {
      const replayPath = await deps.saveReplayBuffer();
      if (replayPath) {
        obsLogger.info({ path: replayPath }, "Replay buffer saved");
        sendSuccess(res, { saved: true, path: replayPath });
      } else {
        sendError(res, 500, "Failed to save replay buffer");
      }
    } catch (err) {
      obsLogger.error({ err }, "Failed to save replay buffer");
      sendError(res, 500, "Failed to save replay buffer");
    }
  });

  // ─── Quicklaunch ───────────────────────────────────────────────────────────
  router.post("/quicklaunch", async (req: Request, res: Response) => {
    try {
      const options = quicklaunchSchema.parse(req.body);
      const results: Record<string, unknown> = {};
      const errors: string[] = [];

      // 1. Start session
      try {
        const sessionResult = await deps.startSessionInternal({
          workflow: options.workflow,
          title: options.title,
          captureMode: options.captureMode,
          participants: options.participants,
        });
        results.session = sessionResult;
      } catch (err) {
        errors.push(`session: ${err instanceof Error ? err.message : "failed"}`);
      }

      // 2. Start stream (if OBS connected and requested)
      if (options.startStream && obs.identified) {
        try {
          await obs.call("StartStream");
          results.streaming = true;
        } catch (err) {
          errors.push(`stream: ${err instanceof Error ? err.message : "failed"}`);
        }
      }

      // 3. Start recording (if OBS connected and requested)
      if (options.startRecord && obs.identified) {
        try {
          await obs.call("StartRecord");
          results.recording = true;
        } catch (err) {
          errors.push(`record: ${err instanceof Error ? err.message : "failed"}`);
        }
      }

      // 4. Start replay buffer (if OBS connected and requested)
      if (options.startReplay && obs.identified) {
        results.replayBuffer = await startReplayBuffer(obs);
      }

      const ws = buildWsUrl(req, cfg.WS_PORT);

      if (errors.length > 0) {
        obsLogger.warn({ errors, results }, "Quicklaunch completed with errors");
        res.status(207).json({
          ok: true,
          success: true,
          data: { ...results, ws },
          warnings: errors,
        });
      } else {
        obsLogger.info({ results }, "Quicklaunch completed");
        sendSuccess(res, { ...results, ws });
      }
    } catch (err) {
      if (err instanceof ZodError) return handleValidationError(res, err);
      obsLogger.error({ err }, "Quicklaunch failed");
      sendError(res, 500, "Quicklaunch failed");
    }
  });

  // ─── Quickstop ─────────────────────────────────────────────────────────────
  router.post("/quickstop", async (_req: Request, res: Response) => {
    const results: Record<string, unknown> = {};
    const errors: string[] = [];

    // 1. Stop stream
    if (obs.identified) {
      try {
        const streamStatus = await obs.call("GetStreamStatus");
        if (streamStatus.outputActive) {
          await obs.call("StopStream");
          results.streaming = false;
        }
      } catch (err) {
        errors.push(`stream: ${err instanceof Error ? err.message : "failed"}`);
      }

      // 2. Stop recording
      try {
        const recordStatus = await obs.call("GetRecordStatus");
        if (recordStatus.outputActive) {
          await obs.call("StopRecord");
          results.recording = false;
        }
      } catch (err) {
        errors.push(`record: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    // 3. Stop session
    if (deps.getSession()) {
      try {
        const stopResult = await deps.stopSessionInternal();
        results.session = stopResult;
      } catch (err) {
        errors.push(`session: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    if (errors.length > 0) {
      obsLogger.warn({ errors, results }, "Quickstop completed with errors");
      res.status(207).json({
        ok: true,
        success: true,
        data: results,
        warnings: errors,
      });
    } else {
      obsLogger.info({ results }, "Quickstop completed");
      sendSuccess(res, results);
    }
  });

  return router;
}

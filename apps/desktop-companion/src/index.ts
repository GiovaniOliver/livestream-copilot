/**
 * Desktop Companion Server
 *
 * Main entry point for the desktop companion service that provides:
 * - OBS WebSocket integration for replay buffer and screenshots
 * - Session management for livestream capture workflows
 * - Event streaming via WebSocket
 * - Speech-to-text (STT) integration
 * - FFmpeg clip trimming pipeline (SOC-262)
 * - MediaMTX video streaming (RTMP ingest, WebRTC/HLS playback)
 * - Opik observability integration
 * - Sentry error monitoring
 * - Social media export functionality
 * - Mobile recording uploads (SOC-407)
 */

// Initialize Sentry BEFORE any other imports to capture all errors
import {
  initSentry,
  sentryErrorHandler,
  flushSentry,
  setTag as setSentryTag,
  captureException,
} from "./observability/sentry.js";

// Pre-initialize Sentry with raw env vars (config module may throw)
initSentry({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  release: process.env.SENTRY_RELEASE,
  debug: process.env.NODE_ENV === "development",
});

import express from "express";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import net from "net";
import OBSWebSocket from "obs-websocket-js";
import { config } from "./config/index.js";
import { withOpikTrace } from "./observability/opik.js";
import {
  EventEnvelopeSchema,
  SessionConfigSchema,
  type EventEnvelope,
  type SessionConfig,
} from "@livestream-copilot/shared";
import {
  logger,
  obsLogger,
  apiLogger,
  sttLogger,
  ffmpegLogger,
  requestLoggingMiddleware,
  setOpikTraceId,
  createLogger,
} from "./logger/index.js";
import {
  STTManager,
  getSTTManager,
  isSTTProviderAvailable,
  listSTTProviders,
  type STTStartConfig,
} from "./stt/index.js";
import {
  trimClip,
  initializeFFmpeg,
  checkFFmpegAvailability,
  FFmpegError,
  type TrimClipResult,
  type OutputFormat,
} from "./ffmpeg/index.js";
import {
  prisma,
  disconnectPrisma,
  checkDatabaseHealth,
} from "./db/index.js";
import * as SessionService from "./db/services/session.service.js";
import * as EventService from "./db/services/event.service.js";
import * as ClipService from "./db/services/clip.service.js";
import {
  agentRouter,
  isAIConfigured,
  StreamerAgent,
  PodcastAgent,
  WritersRoomAgent,
  DebateAgent,
  BrainstormAgent,
} from "./agents/index.js";
import { authRouter, oauthRouter } from "./auth/index.js";
import { sessionsRouter, setActiveSessionGetter, setActiveSessionClearer } from "./api/sessions.js";
import { clipsRouter, sessionClipsRouter } from "./api/clips.js";
import { outputsRouter, sessionOutputsRouter } from "./api/outputs.js";
import { eventsRouter, sessionEventsRouter } from "./api/events.js";
import { recordingsRouter } from "./api/recordings.js";
// Note: triggersRouter requires multer - will be loaded dynamically if available
import { clipQueueRouter, createSessionClipQueueRouter } from "./api/clip-queue.js";
import { createObsRouter } from "./api/obs.js";
import type { ObsRouteDeps } from "./api/obs.types.js";
import { billingRouter } from "./billing/index.js";
import { exportRouter } from "./export/index.js";
import { brandingRouter } from "./export/branding-routes.js";
import { socialRouter } from "./social/index.js";
import { videoRouter, getMediaMTXManager } from "./video/index.js";
import { getVisualTriggerService } from "./triggers/visual-trigger.service.js";
import { getAudioTriggerService } from "./triggers/audio-trigger.service.js";
import { getAutoClipManager } from "./triggers/auto-clip-manager.js";
import { getClipQueueProcessor } from "./triggers/clip-queue-processor.js";

// Use validated config values
const OBS_WS_URL = config.OBS_WS_URL;
const OBS_WS_PASSWORD = config.OBS_WS_PASSWORD;
const HTTP_PORT = config.HTTP_PORT;
const CONFIG_WS_PORT = config.WS_PORT;
const SESSION_DIR = config.SESSION_DIR;
const REPLAY_BUFFER_SECONDS = config.REPLAY_BUFFER_SECONDS;

// FFmpeg configuration (with fallbacks for values not in validated config)
const FFMPEG_PATH = config.FFMPEG_PATH;
const FFPROBE_PATH = process.env.FFPROBE_PATH;
const CLIP_OUTPUT_FORMAT = (process.env.CLIP_OUTPUT_FORMAT || "mp4") as OutputFormat;
const OBS_REPLAY_OUTPUT_DIR = process.env.OBS_REPLAY_OUTPUT_DIR;

const obs = new OBSWebSocket();

// Video streaming logger
const videoLogger = createLogger("video");

type SessionState = {
  config: SessionConfig;
  dbId: string; // Database ID for the session
  t0UnixMs: number;
  clipStartT?: number;
};

let session: SessionState | null = null;

/**
 * Get the current active session's database ID.
 * Used by the sessions API to determine if a session is truly "live".
 * Returns null if no session is currently active in memory.
 */
function getActiveSessionDbId(): string | null {
  return session?.dbId ?? null;
}

// Register the active session getter and clearer with the sessions API
// This allows the API to distinguish between truly active sessions
// and orphaned sessions with endedAt: null from previous crashes/restarts
setActiveSessionGetter(getActiveSessionDbId);
setActiveSessionClearer(() => {
  apiLogger.info("Active session memory cleared via API request");
  session = null;
});

// Database logger
const dbLogger = logger.child({ module: "db" });

// Agent logger
const agentLogger = logger.child({ module: "agents" });

  // Track replay buffer state (updated via OBS events and save requests)
  let lastReplayBufferPath: string | null = null;
  let replayBufferState: {
    active: boolean;
    lastSavedAt: number | null;
    lastSavedPath: string | null;
    lastSaveRequestedAt: number | null;
    lastError: string | null;
  } = {
    active: false,
    lastSavedAt: null,
    lastSavedPath: null,
    lastSaveRequestedAt: null,
    lastError: null,
  };

// Track FFmpeg availability
let ffmpegReady = false;

// Track MediaMTX availability
let mediamtxAvailable = false;

async function startWebSocketServer(preferredPort: number): Promise<{
  server: WebSocketServer;
  port: number;
}> {
  const startOnPort = (port: number) =>
    new Promise<{ server: WebSocketServer; port: number }>((resolve, reject) => {
      const server = new WebSocketServer({ port });

      const cleanup = () => {
        server.off("listening", onListening);
        server.off("error", onError);
      };

      const onListening = () => {
        cleanup();
        const address = server.address();
        const actualPort = typeof address === "object" && address ? address.port : port;
        resolve({ server, port: actualPort });
      };

      const onError = (err: Error) => {
        cleanup();
        server.close();
        reject(err);
      };

      server.once("listening", onListening);
      server.once("error", onError);
    });

  try {
    return await startOnPort(preferredPort);
  } catch (err: any) {
    if (err?.code === "EADDRINUSE") {
      logger.warn(
        { port: preferredPort },
        "WebSocket port in use, selecting a free port"
      );
      return await startOnPort(0);
    }

    throw err;
  }
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function nowMs() {
  return Date.now();
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          resolve(false);
          return;
        }
        logger.warn({ err, port }, "Unexpected error while checking port availability");
        resolve(false);
      })
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, "0.0.0.0");
  });
}

function sessionPath(...parts: string[]) {
  if (!session) throw new Error("No active session");
  return path.join(SESSION_DIR, session.config.sessionId!, ...parts);
}

function appendEvent(ev: EventEnvelope) {
  if (!session) return;
  const eventsFile = sessionPath("events.jsonl");
  fs.appendFileSync(eventsFile, JSON.stringify(ev) + "\n", "utf8");

  // Persist event to database (fire-and-forget, non-blocking)
  EventService.createEvent({
    sessionId: session.dbId,
    type: ev.type,
    payload: ev.payload as Record<string, unknown>,
    ts: BigInt(ev.ts),
    traceId: ev.observability?.traceId,
    spanId: ev.observability?.spanId,
  }).catch((err) => {
    dbLogger.error({ err, eventType: ev.type }, "Failed to persist event to database");
  });
}

function emitEvent(wsServer: WebSocketServer, ev: EventEnvelope) {
  // Validate before broadcasting
  EventEnvelopeSchema.parse(ev);
  appendEvent(ev);
  const msg = JSON.stringify(ev);
  wsServer.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });

  // Route to AI agents (fire-and-forget, non-blocking)
  if (session && agentRouter.isEnabled()) {
    agentRouter
      .routeEvent(ev, {
        sessionId: session.config.sessionId!,
        dbSessionId: session.dbId,
        workflow: session.config.workflow as any,
        title: session.config.title,
        participants: session.config.participants.map((p) => p.name),
        startedAt: session.t0UnixMs,
      })
      .catch((err) => {
        agentLogger.error({ err, eventType: ev.type }, "Failed to route event to agents");
      });
  }
}

async function connectOBS() {
  try {
    await obs.connect(OBS_WS_URL, OBS_WS_PASSWORD || undefined);
    obsLogger.info({ url: OBS_WS_URL }, "Connected to OBS WebSocket");

      // Replay buffer state events
      obs.on("ReplayBufferSaved", (data: any) => {
        lastReplayBufferPath = data.savedReplayPath;
        replayBufferState.lastSavedAt = Date.now();
        replayBufferState.lastSavedPath = lastReplayBufferPath;
        replayBufferState.lastError = null;
        obsLogger.info({ path: lastReplayBufferPath }, "Replay buffer saved");
      });
      (obs as any).on("ReplayBufferStarted", () => {
        replayBufferState.active = true;
        replayBufferState.lastError = null;
      });
      (obs as any).on("ReplayBufferStopped", () => {
        replayBufferState.active = false;
      });
  } catch (err) {
    obsLogger.error({ err, url: OBS_WS_URL }, "Failed to connect to OBS WebSocket");
  }
}

  async function ensureReplayBuffer() {
    // Best-effort: start replay buffer if not running.
    try {
      const status = await obs.call("GetReplayBufferStatus");
      replayBufferState.active = status.outputActive;
      if (!status.outputActive) {
        await obs.call("StartReplayBuffer");
        replayBufferState.active = true;
        replayBufferState.lastError = null;
        obsLogger.info("Replay buffer started");
      }
    } catch (err) {
      replayBufferState.lastError = "Failed to ensure replay buffer";
      obsLogger.warn({ err }, "Failed to ensure replay buffer (is obs-websocket enabled?)");
    }
  }

  async function saveReplayBuffer(): Promise<string | null> {
    // OBS writes replay file to the configured path.
    // We listen for the ReplayBufferSaved event to get the actual path.
    try {
      // Reset last path before saving
      lastReplayBufferPath = null;
      replayBufferState.lastSaveRequestedAt = Date.now();
      replayBufferState.lastError = null;

      await obs.call("SaveReplayBuffer");

      // Wait briefly for the event to fire (OBS sends it after file is written)
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (lastReplayBufferPath) {
        replayBufferState.lastSavedAt = Date.now();
        replayBufferState.lastSavedPath = lastReplayBufferPath;
        return lastReplayBufferPath;
      }

      // Fallback: attempt to resolve from output directory
      if (OBS_REPLAY_OUTPUT_DIR) {
        const latest = findLatestReplayBuffer(OBS_REPLAY_OUTPUT_DIR);
        if (latest) {
          replayBufferState.lastSavedAt = Date.now();
          replayBufferState.lastSavedPath = latest;
          return latest;
        }
      }

      replayBufferState.lastError = "Replay buffer saved but output path not found";
      return "(obs-managed)";
    } catch (err) {
      replayBufferState.lastError = "SaveReplayBuffer failed";
      obsLogger.warn({ err }, "SaveReplayBuffer failed");
      return null;
    }
  }

async function startReplayBuffer(): Promise<void> {
  const status = await obs.call("GetReplayBufferStatus");
  if (!status.outputActive) {
    await obs.call("StartReplayBuffer");
  }
}

async function takeScreenshot(sceneOrSourceName: string, outputPath: string) {
  // Screenshot a source by name. The caller controls where to store it.
  try {
    await obs.call("GetSourceScreenshot" as any, {
      sourceName: sceneOrSourceName,
      imageFormat: "png",
      imageFilePath: outputPath,
    });
    return true;
  } catch (err) {
    obsLogger.warn({ err, sourceName: sceneOrSourceName, outputPath }, "GetSourceScreenshot failed");
    return false;
  }
}

/**
 * Find the most recent replay buffer file in the OBS output directory.
 * Fallback method when we can't get the path from OBS events.
 */
function findLatestReplayBuffer(directory: string, maxAgeMs: number = 30000): string | null {
  if (!directory || !fs.existsSync(directory)) {
    return null;
  }

  try {
    const files = fs.readdirSync(directory);
    const now = Date.now();

    // Filter for video files and sort by modification time (newest first)
    const videoFiles = files
      .filter((f) => /\.(mp4|mkv|flv|mov|ts)$/i.test(f))
      .map((f) => {
        const fullPath = path.join(directory, f);
        const stats = fs.statSync(fullPath);
        return { path: fullPath, mtime: stats.mtimeMs };
      })
      .filter((f) => now - f.mtime < maxAgeMs) // Only recent files
      .sort((a, b) => b.mtime - a.mtime);

    return videoFiles.length > 0 ? videoFiles[0].path : null;
  } catch (err) {
    ffmpegLogger.warn({ err, directory }, "Failed to scan for replay buffer files");
    return null;
  }
}

/**
 * Attempt to trim the replay buffer to extract the clip.
 * This is a best-effort operation - if it fails, we still emit the artifact event.
 */
async function attemptClipTrim(
  replayBufferPath: string,
  t0: number,
  t1: number,
  sessionDir: string,
  artifactId: string,
  sessionStartedAt: number,
  replayBufferSavedAt: number
): Promise<TrimClipResult | null> {
  try {
    ffmpegLogger.info(
      {
        replayBufferPath,
        t0,
        t1,
        sessionDir,
        artifactId,
      },
      "Starting clip trim"
    );

    const result = await trimClip({
      replayBufferPath,
      t0,
      t1,
      sessionDir,
      artifactId,
      format: CLIP_OUTPUT_FORMAT,
      sessionStartedAt,
      replayBufferSavedAt,
      replayBufferSeconds: REPLAY_BUFFER_SECONDS,
    });

    ffmpegLogger.info(
      {
        clipPath: result.clipPath,
        thumbnailPath: result.thumbnailPath,
        duration: result.duration,
      },
      "Clip trimmed successfully"
    );

    return result;
  } catch (err) {
    if (err instanceof FFmpegError) {
      ffmpegLogger.error(
        {
          code: err.code,
          message: err.message,
          details: err.details,
        },
        "Clip trimming failed"
      );
    } else {
      ffmpegLogger.error({ err }, "Unexpected error during clip trimming");
    }
    return null;
  }
}

async function main() {
  // Initialize FFmpeg with custom paths if provided
  initializeFFmpeg({
    ffmpegPath: FFMPEG_PATH,
    ffprobePath: FFPROBE_PATH,
  });

  // Check FFmpeg availability
  const ffmpegStatus = await checkFFmpegAvailability();
  ffmpegReady = ffmpegStatus.ready;

  if (ffmpegStatus.ready) {
    ffmpegLogger.info("FFmpeg and FFprobe are available");
  } else {
    ffmpegLogger.warn(
      {
        ffmpeg: ffmpegStatus.ffmpeg,
        ffprobe: ffmpegStatus.ffprobe,
      },
      "FFmpeg tools not fully available - clip trimming will be disabled"
    );
  }

  // Initialize MediaMTX manager
  const mediamtxManager = getMediaMTXManager();
  mediamtxAvailable = mediamtxManager.isBinaryAvailable();

  if (mediamtxAvailable) {
    videoLogger.info(
      { config: mediamtxManager.getConfig() },
      "MediaMTX binary found - video streaming available"
    );

    // Auto-start MediaMTX server on backend startup
    try {
      videoLogger.info("Auto-starting MediaMTX server...");
      await mediamtxManager.start();
      videoLogger.info("MediaMTX server auto-started successfully");
    } catch (err) {
      videoLogger.error({ err }, "Failed to auto-start MediaMTX server - video streaming may be unavailable");
    }
  } else {
    videoLogger.warn("MediaMTX binary not found - video streaming disabled");
  }

  // Check database connectivity
  const dbHealthy = await checkDatabaseHealth();
  if (dbHealthy) {
    dbLogger.info("Database connection established");
  } else {
    dbLogger.warn("Database connection unavailable - session persistence will be limited");
  }

  // Initialize AI agent router
  const agentsEnabled = agentRouter.initialize();
  if (agentsEnabled) {
    // Register specialized workflow agents for all workflow types
    agentRouter.registerAgent(new StreamerAgent());
    agentRouter.registerAgent(new PodcastAgent());
    agentRouter.registerAgent(new WritersRoomAgent());
    agentRouter.registerAgent(new DebateAgent());
    agentRouter.registerAgent(new BrainstormAgent());

    agentLogger.info(
      { stats: agentRouter.getStats() },
      "AI agent router initialized with workflow agents"
    );
  } else {
    agentLogger.warn("AI agent router disabled - set ANTHROPIC_API_KEY to enable");
  }

  // Log startup configuration (config is already validated at import time)
  logger.info(
    {
      nodeEnv: config.NODE_ENV,
      httpPort: HTTP_PORT,
      wsPort: CONFIG_WS_PORT,
      sessionDir: SESSION_DIR,
      obsWsUrl: OBS_WS_URL,
      logLevel: config.LOG_LEVEL,
      logFormat: config.LOG_FORMAT,
      sttProvider: config.STT_PROVIDER,
      ffmpegReady,
      mediamtxAvailable,
      clipOutputFormat: CLIP_OUTPUT_FORMAT,
      dbHealthy,
      agentsEnabled,
      aiProvider: config.AI_PROVIDER,
      aiModel: config.AI_MODEL,
    },
    "Initializing desktop-companion service with validated configuration"
  );

  ensureDir(SESSION_DIR);
  await connectOBS();

  const app = express();

  // Configure Express to trust proxy headers for correct IP detection
  // This is CRITICAL for rate limiting to work correctly behind reverse proxies
  // Trust first proxy (e.g., nginx, Cloudflare, AWS ALB)
  app.set("trust proxy", 1);

  const corsOrigins = new Set(
    [config.APP_URL, config.FRONTEND_URL, ...config.CORS_ORIGINS.split(",")]
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Enable logging for CORS debugging if needed
    // apiLogger.debug({ origin, method: req.method, url: req.url }, "Incoming request CORS check");

    if (origin) {
      const isAllowed = corsOrigins.has(origin) ||
        (config.NODE_ENV === "development" && corsOrigins.size === 0);

      if (isAllowed) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key"
        );
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        );
      } else {
        apiLogger.warn({ origin }, "CORS Origin not allowed");
      }
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  });

  // Apply request logging middleware
  app.use(requestLoggingMiddleware());
  app.use(express.json({ limit: "2mb" }));

  // =============================================================================
  // Authentication Routes (API v1)
  // =============================================================================
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/auth/oauth", oauthRouter);
  apiLogger.info("Auth routes mounted at /api/v1/auth");

  // =============================================================================
  // Sessions Routes (API v1)
  // =============================================================================
  app.use("/api/sessions", sessionsRouter);
  app.use("/sessions", sessionsRouter);
  apiLogger.info("Sessions routes mounted at /api/sessions");

  // =============================================================================
  // Clips Routes
  // =============================================================================
  app.use("/api/clips", clipsRouter);
  app.use("/api/sessions/:sessionId/clips", sessionClipsRouter);
  app.use("/sessions/:sessionId/clips", sessionClipsRouter);
  apiLogger.info("Clips routes mounted at /api/clips and /api/sessions/:sessionId/clips");

  // =============================================================================
  // Outputs Routes
  // =============================================================================
  app.use("/api/outputs", outputsRouter);
  app.use("/api/sessions/:sessionId/outputs", sessionOutputsRouter);
  apiLogger.info("Outputs routes mounted at /api/outputs and /api/sessions/:sessionId/outputs");

  // =============================================================================
  // Events Routes
  // =============================================================================
  app.use("/api/events", eventsRouter);
  app.use("/api/sessions/:sessionId/events", sessionEventsRouter);
  app.use("/sessions/:sessionId/events", sessionEventsRouter);
  apiLogger.info("Events routes mounted at /api/events and /api/sessions/:sessionId/events");

  // =============================================================================
  // Recordings Routes (Mobile uploads)
  // =============================================================================
  app.use("/api/sessions", recordingsRouter);
  apiLogger.info("Recordings routes mounted at /api/sessions/:sessionId/recordings");

  // =============================================================================
  // Triggers Routes (Auto-marker configuration)
  // =============================================================================
  // Triggers router requires multer - load dynamically if available
  try {
    const { triggersRouter } = await import("./api/triggers.js");
    app.use("/api/workflows/:workflow/triggers", triggersRouter);
    apiLogger.info("Triggers routes mounted at /api/workflows/:workflow/triggers");
  } catch (err) {
    apiLogger.warn("Triggers routes not available (multer may not be installed)")
  }

  // =============================================================================
  // Billing Routes (API v1)
  // =============================================================================
  // Raw body parsing for Stripe webhooks
  app.use("/api/v1/billing/webhook", express.raw({ type: "application/json" }));
  app.use("/api/v1/billing", billingRouter);
  apiLogger.info("Billing routes mounted at /api/v1/billing");

  // =============================================================================
  // Export Routes (API v1)
  // =============================================================================
  app.use("/api/v1/export", exportRouter);
  apiLogger.info("Export routes mounted at /api/v1/export");

  // =============================================================================
  // Branding Routes (API v1)
  // =============================================================================
  app.use("/api/v1/branding", brandingRouter);
  apiLogger.info("Branding routes mounted at /api/v1/branding");

  // =============================================================================
  // Social Media Routes (API v1)
  // =============================================================================
  app.use("/api/v1/social", socialRouter);
  apiLogger.info("Social media routes mounted at /api/v1/social");

  // =============================================================================
  // Video Streaming Routes
  // =============================================================================
  app.use("/api/video", videoRouter);
  apiLogger.info("Video streaming routes mounted at /api/video");

  // =============================================================================
  // Agent Observability Routes
  // =============================================================================
  app.get("/api/agents/stats", (_req, res) => {
    const stats = agentRouter.getStats();
    const opikConfigured = !!(config.OPIK_WORKSPACE_NAME && config.OPIK_PROJECT_NAME);

    res.json({
      success: true,
      data: {
        ...stats,
        opik: {
          configured: opikConfigured,
          workspaceName: config.OPIK_WORKSPACE_NAME || null,
          projectName: config.OPIK_PROJECT_NAME || null,
          dashboardUrl: opikConfigured
            ? `https://www.comet.com/opik/${config.OPIK_WORKSPACE_NAME}/redirect/projects?query=${encodeURIComponent(config.OPIK_PROJECT_NAME || '')}`
            : null,
        },
        config: {
          aiProvider: config.AI_PROVIDER,
          aiModel: config.AI_MODEL,
          maxTokens: config.AI_MAX_TOKENS,
        },
      },
    });
  });
  app.get("/agents/status", (_req, res) => {
    const stats = agentRouter.getStats();
    res.json({
      ok: true,
      enabled: stats.enabled,
      workflowCount: stats.workflowCount,
      agentCount: stats.agentCount,
      activeSessionCount: stats.activeSessionCount,
      aiProvider: config.AI_PROVIDER,
      aiModel: config.AI_MODEL,
    });
  });
  apiLogger.info("Agent observability routes mounted at /api/agents");

  let wss: WebSocketServer;
  let wsPort = CONFIG_WS_PORT;
  try {
    const started = await startWebSocketServer(CONFIG_WS_PORT);
    wss = started.server;
    wsPort = started.port;
    wss.on("error", (err) => {
      logger.error({ err, port: wsPort }, "WebSocket server error");
    });
    if (wsPort !== CONFIG_WS_PORT) {
      logger.warn(
        { configuredPort: CONFIG_WS_PORT, activePort: wsPort },
        "WebSocket server started on a fallback port"
      );
    }
    wss.on("connection", (ws) => {
      logger.debug("New WebSocket client connected");
      ws.send(JSON.stringify({ type: "hello", ok: true }));

      // Handle incoming messages (e.g., MediaPipe detections from browser)
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());

          // Handle MediaPipe gesture detections from frontend
          if (message.type === "MEDIAPIPE_DETECTION" && message.sessionId) {
            const visualTriggerService = getVisualTriggerService(wss);
            const detections = message.payload?.detections || [];

            if (detections.length > 0) {
              logger.debug(
                { sessionId: message.sessionId, detections },
                "Received MediaPipe detections from browser"
              );
              visualTriggerService.handleMediaPipeDetections(detections);
            }
          }
        } catch (err) {
          // Ignore parse errors for non-JSON messages
        }
      });
    });
  } catch (err: any) {
    logger.error({ err, port: wsPort }, "Failed to start WebSocket server");
    // If WebSocket fails, we can't really function as a real-time service
    // but we can at least log the error clearly.
    throw err;
  }

  // =============================================================================
  // Clip Queue Routes (requires wss)
  // =============================================================================
  app.use("/api/clip-queue", clipQueueRouter);
  app.use("/api/sessions/:sessionId/clip-queue", createSessionClipQueueRouter({ wss, saveReplayBuffer }));
  apiLogger.info("Clip queue routes mounted at /api/clip-queue and /api/sessions/:sessionId/clip-queue");

  // Initialize STT Manager with WebSocket server
  const sttManager = getSTTManager();
  sttManager.initialize(wss);
  sttLogger.info("STT Manager initialized");

  // Initialize clip queue processor
  const clipQueueProcessor = getClipQueueProcessor(wss);
  clipQueueProcessor.start();

  // Initialize trigger services + auto-clip manager
  const autoClipManager = getAutoClipManager(wss);
  const audioTriggerService = getAudioTriggerService(wss);
  const visualTriggerService = getVisualTriggerService(wss);

  audioTriggerService.onTrigger((event) => {
    void autoClipManager.handleTrigger({ type: "audio", event });
  });

  visualTriggerService.onTrigger((event) => {
    void autoClipManager.handleTrigger({
      type: "visual",
      event: {
        sessionId: event.sessionId,
        workflow: event.workflow,
        label: event.detection.label,
        confidence: event.detection.confidence,
        t: event.t,
      },
    });
  });

  // =============================================================================
  // Extracted Helper Functions
  // =============================================================================

  function buildWsUrl(req: express.Request): string {
    const host = req.hostname || "localhost";
    const protocol = req.secure ? "wss" : "ws";
    return `${protocol}://${host}:${wsPort}`;
  }

  async function startSessionInternal(body: Record<string, unknown>): Promise<{
    sessionId: string;
    startedAt: number;
  }> {
    if (session) {
      throw new Error("Session already active");
    }

    const validated = SessionConfigSchema.parse(body);
    const t0 = nowMs();

    const dbSession = await SessionService.createSession({
      workflow: validated.workflow,
      captureMode: validated.captureMode,
      title: validated.title,
      participants: validated.participants.map((p) => p.name),
      startedAt: new Date(t0),
    });

    const sessionId = dbSession.id;
    const sessionDir = path.join(SESSION_DIR, sessionId);
    ensureDir(sessionDir);

    session = {
      config: { ...validated, sessionId },
      dbId: dbSession.id,
      t0UnixMs: t0,
    };

    await ensureReplayBuffer();

    await autoClipManager.initialize(validated.workflow);
    await visualTriggerService.start(sessionId, validated.workflow, "mediapipe");

    const startEvent: any = {
      id: uuidv4(),
      type: "SESSION_START",
      ts: t0,
      payload: { sessionId, workflow: validated.workflow, title: validated.title },
    };
    emitEvent(wss, startEvent);

    apiLogger.info({ sessionId, workflow: validated.workflow }, "Session started");
    return { sessionId, startedAt: t0 };
  }

  async function stopSessionInternal(): Promise<{ ok: boolean; t1: number; duration: number }> {
    if (!session) {
      throw new Error("No active session");
    }

    const t1 = nowMs();
    const duration = t1 - session.t0UnixMs;

    await SessionService.updateSession(session.dbId, {
      endedAt: new Date(t1),
      status: "completed",
    });

    await autoClipManager.stopAll();
    audioTriggerService.stop();
    visualTriggerService.stop();

    const endEvent: any = {
      id: uuidv4(),
      type: "SESSION_END",
      ts: t1,
      payload: { sessionId: session.config.sessionId, duration },
    };
    emitEvent(wss, endEvent);

    apiLogger.info({ sessionId: session.config.sessionId, duration }, "Session stopped");
    session = null;
    return { ok: true, t1, duration };
  }

  async function createClipInternal(now: number) {
    if (!session) {
      throw new Error("No active session");
    }

    const clipStart = session.clipStartT || now - REPLAY_BUFFER_SECONDS * 1000;
    session.clipStartT = now;

    const replayBufferPath = await saveReplayBuffer();
    const artifactId = uuidv4();
    const t0 = Math.max(0, (clipStart - session.t0UnixMs) / 1000);
    const t1 = (now - session.t0UnixMs) / 1000;

    const artifactEvent: any = {
      id: uuidv4(),
      type: "ARTIFACT_CLIP_CREATED",
      ts: now,
      payload: { artifactId, type: "clip", path: replayBufferPath || "(pending)", t0, t1, duration: t1 - t0 },
    };
    emitEvent(wss, artifactEvent);

    let trimResult: TrimClipResult | null = null;
    if (ffmpegReady && replayBufferPath && replayBufferPath !== "(obs-managed)" && fs.existsSync(replayBufferPath)) {
      trimResult = await attemptClipTrim(replayBufferPath, t0, t1, sessionPath(), artifactId, session.t0UnixMs, now);
    } else if (ffmpegReady && OBS_REPLAY_OUTPUT_DIR) {
      const latestReplayBuffer = findLatestReplayBuffer(OBS_REPLAY_OUTPUT_DIR);
      if (latestReplayBuffer) {
        ffmpegLogger.info({ path: latestReplayBuffer }, "Using latest replay buffer file from directory scan");
        trimResult = await attemptClipTrim(latestReplayBuffer, t0, t1, sessionPath(), artifactId, session.t0UnixMs, now);
      }
    }

    await ClipService.createClip({
      sessionId: session.dbId,
      artifactId,
      path: trimResult?.clipPath || replayBufferPath || "(pending)",
      t0,
      t1,
      thumbnailId: undefined,
    });

    if (trimResult) {
      const updateEvent: any = {
        id: uuidv4(),
        type: "ARTIFACT_CLIP_CREATED",
        ts: nowMs(),
        payload: {
          artifactId, type: "clip", path: trimResult.clipPath, thumbnailPath: trimResult.thumbnailPath,
          t0, t1, duration: trimResult.duration, format: trimResult.metadata?.format,
          videoCodec: trimResult.metadata?.codec, audioCodec: trimResult.metadata?.codec,
        },
      };
      emitEvent(wss, updateEvent);
    }

    apiLogger.info({ artifactId, t0, t1, duration: t1 - t0, trimmed: !!trimResult, clipPath: trimResult?.clipPath }, "Clip created");

    return {
      ok: true,
      artifactId,
      replayBufferPath,
      clipPath: trimResult?.clipPath,
      thumbnailPath: trimResult?.thumbnailPath,
      t0,
      t1,
      duration: trimResult?.duration || t1 - t0,
    };
  }

  // =============================================================================
  // OBS Routes (modular router)
  // =============================================================================
  const obsRouteDeps: ObsRouteDeps = {
    obs,
    getSession: () => session,
    setSession: (s) => { session = s as SessionState | null; },
    wss,
    emitEvent,
    config: { OBS_WS_URL, OBS_WS_PASSWORD: OBS_WS_PASSWORD || "", WS_PORT: wsPort },
    ffmpegReady: () => ffmpegReady,
    ffmpegStatus: () => checkFFmpegAvailability(),
    saveReplayBuffer,
    startSessionInternal,
    stopSessionInternal,
  };
  const obsRouter = createObsRouter(obsRouteDeps);
  app.use("/api/obs", obsRouter);
  app.use("/obs", obsRouter);
  apiLogger.info("OBS routes mounted at /api/obs and /obs");

  // =============================================================================
  // Dual Route Mounting (API compatibility)
  // =============================================================================
  app.use("/sessions", sessionsRouter);
  app.use("/sessions/:sessionId/clips", sessionClipsRouter);
  app.use("/sessions/:sessionId/events", sessionEventsRouter);
  app.get("/agents/status", (_req, res) => {
    const stats = agentRouter.getStats();
    res.json({ ok: true, success: true, data: stats });
  });
  apiLogger.info("Dual route mounts registered (non-prefixed aliases)");

  // =============================================================================
  // FFmpeg Status Route
  // =============================================================================
  app.get("/ffmpeg/status", async (_req, res) => {
    const status = await checkFFmpegAvailability();
    res.json({
      ok: true,
      success: true,
      data: {
        ready: ffmpegReady,
        ffmpeg: status.ffmpeg,
        ffprobe: status.ffprobe,
        clipOutputFormat: CLIP_OUTPUT_FORMAT,
        ffmpegPath: FFMPEG_PATH || "(default)",
        ffprobePath: FFPROBE_PATH || "(default)",
      },
    });
  });
  apiLogger.info("FFmpeg status route mounted at /ffmpeg/status");

  // =============================================================================
  // Session Management Routes
  // =============================================================================
  app.post("/session/start", async (req, res) => {
    try {
      if (session) {
        return res.status(409).json({
          ok: false,
          error: "Session already active",
          session: session.config,
          startedAt: session.t0UnixMs,
        });
      }

      const result = await startSessionInternal(req.body);
      const ws = buildWsUrl(req);
      return res.json({ ok: true, ...result, ws });
    } catch (err: any) {
      apiLogger.error({ err }, "Failed to start session");
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  app.post("/session/stop", async (req, res) => {
    try {
      const result = await stopSessionInternal();
      return res.json(result);
    } catch (err: any) {
      return res.status(404).json({ ok: false, error: err.message });
    }
  });

  app.get("/session/force-stop", async (req, res) => {
    session = null;
    await autoClipManager.stopAll();
    audioTriggerService.stop();
    visualTriggerService.stop();
    return res.json({ ok: true, message: "Session cleared via GET" });
  });

  app.post("/session/force-stop", async (req, res) => {
    const t1 = nowMs();

    if (session) {
      /*
      try {
        await SessionService.updateSession(session.dbId, {
          endedAt: new Date(t1),
          status: "completed",
        });
      } catch (err) {
        apiLogger.error({ err }, "Failed to update session in DB during force-stop");
      }
      */

      apiLogger.info({ sessionId: session.config.sessionId }, "Session force-stopped (memory only)");
      session = null;
    } else {
      apiLogger.info("Force-stop called but no active session in memory");
    }

    await autoClipManager.stopAll();
    audioTriggerService.stop();
    visualTriggerService.stop();

    return res.json({ ok: true, message: "Session state cleared", t1 });
  });

  app.get("/session/status", (req, res) => {
    if (!session) {
      return res.json({ ok: true, active: false });
    }
    return res.json({
      ok: true,
      active: true,
      sessionId: session.config.sessionId,
      workflow: session.config.workflow,
      captureMode: session.config.captureMode,
      title: session.config.title,
      participants: session.config.participants,
      startedAt: session.t0UnixMs,
      elapsed: nowMs() - session.t0UnixMs,
      // Keep legacy fields for backward compatibility
      session: session.config,
      t0: session.t0UnixMs,
    });
  });

  // =============================================================================
  // OBS Integration Routes
  // =============================================================================
  app.post("/clip", async (req, res) => {
    try {
      const result = await createClipInternal(nowMs());
      return res.json(result);
    } catch (err: any) {
      const statusCode = err.message === "No active session" ? 404 : 500;
      apiLogger.error({ err }, "Failed to create clip");
      return res.status(statusCode).json({ ok: false, error: err.message });
    }
  });

  app.post("/clip/start", async (req, res) => {
    if (!session) {
      return res.status(404).json({ ok: false, error: "No active session" });
    }
    const now = typeof req.body?.t === "number" ? req.body.t : nowMs();
    session.clipStartT = now;
    return res.json({ ok: true, t: now });
  });

  app.post("/clip/end", async (req, res) => {
    try {
      const now = typeof req.body?.t === "number" ? req.body.t : nowMs();
      const result = await createClipInternal(now);
      return res.json(result);
    } catch (err: any) {
      const statusCode = err.message === "No active session" ? 404 : 500;
      apiLogger.error({ err }, "Failed to create clip");
      return res.status(statusCode).json({ ok: false, error: err.message });
    }
  });

  // Screenshot handler (used by both /screenshot and /frame)
  const screenshotHandler: express.RequestHandler = async (req, res) => {
    if (!session) {
      return res.status(409).json({ ok: false, error: "No active session. Start a session first." });
    }

    try {
      const { sourceName } = req.body;
      if (!sourceName) {
        return res.status(400).json({ ok: false, error: "sourceName required" });
      }

      const now = nowMs();
      const artifactId = uuidv4();
      const fileName = `screenshot-${artifactId}.png`;
      const outputPath = sessionPath(fileName);

      const success = await takeScreenshot(sourceName, outputPath);

      if (success) {
        const artifactEvent: any = {
          id: uuidv4(),
          type: "ARTIFACT_FRAME_CREATED",
          ts: now,
          payload: {
            artifactId,
            type: "frame",
            path: outputPath,
            sourceName,
          },
        };
        emitEvent(wss, artifactEvent);

        apiLogger.info({ artifactId, sourceName, outputPath }, "Screenshot captured");
        return res.json({ ok: true, artifactId, path: outputPath });
      } else {
        return res.status(500).json({ ok: false, error: "Screenshot failed" });
      }
    } catch (err: any) {
      apiLogger.error({ err }, "Failed to capture screenshot");
      return res.status(500).json({ ok: false, error: err.message });
    }
  };
  app.post("/screenshot", screenshotHandler);
  app.post("/frame", screenshotHandler);

  // =============================================================================
  // Speech-to-Text Routes
  // =============================================================================
  const startSttHandler: express.RequestHandler = async (req, res) => {
    try {
      if (!session) {
        return res.status(404).json({ ok: false, error: "No active session" });
      }

      const sttConfig: STTStartConfig = {
        sessionId: session.config.sessionId!,
        sessionStartedAt: session.t0UnixMs,
        language: req.body.language || "en-US",
        enableDiarization: req.body.diarization !== false,
        enableInterimResults: req.body.interimResults !== false,
        keywords: req.body.keywords,
      };

      await sttManager.start(sttConfig);

      const provider = sttManager.getProvider();
      if (provider) {
        await audioTriggerService.start(sttConfig.sessionId, session.config.workflow, provider);
      }

      sttLogger.info({ sessionId: sttConfig.sessionId }, "STT started");
      return res.json({ ok: true, sessionId: sttConfig.sessionId });
    } catch (err: any) {
      sttLogger.error({ err }, "Failed to start STT");
      return res.status(500).json({ ok: false, error: err.message });
    }
  };

  const stopSttHandler: express.RequestHandler = async (_req, res) => {
    try {
      await sttManager.stop();
      audioTriggerService.stop();
      sttLogger.info("STT stopped");
      return res.json({ ok: true });
    } catch (err: any) {
      sttLogger.error({ err }, "Failed to stop STT");
      return res.status(500).json({ ok: false, error: err.message });
    }
  };

  const sendSttAudioHandler: express.RequestHandler = async (req, res) => {
    try {
      let audioBuffer: Buffer | null = null;

      if (Buffer.isBuffer(req.body)) {
        audioBuffer = req.body;
      } else if (req.body?.audio && typeof req.body.audio === "string") {
        const base64 = req.body.audio.includes(",")
          ? req.body.audio.split(",")[1]
          : req.body.audio;
        audioBuffer = Buffer.from(base64, "base64");
      }

      if (!audioBuffer) {
        return res.status(400).json({ ok: false, error: "Audio data required" });
      }

      await sttManager.sendAudio(audioBuffer);
      return res.json({ ok: true, bytesReceived: audioBuffer.length });
    } catch (err: any) {
      sttLogger.error({ err }, "Failed to send audio");
      return res.status(500).json({ ok: false, error: err.message });
    }
  };

  const sttStatusHandler: express.RequestHandler = (_req, res) => {
    const status = sttManager.getStatus();
    const providers = listSTTProviders();

    return res.json({
      ok: true,
      active: status.active,
      provider: status.provider,
      sessionId: status.sessionId,
      availableProviders: providers,
      configured: isSTTProviderAvailable(config.STT_PROVIDER),
    });
  };

  app.post("/stt/start", startSttHandler);
  app.post("/stt/stop", stopSttHandler);
  app.post("/stt/audio", sendSttAudioHandler);
  app.get("/stt/status", sttStatusHandler);

  // API aliases for frontend compatibility
  app.post("/api/stt/start", startSttHandler);
  app.post("/api/stt/stop", stopSttHandler);
  app.post("/api/stt/audio", sendSttAudioHandler);
  app.get("/api/stt/status", sttStatusHandler);

  // =============================================================================
  // Sentry Error Handler (must be before other error handlers)
  // =============================================================================
  app.use(sentryErrorHandler);

  // =============================================================================
  // Global Error Handler
  // =============================================================================
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ err, url: req.url, method: req.method }, "Unhandled error");

    // Don't expose internal errors to clients
    const statusCode = (err as any).statusCode || 500;
    const message = statusCode === 500 ? "Internal server error" : err.message;

    res.status(statusCode).json({
      ok: false,
      error: message,
      ...(config.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

  // =============================================================================
  // Health Check
  // =============================================================================
  // Health check handler - used by both /health and /api/health routes
  const healthCheckHandler: express.RequestHandler = async (req, res) => {
    const dbHealthy = await checkDatabaseHealth();
    const aiConfigured = isAIConfigured();
    const sttConfigured = isSTTProviderAvailable(config.STT_PROVIDER);

    // Get video streaming status
      const videoStatus = await mediamtxManager.getStatus();

      // Refresh replay buffer active state from OBS (best-effort)
      if (obs.identified) {
        try {
          const status = await obs.call("GetReplayBufferStatus");
          replayBufferState.active = status.outputActive;
        } catch (err) {
          replayBufferState.lastError = "Failed to read replay buffer status";
          obsLogger.warn({ err }, "Failed to read replay buffer status");
        }
      }

    return res.json({
      ok: true,
      service: "desktop-companion",
      version: "1.0.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbHealthy,
      ffmpeg: ffmpegReady,
      agents: agentRouter.isEnabled(),
      sessionId: session?.config.sessionId ?? null,
      components: {
        database: dbHealthy,
        obs: obs.identified,
        stt: sttConfigured,
        ai: aiConfigured,
        ffmpeg: ffmpegReady,
        agents: agentRouter.isEnabled(),
        replayBuffer: {
          active: replayBufferState.active,
          lastSavedAt: replayBufferState.lastSavedAt,
          lastSavedPath: replayBufferState.lastSavedPath,
          lastSaveRequestedAt: replayBufferState.lastSaveRequestedAt,
          lastError: replayBufferState.lastError,
          outputDir: OBS_REPLAY_OUTPUT_DIR ?? null,
        },
        video: {
          enabled: videoStatus.enabled,
          serverRunning: videoStatus.serverRunning,
          streamActive: videoStatus.streamActive,
        },
      },
      session: session
        ? {
          active: true,
          sessionId: session.config.sessionId,
          workflow: session.config.workflow,
          elapsed: nowMs() - session.t0UnixMs,
        }
        : { active: false },
    });
  };

  // Register health check at both /health and /api/health for frontend compatibility
  app.get("/health", healthCheckHandler);
  app.get("/api/health", healthCheckHandler);

  // =============================================================================
  // Start HTTP Server
  // =============================================================================
  app.listen(HTTP_PORT, () => {
    logger.info({ port: HTTP_PORT }, "HTTP server listening");
  });

  // =============================================================================
  // Graceful Shutdown
  // =============================================================================
  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully...");

    // Stop active session if any
    if (session) {
      const t1 = nowMs();
      const duration = t1 - session.t0UnixMs;

      await SessionService.updateSession(session.dbId, {
        endedAt: new Date(t1),
        status: "completed",
      });

      const endEvent: any = {
        id: uuidv4(),
        type: "SESSION_END",
        ts: t1,
        payload: { sessionId: session.config.sessionId, duration },
      };
      emitEvent(wss, endEvent);
    }

    // Stop MediaMTX server if running
    if (mediamtxManager.isRunning()) {
      videoLogger.info("Stopping MediaMTX server...");
      await mediamtxManager.cleanup();
    }

    // Flush Sentry events before shutdown
    await flushSentry(2000);

    // Close database connection
    await disconnectPrisma();

    // Close OBS connection
    if (obs.identified) {
      await obs.disconnect();
    }

    // Close WebSocket server
    wss.close(() => {
      logger.info("WebSocket server closed");
    });

    process.exit(0);
  });
}

main().catch(async (err) => {
  logger.error({ err }, "Fatal error in main");
  captureException(err, { context: "main" });
  await flushSentry(2000);
  process.exit(1);
});

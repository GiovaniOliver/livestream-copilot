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
import { sessionsRouter, setActiveSessionGetter } from "./api/sessions.js";
import { clipsRouter, sessionClipsRouter } from "./api/clips.js";
import { outputsRouter, sessionOutputsRouter } from "./api/outputs.js";
import { eventsRouter, sessionEventsRouter } from "./api/events.js";
import { billingRouter } from "./billing/index.js";
import { exportRouter } from "./export/index.js";
import { brandingRouter } from "./export/branding-routes.js";
import { socialRouter } from "./social/index.js";
import { videoRouter, getMediaMTXManager } from "./video/index.js";

// Use validated config values
const OBS_WS_URL = config.OBS_WS_URL;
const OBS_WS_PASSWORD = config.OBS_WS_PASSWORD;
const HTTP_PORT = config.HTTP_PORT;
const WS_PORT = config.WS_PORT;
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

// Register the active session getter with the sessions API
// This allows the API to distinguish between truly active sessions
// and orphaned sessions with endedAt: null from previous crashes/restarts
setActiveSessionGetter(getActiveSessionDbId);

// Database logger
const dbLogger = logger.child({ module: "db" });

// Agent logger
const agentLogger = logger.child({ module: "agents" });

// Track last saved replay buffer path (updated via OBS event)
let lastReplayBufferPath: string | null = null;

// Track FFmpeg availability
let ffmpegReady = false;

// Track MediaMTX availability
let mediamtxAvailable = false;

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function nowMs() {
  return Date.now();
}

function sessionPath(...parts: string[]) {
  if (!session) throw new Error("No active session");
  return path.join(SESSION_DIR, session.config.sessionId, ...parts);
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
        sessionId: session.config.sessionId,
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

    // Listen for replay buffer saved events to capture the output path
    obs.on("ReplayBufferSaved", (data: any) => {
      lastReplayBufferPath = data.savedReplayPath;
      obsLogger.info({ path: lastReplayBufferPath }, "Replay buffer saved");
    });
  } catch (err) {
    obsLogger.error({ err, url: OBS_WS_URL }, "Failed to connect to OBS WebSocket");
  }
}

async function ensureReplayBuffer() {
  // Best-effort: start replay buffer if not running.
  try {
    const status = await obs.call("GetReplayBufferStatus");
    if (!status.outputActive) {
      await obs.call("StartReplayBuffer");
      obsLogger.info("Replay buffer started");
    }
  } catch (err) {
    obsLogger.warn({ err }, "Failed to ensure replay buffer (is obs-websocket enabled?)");
  }
}

async function saveReplayBuffer(): Promise<string | null> {
  // OBS writes replay file to the configured path.
  // We listen for the ReplayBufferSaved event to get the actual path.
  try {
    // Reset last path before saving
    lastReplayBufferPath = null;

    await obs.call("SaveReplayBuffer");

    // Wait briefly for the event to fire (OBS sends it after file is written)
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (lastReplayBufferPath) {
      return lastReplayBufferPath;
    }

    // Fallback: if we didn't get the event, return placeholder
    return "(obs-managed)";
  } catch (err) {
    obsLogger.warn({ err }, "SaveReplayBuffer failed");
    return null;
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
      wsPort: WS_PORT,
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
  const corsOrigins = new Set(
    [config.APP_URL, config.FRONTEND_URL, ...config.CORS_ORIGINS.split(",")]
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && corsOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
      );
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
  apiLogger.info("Sessions routes mounted at /api/sessions");

  // =============================================================================
  // Clips Routes
  // =============================================================================
  app.use("/api/clips", clipsRouter);
  app.use("/api/sessions/:sessionId/clips", sessionClipsRouter);
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
  apiLogger.info("Events routes mounted at /api/events and /api/sessions/:sessionId/events");

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

  const wss = new WebSocketServer({ port: WS_PORT });
  wss.on("connection", (ws) => {
    logger.debug("New WebSocket client connected");
    ws.send(JSON.stringify({ type: "hello", ok: true }));
  });

  // Initialize STT Manager with WebSocket server
  const sttManager = getSTTManager();
  sttManager.initialize(wss);
  sttLogger.info("STT Manager initialized");

  // =============================================================================
  // Agent Processing Routes (API v1)
  // =============================================================================
  // Note: agentRouter is an internal event router, not an Express router
  // It processes events via routeEvent() calls, not HTTP endpoints
  // apiLogger.info("Agent event router initialized (internal use only)");

  // =============================================================================
  // Session Management Routes
  // =============================================================================
  app.post("/session/start", async (req, res) => {
    const traceId = setOpikTraceId();

    await withOpikTrace(
      { name: "session.start", metadata: { endpoint: "/session/start" } },
      async () => {
      try {
        if (session) {
          return res.status(409).json({ ok: false, error: "Session already active" });
        }

        const validated = SessionConfigSchema.parse(req.body);
        const sessionId = validated.sessionId || uuidv4();
        const t0 = nowMs();

        const sessionDir = path.join(SESSION_DIR, sessionId);
        ensureDir(sessionDir);

        // Persist session to database
        const dbSession = await SessionService.createSession({
          workflow: validated.workflow,
          captureMode: validated.captureMode,
          title: validated.title,
          participants: validated.participants.map((p) => p.name),
          startedAt: new Date(t0),
        });

        session = {
          config: { ...validated, sessionId },
          dbId: dbSession.id,
          t0UnixMs: t0,
        };

        await ensureReplayBuffer();

        // Emit SESSION_START event
        const startEvent: EventEnvelope = {
          id: uuidv4(),
          type: "SESSION_START",
          ts: t0,
          payload: { sessionId, workflow: validated.workflow, title: validated.title },
          observability: { traceId },
        };
        emitEvent(wss, startEvent);

        apiLogger.info({ sessionId, workflow: validated.workflow }, "Session started");
        return res.json({ sessionId, startedAt: t0 });
      } catch (err: any) {
        apiLogger.error({ err }, "Failed to start session");
        return res.status(400).json({ ok: false, error: err.message });
      }
    });
  });

  app.post("/session/stop", async (req, res) => {
    const traceId = setOpikTraceId();

    await withOpikTrace(
      { name: "session.stop", metadata: { endpoint: "/session/stop" } },
      async () => {
      if (!session) {
        return res.status(404).json({ ok: false, error: "No active session" });
      }

      const t1 = nowMs();
      const duration = t1 - session.t0UnixMs;

      // Update session in database
      await SessionService.updateSession(session.dbId, {
        endedAt: new Date(t1),
        status: "completed",
      });

      // Emit SESSION_END event
      const endEvent: EventEnvelope = {
        id: uuidv4(),
        type: "SESSION_END",
        ts: t1,
        payload: { sessionId: session.config.sessionId, duration },
        observability: { traceId },
      };
      emitEvent(wss, endEvent);

      apiLogger.info({ sessionId: session.config.sessionId, duration }, "Session stopped");

      session = null;
      return res.json({ ok: true, t1, duration });
    });
  });

  app.get("/session/status", (req, res) => {
    if (!session) {
      return res.json({ ok: true, active: false });
    }
    return res.json({
      ok: true,
      active: true,
      session: session.config,
      t0: session.t0UnixMs,
      elapsed: nowMs() - session.t0UnixMs,
    });
  });

  // =============================================================================
  // OBS Integration Routes
  // =============================================================================
  app.post("/clip", async (req, res) => {
    const traceId = setOpikTraceId();

    await withOpikTrace(
      { name: "clip.create", metadata: { endpoint: "/clip" } },
      async () => {
      if (!session) {
        return res.status(404).json({ ok: false, error: "No active session" });
      }

      try {
        const now = nowMs();
        const clipStart = session.clipStartT || now - REPLAY_BUFFER_SECONDS * 1000;
        session.clipStartT = now;

        // Save replay buffer
        const replayBufferPath = await saveReplayBuffer();

        // Generate artifact ID
        const artifactId = uuidv4();

        // Calculate clip timestamps
        const t0 = Math.max(0, (clipStart - session.t0UnixMs) / 1000);
        const t1 = (now - session.t0UnixMs) / 1000;

        // Emit artifact event (before trimming)
        const artifactEvent: EventEnvelope = {
          id: uuidv4(),
          type: "ARTIFACT_CLIP_CREATED",
          ts: now,
          payload: {
            artifactId,
            type: "clip",
            path: replayBufferPath || "(pending)",
            t0,
            t1,
            duration: t1 - t0,
          },
          observability: { traceId },
        };
        emitEvent(wss, artifactEvent);

        // Attempt FFmpeg trim if available and we have a valid replay buffer path
        let trimResult: TrimClipResult | null = null;
        if (
          ffmpegReady &&
          replayBufferPath &&
          replayBufferPath !== "(obs-managed)" &&
          fs.existsSync(replayBufferPath)
        ) {
          trimResult = await attemptClipTrim(
            replayBufferPath,
            t0,
            t1,
            sessionPath(),
            artifactId,
            session.t0UnixMs,
            now
          );
        } else if (ffmpegReady && OBS_REPLAY_OUTPUT_DIR) {
          // Fallback: try to find the latest replay buffer file
          const latestReplayBuffer = findLatestReplayBuffer(OBS_REPLAY_OUTPUT_DIR);
          if (latestReplayBuffer) {
            ffmpegLogger.info(
              { path: latestReplayBuffer },
              "Using latest replay buffer file from directory scan"
            );
            trimResult = await attemptClipTrim(
              latestReplayBuffer,
              t0,
              t1,
              sessionPath(),
              artifactId,
              session.t0UnixMs,
              now
            );
          }
        }

        // Persist clip to database
        const dbClip = await ClipService.createClip({
          sessionId: session.dbId,
          artifactId,
          path: trimResult?.clipPath || replayBufferPath || "(pending)",
          t0,
          t1,
          thumbnailId: undefined, // TODO: implement thumbnail ID tracking
        });

        // If trimming succeeded, emit an update event with the trimmed clip path
        if (trimResult) {
          const updateEvent: EventEnvelope = {
            id: uuidv4(),
            type: "ARTIFACT_CLIP_CREATED",
            ts: nowMs(),
            payload: {
              artifactId,
              type: "clip",
              path: trimResult.clipPath,
              thumbnailPath: trimResult.thumbnailPath,
              t0,
              t1,
              duration: trimResult.duration,
              format: trimResult.format,
              videoCodec: trimResult.videoCodec,
              audioCodec: trimResult.audioCodec,
            },
            observability: { traceId },
          };
          emitEvent(wss, updateEvent);
        }

        apiLogger.info(
          {
            artifactId,
            t0,
            t1,
            duration: t1 - t0,
            trimmed: !!trimResult,
            clipPath: trimResult?.clipPath,
          },
          "Clip created"
        );

        return res.json({
          ok: true,
          artifactId,
          replayBufferPath,
          clipPath: trimResult?.clipPath,
          thumbnailPath: trimResult?.thumbnailPath,
          t0,
          t1,
          duration: trimResult?.duration || t1 - t0,
        });
      } catch (err: any) {
        apiLogger.error({ err }, "Failed to create clip");
        return res.status(500).json({ ok: false, error: err.message });
      }
    });
  });

  app.post("/screenshot", async (req, res) => {
    const traceId = setOpikTraceId();

    await withOpikTrace(
      { name: "screenshot.create", metadata: { endpoint: "/screenshot" } },
      async () => {
      if (!session) {
        return res.status(404).json({ ok: false, error: "No active session" });
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
          const artifactEvent: EventEnvelope = {
            id: uuidv4(),
            type: "ARTIFACT_FRAME_CREATED",
            ts: now,
            payload: {
              artifactId,
              type: "frame",
              path: outputPath,
              sourceName,
            },
            observability: { traceId },
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
    });
  });

  // =============================================================================
  // Speech-to-Text Routes
  // =============================================================================
  app.post("/stt/start", async (req, res) => {
    try {
      if (!session) {
        return res.status(404).json({ ok: false, error: "No active session" });
      }

      const config: STTStartConfig = {
        sessionId: session.config.sessionId,
        language: req.body.language || "en",
        diarization: req.body.diarization !== false,
        interimResults: req.body.interimResults !== false,
        keywords: req.body.keywords,
      };

      await sttManager.start(config);

      sttLogger.info({ sessionId: config.sessionId }, "STT started");
      return res.json({ ok: true, sessionId: config.sessionId });
    } catch (err: any) {
      sttLogger.error({ err }, "Failed to start STT");
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/stt/stop", async (req, res) => {
    try {
      await sttManager.stop();
      sttLogger.info("STT stopped");
      return res.json({ ok: true });
    } catch (err: any) {
      sttLogger.error({ err }, "Failed to stop STT");
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/stt/audio", async (req, res) => {
    try {
      if (!req.body || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({ ok: false, error: "Audio data required (raw buffer)" });
      }

      await sttManager.sendAudio(req.body);
      return res.json({ ok: true });
    } catch (err: any) {
      sttLogger.error({ err }, "Failed to send audio");
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/stt/status", (req, res) => {
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
  });

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

    return res.json({
      ok: true,
      service: "desktop-companion",
      version: "1.0.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      components: {
        database: dbHealthy,
        obs: obs.identified,
        stt: sttConfigured,
        ai: aiConfigured,
        ffmpeg: ffmpegReady,
        agents: agentRouter.isEnabled(),
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

      const endEvent: EventEnvelope = {
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

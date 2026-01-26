/**
 * Desktop Companion Server
 *
 * Main entry point for the desktop companion service that provides:
 * - OBS WebSocket integration for replay buffer and screenshots
 * - Session management for livestream capture workflows
 * - Event streaming via WebSocket
 * - Speech-to-text (STT) integration
 * - FFmpeg clip trimming pipeline (SOC-262)
 * - Opik observability integration
 */
import express from "express";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import OBSWebSocket from "obs-websocket-js";
import { config } from "./config/index.js";
import { withOpikTrace } from "./observability/opik.js";
import { EventEnvelopeSchema, SessionConfigSchema, } from "@livestream-copilot/shared";
import { logger, obsLogger, apiLogger, sttLogger, ffmpegLogger, requestLoggingMiddleware, setOpikTraceId, } from "./logger/index.js";
import { getSTTManager, isSTTProviderAvailable, listSTTProviders, } from "./stt/index.js";
import { trimClip, initializeFFmpeg, checkFFmpegAvailability, FFmpegError, } from "./ffmpeg/index.js";
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
const CLIP_OUTPUT_FORMAT = (process.env.CLIP_OUTPUT_FORMAT || "mp4");
const OBS_REPLAY_OUTPUT_DIR = process.env.OBS_REPLAY_OUTPUT_DIR;
const obs = new OBSWebSocket();
let session = null;
// Track last saved replay buffer path (updated via OBS event)
let lastReplayBufferPath = null;
// Track FFmpeg availability
let ffmpegReady = false;
function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}
function nowMs() {
    return Date.now();
}
function sessionPath(...parts) {
    if (!session)
        throw new Error("No active session");
    return path.join(SESSION_DIR, session.config.sessionId, ...parts);
}
function appendEvent(ev) {
    if (!session)
        return;
    const eventsFile = sessionPath("events.jsonl");
    fs.appendFileSync(eventsFile, JSON.stringify(ev) + "\n", "utf8");
}
function emitEvent(wsServer, ev) {
    // Validate before broadcasting
    EventEnvelopeSchema.parse(ev);
    appendEvent(ev);
    const msg = JSON.stringify(ev);
    wsServer.clients.forEach((client) => {
        if (client.readyState === 1)
            client.send(msg);
    });
}
async function connectOBS() {
    try {
        await obs.connect(OBS_WS_URL, OBS_WS_PASSWORD || undefined);
        obsLogger.info({ url: OBS_WS_URL }, "Connected to OBS WebSocket");
        // Listen for replay buffer saved events to capture the output path
        obs.on("ReplayBufferSaved", (data) => {
            lastReplayBufferPath = data.savedReplayPath;
            obsLogger.info({ path: lastReplayBufferPath }, "Replay buffer saved");
        });
    }
    catch (err) {
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
    }
    catch (err) {
        obsLogger.warn({ err }, "Failed to ensure replay buffer (is obs-websocket enabled?)");
    }
}
async function saveReplayBuffer() {
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
    }
    catch (err) {
        obsLogger.warn({ err }, "SaveReplayBuffer failed");
        return null;
    }
}
async function takeScreenshot(sceneOrSourceName, outputPath) {
    // Screenshot a source by name. The caller controls where to store it.
    try {
        await obs.call("GetSourceScreenshot", {
            sourceName: sceneOrSourceName,
            imageFormat: "png",
            imageFilePath: outputPath,
        });
        return true;
    }
    catch (err) {
        obsLogger.warn({ err, sourceName: sceneOrSourceName, outputPath }, "GetSourceScreenshot failed");
        return false;
    }
}
/**
 * Find the most recent replay buffer file in the OBS output directory.
 * Fallback method when we can't get the path from OBS events.
 */
function findLatestReplayBuffer(directory, maxAgeMs = 30000) {
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
    }
    catch (err) {
        ffmpegLogger.warn({ err, directory }, "Failed to scan for replay buffer files");
        return null;
    }
}
/**
 * Attempt to trim the replay buffer to extract the clip.
 * This is a best-effort operation - if it fails, we still emit the artifact event.
 */
async function attemptClipTrim(replayBufferPath, t0, t1, sessionDir, artifactId, sessionStartedAt, replayBufferSavedAt) {
    try {
        ffmpegLogger.info({
            replayBufferPath,
            t0,
            t1,
            sessionDir,
            artifactId,
        }, "Starting clip trim");
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
        ffmpegLogger.info({
            clipPath: result.clipPath,
            thumbnailPath: result.thumbnailPath,
            duration: result.duration,
        }, "Clip trimmed successfully");
        return result;
    }
    catch (err) {
        if (err instanceof FFmpegError) {
            ffmpegLogger.error({
                code: err.code,
                message: err.message,
                details: err.details,
            }, "Clip trimming failed");
        }
        else {
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
    }
    else {
        ffmpegLogger.warn({
            ffmpeg: ffmpegStatus.ffmpeg,
            ffprobe: ffmpegStatus.ffprobe,
        }, "FFmpeg tools not fully available - clip trimming will be disabled");
    }
    // Log startup configuration (config is already validated at import time)
    logger.info({
        nodeEnv: config.NODE_ENV,
        httpPort: HTTP_PORT,
        wsPort: WS_PORT,
        sessionDir: SESSION_DIR,
        obsWsUrl: OBS_WS_URL,
        logLevel: config.LOG_LEVEL,
        logFormat: config.LOG_FORMAT,
        sttProvider: config.STT_PROVIDER,
        ffmpegReady,
        clipOutputFormat: CLIP_OUTPUT_FORMAT,
    }, "Initializing desktop-companion service with validated configuration");
    ensureDir(SESSION_DIR);
    await connectOBS();
    const app = express();
    // Apply request logging middleware
    app.use(requestLoggingMiddleware());
    app.use(express.json({ limit: "2mb" }));
    const wss = new WebSocketServer({ port: WS_PORT });
    wss.on("connection", (ws) => {
        logger.debug("New WebSocket client connected");
        ws.send(JSON.stringify({ type: "hello", ok: true }));
    });
    // Initialize STT Manager with WebSocket server
    const sttManager = getSTTManager();
    sttManager.initialize(wss);
    sttLogger.info("STT Manager initialized");
    // Create or start a session
    app.post("/session/start", async (req, res) => {
        try {
            const sessionId = req.body?.sessionId || uuidv4();
            const startedAt = nowMs();
            const sessionConfig = SessionConfigSchema.parse({
                sessionId,
                workflow: req.body.workflow,
                captureMode: req.body.captureMode,
                title: req.body.title,
                participants: req.body.participants || [],
                startedAt,
            });
            const { traceId } = await withOpikTrace({
                name: "session.start",
                input: {
                    sessionId,
                    workflow: sessionConfig.workflow,
                    captureMode: sessionConfig.captureMode,
                    title: sessionConfig.title,
                    participants: sessionConfig.participants,
                },
            }, async ({ startSpan }) => {
                const s = startSpan({ name: "init.sessionState", type: "custom" });
                session = { config: sessionConfig, t0UnixMs: startedAt };
                ensureDir(sessionPath());
                // Pre-create clips and thumbnails directories
                ensureDir(sessionPath("clips"));
                ensureDir(sessionPath("thumbnails"));
                s.end();
                if (sessionConfig.captureMode !== "audio") {
                    const sObs = startSpan({ name: "obs.ensureReplayBuffer", type: "custom" });
                    await ensureReplayBuffer();
                    sObs.end();
                }
                return { result: { ok: true } };
            });
            // Set trace ID in logger context
            if (traceId) {
                setOpikTraceId(traceId);
            }
            apiLogger.info({
                sessionId,
                workflow: sessionConfig.workflow,
                captureMode: sessionConfig.captureMode,
                title: sessionConfig.title,
                participantCount: sessionConfig.participants.length,
                opikTraceId: traceId,
            }, "Session started");
            res.json({ ok: true, sessionId, ws: `ws://127.0.0.1:${WS_PORT}`, opikTraceId: traceId });
        }
        catch (err) {
            apiLogger.error({ err }, "Failed to start session");
            res.status(400).json({ ok: false, error: String(err?.message || err) });
        }
    });
    // Clip intent markers
    app.post("/clip/start", async (req, res) => {
        if (!session)
            return res.status(400).json({ ok: false, error: "No session" });
        try {
            const t = Number(req.body?.t ?? (nowMs() - session.t0UnixMs) / 1000);
            const source = req.body?.source || "api";
            session.clipStartT = t;
            const { result, traceId } = await withOpikTrace({
                name: "clip.intent.start",
                input: {
                    sessionId: session.config.sessionId,
                    workflow: session.config.workflow,
                    captureMode: session.config.captureMode,
                    t,
                    source,
                },
            }, async ({ traceId, startSpan }) => {
                const s = startSpan({ name: "emit.CLIP_INTENT_START", type: "custom", input: { t, source } });
                emitEvent(wss, {
                    id: uuidv4(),
                    sessionId: session.config.sessionId,
                    ts: nowMs(),
                    observability: traceId ? { provider: "opik", traceId, spanId: s.spanId } : undefined,
                    type: "CLIP_INTENT_START",
                    payload: { t, source, confidence: req.body?.confidence },
                });
                s.end();
                return { result: { t } };
            });
            // Set trace ID in logger context
            if (traceId) {
                setOpikTraceId(traceId);
            }
            apiLogger.info({
                sessionId: session.config.sessionId,
                t,
                source,
                confidence: req.body?.confidence,
                opikTraceId: traceId,
            }, "Clip intent started");
            res.json({ ok: true, t: result.t, opikTraceId: traceId });
        }
        catch (err) {
            apiLogger.error({ err, sessionId: session?.config.sessionId }, "Failed to start clip intent");
            res.status(500).json({ ok: false, error: String(err?.message || err) });
        }
    });
    app.post("/clip/end", async (req, res) => {
        if (!session)
            return res.status(400).json({ ok: false, error: "No session" });
        try {
            const tEnd = Number(req.body?.t ?? (nowMs() - session.t0UnixMs) / 1000);
            const tStart = session.clipStartT ?? Math.max(0, tEnd - 30);
            const source = req.body?.source || "api";
            // Allow caller to provide replay buffer path directly (for testing/advanced use)
            const providedReplayPath = req.body?.replayBufferPath;
            const { result, traceId } = await withOpikTrace({
                name: "clip.intent.end",
                input: {
                    sessionId: session.config.sessionId,
                    workflow: session.config.workflow,
                    captureMode: session.config.captureMode,
                    t0: tStart,
                    t1: tEnd,
                    source,
                },
            }, async ({ traceId, startSpan }) => {
                // 1) Emit end marker
                const sEnd = startSpan({ name: "emit.CLIP_INTENT_END", type: "custom", input: { t: tEnd, source } });
                emitEvent(wss, {
                    id: uuidv4(),
                    sessionId: session.config.sessionId,
                    ts: nowMs(),
                    observability: traceId ? { provider: "opik", traceId, spanId: sEnd.spanId } : undefined,
                    type: "CLIP_INTENT_END",
                    payload: { t: tEnd, source, confidence: req.body?.confidence },
                });
                sEnd.end();
                // 2) Save OBS replay buffer
                const sSave = startSpan({ name: "obs.SaveReplayBuffer", type: "custom" });
                const replayBufferSavedAt = nowMs();
                const saved = await saveReplayBuffer();
                sSave.end({ saved });
                // 3) Attempt to trim the clip using ffmpeg (if available)
                const artifactId = uuidv4();
                let trimResult = null;
                let clipPath = saved || "";
                let thumbnailPath;
                if (ffmpegReady) {
                    // Determine the replay buffer path
                    let replayBufferPath = providedReplayPath || lastReplayBufferPath;
                    // Fallback: scan the OBS output directory for recent files
                    if (!replayBufferPath && OBS_REPLAY_OUTPUT_DIR) {
                        replayBufferPath = findLatestReplayBuffer(OBS_REPLAY_OUTPUT_DIR);
                    }
                    if (replayBufferPath && fs.existsSync(replayBufferPath)) {
                        const sTrim = startSpan({
                            name: "ffmpeg.trimClip",
                            type: "custom",
                            input: { replayBufferPath, t0: tStart, t1: tEnd },
                        });
                        trimResult = await attemptClipTrim(replayBufferPath, tStart, tEnd, sessionPath(), artifactId, session.t0UnixMs, replayBufferSavedAt);
                        if (trimResult) {
                            clipPath = trimResult.clipPath;
                            thumbnailPath = trimResult.thumbnailPath;
                            sTrim.end({
                                success: true,
                                clipPath: trimResult.clipPath,
                                duration: trimResult.duration,
                            });
                        }
                        else {
                            sTrim.end({ success: false });
                        }
                    }
                    else {
                        ffmpegLogger.warn({
                            providedPath: providedReplayPath,
                            lastKnownPath: lastReplayBufferPath,
                            obsOutputDir: OBS_REPLAY_OUTPUT_DIR,
                        }, "No replay buffer file available for trimming");
                    }
                }
                // 4) Emit artifact event
                const sArt = startSpan({
                    name: "emit.ARTIFACT_CLIP_CREATED",
                    type: "custom",
                    input: { artifactId, clipPath, thumbnailPath },
                });
                emitEvent(wss, {
                    id: uuidv4(),
                    sessionId: session.config.sessionId,
                    ts: nowMs(),
                    observability: traceId ? { provider: "opik", traceId, spanId: sArt.spanId } : undefined,
                    type: "ARTIFACT_CLIP_CREATED",
                    payload: {
                        artifactId,
                        path: clipPath,
                        t0: tStart,
                        t1: tEnd,
                        thumbnailArtifactId: thumbnailPath ? `${artifactId}-thumb` : undefined,
                    },
                });
                sArt.end();
                return {
                    result: {
                        t0: tStart,
                        t1: tEnd,
                        saved,
                        trimmed: !!trimResult,
                        clipPath: trimResult?.clipPath,
                        thumbnailPath: trimResult?.thumbnailPath,
                        clipDuration: trimResult?.duration,
                    },
                };
            });
            // Set trace ID in logger context
            if (traceId) {
                setOpikTraceId(traceId);
            }
            apiLogger.info({
                sessionId: session.config.sessionId,
                t0: result.t0,
                t1: result.t1,
                durationSec: result.t1 - result.t0,
                saved: result.saved,
                trimmed: result.trimmed,
                clipPath: result.clipPath,
                thumbnailPath: result.thumbnailPath,
                source,
                opikTraceId: traceId,
            }, "Clip intent ended and artifact created");
            session.clipStartT = undefined;
            res.json({
                ok: true,
                ...result,
                replayBufferSeconds: REPLAY_BUFFER_SECONDS,
                opikTraceId: traceId,
            });
        }
        catch (err) {
            apiLogger.error({ err, sessionId: session?.config.sessionId }, "Failed to end clip intent");
            res.status(500).json({ ok: false, error: String(err?.message || err) });
        }
    });
    // Screenshot
    app.post("/frame", async (req, res) => {
        if (!session)
            return res.status(400).json({ ok: false, error: "No session" });
        try {
            const t = Number(req.body?.t ?? (nowMs() - session.t0UnixMs) / 1000);
            const sourceName = String(req.body?.sourceName || "Program");
            const artifactId = uuidv4();
            const outDir = sessionPath("frames");
            ensureDir(outDir);
            const file = path.join(outDir, `${Math.round(t * 1000)}_${artifactId}.png`);
            const { result, traceId } = await withOpikTrace({
                name: "frame.capture",
                input: {
                    sessionId: session.config.sessionId,
                    workflow: session.config.workflow,
                    captureMode: session.config.captureMode,
                    t,
                    sourceName,
                    path: file,
                },
            }, async ({ traceId, startSpan }) => {
                const sShot = startSpan({ name: "obs.TakeSourceScreenshot", type: "custom", input: { sourceName, path: file } });
                const ok = await takeScreenshot(sourceName, file);
                sShot.end({ ok });
                if (ok) {
                    const sEmit = startSpan({ name: "emit.ARTIFACT_FRAME_CREATED", type: "custom", input: { artifactId, path: file, t } });
                    emitEvent(wss, {
                        id: uuidv4(),
                        sessionId: session.config.sessionId,
                        ts: nowMs(),
                        observability: traceId ? { provider: "opik", traceId, spanId: sEmit.spanId } : undefined,
                        type: "ARTIFACT_FRAME_CREATED",
                        payload: { artifactId, path: file, t },
                    });
                    sEmit.end();
                }
                return { result: { ok, artifactId, path: file } };
            });
            // Set trace ID in logger context
            if (traceId) {
                setOpikTraceId(traceId);
            }
            if (result.ok) {
                apiLogger.info({
                    sessionId: session.config.sessionId,
                    artifactId: result.artifactId,
                    sourceName,
                    t,
                    path: result.path,
                    opikTraceId: traceId,
                }, "Frame captured successfully");
            }
            else {
                apiLogger.warn({
                    sessionId: session.config.sessionId,
                    sourceName,
                    t,
                    opikTraceId: traceId,
                }, "Frame capture failed");
            }
            res.json({ ...result, opikTraceId: traceId });
        }
        catch (err) {
            apiLogger.error({ err, sessionId: session?.config.sessionId }, "Failed to capture frame");
            res.status(500).json({ ok: false, error: String(err?.message || err) });
        }
    });
    // =============================================================================
    // STT (Speech-to-Text) Routes
    // =============================================================================
    /**
     * POST /stt/start - Start speech-to-text transcription
     */
    app.post("/stt/start", async (req, res) => {
        if (!session) {
            return res.status(400).json({ ok: false, error: "No active session. Call /session/start first." });
        }
        try {
            const provider = config.STT_PROVIDER;
            if (!isSTTProviderAvailable(provider)) {
                sttLogger.error({ provider }, "STT provider not configured");
                return res.status(400).json({
                    ok: false,
                    error: `STT provider "${provider}" is not configured. Set DEEPGRAM_API_KEY environment variable.`,
                });
            }
            const sttProvider = sttManager.getProvider() || sttManager.createProvider();
            if (sttProvider.isReady()) {
                sttLogger.warn("STT is already running");
                return res.status(400).json({ ok: false, error: "STT is already running. Call /stt/stop first." });
            }
            const sttConfig = {
                sessionId: session.config.sessionId,
                sessionStartedAt: session.t0UnixMs,
                audioSource: req.body?.audioSource || "microphone",
                audioDeviceName: req.body?.audioDeviceName,
                language: req.body?.language || "en-US",
                enableDiarization: req.body?.enableDiarization ?? true,
                enableInterimResults: req.body?.enableInterimResults ?? true,
                enablePunctuation: req.body?.enablePunctuation ?? true,
                keywords: req.body?.keywords,
                sampleRate: req.body?.sampleRate || 16000,
                channels: req.body?.channels || 1,
            };
            const { traceId } = await withOpikTrace({
                name: "stt.start",
                input: {
                    sessionId: session.config.sessionId,
                    provider: sttProvider.name,
                    language: sttConfig.language,
                    enableDiarization: sttConfig.enableDiarization,
                    audioSource: sttConfig.audioSource,
                },
            }, async ({ traceId, startSpan }) => {
                const sConnect = startSpan({ name: "stt.connect", type: "custom" });
                sttProvider.on((event) => {
                    switch (event.type) {
                        case "status_change":
                            sttLogger.info({ status: event.status, message: event.message }, "STT status changed");
                            break;
                        case "transcript":
                            if (event.segment.isFinal) {
                                sttLogger.debug({
                                    text: event.segment.text.slice(0, 100),
                                    speaker: event.segment.speakerId,
                                    t0: event.segment.t0,
                                    t1: event.segment.t1,
                                }, "Transcript segment");
                            }
                            break;
                        case "error":
                            sttLogger.error({ error: event.error, code: event.code, recoverable: event.recoverable }, "STT error");
                            break;
                    }
                });
                await sttProvider.start(sttConfig);
                sConnect.end({ status: sttProvider.status });
                return { result: { ok: true } };
            });
            if (traceId) {
                setOpikTraceId(traceId);
            }
            sttLogger.info({
                sessionId: session.config.sessionId,
                provider: sttProvider.name,
                language: sttConfig.language,
                enableDiarization: sttConfig.enableDiarization,
                audioSource: sttConfig.audioSource,
                opikTraceId: traceId,
            }, "STT started");
            res.json({
                ok: true,
                provider: sttProvider.name,
                status: sttProvider.status,
                sessionId: session.config.sessionId,
                config: {
                    language: sttConfig.language,
                    enableDiarization: sttConfig.enableDiarization,
                    enableInterimResults: sttConfig.enableInterimResults,
                    audioSource: sttConfig.audioSource,
                },
                opikTraceId: traceId,
            });
        }
        catch (err) {
            sttLogger.error({ err, sessionId: session?.config.sessionId }, "Failed to start STT");
            res.status(500).json({ ok: false, error: String(err?.message || err) });
        }
    });
    app.post("/stt/stop", async (req, res) => {
        try {
            const sttProvider = sttManager.getProvider();
            if (!sttProvider) {
                sttLogger.warn("No STT provider to stop");
                return res.json({ ok: true, message: "No STT provider was running" });
            }
            const { traceId } = await withOpikTrace({
                name: "stt.stop",
                input: {
                    sessionId: session?.config.sessionId,
                    provider: sttProvider.name,
                    currentStatus: sttProvider.status,
                },
            }, async ({ startSpan }) => {
                const sStop = startSpan({ name: "stt.disconnect", type: "custom" });
                await sttManager.stopProvider();
                sStop.end();
                return { result: { ok: true } };
            });
            if (traceId) {
                setOpikTraceId(traceId);
            }
            sttLogger.info({ sessionId: session?.config.sessionId, opikTraceId: traceId }, "STT stopped");
            res.json({ ok: true, opikTraceId: traceId });
        }
        catch (err) {
            sttLogger.error({ err, sessionId: session?.config.sessionId }, "Failed to stop STT");
            res.status(500).json({ ok: false, error: String(err?.message || err) });
        }
    });
    app.get("/stt/status", (_req, res) => {
        const status = sttManager.getStatus();
        const availableProviders = listSTTProviders().map((name) => ({
            name,
            available: isSTTProviderAvailable(name),
        }));
        res.json({
            ok: true,
            ...status,
            sessionId: session?.config.sessionId || null,
            availableProviders,
        });
    });
    app.post("/stt/audio", (req, res) => {
        try {
            const sttProvider = sttManager.getProvider();
            if (!sttProvider || !sttProvider.isReady()) {
                return res.status(400).json({ ok: false, error: "STT is not running. Call /stt/start first." });
            }
            const audioBase64 = req.body?.audio;
            if (!audioBase64 || typeof audioBase64 !== "string") {
                return res.status(400).json({ ok: false, error: "Missing or invalid 'audio' field (expected base64 string)" });
            }
            const audioBuffer = Buffer.from(audioBase64, "base64");
            sttProvider.sendAudio(audioBuffer);
            res.json({ ok: true, bytesReceived: audioBuffer.length });
        }
        catch (err) {
            sttLogger.error({ err }, "Failed to process audio data");
            res.status(500).json({ ok: false, error: String(err?.message || err) });
        }
    });
    // =============================================================================
    // FFmpeg Status Routes
    // =============================================================================
    app.get("/ffmpeg/status", async (_req, res) => {
        const status = await checkFFmpegAvailability();
        res.json({
            ok: true,
            ...status,
            config: {
                ffmpegPath: FFMPEG_PATH || "(system)",
                ffprobePath: FFPROBE_PATH || "(system)",
                outputFormat: CLIP_OUTPUT_FORMAT,
                replayBufferSeconds: REPLAY_BUFFER_SECONDS,
                obsReplayOutputDir: OBS_REPLAY_OUTPUT_DIR || "(not configured)",
            },
        });
    });
    // =============================================================================
    // Health and Info Routes
    // =============================================================================
    app.get("/health", (_req, res) => res.json({ ok: true }));
    app.listen(HTTP_PORT, () => {
        logger.info({ httpPort: HTTP_PORT, wsPort: WS_PORT }, "Server started");
    });
}
main().catch((e) => {
    logger.fatal({ err: e }, "Fatal error during startup");
    process.exit(1);
});

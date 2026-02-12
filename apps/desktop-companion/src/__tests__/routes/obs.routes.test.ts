/**
 * OBS API Routes Unit Tests
 *
 * Tests for the /api/obs endpoints using supertest with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import express, { type Application } from "express";
import { createObsRouter } from "../../api/obs.js";
import type { ObsRouteDeps } from "../../api/obs.types.js";

// Mock the logger to prevent console output during tests
vi.mock("../../logger/index.js", () => ({
  obsLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  apiLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function createMockObs(identified = true) {
  return {
    identified,
    call: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
  } as any;
}

function createMockDeps(overrides: Partial<ObsRouteDeps> = {}): ObsRouteDeps {
  return {
    obs: createMockObs(true),
    getSession: vi.fn().mockReturnValue(null),
    setSession: vi.fn(),
    wss: { clients: new Set() } as any,
    emitEvent: vi.fn(),
    config: {
      OBS_WS_URL: "ws://127.0.0.1:4455",
      OBS_WS_PASSWORD: "",
      WS_PORT: 3124,
    },
    ffmpegReady: vi.fn().mockReturnValue(true),
    ffmpegStatus: vi.fn().mockReturnValue({ ffmpeg: true, ffprobe: true }),
    saveReplayBuffer: vi.fn().mockResolvedValue("/tmp/replay.mp4"),
    startSessionInternal: vi.fn().mockResolvedValue({ sessionId: "test-session-1", startedAt: Date.now() }),
    stopSessionInternal: vi.fn().mockResolvedValue({ ok: true, t1: Date.now(), duration: 60000 }),
    ...overrides,
  };
}

function createTestApp(deps: ObsRouteDeps): Application {
  const app = express();
  app.use(express.json());
  app.use("/api/obs", createObsRouter(deps));
  return app;
}

describe("OBS API Routes", () => {
  let deps: ObsRouteDeps;
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
    app = createTestApp(deps);
  });

  describe("GET /api/obs/status", () => {
    it("should return connected status with OBS details", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "GetStreamStatus") return { outputActive: true };
        if (method === "GetRecordStatus") return { outputActive: false };
        if (method === "GetReplayBufferStatus") return { outputActive: true };
        if (method === "GetSceneList") {
          return {
            currentProgramSceneName: "Main Scene",
            scenes: [{ sceneName: "Main Scene" }, { sceneName: "BRB" }],
          };
        }
        return {};
      });

      const response = await request(app).get("/api/obs/status");

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.connected).toBe(true);
      expect(response.body.data.streaming).toBe(true);
      expect(response.body.data.recording).toBe(false);
      expect(response.body.data.replayBufferActive).toBe(true);
      expect(response.body.data.currentScene).toBe("Main Scene");
      expect(response.body.data.scenes).toEqual(["Main Scene", "BRB"]);
    });

    it("should return disconnected status with help text", async () => {
      deps = createMockDeps({ obs: createMockObs(false) });
      app = createTestApp(deps);

      const response = await request(app).get("/api/obs/status");

      expect(response.status).toBe(200);
      expect(response.body.data.connected).toBe(false);
      expect(response.body.data.help).not.toBeNull();
      expect(response.body.data.help.steps).toHaveLength(4);
    });
  });

  describe("ensureObsConnected middleware", () => {
    it("should return 503 when OBS is disconnected", async () => {
      deps = createMockDeps({ obs: createMockObs(false) });
      app = createTestApp(deps);

      const response = await request(app).get("/api/obs/scenes");

      expect(response.status).toBe(503);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain("not connected");
    });

    it("should allow request when OBS is connected", async () => {
      const obs = deps.obs as any;
      obs.call.mockResolvedValue({
        currentProgramSceneName: "Scene1",
        scenes: [{ sceneName: "Scene1" }],
      });

      const response = await request(app).get("/api/obs/scenes");

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });

  describe("POST /api/obs/reconnect", () => {
    it("should reconnect OBS WebSocket", async () => {
      const obs = deps.obs as any;

      const response = await request(app).post("/api/obs/reconnect");

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(obs.disconnect).toHaveBeenCalled();
      expect(obs.connect).toHaveBeenCalledWith("ws://127.0.0.1:4455", undefined);
    });

    it("should return error on connection failure", async () => {
      const obs = deps.obs as any;
      obs.connect.mockRejectedValue(new Error("Connection refused"));

      const response = await request(app).post("/api/obs/reconnect");

      expect(response.status).toBe(500);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain("Connection refused");
    });
  });

  describe("GET /api/obs/scenes", () => {
    it("should return scene list", async () => {
      const obs = deps.obs as any;
      obs.call.mockResolvedValue({
        currentProgramSceneName: "Main",
        scenes: [
          { sceneName: "Main", sceneIndex: 0 },
          { sceneName: "BRB", sceneIndex: 1 },
        ],
      });

      const response = await request(app).get("/api/obs/scenes");

      expect(response.status).toBe(200);
      expect(response.body.data.currentScene).toBe("Main");
      expect(response.body.data.scenes).toHaveLength(2);
    });
  });

  describe("POST /api/obs/scenes/switch", () => {
    it("should switch scene", async () => {
      const obs = deps.obs as any;
      obs.call.mockResolvedValue({});

      const response = await request(app)
        .post("/api/obs/scenes/switch")
        .send({ sceneName: "BRB" });

      expect(response.status).toBe(200);
      expect(obs.call).toHaveBeenCalledWith("SetCurrentProgramScene", { sceneName: "BRB" });
    });

    it("should validate sceneName input", async () => {
      const response = await request(app)
        .post("/api/obs/scenes/switch")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
    });
  });

  describe("POST /api/obs/stream/start", () => {
    it("should start streaming", async () => {
      const obs = deps.obs as any;
      obs.call.mockResolvedValue({});

      const response = await request(app).post("/api/obs/stream/start");

      expect(response.status).toBe(200);
      expect(response.body.data.streaming).toBe(true);
      expect(obs.call).toHaveBeenCalledWith("StartStream");
    });
  });

  describe("POST /api/obs/stream/stop", () => {
    it("should stop streaming", async () => {
      const obs = deps.obs as any;
      obs.call.mockResolvedValue({});

      const response = await request(app).post("/api/obs/stream/stop");

      expect(response.status).toBe(200);
      expect(response.body.data.streaming).toBe(false);
    });
  });

  describe("POST /api/obs/stream/toggle", () => {
    it("should toggle streaming", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "ToggleStream") return {};
        if (method === "GetStreamStatus") return { outputActive: true };
        return {};
      });

      const response = await request(app).post("/api/obs/stream/toggle");

      expect(response.status).toBe(200);
      expect(response.body.data.streaming).toBe(true);
    });
  });

  describe("POST /api/obs/record/start", () => {
    it("should start recording", async () => {
      const obs = deps.obs as any;
      obs.call.mockResolvedValue({});

      const response = await request(app).post("/api/obs/record/start");

      expect(response.status).toBe(200);
      expect(response.body.data.recording).toBe(true);
    });
  });

  describe("POST /api/obs/record/stop", () => {
    it("should stop recording", async () => {
      const obs = deps.obs as any;
      obs.call.mockResolvedValue({ outputPath: "/recordings/output.mkv" });

      const response = await request(app).post("/api/obs/record/stop");

      expect(response.status).toBe(200);
      expect(response.body.data.recording).toBe(false);
      expect(response.body.data.outputPath).toBe("/recordings/output.mkv");
    });
  });

  describe("POST /api/obs/record/toggle", () => {
    it("should toggle recording", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "ToggleRecord") return {};
        if (method === "GetRecordStatus") return { outputActive: false };
        return {};
      });

      const response = await request(app).post("/api/obs/record/toggle");

      expect(response.status).toBe(200);
      expect(response.body.data.recording).toBe(false);
    });
  });

  describe("POST /api/obs/replay/save", () => {
    it("should save replay buffer", async () => {
      const response = await request(app).post("/api/obs/replay/save");

      expect(response.status).toBe(200);
      expect(response.body.data.saved).toBe(true);
      expect(response.body.data.path).toBe("/tmp/replay.mp4");
    });

    it("should return error when replay save fails", async () => {
      deps = createMockDeps({
        saveReplayBuffer: vi.fn().mockResolvedValue(null),
      });
      app = createTestApp(deps);

      const response = await request(app).post("/api/obs/replay/save");

      expect(response.status).toBe(500);
      expect(response.body.ok).toBe(false);
    });
  });

  describe("POST /api/obs/quicklaunch", () => {
    it("should orchestrate session + OBS start", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "GetReplayBufferStatus") return { outputActive: false };
        return {};
      });

      const response = await request(app)
        .post("/api/obs/quicklaunch")
        .send({
          title: "My Stream",
          workflow: "solo",
          startStream: true,
          startRecord: true,
          startReplay: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.streaming).toBe(true);
      expect(response.body.data.recording).toBe(true);
      expect(deps.startSessionInternal).toHaveBeenCalled();
    });

    it("should use defaults when no body provided", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "GetReplayBufferStatus") return { outputActive: true };
        return {};
      });

      const response = await request(app)
        .post("/api/obs/quicklaunch")
        .send({});

      expect(response.status).toBe(200);
      expect(deps.startSessionInternal).toHaveBeenCalledWith(
        expect.objectContaining({ workflow: "solo", title: "Untitled Stream" })
      );
    });

    it("should return 207 with warnings on partial failures", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "StartStream") throw new Error("Stream failed");
        if (method === "GetReplayBufferStatus") return { outputActive: true };
        return {};
      });

      const response = await request(app)
        .post("/api/obs/quicklaunch")
        .send({ startStream: true, startRecord: true });

      expect(response.status).toBe(207);
      expect(response.body.ok).toBe(true);
      expect(response.body.warnings).toBeDefined();
      expect(response.body.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/obs/quickstop", () => {
    it("should stop stream, recording, and session", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "GetStreamStatus") return { outputActive: true };
        if (method === "GetRecordStatus") return { outputActive: true };
        return {};
      });

      const mockGetSession = deps.getSession as any;
      mockGetSession.mockReturnValue({ config: { sessionId: "sess-1" } });

      const response = await request(app).post("/api/obs/quickstop");

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(obs.call).toHaveBeenCalledWith("StopStream");
      expect(obs.call).toHaveBeenCalledWith("StopRecord");
      expect(deps.stopSessionInternal).toHaveBeenCalled();
    });

    it("should handle partial failures gracefully", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "GetStreamStatus") throw new Error("OBS error");
        if (method === "GetRecordStatus") return { outputActive: false };
        return {};
      });

      const response = await request(app).post("/api/obs/quickstop");

      expect(response.status).toBe(207);
      expect(response.body.ok).toBe(true);
      expect(response.body.warnings.length).toBeGreaterThan(0);
    });

    it("should skip session stop when no active session", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "GetStreamStatus") return { outputActive: false };
        if (method === "GetRecordStatus") return { outputActive: false };
        return {};
      });

      const response = await request(app).post("/api/obs/quickstop");

      expect(response.status).toBe(200);
      expect(deps.stopSessionInternal).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/obs/sources/toggle", () => {
    it("should toggle source visibility", async () => {
      const obs = deps.obs as any;
      obs.call.mockImplementation((method: string) => {
        if (method === "GetSceneItemList") {
          return {
            sceneItems: [{ sceneItemId: 1, sourceName: "Webcam", sceneItemEnabled: true }],
          };
        }
        return {};
      });

      const response = await request(app)
        .post("/api/obs/sources/toggle")
        .send({ sceneName: "Main", sourceName: "Webcam" });

      expect(response.status).toBe(200);
      expect(obs.call).toHaveBeenCalledWith("SetSceneItemEnabled", {
        sceneName: "Main",
        sceneItemId: 1,
        sceneItemEnabled: false,
      });
    });

    it("should return 404 for unknown source", async () => {
      const obs = deps.obs as any;
      obs.call.mockResolvedValue({ sceneItems: [] });

      const response = await request(app)
        .post("/api/obs/sources/toggle")
        .send({ sceneName: "Main", sourceName: "NonExistent" });

      expect(response.status).toBe(404);
    });
  });
});

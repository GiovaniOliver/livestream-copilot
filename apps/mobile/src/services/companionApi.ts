/**
 * Desktop Companion API Client
 *
 * Comprehensive client for communicating with the desktop companion service.
 * Includes session management, STT control, clip capture, and health monitoring.
 */

// =============================================================================
// Types
// =============================================================================

export type CaptureMode = "audio" | "video" | "av";
export type WorkflowType =
  | "streamer"
  | "podcast"
  | "writers_room"
  | "debate"
  | "brainstorm";

// Request/Response types
export type StartSessionReq = {
  workflow: WorkflowType;
  captureMode: CaptureMode;
  title?: string;
  participants?: { id: string; name: string }[];
  sessionId?: string;
};

export type StartSessionRes =
  | { ok: true; sessionId: string; ws: string; opikTraceId?: string }
  | { ok: false; error: string };

export type HealthRes = {
  ok: boolean;
  database: "connected" | "unavailable";
  ffmpeg: "available" | "unavailable";
  agents: "enabled" | "disabled";
  session: string | null;
};

export type AgentStatusRes = {
  ok: boolean;
  enabled: boolean;
  workflowCount: number;
  agentCount: number;
  activeSessionCount: number;
  aiProvider: string;
  aiModel: string;
};

export type STTStatusRes = {
  ok: boolean;
  active: boolean;
  provider: string | null;
  status: string | null;
  sessionId: string | null;
  availableProviders: Array<{ name: string; available: boolean }>;
};

export type STTStartReq = {
  audioSource?: "microphone" | "system" | "file";
  audioDeviceName?: string;
  language?: string;
  enableDiarization?: boolean;
  enableInterimResults?: boolean;
  enablePunctuation?: boolean;
  keywords?: string[];
  sampleRate?: number;
  channels?: number;
};

export type STTStartRes =
  | {
      ok: true;
      provider: string;
      status: string;
      sessionId: string;
      config: {
        language: string;
        enableDiarization: boolean;
        enableInterimResults: boolean;
        audioSource: string;
      };
      opikTraceId?: string;
    }
  | { ok: false; error: string };

export type ClipRes =
  | {
      ok: true;
      t?: number;
      t0?: number;
      t1?: number;
      saved?: string | null;
      trimmed?: boolean;
      clipPath?: string;
      thumbnailPath?: string;
      clipDuration?: number;
      replayBufferSeconds?: number;
      opikTraceId?: string;
    }
  | { ok: false; error: string };

export type FrameRes =
  | {
      ok: true;
      artifactId: string;
      path: string;
      opikTraceId?: string;
    }
  | { ok: false; error: string };

export type FFmpegStatusRes = {
  ok: boolean;
  ready: boolean;
  ffmpeg: boolean;
  ffprobe: boolean;
  config: {
    ffmpegPath: string;
    ffprobePath: string;
    outputFormat: string;
    replayBufferSeconds: number;
    obsReplayOutputDir: string;
  };
};

// =============================================================================
// OBS Control Types
// =============================================================================

export type OBSStatusRes = {
  ok: boolean;
  connected: boolean;
  streaming?: boolean;
  streamTimecode?: string | null;
  recording?: boolean;
  recordTimecode?: string | null;
  currentScene?: string | null;
  sceneCount?: number;
  error?: string;
};

export type OBSScene = {
  name: string;
  index: number;
};

export type OBSScenesRes = {
  ok: boolean;
  currentScene: string;
  currentPreviewScene?: string;
  scenes: OBSScene[];
  error?: string;
};

export type OBSSource = {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  locked: boolean;
};

export type OBSSourcesRes = {
  ok: boolean;
  scene: string;
  sources: OBSSource[];
  error?: string;
};

export type OBSStreamRes = {
  ok: boolean;
  streaming?: boolean;
  error?: string;
};

export type OBSRecordRes = {
  ok: boolean;
  recording?: boolean;
  outputPath?: string;
  error?: string;
};

export type OBSSourceToggleRes = {
  ok: boolean;
  sceneName?: string;
  sceneItemId?: number;
  enabled?: boolean;
  error?: string;
};

export type QuickLaunchReq = {
  workflow?: WorkflowType;
  captureMode?: CaptureMode;
  title?: string;
  participants?: { id: string; name: string }[];
  startStream?: boolean;
  startRecord?: boolean;
  startReplayBuffer?: boolean;
};

export type QuickLaunchRes = {
  ok: boolean;
  sessionId?: string | null;
  ws?: string | null;
  results?: {
    session?: { ok: boolean; sessionId?: string; error?: string };
    stream?: { ok: boolean; error?: string };
    record?: { ok: boolean; error?: string };
    replayBuffer?: { ok: boolean; error?: string };
  };
  error?: string;
};

export type QuickStopRes = {
  ok: boolean;
  results?: {
    stream?: { ok: boolean; error?: string };
    record?: { ok: boolean; outputPath?: string; error?: string };
    session?: { ok: boolean; error?: string };
  };
  error?: string;
};

// =============================================================================
// Video Source Types
// =============================================================================

export type VideoSourceMode = "camera" | "screen";
export type VideoSourceQuality = "low" | "medium" | "high" | "max";

export type VideoSourceRegisterReq = {
  mode: VideoSourceMode;
  quality: VideoSourceQuality;
  audioEnabled: boolean;
  deviceInfo?: {
    platform?: string;
    type?: string;
  };
};

export type VideoSourceRegisterRes = {
  ok: boolean;
  sourceId?: string;
  streamEndpoint?: string;
  pingEndpoint?: string;
  error?: string;
};

export type VideoSourceInfo = {
  id: string;
  mode: VideoSourceMode;
  quality: string;
  audioEnabled: boolean;
  deviceInfo: {
    platform: string;
    type: string;
  };
  registeredAt: number;
  lastPingAt: number;
  isStale?: boolean;
};

export type VideoSourceStatusRes = {
  ok: boolean;
  count: number;
  sources: VideoSourceInfo[];
  error?: string;
};

export type VideoSourcePingRes = {
  ok: boolean;
  uptime?: number;
  stats?: Record<string, unknown>;
  error?: string;
};

export type VideoSourceStreamRes = {
  ok: boolean;
  received?: number;
  timestamp?: number;
  error?: string;
};

export type VideoSourceSettingsReq = {
  mode?: VideoSourceMode;
  quality?: VideoSourceQuality;
  audioEnabled?: boolean;
};

export type VideoSourceSettingsRes = {
  ok: boolean;
  source?: VideoSourceInfo;
  error?: string;
};

export type SessionListRes = {
  ok: boolean;
  sessions: Array<{
    id: string;
    workflow: string;
    captureMode: string;
    title: string | null;
    startedAt: string;
    endedAt: string | null;
    participants: string[];
  }>;
  count: number;
};

export type SessionDetailRes =
  | {
      ok: true;
      session: {
        id: string;
        workflow: string;
        captureMode: string;
        title: string | null;
        startedAt: string;
        endedAt: string | null;
        participants: string[];
        _count: { events: number; clips: number };
      };
    }
  | { ok: false; error: string };

export type TranscriptRes = {
  ok: boolean;
  segments: Array<{
    id: string;
    ts: number;
    text?: string;
    speakerId?: string;
    t0?: number;
    t1?: number;
  }>;
  count: number;
};

export type ClipsListRes = {
  ok: boolean;
  clips: Array<{
    id: string;
    artifactId: string;
    path: string;
    t0: number;
    t1: number;
    thumbnailId: string | null;
    createdAt: string;
  }>;
  count: number;
  totalDuration: number;
};

// =============================================================================
// API Client Class
// =============================================================================

export class CompanionApiClient {
  constructor(private baseUrl: string) {}

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Health & Status
  // ---------------------------------------------------------------------------

  async health(): Promise<HealthRes> {
    return this.request<HealthRes>("/health");
  }

  async agentStatus(): Promise<AgentStatusRes> {
    return this.request<AgentStatusRes>("/agents/status");
  }

  async ffmpegStatus(): Promise<FFmpegStatusRes> {
    return this.request<FFmpegStatusRes>("/ffmpeg/status");
  }

  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  async startSession(req: StartSessionReq): Promise<StartSessionRes> {
    return this.request<StartSessionRes>("/session/start", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async listSessions(params?: {
    workflow?: WorkflowType;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<SessionListRes> {
    const searchParams = new URLSearchParams();
    if (params?.workflow) searchParams.set("workflow", params.workflow);
    if (params?.active !== undefined)
      searchParams.set("active", String(params.active));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const query = searchParams.toString();
    return this.request<SessionListRes>(
      `/sessions${query ? `?${query}` : ""}`
    );
  }

  async getSession(sessionId: string): Promise<SessionDetailRes> {
    return this.request<SessionDetailRes>(`/sessions/${sessionId}`);
  }

  async deleteSession(
    sessionId: string
  ): Promise<{ ok: boolean; deleted?: boolean; error?: string }> {
    return this.request(`/sessions/${sessionId}`, { method: "DELETE" });
  }

  async getSessionTranscript(sessionId: string): Promise<TranscriptRes> {
    return this.request<TranscriptRes>(`/sessions/${sessionId}/transcript`);
  }

  async getSessionClips(sessionId: string): Promise<ClipsListRes> {
    return this.request<ClipsListRes>(`/sessions/${sessionId}/clips`);
  }

  // ---------------------------------------------------------------------------
  // Clip Capture
  // ---------------------------------------------------------------------------

  async clipStart(params?: {
    t?: number;
    source?: string;
    confidence?: number;
  }): Promise<ClipRes> {
    return this.request<ClipRes>("/clip/start", {
      method: "POST",
      body: JSON.stringify(params || {}),
    });
  }

  async clipEnd(params?: {
    t?: number;
    source?: string;
    confidence?: number;
    replayBufferPath?: string;
  }): Promise<ClipRes> {
    return this.request<ClipRes>("/clip/end", {
      method: "POST",
      body: JSON.stringify(params || {}),
    });
  }

  async captureFrame(params?: {
    t?: number;
    sourceName?: string;
  }): Promise<FrameRes> {
    return this.request<FrameRes>("/frame", {
      method: "POST",
      body: JSON.stringify(params || {}),
    });
  }

  // ---------------------------------------------------------------------------
  // Speech-to-Text (STT)
  // ---------------------------------------------------------------------------

  async sttStatus(): Promise<STTStatusRes> {
    return this.request<STTStatusRes>("/stt/status");
  }

  async sttStart(config?: STTStartReq): Promise<STTStartRes> {
    return this.request<STTStartRes>("/stt/start", {
      method: "POST",
      body: JSON.stringify(config || {}),
    });
  }

  async sttStop(): Promise<{ ok: boolean; message?: string; error?: string }> {
    return this.request("/stt/stop", { method: "POST" });
  }

  async sttSendAudio(
    audioBase64: string
  ): Promise<{ ok: boolean; bytesReceived?: number; error?: string }> {
    return this.request("/stt/audio", {
      method: "POST",
      body: JSON.stringify({ audio: audioBase64 }),
    });
  }

  // ---------------------------------------------------------------------------
  // OBS Control
  // ---------------------------------------------------------------------------

  async obsStatus(): Promise<OBSStatusRes> {
    return this.request<OBSStatusRes>("/obs/status");
  }

  async obsScenes(): Promise<OBSScenesRes> {
    return this.request<OBSScenesRes>("/obs/scenes");
  }

  async obsSwitchScene(sceneName: string): Promise<{ ok: boolean; sceneName?: string; error?: string }> {
    return this.request("/obs/scenes/switch", {
      method: "POST",
      body: JSON.stringify({ sceneName }),
    });
  }

  async obsSources(sceneName?: string): Promise<OBSSourcesRes> {
    const query = sceneName ? `?scene=${encodeURIComponent(sceneName)}` : "";
    return this.request<OBSSourcesRes>(`/obs/sources${query}`);
  }

  async obsToggleSource(params: {
    sceneItemId: number;
    sceneName?: string;
    enabled?: boolean;
  }): Promise<OBSSourceToggleRes> {
    return this.request<OBSSourceToggleRes>("/obs/sources/toggle", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async obsStartStream(): Promise<OBSStreamRes> {
    return this.request<OBSStreamRes>("/obs/stream/start", { method: "POST" });
  }

  async obsStopStream(): Promise<OBSStreamRes> {
    return this.request<OBSStreamRes>("/obs/stream/stop", { method: "POST" });
  }

  async obsToggleStream(): Promise<OBSStreamRes> {
    return this.request<OBSStreamRes>("/obs/stream/toggle", { method: "POST" });
  }

  async obsStartRecord(): Promise<OBSRecordRes> {
    return this.request<OBSRecordRes>("/obs/record/start", { method: "POST" });
  }

  async obsStopRecord(): Promise<OBSRecordRes> {
    return this.request<OBSRecordRes>("/obs/record/stop", { method: "POST" });
  }

  async obsToggleRecord(): Promise<OBSRecordRes> {
    return this.request<OBSRecordRes>("/obs/record/toggle", { method: "POST" });
  }

  async obsSaveReplay(): Promise<{ ok: boolean; path?: string | null; error?: string }> {
    return this.request("/obs/replay/save", { method: "POST" });
  }

  async quickLaunch(params?: QuickLaunchReq): Promise<QuickLaunchRes> {
    return this.request<QuickLaunchRes>("/obs/quicklaunch", {
      method: "POST",
      body: JSON.stringify(params || {}),
    });
  }

  async quickStop(): Promise<QuickStopRes> {
    return this.request<QuickStopRes>("/obs/quickstop", { method: "POST" });
  }

  // ---------------------------------------------------------------------------
  // Video Source
  // ---------------------------------------------------------------------------

  async videoSourceRegister(params: VideoSourceRegisterReq): Promise<VideoSourceRegisterRes> {
    return this.request<VideoSourceRegisterRes>("/video-source/register", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async videoSourceUnregister(sourceId?: string): Promise<{ ok: boolean; error?: string }> {
    return this.request("/video-source/unregister", {
      method: "POST",
      body: JSON.stringify({ sourceId }),
    });
  }

  async videoSourceStatus(): Promise<VideoSourceStatusRes> {
    return this.request<VideoSourceStatusRes>("/video-source/status");
  }

  async videoSourcePing(
    sourceId: string,
    stats?: Record<string, unknown>
  ): Promise<VideoSourcePingRes> {
    return this.request<VideoSourcePingRes>(`/video-source/${sourceId}/ping`, {
      method: "POST",
      body: JSON.stringify({ stats }),
    });
  }

  async videoSourceSendFrame(
    sourceId: string,
    frameBase64: string
  ): Promise<VideoSourceStreamRes> {
    return this.request<VideoSourceStreamRes>(`/video-source/${sourceId}/stream`, {
      method: "POST",
      body: JSON.stringify({ frame: frameBase64 }),
    });
  }

  async videoSourceUpdateSettings(
    sourceId: string,
    settings: VideoSourceSettingsReq
  ): Promise<VideoSourceSettingsRes> {
    return this.request<VideoSourceSettingsRes>(`/video-source/${sourceId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }
}

// =============================================================================
// Legacy Function Exports (for backwards compatibility)
// =============================================================================

export async function startSession(
  baseUrl: string,
  req: StartSessionReq
): Promise<StartSessionRes> {
  const client = new CompanionApiClient(baseUrl);
  return client.startSession(req);
}

export async function clipStart(baseUrl: string): Promise<ClipRes> {
  const client = new CompanionApiClient(baseUrl);
  return client.clipStart();
}

export async function clipEnd(baseUrl: string): Promise<ClipRes> {
  const client = new CompanionApiClient(baseUrl);
  return client.clipEnd();
}

export async function markMoment(
  baseUrl: string,
  label?: string
): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(`${baseUrl}/moment/mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, timestamp: Date.now() }),
  });
  return await r.json();
}

export async function health(baseUrl: string): Promise<HealthRes> {
  const client = new CompanionApiClient(baseUrl);
  return client.health();
}

export async function sttStatus(baseUrl: string): Promise<STTStatusRes> {
  const client = new CompanionApiClient(baseUrl);
  return client.sttStatus();
}

export async function sttStart(
  baseUrl: string,
  config?: STTStartReq
): Promise<STTStartRes> {
  const client = new CompanionApiClient(baseUrl);
  return client.sttStart(config);
}

export async function sttStop(
  baseUrl: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const client = new CompanionApiClient(baseUrl);
  return client.sttStop();
}

// =============================================================================
// React Native Hook Helper
// =============================================================================

/**
 * Create a companion API client instance.
 * Use this in React Native components with the companion host from session store.
 *
 * @example
 * const client = createCompanionClient('http://192.168.1.100:3123');
 * const health = await client.health();
 */
export function createCompanionClient(baseUrl: string): CompanionApiClient {
  return new CompanionApiClient(baseUrl);
}

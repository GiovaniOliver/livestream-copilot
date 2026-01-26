/**
 * Application-wide constants
 */

export const APP_NAME = "FluxBoard";

export const APP_DESCRIPTION =
  "A workflow-first copilot for streamers, podcast teams, writers rooms, brainstorms, and debates.";

/**
 * Theme colors matching the mobile app
 */
export const THEME_COLORS = {
  bg0: "#0D0D12",
  bg1: "#16161D",
  bg2: "#1E1E26",
  text: "#EAEAF3",
  textMuted: "#6B6B7B",
  textDim: "#4A4A57",
  teal: "#00D4C7",
  purple: "#8B5CF6",
  success: "#2EE59D",
  warning: "#FBBF24",
  error: "#EF4444",
} as const;

/**
 * Workflow types - Updated workflow definitions
 */
export const WORKFLOW_TYPES = {
  CONTENT_CREATOR: "content_creator",
  PODCAST: "podcast",
  SCRIPT_STUDIO: "script_studio",
  WRITERS_CORNER: "writers_corner",
  MIND_MAP: "mind_map",
  COURT_SESSION: "court_session",
  DEBATE_ROOM: "debate_room",
} as const;

export type WorkflowType = (typeof WORKFLOW_TYPES)[keyof typeof WORKFLOW_TYPES];

/**
 * Workflow metadata
 */
export const WORKFLOW_META: Record<WorkflowType, {
  label: string;
  description: string;
  path: string;
  icon: string;
}> = {
  [WORKFLOW_TYPES.CONTENT_CREATOR]: {
    label: "Content Creator",
    description: "Clip queue, post drafts by platform, and moment rail for fast publishing.",
    path: "content-creator",
    icon: "video",
  },
  [WORKFLOW_TYPES.PODCAST]: {
    label: "Podcast Console",
    description: "Chapters, quote bank, promos, and highlights list with timestamps.",
    path: "podcast",
    icon: "microphone",
  },
  [WORKFLOW_TYPES.SCRIPT_STUDIO]: {
    label: "Script Studio",
    description: "Screenplay-style editor, scene breakdowns, and format tools for screenwriters and playwrights (film, TV, theater).",
    path: "script-studio",
    icon: "film",
  },
  [WORKFLOW_TYPES.WRITERS_CORNER]: {
    label: "Writers Corner",
    description: "Idea ledger, chapter outlines, and attribution tracking for authors.",
    path: "writers-corner",
    icon: "pencil",
  },
  [WORKFLOW_TYPES.MIND_MAP]: {
    label: "Mind Map Room",
    description: "Clusters, sticky nodes, and action funnel to convert ideas into tasks.",
    path: "mind-map",
    icon: "lightbulb",
  },
  [WORKFLOW_TYPES.COURT_SESSION]: {
    label: "Court Session",
    description: "Evidence board, witness timeline, and verdict tracking for legal analysis.",
    path: "court-session",
    icon: "scales",
  },
  [WORKFLOW_TYPES.DEBATE_ROOM]: {
    label: "Debate Room",
    description: "Claims graph, argument threads, and rebuttal queue for structured debates.",
    path: "debate-room",
    icon: "chat",
  },
};

/**
 * Capture modes
 */
export const CAPTURE_MODES = {
  AUDIO: "audio",
  VIDEO: "video",
  AUDIO_VIDEO: "audio_video",
} as const;

export type CaptureMode = (typeof CAPTURE_MODES)[keyof typeof CAPTURE_MODES];

/**
 * API configuration
 */
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3123",
  WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3123",
} as const;

/**
 * API routes
 */
export const API_ROUTES = {
  SESSIONS: "/api/sessions",
  CLIPS: "/api/clips",
  OUTPUTS: "/api/outputs",
  STT: "/api/stt",
  HEALTH: "/api/health",
} as const;

/**
 * WebSocket events
 */
export const WS_EVENTS = {
  // Client -> Server
  START_SESSION: "session:start",
  END_SESSION: "session:end",
  PAUSE_SESSION: "session:pause",
  RESUME_SESSION: "session:resume",
  CREATE_CLIP: "clip:create",

  // Server -> Client
  TRANSCRIPT_UPDATE: "transcript:update",
  CLIP_CREATED: "clip:created",
  OUTPUT_GENERATED: "output:generated",
  SESSION_STATUS: "session:status",
  ERROR: "error",
} as const;

/**
 * External links
 */
export const EXTERNAL_LINKS = {
  GITHUB: "https://github.com/",
  COMET_OPIK: "https://www.comet.com/opik",
} as const;

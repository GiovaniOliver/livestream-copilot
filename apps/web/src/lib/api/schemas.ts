/**
 * Zod schemas for API response validation
 * Provides comprehensive runtime type checking for all API responses
 */

import { z } from "zod";

// ============================================================================
// Common/Shared Schemas
// ============================================================================

/**
 * Workflow type schema
 */
export const workflowSchema = z.enum([
  "streamer",
  "podcast",
  "debate",
  "brainstorm",
  "court-session",
  "writers-corner",
  "mind-map",
  "script-studio",
]);

/**
 * Capture mode schema
 */
export const captureModeSchema = z.enum(["audio", "video", "av", "manual", "auto", "hybrid"]);

/**
 * Pagination info schema
 */
export const paginationSchema = z.object({
  limit: z.number().int().min(0),
  offset: z.number().int().min(0),
  total: z.number().int().min(0),
});

/**
 * Generic API response wrapper
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    error: z.string().optional(),
  });

/**
 * Generic API error response
 */
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});

// ============================================================================
// Session Schemas
// ============================================================================

/**
 * Participant schema
 */
export const participantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

/**
 * Session counts schema
 */
export const sessionCountsSchema = z.object({
  events: z.number().int().min(0),
  outputs: z.number().int().min(0),
  clips: z.number().int().min(0),
});

/**
 * Session list item schema
 */
export const sessionListItemSchema = z.object({
  id: z.string().min(1), // CUID format (e.g., cmlbcgemg0000i7b80ufgh3ko)
  workflow: workflowSchema,
  captureMode: captureModeSchema,
  title: z.string().nullable(),
  participants: z.array(z.string()),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  isActive: z.boolean(),
  counts: sessionCountsSchema,
});

/**
 * Response from GET /api/sessions
 */
export const getSessionsResponseSchema = apiResponseSchema(
  z.object({
    sessions: z.array(sessionListItemSchema),
    pagination: paginationSchema,
  })
);

/**
 * Response from GET /api/sessions/:id
 */
export const getSessionByIdResponseSchema = apiResponseSchema(
  z.object({
    session: sessionListItemSchema,
  })
);

/**
 * Start session response
 */
export const startSessionResponseSchema = z.object({
  sessionId: z.string().min(1),
  startedAt: z.number().int().min(0),
});

/**
 * End session response
 */
export const endSessionResponseSchema = apiResponseSchema(
  z.object({
    session: sessionListItemSchema,
    duration: z.number().int().min(0).optional(),
    message: z.string().optional(),
  })
);

/**
 * Force stop session response
 */
export const forceStopSessionResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
});

/**
 * Session status response
 */
export const sessionStatusResponseSchema = z.object({
  ok: z.boolean(),
  active: z.boolean(),
  sessionId: z.string().min(1).optional(),
  workflow: workflowSchema.optional(),
  captureMode: captureModeSchema.optional(),
  title: z.string().optional(),
  participants: z.array(participantSchema).optional(),
  startedAt: z.number().int().min(0).optional(),
  elapsed: z.number().int().min(0).optional(),
  // Legacy fields for backward compatibility
  session: z
    .object({
      workflow: workflowSchema,
      captureMode: captureModeSchema,
      title: z.string(),
      participants: z.array(participantSchema),
    })
    .optional(),
  t0: z.number().int().min(0).optional(),
});

/**
 * Session output schema
 */
export const sessionOutputSchema = z.object({
  id: z.string().min(1), // CUID format
  sessionId: z.string().min(1),
  type: z.string().min(1),
  label: z.string().nullable(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

/**
 * Get session outputs response
 */
export const getSessionOutputsResponseSchema = apiResponseSchema(
  z.object({
    outputs: z.array(sessionOutputSchema),
  })
);

/**
 * Update session response
 */
export const updateSessionResponseSchema = apiResponseSchema(
  z.object({
    session: sessionListItemSchema,
  })
);

// ============================================================================
// Clip Schemas
// ============================================================================

/**
 * Clip source type
 */
export const clipSourceSchema = z.enum(["gesture", "voice", "button", "api"]);

/**
 * Clip info schema
 */
export const clipInfoSchema = z.object({
  id: z.string().min(1), // CUID format
  artifactId: z.string().min(1),
  sessionId: z.string().min(1),
  path: z.string().min(1),
  t0: z.number().min(0),
  t1: z.number().min(0),
  duration: z.number().min(0),
  thumbnailId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Clips list response
 */
export const clipsListResponseSchema = apiResponseSchema(
  z.object({
    clips: z.array(clipInfoSchema),
    pagination: paginationSchema,
  })
);

/**
 * Get clip response
 */
export const clipResponseSchema = apiResponseSchema(
  z.object({
    clip: clipInfoSchema,
  })
);

/**
 * Clip intent response
 */
export const clipIntentResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().min(1),
  t: z.number().min(0),
  source: clipSourceSchema,
});

/**
 * Export clip response
 */
export const exportClipResponseSchema = z.object({
  exportId: z.string().min(1),
  status: z.string().min(1),
});

// ============================================================================
// Health Schemas
// ============================================================================

/**
 * Health status enum
 */
export const healthStatusSchema = z.enum(["healthy", "degraded", "unhealthy"]);

/**
 * Component health schema
 */
export const componentHealthSchema = z.object({
  status: healthStatusSchema,
  message: z.string().optional(),
  latency: z.number().min(0).optional(),
  lastCheck: z.number().int().min(0).optional(),
});

/**
 * Health response schema
 */
export const healthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string().min(1),
  version: z.string().min(1),
  uptime: z.number().min(0),
  timestamp: z.string().datetime(),
  components: z.object({
    database: z.boolean(),
    obs: z.boolean(),
    stt: z.boolean(),
    ai: z.boolean(),
    ffmpeg: z.boolean(),
    agents: z.boolean(),
  }),
  session: z.object({
    active: z.boolean(),
    sessionId: z.string().min(1).optional(),
    workflow: z.string().optional(),
    elapsed: z.number().int().min(0).optional(),
  }),
});

/**
 * Agent status schema
 */
export const agentStatusSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  status: z.enum(["idle", "running", "error", "stopped"]),
  lastActivity: z.number().int().min(0).optional(),
  currentTask: z.string().optional(),
  processedCount: z.number().int().min(0),
  errorCount: z.number().int().min(0),
  averageLatency: z.number().min(0).optional(),
});

/**
 * Agents status response
 */
export const agentsStatusResponseSchema = z.object({
  status: healthStatusSchema,
  agents: z.array(agentStatusSchema),
  totalProcessed: z.number().int().min(0),
  totalErrors: z.number().int().min(0),
});

/**
 * FFmpeg status response
 */
export const ffmpegStatusResponseSchema = z.object({
  status: healthStatusSchema,
  installed: z.boolean(),
  version: z.string().optional(),
  path: z.string().optional(),
  codecs: z.object({
    video: z.array(z.string()),
    audio: z.array(z.string()),
  }),
  hwAcceleration: z.object({
    available: z.boolean(),
    type: z.enum(["nvidia", "amd", "intel", "apple"]).optional(),
  }),
  activeJobs: z.number().int().min(0),
  queuedJobs: z.number().int().min(0),
});

/**
 * System resources response
 */
export const systemResourcesResponseSchema = z.object({
  cpu: z.number().min(0).max(100),
  memory: z.object({
    used: z.number().min(0),
    total: z.number().min(0),
    percent: z.number().min(0).max(100),
  }),
  disk: z.object({
    used: z.number().min(0),
    total: z.number().min(0),
    percent: z.number().min(0).max(100),
  }),
});

/**
 * Ping response
 */
export const pingResponseSchema = z.object({
  ok: z.boolean(),
});

// ============================================================================
// Moment Schemas
// ============================================================================

/**
 * Moment type schema
 */
export const momentTypeSchema = z.enum([
  "hype",
  "qa",
  "sponsor",
  "clip",
  "highlight",
  "marker",
]);

/**
 * Moment info schema
 */
export const momentInfoSchema = z.object({
  id: z.string().min(1), // CUID format
  sessionId: z.string().min(1),
  type: momentTypeSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  timestamp: z.number().min(0),
  clipId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
});

/**
 * Moments list response
 */
export const momentsListResponseSchema = apiResponseSchema(
  z.object({
    moments: z.array(momentInfoSchema),
    pagination: paginationSchema,
  })
);

/**
 * Create moment response
 */
export const createMomentResponseSchema = apiResponseSchema(
  z.object({
    moment: momentInfoSchema,
  })
);

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Output status schema
 */
export const outputStatusSchema = z.enum(["draft", "approved", "published", "archived"]);

/**
 * Output info schema
 */
export const outputInfoSchema = z.object({
  id: z.string().min(1), // CUID format
  sessionId: z.string().min(1),
  category: z.string().min(1),
  title: z.string().nullable(),
  text: z.string(),
  refs: z.array(z.string()),
  meta: z.record(z.string(), z.unknown()).nullable(),
  status: outputStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Output with session schema
 */
export const outputWithSessionSchema = outputInfoSchema.extend({
  session: z.object({
    id: z.string().min(1), // CUID format
    workflow: z.string().min(1),
    title: z.string().nullable(),
  }),
});

/**
 * Outputs list response
 */
export const outputsListResponseSchema = apiResponseSchema(
  z.object({
    outputs: z.array(outputInfoSchema),
    pagination: paginationSchema,
  })
);

/**
 * Get output response
 */
export const outputResponseSchema = apiResponseSchema(
  z.object({
    output: outputWithSessionSchema,
  })
);

/**
 * Output mutation response
 */
export const outputMutationResponseSchema = apiResponseSchema(
  z.object({
    output: outputInfoSchema.optional(),
    message: z.string().optional(),
  })
);

/**
 * Approve all response
 */
export const approveAllResponseSchema = apiResponseSchema(
  z.object({
    message: z.string(),
    count: z.number().int().min(0),
  })
);

// ============================================================================
// Post Schemas
// ============================================================================

/**
 * Post platform schema
 */
export const postPlatformSchema = z.enum(["twitter", "linkedin", "instagram", "tiktok"]);

/**
 * Post status schema
 */
export const postStatusSchema = z.enum(["draft", "scheduled", "published", "failed"]);

/**
 * Post info schema
 */
export const postInfoSchema = z.object({
  id: z.string().min(1), // CUID format
  sessionId: z.string().min(1),
  platform: postPlatformSchema,
  content: z.string(),
  media: z.array(z.string()).nullable(),
  status: postStatusSchema,
  scheduledFor: z.string().datetime().nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Posts list response
 */
export const postsListResponseSchema = apiResponseSchema(
  z.object({
    posts: z.array(postInfoSchema),
    pagination: paginationSchema,
  })
);

/**
 * Get post response
 */
export const postResponseSchema = apiResponseSchema(
  z.object({
    post: postInfoSchema,
  })
);

// ============================================================================
// Export Schemas
// ============================================================================

/**
 * Export format schema
 */
export const exportFormatSchema = z.enum(["mp4", "webm", "gif", "zip", "json"]);

/**
 * Export status schema
 */
export const exportStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);

/**
 * Export info schema
 */
export const exportInfoSchema = z.object({
  id: z.string().min(1), // CUID format
  sessionId: z.string().min(1),
  format: exportFormatSchema,
  status: exportStatusSchema,
  progress: z.number().min(0).max(100),
  url: z.string().url().nullable(),
  error: z.string().nullable(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

/**
 * Export response
 */
export const exportResponseSchema = apiResponseSchema(
  z.object({
    export: exportInfoSchema,
  })
);

// ============================================================================
// Auth Schemas
// ============================================================================

/**
 * Login response schema
 */
export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: z.object({
    id: z.string().min(1), // CUID format
    email: z.string().email(),
    name: z.string().min(1),
  }),
});

/**
 * User info schema
 */
export const userInfoSchema = z.object({
  id: z.string().min(1), // CUID format
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type Workflow = z.infer<typeof workflowSchema>;
export type CaptureMode = z.infer<typeof captureModeSchema>;
export type PaginationInfo = z.infer<typeof paginationSchema>;
export type SessionListItem = z.infer<typeof sessionListItemSchema>;
export type ClipInfo = z.infer<typeof clipInfoSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type MomentType = z.infer<typeof momentTypeSchema>;
export type MomentInfo = z.infer<typeof momentInfoSchema>;
export type OutputStatus = z.infer<typeof outputStatusSchema>;
export type OutputInfo = z.infer<typeof outputInfoSchema>;

// ============================================================================
// STT (Speech-to-Text) Schemas
// ============================================================================

/**
 * STT provider schema
 */
export const sttProviderSchema = z.enum(["whisper", "deepgram", "azure", "google"]);

/**
 * STT status schema
 */
export const sttStatusSchema = z.object({
  active: z.boolean(),
  provider: sttProviderSchema.optional(),
  language: z.string().optional(),
  sessionId: z.string().min(1).optional(),
  startedAt: z.number().int().min(0).optional(),
  segmentCount: z.number().int().min(0).optional(),
  wordCount: z.number().int().min(0).optional(),
  averageConfidence: z.number().min(0).max(1).optional(),
});

/**
 * STT start response schema
 */
export const sttStartResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().min(1),
  provider: sttProviderSchema,
  language: z.string(),
});

/**
 * STT stop response schema
 */
export const sttStopResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().min(1),
  duration: z.number().min(0),
  segmentCount: z.number().int().min(0),
  wordCount: z.number().int().min(0),
});

/**
 * Transcript segment schema
 */
export const transcriptSegmentSchema = z.object({
  id: z.string().min(1), // CUID format
  speakerId: z.string().optional(),
  text: z.string(),
  t0: z.number().min(0),
  t1: z.number().min(0),
  confidence: z.number().min(0).max(1).optional(),
  isFinal: z.boolean(),
});

/**
 * STT config update response schema
 */
export const sttConfigUpdateResponseSchema = z.object({
  success: z.boolean(),
  config: z.object({
    provider: sttProviderSchema.optional(),
    language: z.string().optional(),
    interimResults: z.boolean().optional(),
    diarization: z.boolean().optional(),
    maxSpeakers: z.number().int().min(1).optional(),
    profanityFilter: z.boolean().optional(),
    vocabulary: z.array(z.string()).optional(),
  }),
});

// ============================================================================
// Enhanced Export Schemas
// ============================================================================

/**
 * Export job status enum (extended)
 */
export const exportJobStatusSchema = z.enum([
  "pending",
  "preparing",
  "processing",
  "encoding",
  "completed",
  "failed",
]);

/**
 * Start export response schema
 */
export const startExportResponseSchema = z.object({
  exportId: z.string().uuid(),
  status: exportJobStatusSchema,
  createdAt: z.string().datetime(),
});

/**
 * Export status response schema
 */
export const exportStatusResponseSchema = z.object({
  exportId: z.string().uuid(),
  status: exportJobStatusSchema,
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
  error: z.string().optional(),
  downloadUrl: z.string().url().optional(),
  filename: z.string().optional(),
  fileSize: z.number().int().min(0).optional(),
  completedAt: z.string().datetime().optional(),
});

/**
 * Export download response schema
 */
export const exportDownloadResponseSchema = z.object({
  downloadUrl: z.string().url(),
  filename: z.string().min(1),
  fileSize: z.number().int().min(0),
  expiresAt: z.string().datetime().optional(),
});

// ============================================================================
// Enhanced Auth Schemas
// ============================================================================

/**
 * User schema (comprehensive)
 */
export const userSchema = z.object({
  id: z.string().min(1), // CUID format
  email: z.string().email(),
  emailVerified: z.boolean(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  platformRole: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  organizations: z
    .array(
      z.object({
        id: z.string().min(1), // CUID format
        name: z.string().min(1),
        slug: z.string().optional(),
        role: z.string(),
        joinedAt: z.string().datetime().optional(),
      })
    )
    .optional(),
});

/**
 * Enhanced login response schema
 */
export const enhancedLoginResponseSchema = apiResponseSchema(
  z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresIn: z.number().int().min(0),
    tokenType: z.string(),
    user: userSchema,
  })
);

/**
 * Register response schema
 */
export const registerResponseSchema = apiResponseSchema(
  z.object({
    user: userSchema,
    message: z.string(),
  })
);

/**
 * Refresh token response schema
 */
export const refreshTokenResponseSchema = apiResponseSchema(
  z.object({
    accessToken: z.string().min(1),
    expiresIn: z.number().int().min(0),
    tokenType: z.string(),
  })
);

/**
 * OAuth providers response schema
 */
export const oauthProvidersResponseSchema = apiResponseSchema(
  z.object({
    providers: z.array(
      z.object({
        name: z.string().min(1),
        enabled: z.boolean(),
      })
    ),
  })
);

/**
 * OAuth connections response schema
 */
export const oauthConnectionsResponseSchema = apiResponseSchema(
  z.object({
    connections: z.array(z.unknown()),
  })
);

/**
 * Generic auth API response schema
 */
export const authApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
      })
      .optional(),
  });

// ============================================================================
// Additional Type Exports
// ============================================================================

export type STTProvider = z.infer<typeof sttProviderSchema>;
export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>;

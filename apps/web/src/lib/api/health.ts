/**
 * Health check API methods for FluxBoard
 * Enhanced with comprehensive Zod schema validation for runtime type safety
 */

import { apiClient } from "./client";
import {
  healthResponseSchema,
  agentsStatusResponseSchema,
  ffmpegStatusResponseSchema,
  systemResourcesResponseSchema,
  pingResponseSchema,
  type HealthStatus,
} from "./schemas";

/**
 * Component health information
 */
export interface ComponentHealth {
  status: HealthStatus;
  message?: string;
  latency?: number;
  lastCheck?: number;
}

/**
 * Main health response from the backend
 * Note: Backend returns boolean values for components, not ComponentHealth objects
 */
export interface HealthResponse {
  ok: boolean;
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  components: {
    database: boolean;
    obs: boolean;
    stt: boolean;
    ai: boolean;
    ffmpeg: boolean;
    agents: boolean;
  };
  session: {
    active: boolean;
    sessionId?: string;
    workflow?: string;
    elapsed?: number;
  };
}

/**
 * Agent status information
 */
export interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: "idle" | "running" | "error" | "stopped";
  lastActivity?: number;
  currentTask?: string;
  processedCount: number;
  errorCount: number;
  averageLatency?: number;
}

/**
 * Agents status response
 */
export interface AgentsStatusResponse {
  status: HealthStatus;
  agents: AgentStatus[];
  totalProcessed: number;
  totalErrors: number;
}

/**
 * FFmpeg status response
 */
export interface FFmpegStatusResponse {
  status: HealthStatus;
  installed: boolean;
  version?: string;
  path?: string;
  codecs: {
    video: string[];
    audio: string[];
  };
  hwAcceleration: {
    available: boolean;
    type?: "nvidia" | "amd" | "intel" | "apple";
  };
  activeJobs: number;
  queuedJobs: number;
}

/**
 * Get overall health status
 */
export async function getHealth(): Promise<HealthResponse> {
  return apiClient.get("/api/health", healthResponseSchema);
}

/**
 * Get agents status
 */
export async function getAgentsStatus(): Promise<AgentsStatusResponse> {
  return apiClient.get("/api/health/agents", agentsStatusResponseSchema);
}

/**
 * Get FFmpeg status
 */
export async function getFFmpegStatus(): Promise<FFmpegStatusResponse> {
  return apiClient.get("/api/health/ffmpeg", ffmpegStatusResponseSchema);
}

/**
 * Check if the service is reachable (simple ping)
 */
export async function ping(): Promise<boolean> {
  try {
    await apiClient.get("/api/health/ping", pingResponseSchema);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get system resource usage
 */
export async function getSystemResources(): Promise<{
  cpu: number;
  memory: { used: number; total: number; percent: number };
  disk: { used: number; total: number; percent: number };
}> {
  return apiClient.get("/api/health/resources", systemResourcesResponseSchema);
}

/**
 * Check connection to the desktop service with timeout
 * @param timeout - Timeout in milliseconds (default: 5000)
 */
export async function checkConnection(timeout = 5000): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3123"}/api/health/ping`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);
    return {
      connected: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

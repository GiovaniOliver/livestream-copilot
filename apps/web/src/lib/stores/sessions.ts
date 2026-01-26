/**
 * Session types and utility functions
 *
 * Note: Session data is now fetched from the backend API via useSessions hook.
 * This file only contains type definitions and utility functions.
 */

import { WORKFLOW_TYPES, WORKFLOW_META, CAPTURE_MODES, type WorkflowType, type CaptureMode } from "../constants";

/**
 * Session data structure used by the frontend
 */
export interface Session {
  id: string;
  name: string;
  workflow: WorkflowType;
  captureMode: CaptureMode;
  status: "live" | "paused" | "ended";
  startedAt: string;
  endedAt?: string;
  duration: string;
  clipCount: number;
  outputCount: number;
}

/**
 * Input for creating a new session (used by API)
 */
export interface CreateSessionInput {
  name: string;
  workflow: WorkflowType;
  captureMode: CaptureMode;
}

/**
 * Format duration from milliseconds to HH:MM:SS
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get workflow display name from WORKFLOW_META
 */
export function getWorkflowLabel(workflow: WorkflowType): string {
  return WORKFLOW_META[workflow]?.label || workflow;
}

/**
 * Get workflow description from WORKFLOW_META
 */
export function getWorkflowDescription(workflow: WorkflowType): string {
  return WORKFLOW_META[workflow]?.description || "";
}

/**
 * Get capture mode display name
 */
export function getCaptureModeLabel(mode: CaptureMode): string {
  const labels: Record<CaptureMode, string> = {
    [CAPTURE_MODES.AUDIO]: "Audio Only",
    [CAPTURE_MODES.VIDEO]: "Video Only",
    [CAPTURE_MODES.AUDIO_VIDEO]: "Audio + Video",
  };
  return labels[mode] || mode;
}

/**
 * Get workflow route path from WORKFLOW_META
 */
export function getWorkflowPath(workflow: WorkflowType): string {
  return WORKFLOW_META[workflow]?.path || "content-creator";
}

/**
 * Get all workflow types as array
 */
export function getAllWorkflows(): WorkflowType[] {
  return Object.values(WORKFLOW_TYPES);
}

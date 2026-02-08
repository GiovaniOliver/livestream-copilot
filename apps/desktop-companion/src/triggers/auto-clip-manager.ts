/**
 * Auto-Clip Manager
 *
 * Manages automatic clip creation based on trigger events.
 * Tracks active recordings, handles auto-end timers, and creates queue items.
 */

import type { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import * as ClipQueueService from "../db/services/clip-queue.service.js";
import * as TriggerConfigService from "../db/services/trigger-config.service.js";
import type {
  ClipQueueItem,
  TriggerType,
  CreateClipQueueItemInput,
} from "../db/services/clip-queue.service.js";
import type { EventEnvelope } from "@livestream-copilot/shared";
import type { AudioTriggerEvent } from "./audio-trigger.service.js";

import { logger } from '../logger/index.js';

/**
 * Safely convert a status string to a valid ClipQueueStatus value
 */
const VALID_CLIP_QUEUE_STATUSES = ["pending", "recording", "processing", "completed", "failed"] as const;
type ClipQueueStatus = typeof VALID_CLIP_QUEUE_STATUSES[number];

function toClipQueueStatus(status: string): ClipQueueStatus {
  const lower = status.toLowerCase();
  if ((VALID_CLIP_QUEUE_STATUSES as readonly string[]).includes(lower)) {
    return lower as ClipQueueStatus;
  }
  return "pending";
}

/**
 * Safely convert a trigger type string to a valid trigger source value
 */
const VALID_TRIGGER_SOURCES = ["audio", "visual", "manual"] as const;
type TriggerSource = typeof VALID_TRIGGER_SOURCES[number];

function toTriggerSource(triggerType: string): TriggerSource {
  const lower = triggerType.toLowerCase();
  if ((VALID_TRIGGER_SOURCES as readonly string[]).includes(lower)) {
    return lower as TriggerSource;
  }
  return "manual";
}

/**
 * Visual trigger event (from visual detection service)
 */
export interface VisualTriggerEvent {
  sessionId: string;
  workflow: string;
  label: string;
  confidence: number;
  t: number;
}

/**
 * Manual trigger event (from producer button click)
 */
export interface ManualTriggerEvent {
  sessionId: string;
  workflow: string;
  t: number;
}

/**
 * Unified trigger event
 */
export type TriggerEvent =
  | { type: "audio"; event: AudioTriggerEvent }
  | { type: "visual"; event: VisualTriggerEvent }
  | { type: "manual"; event: ManualTriggerEvent };

/**
 * Active clip state
 */
interface ActiveClip {
  queueItemId: string;
  sessionId: string;
  triggerType: TriggerType;
  t0: number;
  endTimer: NodeJS.Timeout | null;
}

/**
 * Auto-Clip Manager
 *
 * Orchestrates automatic clip creation based on trigger events.
 */
export class AutoClipManager {
  private wss: WebSocketServer;
  private activeClips: Map<string, ActiveClip> = new Map();
  private autoClipEnabled: boolean = false;
  private autoClipDuration: number = 60; // seconds
  private workflow: string | null = null;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  /**
   * Initialize manager with workflow configuration
   */
  async initialize(workflow: string): Promise<void> {
    this.workflow = workflow;

    try {
      const config = await TriggerConfigService.getTriggerConfig(workflow);
      if (config) {
        this.autoClipEnabled = config.autoClipEnabled;
        this.autoClipDuration = config.autoClipDuration;
      }

      logger.info(
        `[auto-clip] Initialized for workflow "${workflow}": enabled=${this.autoClipEnabled}, duration=${this.autoClipDuration}s`
      );
    } catch (error) {
      logger.error({ err: error }, "[auto-clip] Failed to load config");
    }
  }

  /**
   * Reload configuration
   */
  async reloadConfig(): Promise<void> {
    if (this.workflow) {
      await this.initialize(this.workflow);
    }
  }

  /**
   * Handle a trigger event and start a new clip
   */
  async handleTrigger(trigger: TriggerEvent): Promise<ClipQueueItem | null> {
    const { type, event } = trigger;

    // Don't auto-clip if disabled
    if (!this.autoClipEnabled && type !== "manual") {
      logger.info(`[auto-clip] Auto-clip disabled, ignoring ${type} trigger`);
      return null;
    }

    const sessionId = event.sessionId;
    const t = 't' in event ? event.t : (event as AudioTriggerEvent).match.t;

    // Check if there's already an active clip for this session
    const existingClip = this.getActiveClipForSession(sessionId);
    if (existingClip) {
      logger.info(
        `[auto-clip] Session ${sessionId} already has an active clip, ignoring trigger`
      );
      return null;
    }

    // Determine trigger details
    let triggerSource: string;
    let triggerConfidence: number | undefined;

    switch (type) {
      case "audio":
        triggerSource = event.match.phrase;
        triggerConfidence = event.match.confidence;
        break;
      case "visual":
        triggerSource = event.label;
        triggerConfidence = event.confidence;
        break;
      case "manual":
        triggerSource = "manual";
        break;
    }

    // Create clip queue item
    const queueItemInput: CreateClipQueueItemInput = {
      sessionId,
      triggerType: type.toUpperCase() as TriggerType,
      triggerSource,
      triggerConfidence,
      t0: t,
      title: `${type === "manual" ? "Manual" : triggerSource} clip`,
    };

    try {
      const queueItem = await ClipQueueService.createClipQueueItem(queueItemInput);

      logger.info(
        `[auto-clip] Created clip queue item ${queueItem.id} (${type}: "${triggerSource}" at t=${t.toFixed(2)}s)`
      );

      // Track active clip
      const activeClip: ActiveClip = {
        queueItemId: queueItem.id,
        sessionId,
        triggerType: type.toUpperCase() as TriggerType,
        t0: t,
        endTimer: null,
      };

      // Set up auto-end timer if enabled and not manual
      if (this.autoClipEnabled) {
        activeClip.endTimer = setTimeout(() => {
          this.endClip(queueItem.id, t + this.autoClipDuration);
        }, this.autoClipDuration * 1000);
      }

      this.activeClips.set(queueItem.id, activeClip);

      // Emit CLIP_INTENT_START event
      this.emitClipIntentStart(sessionId, t, type, triggerSource, triggerConfidence);

      // Emit CLIP_QUEUE_UPDATED event
      this.emitQueueUpdated(queueItem);

      return queueItem;
    } catch (error) {
      logger.error({ err: error }, "[auto-clip] Failed to create clip queue item");
      return null;
    }
  }

  /**
   * End an active clip
   */
  async endClip(queueItemId: string, t1?: number): Promise<ClipQueueItem | null> {
    const activeClip = this.activeClips.get(queueItemId);
    if (!activeClip) {
      logger.warn(`[auto-clip] No active clip with ID ${queueItemId}`);
      return null;
    }

    // Clear timer if exists
    if (activeClip.endTimer) {
      clearTimeout(activeClip.endTimer);
    }

    // Calculate end time if not provided
    const endTime = t1 ?? activeClip.t0 + this.autoClipDuration;

    try {
      // Update queue item
      const queueItem = await ClipQueueService.endRecording(queueItemId, endTime);

      logger.info(
        `[auto-clip] Ended clip ${queueItemId} at t1=${endTime.toFixed(2)}s (duration: ${(endTime - activeClip.t0).toFixed(2)}s)`
      );

      // Remove from active clips
      this.activeClips.delete(queueItemId);

      // Emit CLIP_INTENT_END event
      this.emitClipIntentEnd(
        activeClip.sessionId,
        endTime,
        toTriggerSource(activeClip.triggerType)
      );

      // Emit CLIP_QUEUE_UPDATED event
      this.emitQueueUpdated(queueItem);

      return queueItem;
    } catch (error) {
      logger.error({ err: error }, "[auto-clip] Failed to end clip");
      return null;
    }
  }

  /**
   * Cancel an active clip
   */
  async cancelClip(queueItemId: string): Promise<void> {
    const activeClip = this.activeClips.get(queueItemId);
    if (!activeClip) {
      return;
    }

    // Clear timer
    if (activeClip.endTimer) {
      clearTimeout(activeClip.endTimer);
    }

    try {
      // Delete queue item
      await ClipQueueService.deleteClipQueueItem(queueItemId);

      logger.info(`[auto-clip] Cancelled clip ${queueItemId}`);

      // Remove from active clips
      this.activeClips.delete(queueItemId);
    } catch (error) {
      logger.error({ err: error }, "[auto-clip] Failed to cancel clip");
    }
  }

  /**
   * Get active clip for a session
   */
  getActiveClipForSession(sessionId: string): ActiveClip | null {
    for (const clip of this.activeClips.values()) {
      if (clip.sessionId === sessionId) {
        return clip;
      }
    }
    return null;
  }

  /**
   * Get all active clips
   */
  getActiveClips(): ActiveClip[] {
    return Array.from(this.activeClips.values());
  }

  /**
   * Stop all active clips and clean up
   */
  async stopAll(): Promise<void> {
    logger.info(`[auto-clip] Stopping ${this.activeClips.size} active clips`);

    for (const [queueItemId, clip] of this.activeClips) {
      if (clip.endTimer) {
        clearTimeout(clip.endTimer);
      }

      // End the clip at current time
      const now = Date.now() / 1000;
      const t1 = clip.t0 + (now - clip.t0);

      try {
        await ClipQueueService.endRecording(queueItemId, t1);
      } catch {
        // Ignore errors during cleanup
      }
    }

    this.activeClips.clear();
  }

  /**
   * Emit CLIP_INTENT_START event
   */
  private emitClipIntentStart(
    sessionId: string,
    t: number,
    source: "audio" | "visual" | "manual",
    triggerSource: string,
    confidence?: number
  ): void {
    const sourceMap = {
      audio: "voice",
      visual: "gesture",
      manual: "button",
    } as const;

    const event: EventEnvelope = {
      id: uuidv4(),
      sessionId,
      ts: Date.now(),
      type: "CLIP_INTENT_START",
      payload: {
        t,
        source: sourceMap[source],
        confidence,
      },
    };

    this.broadcast(event);
    logger.info(`[auto-clip] Emitted CLIP_INTENT_START for ${triggerSource}`);
  }

  /**
   * Emit CLIP_INTENT_END event
   */
  private emitClipIntentEnd(
    sessionId: string,
    t: number,
    source: "audio" | "visual" | "manual"
  ): void {
    const sourceMap = {
      audio: "voice",
      visual: "gesture",
      manual: "button",
    } as const;

    const event: EventEnvelope = {
      id: uuidv4(),
      sessionId,
      ts: Date.now(),
      type: "CLIP_INTENT_END",
      payload: {
        t,
        source: sourceMap[source],
      },
    };

    this.broadcast(event);
    logger.info(`[auto-clip] Emitted CLIP_INTENT_END at t=${t.toFixed(2)}s`);
  }

  /**
   * Emit CLIP_QUEUE_UPDATED event
   */
  private emitQueueUpdated(queueItem: ClipQueueItem): void {
    const event: EventEnvelope = {
      id: uuidv4(),
      sessionId: queueItem.sessionId,
      ts: Date.now(),
      type: "CLIP_QUEUE_UPDATED",
      payload: {
        queueItemId: queueItem.id,
        status: toClipQueueStatus(queueItem.status),
        triggerType: toTriggerSource(queueItem.triggerType),
        triggerSource: queueItem.triggerSource ?? undefined,
        t0: queueItem.t0,
        t1: queueItem.t1 ?? undefined,
        clipId: queueItem.clipId ?? undefined,
        thumbnailPath: queueItem.thumbnailPath ?? undefined,
        title: queueItem.title ?? undefined,
        errorMessage: queueItem.errorMessage ?? undefined,
      },
    };

    this.broadcast(event);
  }

  /**
   * Broadcast event to all WebSocket clients
   */
  private broadcast(event: EventEnvelope): void {
    const message = JSON.stringify(event);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }
}

/**
 * Singleton instance
 */
let autoClipManager: AutoClipManager | null = null;

/**
 * Get or create the auto-clip manager
 */
export function getAutoClipManager(wss: WebSocketServer): AutoClipManager {
  if (!autoClipManager) {
    autoClipManager = new AutoClipManager(wss);
  }
  return autoClipManager;
}

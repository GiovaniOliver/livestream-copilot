/**
 * Clip Queue Processor
 *
 * Processes pending clip queue items through FFmpeg.
 * Handles video trimming, thumbnail generation, and status updates.
 */

import type { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import * as ClipQueueService from "../db/services/clip-queue.service.js";
import * as ClipService from "../db/services/clip.service.js";
import * as SessionService from "../db/services/session.service.js";
import { trimClip, type TrimClipInput, type TrimClipResult } from "../ffmpeg/index.js";
import { config } from "../config/index.js";
import type { EventEnvelope } from "@livestream-copilot/shared";
import type { ClipQueueItem } from "../db/services/clip-queue.service.js";

/**
 * Processing options
 */
export interface ProcessorOptions {
  /** Maximum concurrent processing jobs */
  concurrency: number;
  /** Polling interval in ms */
  pollingInterval: number;
  /** Session directory */
  sessionDir: string;
  /** Replay buffer seconds */
  replayBufferSeconds: number;
}

const DEFAULT_OPTIONS: ProcessorOptions = {
  concurrency: 1,
  pollingInterval: 5000,
  sessionDir: config.SESSION_DIR,
  replayBufferSeconds: config.REPLAY_BUFFER_SECONDS,
};

/**
 * Clip Queue Processor
 *
 * Continuously processes pending clip queue items.
 */
export class ClipQueueProcessor {
  private wss: WebSocketServer;
  private options: ProcessorOptions;
  private isRunning: boolean = false;
  private processingCount: number = 0;
  private pollTimeout: NodeJS.Timeout | null = null;

  constructor(wss: WebSocketServer, options?: Partial<ProcessorOptions>) {
    this.wss = wss;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Start the processor
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log(
      `[clip-processor] Started (concurrency: ${this.options.concurrency}, polling: ${this.options.pollingInterval}ms)`
    );

    this.poll();
  }

  /**
   * Stop the processor
   */
  stop(): void {
    this.isRunning = false;

    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }

    console.log("[clip-processor] Stopped");
  }

  /**
   * Poll for pending items
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Check if we can process more items
      if (this.processingCount >= this.options.concurrency) {
        this.scheduleNextPoll();
        return;
      }

      // Get next pending item
      const item = await ClipQueueService.getNextPendingItem();

      if (item) {
        // Process in background
        this.processItem(item).catch((error) => {
          console.error("[clip-processor] Error processing item:", error);
        });
      }
    } catch (error) {
      console.error("[clip-processor] Error polling:", error);
    }

    this.scheduleNextPoll();
  }

  /**
   * Schedule next poll
   */
  private scheduleNextPoll(): void {
    if (!this.isRunning) return;

    this.pollTimeout = setTimeout(() => this.poll(), this.options.pollingInterval);
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: ClipQueueItem): Promise<void> {
    this.processingCount++;

    try {
      console.log(`[clip-processor] Processing item ${item.id} (${item.triggerType}: ${item.triggerSource})`);

      // Mark as processing
      await ClipQueueService.startProcessing(item.id);
      this.emitQueueUpdated(await ClipQueueService.getClipQueueItemById(item.id)!);

      // Get session info
      const session = await SessionService.getSessionById(item.sessionId);
      if (!session) {
        throw new Error(`Session not found: ${item.sessionId}`);
      }

      // Find the replay buffer file
      // Note: In a real implementation, this would be coordinated with OBS
      // For now, we assume the replay buffer was saved and we need to find it
      const sessionDir = path.join(this.options.sessionDir, session.id);
      const replayBufferPath = await this.findReplayBuffer(sessionDir);

      if (!replayBufferPath) {
        throw new Error("Replay buffer not found");
      }

      // Calculate session started time
      const sessionStartedAt = session.startedAt?.getTime() ?? Date.now() - 300000;

      // Generate artifact ID
      const artifactId = uuidv4();

      // Trim the clip
      const trimInput: TrimClipInput = {
        replayBufferPath,
        t0: item.t0,
        t1: item.t1!,
        sessionDir,
        artifactId,
        sessionStartedAt,
        replayBufferSavedAt: Date.now(),
        replayBufferSeconds: this.options.replayBufferSeconds,
      };

      const result = await trimClip(trimInput);

      // Create clip record in database
      const clip = await ClipService.createClip({
        sessionId: item.sessionId,
        artifactId,
        path: result.clipPath,
        t0: item.t0,
        t1: item.t1!,
        thumbnailId: result.thumbnailArtifactId,
      });

      // Mark as completed
      const completedItem = await ClipQueueService.completeProcessing(
        item.id,
        clip.id,
        result.thumbnailPath
      );

      console.log(
        `[clip-processor] Completed item ${item.id} -> clip ${clip.id} (${result.clipPath})`
      );

      this.emitQueueUpdated(completedItem);
      this.emitClipCreated(item.sessionId, clip.id, artifactId, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[clip-processor] Failed to process item ${item.id}:`, error);

      // Mark as failed
      const failedItem = await ClipQueueService.failProcessing(item.id, errorMessage);
      this.emitQueueUpdated(failedItem);
    } finally {
      this.processingCount--;
    }
  }

  /**
   * Find the most recent replay buffer file
   */
  private async findReplayBuffer(sessionDir: string): Promise<string | null> {
    const fs = await import("fs/promises");

    try {
      // Look for replay buffer files in session directory
      const files = await fs.readdir(sessionDir);
      const replayFiles = files.filter(
        (f) => f.startsWith("replay") && (f.endsWith(".mp4") || f.endsWith(".mkv"))
      );

      if (replayFiles.length === 0) {
        // Also check parent directory for replay buffer
        const parentDir = path.dirname(sessionDir);
        const parentFiles = await fs.readdir(parentDir);
        const parentReplayFiles = parentFiles.filter(
          (f) => f.startsWith("replay") && (f.endsWith(".mp4") || f.endsWith(".mkv"))
        );

        if (parentReplayFiles.length > 0) {
          // Return most recent
          parentReplayFiles.sort().reverse();
          return path.join(parentDir, parentReplayFiles[0]);
        }

        return null;
      }

      // Return most recent
      replayFiles.sort().reverse();
      return path.join(sessionDir, replayFiles[0]);
    } catch {
      return null;
    }
  }

  /**
   * Emit CLIP_QUEUE_UPDATED event
   */
  private emitQueueUpdated(queueItem: ClipQueueItem | null): void {
    if (!queueItem) return;

    const event: EventEnvelope = {
      id: uuidv4(),
      sessionId: queueItem.sessionId,
      ts: Date.now(),
      type: "CLIP_QUEUE_UPDATED",
      payload: {
        queueItemId: queueItem.id,
        status: queueItem.status.toLowerCase(),
        triggerType: queueItem.triggerType.toLowerCase(),
        triggerSource: queueItem.triggerSource,
        t0: queueItem.t0,
        t1: queueItem.t1,
        clipId: queueItem.clipId,
        thumbnailPath: queueItem.thumbnailPath,
        title: queueItem.title,
        errorMessage: queueItem.errorMessage,
      },
    };

    this.broadcast(event);
  }

  /**
   * Emit ARTIFACT_CLIP_CREATED event
   */
  private emitClipCreated(
    sessionId: string,
    clipId: string,
    artifactId: string,
    result: TrimClipResult
  ): void {
    const event: EventEnvelope = {
      id: uuidv4(),
      sessionId,
      ts: Date.now(),
      type: "ARTIFACT_CLIP_CREATED",
      payload: {
        artifactId,
        path: result.clipPath,
        t0: result.trimmedStartTime,
        t1: result.trimmedStartTime + result.duration,
        thumbnailArtifactId: result.thumbnailArtifactId,
      },
    };

    this.broadcast(event);
    console.log(`[clip-processor] Emitted ARTIFACT_CLIP_CREATED for ${artifactId}`);
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

  /**
   * Manually process a specific queue item
   */
  async processById(id: string): Promise<void> {
    const item = await ClipQueueService.getClipQueueItemById(id);
    if (!item) {
      throw new Error(`Queue item not found: ${id}`);
    }

    if (item.status !== "PENDING" && item.status !== "FAILED") {
      throw new Error(`Cannot process item with status: ${item.status}`);
    }

    await this.processItem(item);
  }
}

/**
 * Singleton instance
 */
let clipQueueProcessor: ClipQueueProcessor | null = null;

/**
 * Get or create the clip queue processor
 */
export function getClipQueueProcessor(
  wss: WebSocketServer,
  options?: Partial<ProcessorOptions>
): ClipQueueProcessor {
  if (!clipQueueProcessor) {
    clipQueueProcessor = new ClipQueueProcessor(wss, options);
  }
  return clipQueueProcessor;
}

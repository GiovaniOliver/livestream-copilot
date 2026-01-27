/**
 * Visual Trigger Service
 *
 * Detects visual cues (gestures, poses, objects) from video frames.
 * Supports multiple detection providers:
 * - MediaPipe (free, runs locally)
 * - Claude Vision (cloud, ~$0.003/frame)
 * - Gemini Pro Vision (cloud)
 * - OpenAI GPT-4 Vision (cloud)
 */

import type { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import * as TriggerConfigService from "../db/services/trigger-config.service.js";
import * as ReferenceImageService from "../db/services/reference-image.service.js";
import type { VisualTrigger } from "../db/services/trigger-config.service.js";
import type { EventEnvelope } from "@livestream-copilot/shared";

/**
 * Visual detection result
 */
export interface VisualDetection {
  label: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Visual trigger event
 */
export interface VisualTriggerEvent {
  sessionId: string;
  workflow: string;
  detection: VisualDetection;
  t: number;
}

export type VisualTriggerCallback = (event: VisualTriggerEvent) => void;

/**
 * Detection provider interface
 */
export interface VisualDetectionProvider {
  name: string;
  detect(frame: Buffer, triggers: VisualTrigger[]): Promise<VisualDetection[]>;
  dispose(): void;
}

/**
 * MediaPipe detection provider (free, local)
 * Note: MediaPipe runs in the browser, so this provider forwards
 * detections from the frontend via WebSocket.
 */
export class MediaPipeProvider implements VisualDetectionProvider {
  name = "mediapipe";

  // MediaPipe runs in the browser, detections come via WebSocket
  // This is a placeholder that accepts forwarded detections
  private pendingDetections: VisualDetection[] = [];

  async detect(_frame: Buffer, triggers: VisualTrigger[]): Promise<VisualDetection[]> {
    // Filter detections by enabled triggers
    const triggerLabels = triggers
      .filter((t) => t.enabled)
      .map((t) => t.label.toLowerCase());

    return this.pendingDetections.filter((d) =>
      triggerLabels.includes(d.label.toLowerCase())
    );
  }

  /**
   * Receive detections from browser MediaPipe
   */
  receiveDetections(detections: VisualDetection[]): void {
    this.pendingDetections = detections;
  }

  dispose(): void {
    this.pendingDetections = [];
  }
}

/**
 * Claude Vision detection provider
 */
export class ClaudeVisionProvider implements VisualDetectionProvider {
  name = "claude";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async detect(frame: Buffer, triggers: VisualTrigger[]): Promise<VisualDetection[]> {
    if (!this.apiKey) {
      console.warn("[visual-trigger] Claude API key not configured");
      return [];
    }

    try {
      const triggerDescriptions = triggers
        .filter((t) => t.enabled)
        .map((t) => `- "${t.label}" (threshold: ${t.threshold})`)
        .join("\n");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: frame.toString("base64"),
                  },
                },
                {
                  type: "text",
                  text: `Analyze this image and detect if any of the following visual cues are present:
${triggerDescriptions}

Respond with a JSON array of detected items. Each item should have:
- "label": the exact label from the list above
- "confidence": a number from 0 to 1 indicating how confident you are

Only include items you are confident are present (confidence > threshold).
If nothing is detected, respond with an empty array: []

Response format: [{"label": "...", "confidence": 0.95}]`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text || "[]";

      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const detections: VisualDetection[] = JSON.parse(jsonMatch[0]);
      return detections;
    } catch (error) {
      console.error("[visual-trigger] Claude detection error:", error);
      return [];
    }
  }

  dispose(): void {
    // Nothing to clean up
  }
}

/**
 * Visual Trigger Service
 *
 * Manages visual detection and triggers.
 */
export class VisualTriggerService {
  private sessionId: string | null = null;
  private workflow: string | null = null;
  private wss: WebSocketServer;
  private callbacks: VisualTriggerCallback[] = [];
  private enabled: boolean = false;
  private triggers: VisualTrigger[] = [];
  private provider: VisualDetectionProvider | null = null;
  private frameSampleRate: number = 5;
  private extractionInterval: NodeJS.Timeout | null = null;
  private lastTriggerTime: Map<string, number> = new Map();
  private cooldownMs: number = 30000;
  private sessionStartTime: number = 0;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  /**
   * Start visual trigger monitoring
   */
  async start(
    sessionId: string,
    workflow: string,
    providerType: string = "mediapipe"
  ): Promise<void> {
    this.sessionId = sessionId;
    this.workflow = workflow;
    this.sessionStartTime = Date.now();

    // Load configuration
    await this.loadConfig();

    if (!this.enabled || this.triggers.length === 0) {
      console.log(
        `[visual-trigger] Visual triggers disabled or no cues configured for workflow "${workflow}"`
      );
      return;
    }

    // Initialize provider
    this.provider = this.createProvider(providerType);

    // Start frame extraction for cloud providers
    if (providerType !== "mediapipe" && this.provider) {
      this.startFrameExtraction();
    }

    console.log(
      `[visual-trigger] Started with ${this.triggers.length} visual cues for workflow "${workflow}" using ${providerType}`
    );
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.extractionInterval) {
      clearInterval(this.extractionInterval);
      this.extractionInterval = null;
    }

    if (this.provider) {
      this.provider.dispose();
      this.provider = null;
    }

    this.sessionId = null;
    this.workflow = null;
    this.lastTriggerTime.clear();

    console.log("[visual-trigger] Stopped monitoring");
  }

  /**
   * Register a callback for trigger events
   */
  onTrigger(callback: VisualTriggerCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a callback
   */
  offTrigger(callback: VisualTriggerCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index >= 0) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Handle detections from browser MediaPipe
   * Called when the frontend sends detection results via WebSocket
   */
  handleMediaPipeDetections(detections: VisualDetection[]): void {
    if (!this.enabled || !this.sessionId || !this.workflow) return;

    if (this.provider instanceof MediaPipeProvider) {
      this.provider.receiveDetections(detections);
      this.processDetections(detections);
    }
  }

  /**
   * Process detections and emit trigger events
   */
  private processDetections(detections: VisualDetection[]): void {
    if (!this.sessionId || !this.workflow) return;

    const now = Date.now();
    const t = (now - this.sessionStartTime) / 1000;

    for (const detection of detections) {
      // Find matching trigger
      const trigger = this.triggers.find(
        (tr) => tr.label.toLowerCase() === detection.label.toLowerCase() && tr.enabled
      );

      if (!trigger) continue;

      // Check confidence threshold
      if (detection.confidence < trigger.threshold) continue;

      // Check cooldown
      const lastTrigger = this.lastTriggerTime.get(trigger.id) ?? 0;
      if (now - lastTrigger < this.cooldownMs) {
        console.log(
          `[visual-trigger] "${trigger.label}" detected but in cooldown (${Math.round((this.cooldownMs - (now - lastTrigger)) / 1000)}s remaining)`
        );
        continue;
      }

      // Update last trigger time
      this.lastTriggerTime.set(trigger.id, now);

      console.log(
        `[visual-trigger] Detected: "${trigger.label}" at t=${t.toFixed(2)}s (confidence: ${(detection.confidence * 100).toFixed(1)}%)`
      );

      // Emit trigger event
      const triggerEvent: VisualTriggerEvent = {
        sessionId: this.sessionId,
        workflow: this.workflow,
        detection,
        t,
      };

      // Notify callbacks
      for (const callback of this.callbacks) {
        try {
          callback(triggerEvent);
        } catch (error) {
          console.error("[visual-trigger] Callback error:", error);
        }
      }

      // Emit to WebSocket clients
      this.emitTriggerEvent(triggerEvent);
    }
  }

  /**
   * Reload configuration
   */
  async reloadConfig(): Promise<void> {
    await this.loadConfig();
  }

  /**
   * Load configuration from database
   */
  private async loadConfig(): Promise<void> {
    if (!this.workflow) return;

    try {
      const config = await TriggerConfigService.getTriggerConfig(this.workflow);

      if (!config) {
        this.enabled = false;
        this.triggers = [];
        return;
      }

      this.enabled = config.visualEnabled;
      this.frameSampleRate = config.frameSampleRate;
      this.cooldownMs = config.triggerCooldown * 1000;
      this.triggers = config.visualTriggers.filter((t) => t.enabled);

      console.log(
        `[visual-trigger] Loaded config: enabled=${this.enabled}, sampleRate=${this.frameSampleRate}s, triggers=${this.triggers.length}`
      );
    } catch (error) {
      console.error("[visual-trigger] Failed to load config:", error);
      this.enabled = false;
      this.triggers = [];
    }
  }

  /**
   * Create detection provider based on type
   */
  private createProvider(type: string): VisualDetectionProvider | null {
    switch (type) {
      case "mediapipe":
        return new MediaPipeProvider();

      case "claude":
        const claudeKey = process.env.ANTHROPIC_API_KEY;
        if (!claudeKey) {
          console.warn("[visual-trigger] ANTHROPIC_API_KEY not set");
          return null;
        }
        return new ClaudeVisionProvider(claudeKey);

      // TODO: Add GeminiVisionProvider, OpenAIVisionProvider

      default:
        console.warn(`[visual-trigger] Unknown provider: ${type}`);
        return new MediaPipeProvider();
    }
  }

  /**
   * Start periodic frame extraction for cloud providers
   */
  private startFrameExtraction(): void {
    if (this.extractionInterval) {
      clearInterval(this.extractionInterval);
    }

    this.extractionInterval = setInterval(async () => {
      if (!this.provider || !this.enabled) return;

      try {
        // TODO: Extract frame from MediaMTX RTSP stream
        // For now, this is a placeholder
        // const frame = await extractFrameFromStream();
        // const detections = await this.provider.detect(frame, this.triggers);
        // this.processDetections(detections);
      } catch (error) {
        console.error("[visual-trigger] Frame extraction error:", error);
      }
    }, this.frameSampleRate * 1000);
  }

  /**
   * Emit trigger event to WebSocket clients
   */
  private emitTriggerEvent(triggerEvent: VisualTriggerEvent): void {
    const event: EventEnvelope = {
      id: uuidv4(),
      sessionId: triggerEvent.sessionId,
      ts: Date.now(),
      type: "AUTO_TRIGGER_DETECTED",
      payload: {
        triggerType: "visual",
        triggerSource: triggerEvent.detection.label,
        confidence: triggerEvent.detection.confidence,
        t: triggerEvent.t,
      },
    };

    const message = JSON.stringify(event);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });

    console.log(
      `[visual-trigger] Emitted AUTO_TRIGGER_DETECTED: "${triggerEvent.detection.label}"`
    );
  }
}

/**
 * Singleton instance
 */
let visualTriggerService: VisualTriggerService | null = null;

/**
 * Get or create the visual trigger service
 */
export function getVisualTriggerService(wss: WebSocketServer): VisualTriggerService {
  if (!visualTriggerService) {
    visualTriggerService = new VisualTriggerService(wss);
  }
  return visualTriggerService;
}

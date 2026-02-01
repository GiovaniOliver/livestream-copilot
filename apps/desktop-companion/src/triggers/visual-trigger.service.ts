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
import { GeminiVisionProvider } from "./vision-providers/gemini.js";
import { OpenAIVisionProvider } from "./vision-providers/openai.js";
import { FrameExtractor, createFrameExtractor } from "./frame-extractor.js";
import { config } from "../config/index.js";
import { createLogger } from "../logger/index.js";

const logger = createLogger("visual-trigger");

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
      logger.warn("[ClaudeVision] API key not configured");
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
      logger.error({ error }, "[ClaudeVision] Detection error");
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
  private geminiProvider: GeminiVisionProvider | null = null;
  private openaiProvider: OpenAIVisionProvider | null = null;
  private frameExtractor: FrameExtractor | null = null;
  private frameSampleRate: number = 5;
  private extractionInterval: NodeJS.Timeout | null = null;
  private lastTriggerTime: Map<string, number> = new Map();
  private lastFrameCheck: Map<string, number> = new Map();
  private cooldownMs: number = 30000;
  private frameCheckInterval: number = 2000; // Minimum 2 seconds between frame checks
  private sessionStartTime: number = 0;

  constructor(wss: WebSocketServer) {
    this.wss = wss;

    // Initialize vision providers
    if (config.GEMINI_API_KEY) {
      try {
        this.geminiProvider = new GeminiVisionProvider(config.GEMINI_API_KEY);
        logger.info("[VisualTrigger] Gemini vision provider initialized");
      } catch (error) {
        logger.warn({ error }, "[VisualTrigger] Failed to initialize Gemini provider");
      }
    }

    if (config.OPENAI_API_KEY) {
      try {
        this.openaiProvider = new OpenAIVisionProvider(config.OPENAI_API_KEY);
        logger.info("[VisualTrigger] OpenAI vision provider initialized");
      } catch (error) {
        logger.warn({ error }, "[VisualTrigger] Failed to initialize OpenAI provider");
      }
    }

    // Get frame check interval from config
    this.frameCheckInterval = config.VISUAL_TRIGGER_FRAME_INTERVAL || 2000;
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
      logger.info(
        { workflow },
        "[VisualTrigger] Visual triggers disabled or no cues configured"
      );
      return;
    }

    // Initialize provider
    this.provider = this.createProvider(providerType);

    // Start frame extraction for cloud providers
    if (providerType !== "mediapipe" && this.provider) {
      this.startFrameExtraction();
    }

    logger.info(
      { workflow, triggerCount: this.triggers.length, providerType },
      "[VisualTrigger] Started monitoring"
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

    if (this.frameExtractor) {
      this.frameExtractor.stopPeriodicExtraction();
      this.frameExtractor = null;
    }

    if (this.provider) {
      this.provider.dispose();
      this.provider = null;
    }

    this.sessionId = null;
    this.workflow = null;
    this.lastTriggerTime.clear();
    this.lastFrameCheck.clear();

    logger.info("[VisualTrigger] Stopped monitoring");
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
        const remainingSec = Math.round((this.cooldownMs - (now - lastTrigger)) / 1000);
        logger.debug(
          { label: trigger.label, remainingSec },
          "[VisualTrigger] Detection in cooldown"
        );
        continue;
      }

      // Update last trigger time
      this.lastTriggerTime.set(trigger.id, now);

      logger.info(
        {
          label: trigger.label,
          t: t.toFixed(2),
          confidence: (detection.confidence * 100).toFixed(1),
        },
        "[VisualTrigger] Detected visual cue"
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
          logger.error({ error }, "[VisualTrigger] Callback error");
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

      logger.info(
        {
          enabled: this.enabled,
          sampleRate: this.frameSampleRate,
          triggerCount: this.triggers.length,
        },
        "[VisualTrigger] Config loaded"
      );
    } catch (error) {
      logger.error({ error }, "[VisualTrigger] Failed to load config");
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
          logger.warn("[VisualTrigger] ANTHROPIC_API_KEY not set");
          return null;
        }
        return new ClaudeVisionProvider(claudeKey);

      case "gemini":
        if (!this.geminiProvider) {
          logger.warn("[VisualTrigger] Gemini provider not initialized");
          return null;
        }
        logger.info("[VisualTrigger] Using Gemini vision provider");
        return null; // Gemini uses new interface, handled separately

      case "openai":
        if (!this.openaiProvider) {
          logger.warn("[VisualTrigger] OpenAI provider not initialized");
          return null;
        }
        logger.info("[VisualTrigger] Using OpenAI vision provider");
        return null; // OpenAI uses new interface, handled separately

      default:
        logger.warn({ type }, "[VisualTrigger] Unknown provider, defaulting to MediaPipe");
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

    // Initialize frame extractor for RTSP stream
    this.frameExtractor = createFrameExtractor("live/stream", {
      maxWidth: 1024,
      quality: 85,
    });

    logger.info(
      { sampleRate: this.frameSampleRate },
      "[VisualTrigger] Starting frame extraction"
    );

    this.extractionInterval = setInterval(async () => {
      if (!this.enabled || this.triggers.length === 0) return;

      try {
        await this.checkVisualTriggers();
      } catch (error) {
        logger.error({ error }, "[VisualTrigger] Frame extraction error");
      }
    }, this.frameSampleRate * 1000);
  }

  /**
   * Check all enabled visual triggers
   */
  private async checkVisualTriggers(): Promise<void> {
    if (!this.frameExtractor) {
      logger.warn("[VisualTrigger] Frame extractor not initialized");
      return;
    }

    const now = Date.now();

    // Check rate limiting
    const lastCheck = this.lastFrameCheck.get("global") || 0;
    if (now - lastCheck < this.frameCheckInterval) {
      logger.debug(
        { remaining: this.frameCheckInterval - (now - lastCheck) },
        "[VisualTrigger] Rate limited, skipping frame check"
      );
      return;
    }

    this.lastFrameCheck.set("global", now);

    try {
      // Extract frame with timeout
      const frameBuffer = await Promise.race([
        this.frameExtractor.extractFrame(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Frame extraction timeout")), 5000)
        ),
      ]);

      logger.debug(
        { size: frameBuffer.length },
        "[VisualTrigger] Frame extracted successfully"
      );

      // Process triggers based on provider type
      await this.processTriggersWithVision(frameBuffer);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          logger.warn("[VisualTrigger] Frame extraction timeout");
        } else {
          logger.error({ error }, "[VisualTrigger] Frame extraction failed");
        }
      }
    }
  }

  /**
   * Process triggers with vision API
   */
  private async processTriggersWithVision(frameBuffer: Buffer): Promise<void> {
    for (const trigger of this.triggers) {
      if (!trigger.enabled) continue;

      // Check trigger cooldown
      const now = Date.now();
      const lastTrigger = this.lastTriggerTime.get(trigger.id) ?? 0;
      if (now - lastTrigger < this.cooldownMs) {
        continue;
      }

      try {
        // Determine provider from trigger config
        const visionProvider = (trigger as any).visionProvider || "gemini";
        const confidenceThreshold = (trigger as any).confidenceThreshold || 0.7;
        const visualQuery = (trigger as any).visualQuery || trigger.label;

        // Detect with appropriate provider
        let detection: VisualDetection | null = null;

        if (visionProvider === "gemini" && this.geminiProvider) {
          detection = await Promise.race([
            this.geminiProvider.detect(frameBuffer, visualQuery, confidenceThreshold),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Vision detection timeout")), config.VISUAL_TRIGGER_TIMEOUT || 10000)
            ),
          ]);
        } else if (visionProvider === "openai" && this.openaiProvider) {
          detection = await Promise.race([
            this.openaiProvider.detect(frameBuffer, visualQuery, confidenceThreshold),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Vision detection timeout")), config.VISUAL_TRIGGER_TIMEOUT || 10000)
            ),
          ]);
        } else if (visionProvider === "claude" && this.provider) {
          // Use legacy provider interface
          const detections = await this.provider.detect(frameBuffer, [trigger]);
          if (detections.length > 0) {
            detection = detections[0];
          }
        }

        // Process detection result
        if (detection && detection.confidence >= confidenceThreshold) {
          logger.info(
            {
              label: trigger.label,
              confidence: detection.confidence,
              provider: visionProvider,
            },
            "[VisualTrigger] Visual cue detected"
          );

          this.lastTriggerTime.set(trigger.id, now);
          this.processDetections([detection]);
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("timeout")) {
            logger.warn(
              { trigger: trigger.label },
              "[VisualTrigger] Detection timeout"
            );
          } else {
            logger.error(
              { error, trigger: trigger.label },
              "[VisualTrigger] Detection error"
            );
          }
        }
      }
    }
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

    logger.info(
      { label: triggerEvent.detection.label },
      "[VisualTrigger] Emitted AUTO_TRIGGER_DETECTED"
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

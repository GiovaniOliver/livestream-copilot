/**
 * Audio Trigger Service
 *
 * Monitors transcript events and detects configured trigger phrases.
 * Emits clip start events when phrases are detected, respecting cooldown.
 */

import type { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import type { STTProvider, STTEvent, TranscriptionSegment, TranscriptionWord } from "../stt/types.js";
import * as TriggerConfigService from "../db/services/trigger-config.service.js";
import type { AudioTrigger } from "../db/services/trigger-config.service.js";
import type { EventEnvelope } from "@livestream-copilot/shared";

/**
 * Phrase match result
 */
export interface PhraseMatch {
  triggerId: string;
  phrase: string;
  matchedText: string;
  confidence: number;
  t: number; // Timestamp of match
}

/**
 * Audio trigger detected event
 */
export interface AudioTriggerEvent {
  sessionId: string;
  workflow: string;
  match: PhraseMatch;
}

export type AudioTriggerCallback = (event: AudioTriggerEvent) => void;

/**
 * Audio Trigger Service
 *
 * Subscribes to transcript events and detects configured trigger phrases.
 */
export class AudioTriggerService {
  private sessionId: string | null = null;
  private workflow: string | null = null;
  private sttProvider: STTProvider | null = null;
  private wss: WebSocketServer;
  private callbacks: AudioTriggerCallback[] = [];
  private lastTriggerTime: Map<string, number> = new Map();
  private cooldownMs: number = 30000;
  private enabled: boolean = false;
  private triggers: AudioTrigger[] = [];

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  /**
   * Start monitoring for audio triggers
   */
  async start(
    sessionId: string,
    workflow: string,
    sttProvider: STTProvider
  ): Promise<void> {
    this.sessionId = sessionId;
    this.workflow = workflow;
    this.sttProvider = sttProvider;

    // Load trigger config
    await this.loadConfig();

    if (!this.enabled || this.triggers.length === 0) {
      console.log(`[audio-trigger] Audio triggers disabled or no phrases configured for workflow "${workflow}"`);
      return;
    }

    // Subscribe to transcript events
    sttProvider.on(this.handleSTTEvent.bind(this));

    console.log(`[audio-trigger] Started monitoring ${this.triggers.length} phrases for workflow "${workflow}"`);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    // STT provider will be stopped elsewhere, just clean up state
    this.sessionId = null;
    this.workflow = null;
    this.lastTriggerTime.clear();
    console.log("[audio-trigger] Stopped monitoring");
  }

  /**
   * Register a callback for trigger events
   */
  onTrigger(callback: AudioTriggerCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a callback
   */
  offTrigger(callback: AudioTriggerCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index >= 0) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Reload configuration
   */
  async reloadConfig(): Promise<void> {
    await this.loadConfig();
  }

  /**
   * Load trigger configuration from database
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

      this.enabled = config.audioEnabled;
      this.cooldownMs = config.triggerCooldown * 1000;
      this.triggers = config.audioTriggers.filter((t) => t.enabled);

      console.log(
        `[audio-trigger] Loaded config: enabled=${this.enabled}, cooldown=${config.triggerCooldown}s, phrases=${this.triggers.length}`
      );
    } catch (error) {
      console.error("[audio-trigger] Failed to load config:", error);
      this.enabled = false;
      this.triggers = [];
    }
  }

  /**
   * Handle STT events
   */
  private handleSTTEvent(event: STTEvent): void {
    if (event.type !== "transcript") return;

    const segment = event.segment;

    // Only process final transcripts
    if (!segment.isFinal) return;

    this.processSegment(segment);
  }

  /**
   * Process a transcript segment for trigger phrases
   */
  private processSegment(segment: TranscriptionSegment): void {
    if (!this.enabled || !this.sessionId || !this.workflow) return;

    for (const trigger of this.triggers) {
      const match = this.matchPhrase(segment, trigger);

      if (match) {
        // Check cooldown
        const lastTrigger = this.lastTriggerTime.get(trigger.id) ?? 0;
        const now = Date.now();

        if (now - lastTrigger < this.cooldownMs) {
          console.log(
            `[audio-trigger] Phrase "${trigger.phrase}" detected but in cooldown (${Math.round((this.cooldownMs - (now - lastTrigger)) / 1000)}s remaining)`
          );
          continue;
        }

        // Update last trigger time
        this.lastTriggerTime.set(trigger.id, now);

        console.log(
          `[audio-trigger] Phrase detected: "${match.phrase}" at t=${match.t.toFixed(2)}s (confidence: ${(match.confidence * 100).toFixed(1)}%)`
        );

        // Emit trigger event
        const triggerEvent: AudioTriggerEvent = {
          sessionId: this.sessionId,
          workflow: this.workflow,
          match,
        };

        // Notify callbacks
        for (const callback of this.callbacks) {
          try {
            callback(triggerEvent);
          } catch (error) {
            console.error("[audio-trigger] Callback error:", error);
          }
        }

        // Emit to WebSocket clients
        this.emitTriggerEvent(triggerEvent);
      }
    }
  }

  /**
   * Match a phrase against a transcript segment
   */
  private matchPhrase(segment: TranscriptionSegment, trigger: AudioTrigger): PhraseMatch | null {
    const searchText = trigger.caseSensitive
      ? segment.text
      : segment.text.toLowerCase();
    const searchPhrase = trigger.caseSensitive
      ? trigger.phrase
      : trigger.phrase.toLowerCase();

    // Check if phrase exists in text
    const index = searchText.indexOf(searchPhrase);
    if (index === -1) return null;

    // Find the timestamp of the match
    let matchTimestamp = segment.t0;
    let matchConfidence = segment.confidence;

    // Try to find exact word match for more precise timestamp
    if (segment.words && segment.words.length > 0) {
      const phraseWords = trigger.phrase.toLowerCase().split(/\s+/);
      const segmentWords = segment.words;

      // Find the starting position of the phrase in words
      for (let i = 0; i <= segmentWords.length - phraseWords.length; i++) {
        let matches = true;
        let totalConfidence = 0;

        for (let j = 0; j < phraseWords.length; j++) {
          const segmentWord = segmentWords[i + j];
          const targetWord = phraseWords[j];

          // Normalize word (remove punctuation for comparison)
          const normalizedWord = (segmentWord.punctuated_word || segmentWord.word)
            .toLowerCase()
            .replace(/[^\w]/g, "");

          if (normalizedWord !== targetWord.replace(/[^\w]/g, "")) {
            matches = false;
            break;
          }

          totalConfidence += segmentWord.confidence;
        }

        if (matches) {
          matchTimestamp = segmentWords[i].start;
          matchConfidence = totalConfidence / phraseWords.length;
          break;
        }
      }
    }

    return {
      triggerId: trigger.id,
      phrase: trigger.phrase,
      matchedText: segment.text.substring(index, index + trigger.phrase.length),
      confidence: matchConfidence,
      t: matchTimestamp,
    };
  }

  /**
   * Emit trigger event to WebSocket clients
   */
  private emitTriggerEvent(triggerEvent: AudioTriggerEvent): void {
    const event: EventEnvelope = {
      id: uuidv4(),
      sessionId: triggerEvent.sessionId,
      ts: Date.now(),
      type: "AUTO_TRIGGER_DETECTED",
      payload: {
        triggerType: "audio",
        triggerSource: triggerEvent.match.phrase,
        confidence: triggerEvent.match.confidence,
        t: triggerEvent.match.t,
      },
    };

    const message = JSON.stringify(event);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });

    console.log(`[audio-trigger] Emitted AUTO_TRIGGER_DETECTED: "${triggerEvent.match.phrase}"`);
  }
}

/**
 * Singleton instance
 */
let audioTriggerService: AudioTriggerService | null = null;

/**
 * Get or create the audio trigger service
 */
export function getAudioTriggerService(wss: WebSocketServer): AudioTriggerService {
  if (!audioTriggerService) {
    audioTriggerService = new AudioTriggerService(wss);
  }
  return audioTriggerService;
}

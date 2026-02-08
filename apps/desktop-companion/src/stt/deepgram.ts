/**
 * Deepgram Speech-to-Text Provider
 *
 * Implements real-time transcription using Deepgram's WebSocket API.
 * Supports speaker diarization, interim results, and automatic reconnection.
 */

import { createClient, LiveTranscriptionEvents, type DeepgramClient, type LiveClient } from "@deepgram/sdk";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import type { EventEnvelope } from "@livestream-copilot/shared";
import { config } from "../config/index.js";
import { sttLogger } from '../logger/index.js';
import type {
  STTProvider,
  STTStartConfig,
  STTStatus,
  STTEvent,
  STTEventCallback,
  TranscriptionSegment,
  DeepgramConfig,
} from "./types.js";

// Default Deepgram configuration
const DEFAULT_MODEL = "nova-2";
const DEFAULT_LANGUAGE = "en-US";
const DEFAULT_SAMPLE_RATE = 16000;

// Reconnection settings
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 30000;

/**
 * Deepgram STT Provider
 *
 * Handles real-time speech-to-text transcription using Deepgram's WebSocket API.
 */
export class DeepgramSTTProvider implements STTProvider {
  readonly name = "deepgram";

  private _status: STTStatus = "idle";
  private deepgramClient: DeepgramClient | null = null;
  private liveClient: LiveClient | null = null;
  private callbacks: Set<STTEventCallback> = new Set();
  private wss: WebSocketServer;
  private startConfig: STTStartConfig | null = null;
  private deepgramConfig: DeepgramConfig;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;
  private sessionStartedAt: number = 0;

  constructor(wss: WebSocketServer, deepgramConfig?: Partial<DeepgramConfig>) {
    this.wss = wss;
    this.deepgramConfig = {
      apiKey: config.DEEPGRAM_API_KEY || "",
      model: DEFAULT_MODEL,
      smartFormat: true,
      profanityFilter: false,
      redact: false,
      ...deepgramConfig,
    };

    if (!this.deepgramConfig.apiKey) {
      sttLogger.warn("[stt:deepgram] No API key provided. Set DEEPGRAM_API_KEY environment variable.");
    }
  }

  get status(): STTStatus {
    return this._status;
  }

  private setStatus(status: STTStatus, message?: string): void {
    this._status = status;
    this.emit({
      type: "status_change",
      status,
      message,
    });
    sttLogger.info(`[stt:deepgram] Status: ${status}${message ? ` - ${message}` : ""}`);
  }

  /**
   * Start the Deepgram STT session
   */
  async start(startConfig: STTStartConfig): Promise<void> {
    if (this._status === "connected" || this._status === "transcribing") {
      sttLogger.warn("[stt:deepgram] Already connected. Call stop() first.");
      return;
    }

    if (!this.deepgramConfig.apiKey) {
      throw new Error("Deepgram API key is required. Set DEEPGRAM_API_KEY environment variable.");
    }

    this.startConfig = startConfig;
    this.sessionId = startConfig.sessionId;
    this.sessionStartedAt = startConfig.sessionStartedAt;
    this.reconnectAttempts = 0;

    await this.connect();
  }

  /**
   * Internal connection logic
   */
  private async connect(): Promise<void> {
    this.setStatus("connecting");

    try {
      // Create Deepgram client
      this.deepgramClient = createClient(this.deepgramConfig.apiKey);

      // Configure live transcription options
      const options = {
        model: this.deepgramConfig.model || DEFAULT_MODEL,
        language: this.startConfig?.language || DEFAULT_LANGUAGE,
        smart_format: this.deepgramConfig.smartFormat,
        punctuate: this.startConfig?.enablePunctuation ?? true,
        diarize: this.startConfig?.enableDiarization ?? true,
        interim_results: this.startConfig?.enableInterimResults ?? true,
        utterance_end_ms: 1000,
        vad_events: true,
        encoding: "linear16",
        sample_rate: this.startConfig?.sampleRate || DEFAULT_SAMPLE_RATE,
        channels: this.startConfig?.channels || 1,
        endpointing: 300,
        // Add keywords if provided
        ...(this.startConfig?.keywords?.length && {
          keywords: this.startConfig.keywords.map(k => `${k}:2`),
        }),
      };

      // Create live transcription connection
      this.liveClient = this.deepgramClient.listen.live(options);

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        const onOpen = () => {
          clearTimeout(timeout);
          this.liveClient?.off(LiveTranscriptionEvents.Open, onOpen);
          resolve();
        };

        const onError = (err: Error) => {
          clearTimeout(timeout);
          this.liveClient?.off(LiveTranscriptionEvents.Error, onError);
          reject(err);
        };

        this.liveClient?.on(LiveTranscriptionEvents.Open, onOpen);
        this.liveClient?.on(LiveTranscriptionEvents.Error, onError);
      });

      this.setStatus("connected");
      this.reconnectAttempts = 0;

      // Start keep-alive interval
      this.startKeepAlive();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.setStatus("error", errorMessage);
      this.emit({
        type: "error",
        error: errorMessage,
        recoverable: this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS,
      });

      // Attempt reconnection
      await this.handleReconnection();
    }
  }

  /**
   * Set up Deepgram event handlers
   */
  private setupEventHandlers(): void {
    if (!this.liveClient) return;

    // Connection opened
    this.liveClient.on(LiveTranscriptionEvents.Open, () => {
      sttLogger.info("[stt:deepgram] Connection opened");
      this.emit({
        type: "connection_opened",
        timestamp: Date.now(),
      });
    });

    // Transcript received
    this.liveClient.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      this.handleTranscript(data);
    });

    // Metadata received
    this.liveClient.on(LiveTranscriptionEvents.Metadata, (data: any) => {
      sttLogger.info({ metadata: JSON.stringify(data).slice(0, 200) }, "[stt:deepgram] Metadata");
    });

    // Speech started
    this.liveClient.on(LiveTranscriptionEvents.SpeechStarted, () => {
      if (this._status !== "transcribing") {
        this.setStatus("transcribing");
      }
    });

    // Utterance end
    this.liveClient.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      // This signals the end of an utterance, useful for UI feedback
      sttLogger.info("[stt:deepgram] Utterance ended");
    });

    // Error handling
    this.liveClient.on(LiveTranscriptionEvents.Error, (error: Error) => {
      sttLogger.error({ err: error }, "[stt:deepgram] Error");
      this.emit({
        type: "error",
        error: error.message,
        recoverable: true,
      });
    });

    // Connection closed
    this.liveClient.on(LiveTranscriptionEvents.Close, () => {
      sttLogger.info("[stt:deepgram] Connection closed");
      this.emit({
        type: "connection_closed",
        timestamp: Date.now(),
      });

      // Handle unexpected disconnection
      if (this._status !== "stopped" && this._status !== "idle") {
        this.handleReconnection();
      }
    });
  }

  /**
   * Handle incoming transcript data from Deepgram
   */
  private handleTranscript(data: any): void {
    try {
      const channel = data?.channel;
      const alternatives = channel?.alternatives;

      if (!alternatives || alternatives.length === 0) return;

      const alternative = alternatives[0];
      const transcript = alternative.transcript;

      // Skip empty transcripts
      if (!transcript || transcript.trim() === "") return;

      const isFinal = data.is_final === true;
      const words = alternative.words || [];

      // Calculate timing relative to session start
      const startTime = words.length > 0 ? words[0].start : data.start || 0;
      const endTime = words.length > 0 ? words[words.length - 1].end : (data.start || 0) + (data.duration || 0);

      // Extract speaker from diarization
      let speakerId: string | null = null;
      if (words.length > 0 && words[0].speaker !== undefined) {
        speakerId = `speaker_${words[0].speaker}`;
      }

      const segment: TranscriptionSegment = {
        speakerId,
        text: transcript,
        t0: startTime,
        t1: endTime,
        confidence: alternative.confidence || 0,
        isFinal,
        words: words.map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: w.speaker,
          punctuated_word: w.punctuated_word,
        })),
      };

      // Emit local event
      this.emit({
        type: "transcript",
        segment,
      });

      // Only emit final transcripts to WebSocket clients
      if (isFinal && this.sessionId) {
        this.emitTranscriptEvent(segment);
      }

    } catch (error) {
      sttLogger.error({ err: error }, "[stt:deepgram] Error processing transcript");
    }
  }

  /**
   * Emit TRANSCRIPT_SEGMENT event to WebSocket clients
   */
  private emitTranscriptEvent(segment: TranscriptionSegment): void {
    if (!this.sessionId) return;

    const event: EventEnvelope = {
      id: uuidv4(),
      sessionId: this.sessionId,
      ts: Date.now(),
      type: "TRANSCRIPT_SEGMENT",
      payload: {
        speakerId: segment.speakerId,
        text: segment.text,
        t0: segment.t0,
        t1: segment.t1,
      },
    };

    const message = JSON.stringify(event);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });

    sttLogger.info(`[stt:deepgram] Emitted TRANSCRIPT_SEGMENT: "${segment.text.slice(0, 50)}..."`);
  }

  /**
   * Handle reconnection after disconnect
   */
  private async handleReconnection(): Promise<void> {
    if (this._status === "stopped" || this._status === "idle") {
      return;
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus("error", "Max reconnection attempts reached");
      this.emit({
        type: "error",
        error: "Max reconnection attempts reached",
        recoverable: false,
      });
      return;
    }

    this.setStatus("reconnecting");
    this.reconnectAttempts++;

    // Calculate exponential backoff delay
    const delay = Math.min(
      RECONNECT_DELAY_BASE_MS * Math.pow(2, this.reconnectAttempts - 1),
      RECONNECT_DELAY_MAX_MS
    );

    sttLogger.info(`[stt:deepgram] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        sttLogger.error({ err: error }, "[stt:deepgram] Reconnection failed");
      }
    }, delay);
  }

  /**
   * Start keep-alive ping interval
   */
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.liveClient && this._status === "connected") {
        try {
          this.liveClient.keepAlive();
        } catch (error) {
          sttLogger.warn({ err: error }, "[stt:deepgram] Keep-alive failed");
        }
      }
    }, 10000); // Send keep-alive every 10 seconds
  }

  /**
   * Stop keep-alive interval
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Stop the STT session
   */
  async stop(): Promise<void> {
    this.setStatus("stopped");

    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Stop keep-alive
    this.stopKeepAlive();

    // Close Deepgram connection
    if (this.liveClient) {
      try {
        this.liveClient.requestClose();
      } catch (error) {
        sttLogger.warn({ err: error }, "[stt:deepgram] Error closing connection");
      }
      this.liveClient = null;
    }

    this.deepgramClient = null;
    this.startConfig = null;
    this.sessionId = null;
    this.reconnectAttempts = 0;

    this.setStatus("idle");
    sttLogger.info("[stt:deepgram] Stopped");
  }

  /**
   * Send audio data to Deepgram
   */
  sendAudio(audioData: Buffer): void {
    if (!this.liveClient) {
      sttLogger.warn("[stt:deepgram] Cannot send audio: not connected");
      return;
    }

    if (this._status !== "connected" && this._status !== "transcribing") {
      return;
    }

    try {
      // Convert Buffer to ArrayBuffer for Deepgram SDK compatibility
      const arrayBuffer = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength
      );
      this.liveClient.send(arrayBuffer);
    } catch (error) {
      sttLogger.error({ err: error }, "[stt:deepgram] Error sending audio");
    }
  }

  /**
   * Register an event callback
   */
  on(callback: STTEventCallback): void {
    this.callbacks.add(callback);
  }

  /**
   * Remove an event callback
   */
  off(callback: STTEventCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * Emit an event to all registered callbacks
   */
  private emit(event: STTEvent): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        sttLogger.error({ err: error }, "[stt:deepgram] Error in event callback");
      }
    });
  }

  /**
   * Check if provider is ready to receive audio
   */
  isReady(): boolean {
    return this._status === "connected" || this._status === "transcribing";
  }
}

/**
 * Create a Deepgram STT provider instance
 */
export function createDeepgramProvider(
  wss: WebSocketServer,
  deepgramConfig?: Partial<DeepgramConfig>
): DeepgramSTTProvider {
  return new DeepgramSTTProvider(wss, deepgramConfig);
}

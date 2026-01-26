/**
 * Speech-to-Text Provider Types
 *
 * Defines the interfaces and types for STT providers used in the desktop-companion app.
 */

import type { WebSocketServer } from "ws";

/**
 * Configuration for starting an STT session
 */
export interface STTStartConfig {
  /** Session ID for the current recording session */
  sessionId: string;
  /** Unix timestamp (ms) when the session started - used for calculating relative timestamps */
  sessionStartedAt: number;
  /** Audio input source - either an OBS virtual audio device or system microphone */
  audioSource?: "obs" | "microphone";
  /** Specific audio device name (e.g., "OBS Virtual Audio Device" or microphone name) */
  audioDeviceName?: string;
  /** Sample rate in Hz (default: 16000) */
  sampleRate?: number;
  /** Number of audio channels (default: 1 for mono) */
  channels?: number;
  /** Language code for transcription (default: "en-US") */
  language?: string;
  /** Enable speaker diarization */
  enableDiarization?: boolean;
  /** Enable interim/partial results */
  enableInterimResults?: boolean;
  /** Enable punctuation */
  enablePunctuation?: boolean;
  /** Custom vocabulary/keywords to boost */
  keywords?: string[];
}

/**
 * Individual word with timing information from Deepgram
 */
export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

/**
 * A transcription segment (utterance) with speaker info
 */
export interface TranscriptionSegment {
  /** Speaker identifier (from diarization) */
  speakerId: string | null;
  /** Transcribed text */
  text: string;
  /** Start time in seconds from session start */
  t0: number;
  /** End time in seconds from session start */
  t1: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether this is a final result or interim */
  isFinal: boolean;
  /** Individual words with timing */
  words?: TranscriptionWord[];
}

/**
 * STT Provider status
 */
export type STTStatus = "idle" | "connecting" | "connected" | "transcribing" | "reconnecting" | "error" | "stopped";

/**
 * STT event types
 */
export type STTEventType =
  | "status_change"
  | "transcript"
  | "error"
  | "connection_opened"
  | "connection_closed";

/**
 * STT event payloads
 */
export interface STTStatusChangeEvent {
  type: "status_change";
  status: STTStatus;
  message?: string;
}

export interface STTTranscriptEvent {
  type: "transcript";
  segment: TranscriptionSegment;
}

export interface STTErrorEvent {
  type: "error";
  error: string;
  code?: string;
  recoverable: boolean;
}

export interface STTConnectionEvent {
  type: "connection_opened" | "connection_closed";
  timestamp: number;
}

export type STTEvent =
  | STTStatusChangeEvent
  | STTTranscriptEvent
  | STTErrorEvent
  | STTConnectionEvent;

/**
 * Callback for STT events
 */
export type STTEventCallback = (event: STTEvent) => void;

/**
 * Interface for STT providers
 */
export interface STTProvider {
  /** Provider name identifier */
  readonly name: string;

  /** Current status */
  readonly status: STTStatus;

  /**
   * Start the STT session and connect to the provider
   */
  start(config: STTStartConfig): Promise<void>;

  /**
   * Stop the STT session and disconnect
   */
  stop(): Promise<void>;

  /**
   * Send audio data to the provider
   * @param audioData Raw audio data (PCM)
   */
  sendAudio(audioData: Buffer): void;

  /**
   * Register an event callback
   */
  on(callback: STTEventCallback): void;

  /**
   * Remove an event callback
   */
  off(callback: STTEventCallback): void;

  /**
   * Check if provider is ready to receive audio
   */
  isReady(): boolean;
}

/**
 * Factory function signature for creating STT providers
 */
export type STTProviderFactory = (wss: WebSocketServer) => STTProvider;

/**
 * Deepgram-specific configuration options
 */
export interface DeepgramConfig {
  /** Deepgram API key */
  apiKey: string;
  /** Deepgram model to use (default: "nova-2") */
  model?: string;
  /** Tier (default: "nova") */
  tier?: string;
  /** Enable smart formatting */
  smartFormat?: boolean;
  /** Enable profanity filter */
  profanityFilter?: boolean;
  /** Enable redaction */
  redact?: boolean;
  /** Custom endpoint URL (for on-prem or alternative endpoints) */
  endpointUrl?: string;
}

/**
 * Audio capture configuration
 */
export interface AudioCaptureConfig {
  /** Sample rate in Hz */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Bits per sample (16 or 32) */
  bitsPerSample: number;
  /** Audio encoding format */
  encoding: "linear16" | "opus" | "flac";
}

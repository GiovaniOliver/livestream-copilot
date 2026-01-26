/**
 * Speech-to-Text (STT) API methods for FluxBoard
 */

import { apiClient } from "./client";

/**
 * STT provider options
 */
export type STTProvider = "whisper" | "deepgram" | "azure" | "google";

/**
 * STT configuration
 */
export interface STTConfig {
  /** STT provider to use */
  provider?: STTProvider;
  /** Language code (e.g., "en-US") */
  language?: string;
  /** Enable interim results for real-time feedback */
  interimResults?: boolean;
  /** Enable speaker diarization */
  diarization?: boolean;
  /** Maximum number of speakers (for diarization) */
  maxSpeakers?: number;
  /** Enable profanity filtering */
  profanityFilter?: boolean;
  /** Custom vocabulary/keywords */
  vocabulary?: string[];
}

/**
 * STT status response
 */
export interface STTStatus {
  /** Whether STT is currently active */
  active: boolean;
  /** Current provider being used */
  provider?: STTProvider;
  /** Current language */
  language?: string;
  /** Session ID if STT is active */
  sessionId?: string;
  /** When STT started */
  startedAt?: number;
  /** Number of segments transcribed */
  segmentCount?: number;
  /** Total words transcribed */
  wordCount?: number;
  /** Average confidence score */
  averageConfidence?: number;
}

/**
 * STT start response
 */
export interface STTStartResponse {
  success: boolean;
  sessionId: string;
  provider: STTProvider;
  language: string;
}

/**
 * STT stop response
 */
export interface STTStopResponse {
  success: boolean;
  sessionId: string;
  duration: number;
  segmentCount: number;
  wordCount: number;
}

/**
 * Transcript segment from STT
 */
export interface TranscriptSegment {
  id: string;
  speakerId?: string;
  text: string;
  t0: number;
  t1: number;
  confidence?: number;
  isFinal: boolean;
}

/**
 * Start speech-to-text transcription
 * @param config - STT configuration options
 */
export async function startSTT(config: STTConfig = {}): Promise<STTStartResponse> {
  return apiClient.post<STTStartResponse>("/api/stt/start", config);
}

/**
 * Stop speech-to-text transcription
 */
export async function stopSTT(): Promise<STTStopResponse> {
  return apiClient.post<STTStopResponse>("/api/stt/stop");
}

/**
 * Get current STT status
 */
export async function getStatus(): Promise<STTStatus> {
  return apiClient.get<STTStatus>("/api/stt/status");
}

/**
 * Get transcript segments for a session
 * @param sessionId - Session ID
 * @param limit - Maximum segments to return
 * @param offset - Number of segments to skip
 */
export async function getTranscript(
  sessionId: string,
  limit = 1000,
  offset = 0
): Promise<TranscriptSegment[]> {
  return apiClient.get<TranscriptSegment[]>(`/api/sessions/${sessionId}/transcript`, {
    limit,
    offset,
  });
}

/**
 * Get full transcript as text
 * @param sessionId - Session ID
 * @param format - Output format
 */
export async function getTranscriptText(
  sessionId: string,
  format: "text" | "srt" | "vtt" = "text"
): Promise<string> {
  return apiClient.get<string>(`/api/sessions/${sessionId}/transcript/export`, {
    format,
  });
}

/**
 * Update STT configuration mid-session
 * @param config - Partial STT configuration to update
 */
export async function updateSTTConfig(
  config: Partial<STTConfig>
): Promise<{ success: boolean; config: STTConfig }> {
  return apiClient.patch<{ success: boolean; config: STTConfig }>(
    "/api/stt/config",
    config
  );
}

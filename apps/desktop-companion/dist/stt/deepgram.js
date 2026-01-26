/**
 * Deepgram Speech-to-Text Provider
 *
 * Implements real-time transcription using Deepgram's WebSocket API.
 * Supports speaker diarization, interim results, and automatic reconnection.
 */
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/index.js";
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
export class DeepgramSTTProvider {
    name = "deepgram";
    _status = "idle";
    deepgramClient = null;
    liveClient = null;
    callbacks = new Set();
    wss;
    startConfig = null;
    deepgramConfig;
    reconnectAttempts = 0;
    reconnectTimeout = null;
    keepAliveInterval = null;
    sessionId = null;
    sessionStartedAt = 0;
    constructor(wss, deepgramConfig) {
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
            console.warn("[stt:deepgram] No API key provided. Set DEEPGRAM_API_KEY environment variable.");
        }
    }
    get status() {
        return this._status;
    }
    setStatus(status, message) {
        this._status = status;
        this.emit({
            type: "status_change",
            status,
            message,
        });
        console.log(`[stt:deepgram] Status: ${status}${message ? ` - ${message}` : ""}`);
    }
    /**
     * Start the Deepgram STT session
     */
    async start(startConfig) {
        if (this._status === "connected" || this._status === "transcribing") {
            console.warn("[stt:deepgram] Already connected. Call stop() first.");
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
    async connect() {
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
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Connection timeout"));
                }, 10000);
                const onOpen = () => {
                    clearTimeout(timeout);
                    this.liveClient?.off(LiveTranscriptionEvents.Open, onOpen);
                    resolve();
                };
                const onError = (err) => {
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
        }
        catch (error) {
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
    setupEventHandlers() {
        if (!this.liveClient)
            return;
        // Connection opened
        this.liveClient.on(LiveTranscriptionEvents.Open, () => {
            console.log("[stt:deepgram] Connection opened");
            this.emit({
                type: "connection_opened",
                timestamp: Date.now(),
            });
        });
        // Transcript received
        this.liveClient.on(LiveTranscriptionEvents.Transcript, (data) => {
            this.handleTranscript(data);
        });
        // Metadata received
        this.liveClient.on(LiveTranscriptionEvents.Metadata, (data) => {
            console.log("[stt:deepgram] Metadata:", JSON.stringify(data).slice(0, 200));
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
            console.log("[stt:deepgram] Utterance ended");
        });
        // Error handling
        this.liveClient.on(LiveTranscriptionEvents.Error, (error) => {
            console.error("[stt:deepgram] Error:", error);
            this.emit({
                type: "error",
                error: error.message,
                recoverable: true,
            });
        });
        // Connection closed
        this.liveClient.on(LiveTranscriptionEvents.Close, () => {
            console.log("[stt:deepgram] Connection closed");
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
    handleTranscript(data) {
        try {
            const channel = data?.channel;
            const alternatives = channel?.alternatives;
            if (!alternatives || alternatives.length === 0)
                return;
            const alternative = alternatives[0];
            const transcript = alternative.transcript;
            // Skip empty transcripts
            if (!transcript || transcript.trim() === "")
                return;
            const isFinal = data.is_final === true;
            const words = alternative.words || [];
            // Calculate timing relative to session start
            const startTime = words.length > 0 ? words[0].start : data.start || 0;
            const endTime = words.length > 0 ? words[words.length - 1].end : (data.start || 0) + (data.duration || 0);
            // Extract speaker from diarization
            let speakerId = null;
            if (words.length > 0 && words[0].speaker !== undefined) {
                speakerId = `speaker_${words[0].speaker}`;
            }
            const segment = {
                speakerId,
                text: transcript,
                t0: startTime,
                t1: endTime,
                confidence: alternative.confidence || 0,
                isFinal,
                words: words.map((w) => ({
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
        }
        catch (error) {
            console.error("[stt:deepgram] Error processing transcript:", error);
        }
    }
    /**
     * Emit TRANSCRIPT_SEGMENT event to WebSocket clients
     */
    emitTranscriptEvent(segment) {
        if (!this.sessionId)
            return;
        const event = {
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
        console.log(`[stt:deepgram] Emitted TRANSCRIPT_SEGMENT: "${segment.text.slice(0, 50)}..."`);
    }
    /**
     * Handle reconnection after disconnect
     */
    async handleReconnection() {
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
        const delay = Math.min(RECONNECT_DELAY_BASE_MS * Math.pow(2, this.reconnectAttempts - 1), RECONNECT_DELAY_MAX_MS);
        console.log(`[stt:deepgram] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        this.reconnectTimeout = setTimeout(async () => {
            try {
                await this.connect();
            }
            catch (error) {
                console.error("[stt:deepgram] Reconnection failed:", error);
            }
        }, delay);
    }
    /**
     * Start keep-alive ping interval
     */
    startKeepAlive() {
        this.stopKeepAlive();
        this.keepAliveInterval = setInterval(() => {
            if (this.liveClient && this._status === "connected") {
                try {
                    this.liveClient.keepAlive();
                }
                catch (error) {
                    console.warn("[stt:deepgram] Keep-alive failed:", error);
                }
            }
        }, 10000); // Send keep-alive every 10 seconds
    }
    /**
     * Stop keep-alive interval
     */
    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }
    /**
     * Stop the STT session
     */
    async stop() {
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
            }
            catch (error) {
                console.warn("[stt:deepgram] Error closing connection:", error);
            }
            this.liveClient = null;
        }
        this.deepgramClient = null;
        this.startConfig = null;
        this.sessionId = null;
        this.reconnectAttempts = 0;
        this.setStatus("idle");
        console.log("[stt:deepgram] Stopped");
    }
    /**
     * Send audio data to Deepgram
     */
    sendAudio(audioData) {
        if (!this.liveClient) {
            console.warn("[stt:deepgram] Cannot send audio: not connected");
            return;
        }
        if (this._status !== "connected" && this._status !== "transcribing") {
            return;
        }
        try {
            // Convert Buffer to ArrayBuffer for Deepgram SDK compatibility
            const arrayBuffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
            this.liveClient.send(arrayBuffer);
        }
        catch (error) {
            console.error("[stt:deepgram] Error sending audio:", error);
        }
    }
    /**
     * Register an event callback
     */
    on(callback) {
        this.callbacks.add(callback);
    }
    /**
     * Remove an event callback
     */
    off(callback) {
        this.callbacks.delete(callback);
    }
    /**
     * Emit an event to all registered callbacks
     */
    emit(event) {
        this.callbacks.forEach((callback) => {
            try {
                callback(event);
            }
            catch (error) {
                console.error("[stt:deepgram] Error in event callback:", error);
            }
        });
    }
    /**
     * Check if provider is ready to receive audio
     */
    isReady() {
        return this._status === "connected" || this._status === "transcribing";
    }
}
/**
 * Create a Deepgram STT provider instance
 */
export function createDeepgramProvider(wss, deepgramConfig) {
    return new DeepgramSTTProvider(wss, deepgramConfig);
}

/**
 * WebSocket connection manager for FluxBoard real-time events
 */

import type { EventEnvelope } from "@livestream-copilot/shared";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3124";
const isDev = process.env.NODE_ENV === "development";

/**
 * WebSocket connection states
 */
export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting" | "error";

/**
 * Event handler type
 */
export type EventHandler<T = EventEnvelope> = (event: T) => void;

/**
 * WebSocket event types from the server
 */
export type WebSocketEventType =
  | "connected"
  | "disconnected"
  | "error"
  | "event"
  | "session_started"
  | "session_ended"
  | "transcript_segment"
  | "clip_saved"
  | "output_created";

/**
 * Configuration for the WebSocket manager
 */
export interface WebSocketConfig {
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Reconnect delay multiplier (default: 1.5) */
  reconnectMultiplier?: number;
  /** Maximum reconnect attempts (default: Infinity) */
  maxReconnectAttempts?: number;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
}

/**
 * WebSocket connection manager
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private currentReconnectDelay: number;

  private readonly config: Required<WebSocketConfig>;
  private readonly eventHandlers = new Map<string, Set<EventHandler<unknown>>>();
  private readonly stateHandlers = new Set<(state: ConnectionState) => void>();

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      reconnectMultiplier: config.reconnectMultiplier ?? 1.5,
      maxReconnectAttempts: config.maxReconnectAttempts ?? Infinity,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
    };
    this.currentReconnectDelay = this.config.reconnectDelay;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (isDev) console.log("[WS] Already connected");
      return;
    }

    this.setState("connecting");
    if (isDev) console.log(`[WS] Connecting to ${WS_URL}`);

    try {
      this.ws = new WebSocket(WS_URL);
      this.setupEventListeners();
    } catch (error) {
      if (isDev) console.error("[WS] Connection error:", error);
      this.handleDisconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.setState("disconnected");
    if (isDev) console.log("[WS] Disconnected");
  }

  /**
   * Send a message to the server
   */
  send(type: string, payload?: unknown): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      if (isDev) console.warn("[WS] Cannot send, not connected");
      return;
    }

    const message = JSON.stringify({ type, payload, ts: Date.now() });
    this.ws.send(message);

    if (isDev) console.log("[WS] Sent:", { type, payload });
  }

  /**
   * Subscribe to a specific event type
   */
  on<T = EventEnvelope>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    const handlers = this.eventHandlers.get(eventType)!;
    handlers.add(handler as EventHandler<unknown>);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as EventHandler<unknown>);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    };
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: EventHandler<EventEnvelope>): () => void {
    return this.on("*", handler);
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      if (isDev) console.log("[WS] Connected");
      this.setState("connected");
      this.reconnectAttempts = 0;
      this.currentReconnectDelay = this.config.reconnectDelay;
      this.startHeartbeat();
      this.emit("connected", { ts: Date.now() });
    };

    this.ws.onclose = (event) => {
      if (isDev) console.log("[WS] Closed:", event.code, event.reason);
      this.emit("disconnected", { code: event.code, reason: event.reason });
      this.handleDisconnect();
    };

    this.ws.onerror = (error) => {
      if (isDev) console.error("[WS] Error:", error);
      this.emit("error", { error: "WebSocket error" });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (isDev) console.log("[WS] Received:", data);

        // Handle pong (heartbeat response)
        if (data.type === "pong") return;

        // Emit to specific type handlers
        this.emit(data.type, data);

        // Emit to catch-all handlers
        this.emit("*", data);

        // Emit generic "event" for all events
        this.emit("event", data);
      } catch (error) {
        if (isDev) console.error("[WS] Failed to parse message:", error);
      }
    };
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    this.clearTimers();

    if (!this.config.autoReconnect) {
      this.setState("disconnected");
      return;
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      if (isDev) console.log("[WS] Max reconnect attempts reached");
      this.setState("disconnected");
      return;
    }

    this.setState("reconnecting");
    this.reconnectAttempts++;

    if (isDev) {
      console.log(
        `[WS] Reconnecting in ${this.currentReconnectDelay}ms (attempt ${this.reconnectAttempts})`
      );
    }

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.currentReconnectDelay);

    // Increase delay for next attempt
    this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * this.config.reconnectMultiplier,
      this.config.maxReconnectDelay
    );
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send("ping");
    }, this.config.heartbeatInterval);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Set state and notify handlers
   */
  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.stateHandlers.forEach((handler) => handler(state));
  }

  /**
   * Emit event to handlers
   */
  private emit(type: string, data: unknown): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          if (isDev) console.error(`[WS] Handler error for ${type}:`, error);
        }
      });
    }
  }
}

/**
 * Singleton WebSocket manager instance
 */
let wsManager: WebSocketManager | null = null;

/**
 * Get or create the WebSocket manager instance
 */
export function getWebSocketManager(config?: WebSocketConfig): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(config);
  }
  return wsManager;
}

/**
 * Create a new WebSocket manager instance (for testing or multiple connections)
 */
export function createWebSocketManager(config?: WebSocketConfig): WebSocketManager {
  return new WebSocketManager(config);
}

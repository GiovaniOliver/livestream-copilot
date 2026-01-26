/**
 * WebSocket Manager Hook
 *
 * Manages WebSocket lifecycle and integrates with Zustand stores.
 */

import { useEffect, useRef, useCallback } from "react";
import type { EventEnvelope } from "@livestream-copilot/shared";
import { useConnectionStore } from "./connectionStore";
import { useEventsStore } from "./eventsStore";
import { useOutputsStore } from "./outputsStore";

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

interface WebSocketManagerOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export function useWebSocketManager(options: WebSocketManagerOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store actions
  const wsUrl = useConnectionStore((s) => s.wsUrl);
  const status = useConnectionStore((s) => s.status);
  const reconnectAttempts = useConnectionStore((s) => s.reconnectAttempts);
  const {
    setStatus,
    setError,
    markConnected,
    incrementReconnectAttempts,
    resetReconnectAttempts,
  } = useConnectionStore.getState();

  const { addEvent } = useEventsStore.getState();
  const { addOutput } = useOutputsStore.getState();

  /**
   * Handle incoming WebSocket message.
   */
  const handleMessage = useCallback((data: unknown) => {
    if (!data || typeof data !== "object") return;

    const msg = data as { type?: string };

    // Ignore non-event messages (hello, pong, etc.)
    if (!msg.type || msg.type === "hello" || msg.type === "pong") return;

    // Now treat as EventEnvelope
    const envelope = data as EventEnvelope;

    // Add to events store
    addEvent(envelope);

    // If it's an output, also add to outputs store
    if (envelope.type === "OUTPUT_CREATED" || envelope.type === "OUTPUT_VALIDATED") {
      const payload = (envelope as unknown as { payload?: { category?: string; title?: string; text?: string; refs?: string[]; meta?: Record<string, unknown> } }).payload;
      if (payload) {
        addOutput({
          id: envelope.id,
          category: payload.category || "unknown",
          title: payload.title,
          text: payload.text || "",
          refs: payload.refs || [],
          meta: payload.meta,
        });
      }
    }
  }, [addEvent, addOutput]);

  /**
   * Connect to WebSocket.
   */
  const connect = useCallback(() => {
    if (!wsUrl) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        markConnected();
        options.onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data));
          handleMessage(data);
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
        options.onError?.("Connection error");
      };

      ws.onclose = () => {
        wsRef.current = null;

        // Attempt reconnection if not at max attempts
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setStatus("reconnecting");
          incrementReconnectAttempts();

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts));
        } else {
          setStatus("disconnected");
          options.onDisconnected?.();
        }
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connection failed");
    }
  }, [wsUrl, reconnectAttempts, handleMessage, options]);

  /**
   * Disconnect from WebSocket.
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    resetReconnectAttempts();
    setStatus("disconnected");
  }, []);

  /**
   * Send a message through WebSocket.
   */
  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // Auto-connect when wsUrl changes
  useEffect(() => {
    if (wsUrl) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [wsUrl]);

  return {
    status,
    isConnected: status === "connected",
    connect,
    disconnect,
    send,
  };
}

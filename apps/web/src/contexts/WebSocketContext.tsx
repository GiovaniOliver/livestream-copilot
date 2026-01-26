"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { WebSocketManager, type ConnectionState } from "@/lib/api/websocket";
import type { EventEnvelope } from "@livestream-copilot/shared";

interface WebSocketContextValue {
  connectionState: ConnectionState;
  events: EventEnvelope[];
  outputs: EventEnvelope[];
  clips: EventEnvelope[];
  moments: EventEnvelope[];
  transcripts: EventEnvelope[];
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
  clearEvents: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  maxEvents?: number;
}

export function WebSocketProvider({ children, maxEvents = 500 }: WebSocketProviderProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [events, setEvents] = useState<EventEnvelope[]>([]);
  const wsManagerRef = useRef<WebSocketManager | null>(null);

  // Initialize WebSocket manager
  useEffect(() => {
    if (!wsManagerRef.current) {
      wsManagerRef.current = new WebSocketManager({
        autoReconnect: true,
        reconnectDelay: 1000,
        maxReconnectDelay: 30000,
        reconnectMultiplier: 1.5,
        heartbeatInterval: 30000,
      });

      // Listen to all events
      wsManagerRef.current.onAny((event: EventEnvelope) => {
        setEvents((prev) => [event, ...prev].slice(0, maxEvents));
      });

      // Monitor connection state changes
      wsManagerRef.current.onStateChange((state: ConnectionState) => {
        setConnectionState(state);
      });
    }

    return () => {
      wsManagerRef.current?.disconnect();
    };
  }, [maxEvents]);

  const connect = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    wsManagerRef.current?.disconnect();
    setEvents([]);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Derive categorized events
  const outputs = events.filter((e) => e.type === "OUTPUT_CREATED" || e.type === "OUTPUT_VALIDATED");
  const clips = events.filter((e) => e.type === "ARTIFACT_CLIP_CREATED");
  const moments = events.filter((e) => e.type === "MOMENT_MARKER");
  const transcripts = events.filter((e) => e.type === "TRANSCRIPT_SEGMENT");

  const isConnected = connectionState === "connected";

  const value: WebSocketContextValue = {
    connectionState,
    events,
    outputs,
    clips,
    moments,
    transcripts,
    connect,
    disconnect,
    isConnected,
    clearEvents,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

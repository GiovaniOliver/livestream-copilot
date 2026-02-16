"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useMicStt } from "@/hooks/useMicStt";

interface StreamDebugPanelProps {
  sessionId: string;
  isStreaming: boolean;
}

type SttStatus = {
  active: boolean;
  provider: string | null;
  sessionId?: string | null;
};

const EVENT_TYPES = new Set([
  "TRANSCRIPT_SEGMENT",
  "CLIP_QUEUE_UPDATED",
  "AUTO_TRIGGER_DETECTED",
  "CLIP_INTENT_START",
  "CLIP_INTENT_END",
  "OUTPUT_CREATED",
  "MOMENT_MARKER",
]);

export function StreamDebugPanel({ sessionId, isStreaming }: StreamDebugPanelProps) {
  const { connectionState, events } = useWebSocket();
  const { state: micState, error: micError, level, start, stop } = useMicStt();
  const [sttStatus, setSttStatus] = useState<SttStatus | null>(null);
  const [manualClipPending, setManualClipPending] = useState(false);
  const [manualDuration, setManualDuration] = useState(30);

  const recentEvents = useMemo(() => {
    return events.filter((event) => EVENT_TYPES.has(event.type)).slice(0, 10);
  }, [events]);

  const refreshSttStatus = useCallback(async () => {
    try {
      const response = await apiClient.get<{ ok: boolean; active: boolean; provider: string | null; sessionId?: string | null }>(
        "/api/stt/status"
      );
      setSttStatus({ active: response.active, provider: response.provider ?? null, sessionId: response.sessionId });
    } catch {
      setSttStatus(null);
    }
  }, []);

  const triggerManualClip = useCallback(async () => {
    if (manualClipPending) return;
    setManualClipPending(true);
    try {
      await apiClient.post(`/api/sessions/${sessionId}/clip-queue/manual`, {
        durationSeconds: manualDuration,
      });
    } finally {
      setManualClipPending(false);
    }
  }, [manualClipPending, manualDuration, sessionId]);

  useEffect(() => {
    refreshSttStatus();
    const id = setInterval(refreshSttStatus, 5000);
    return () => clearInterval(id);
  }, [refreshSttStatus]);

  return (
    <Card variant="elevated" className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stream Debug</CardTitle>
            <CardDescription>Live signal status, triggers, and transcript activity.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={connectionState === "connected" ? "teal" : "default"}>
              WS {connectionState}
            </Badge>
            <Badge variant={isStreaming ? "teal" : "default"}>{isStreaming ? "Streaming" : "Idle"}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-stroke bg-surface p-4">
            <h4 className="text-sm font-semibold text-text">Mic + STT</h4>
            <p className="mt-1 text-xs text-text-dim">
              Captures mic audio and streams PCM to `/api/stt/audio`.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={start}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium",
                  micState === "active" ? "bg-teal/10 text-teal" : "bg-surface-hover text-text"
                )}
              >
                {micState === "active" ? "Mic Active" : "Start Mic STT"}
              </button>
              <button
                type="button"
                onClick={stop}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text"
              >
                Stop
              </button>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Input Level</span>
                <span>{(level * 100).toFixed(0)}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-bg-2">
                <div
                  className="h-2 rounded-full bg-teal"
                  style={{ width: `${Math.min(100, level * 200)}%` }}
                />
              </div>
            </div>
            {micError && <p className="mt-2 text-xs text-error">{micError}</p>}
            <div className="mt-3 text-xs text-text-muted">
              STT: {sttStatus?.active ? `active (${sttStatus.provider ?? "unknown"})` : "idle"}
            </div>
          </div>

          <div className="rounded-xl border border-stroke bg-surface p-4">
            <h4 className="text-sm font-semibold text-text">Manual Clip</h4>
            <p className="mt-1 text-xs text-text-dim">
              Create a clip from the last N seconds and enqueue for processing.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={300}
                value={manualDuration}
                onChange={(e) => setManualDuration(Number(e.target.value))}
                className="w-20 rounded-lg border border-stroke bg-bg-0 px-2 py-1 text-xs text-text"
              />
              <span className="text-xs text-text-muted">seconds</span>
            </div>
            <button
              type="button"
              onClick={triggerManualClip}
              disabled={manualClipPending}
              className="mt-3 w-full rounded-lg bg-purple/10 px-3 py-2 text-xs font-semibold text-purple hover:bg-purple/20 disabled:opacity-60"
            >
              {manualClipPending ? "Queuing..." : "Queue Manual Clip"}
            </button>
          </div>

          <div className="rounded-xl border border-stroke bg-surface p-4">
            <h4 className="text-sm font-semibold text-text">Recent Events</h4>
            <p className="mt-1 text-xs text-text-dim">
              Latest trigger + output events from WebSocket.
            </p>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-text-muted">
              {recentEvents.length === 0 ? (
                <div className="rounded-lg border border-stroke/50 p-3 text-text-dim">
                  No trigger or transcript events yet.
                </div>
              ) : (
                recentEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border border-stroke/50 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text">{event.type}</span>
                      <span>{new Date(event.ts).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-1 text-text-dim">
                      {(() => {
                        const p = event.payload as Record<string, unknown>;
                        return (p.triggerSource as string) ?? (p.text as string) ?? (p.title as string) ?? "—";
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

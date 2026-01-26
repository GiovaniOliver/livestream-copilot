import { useEffect, useMemo, useRef, useState } from "react";
import type { EventEnvelope } from "@livestream-copilot/shared";

export function useEventStream(wsUrl: string | null) {
  const [events, setEvents] = useState<EventEnvelope[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!wsUrl) return;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data));
        if (!data?.type) return;
        // ignore non-envelope hello messages
        if (data.type === "hello") return;
        setEvents((prev) => [data as EventEnvelope, ...prev].slice(0, 500));
      } catch {
        // ignore
      }
    };
    return () => {
      try { ws.close(); } catch {}
    };
  }, [wsUrl]);

  const derived = useMemo(() => {
    const outputs = events.filter((e) => e.type === "OUTPUT_CREATED");
    const clips = events.filter((e) => e.type === "ARTIFACT_CLIP_CREATED");
    const moments = events.filter((e) => e.type === "MOMENT_MARKER");
    return { outputs, clips, moments };
  }, [events]);

  return { events, ...derived };
}

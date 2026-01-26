"use client";

import { useWebSocket } from "@/contexts/WebSocketContext";
import { Badge } from "@/components/ui";

export function ConnectionStatus() {
  const { connectionState, isConnected } = useWebSocket();

  const getStatusInfo = () => {
    switch (connectionState) {
      case "connected":
        return { label: "Connected", variant: "success" as const, pulse: true };
      case "connecting":
        return { label: "Connecting", variant: "warning" as const, pulse: true };
      case "reconnecting":
        return { label: "Reconnecting", variant: "warning" as const, pulse: true };
      case "error":
        return { label: "Connection Error", variant: "error" as const, pulse: false };
      case "disconnected":
      default:
        return { label: "Disconnected", variant: "default" as const, pulse: false };
    }
  };

  const status = getStatusInfo();

  return (
    <Badge variant={status.variant} className="gap-1.5">
      {status.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {!status.pulse && <span className="inline-flex h-2 w-2 rounded-full bg-current" />}
      {status.label}
    </Badge>
  );
}

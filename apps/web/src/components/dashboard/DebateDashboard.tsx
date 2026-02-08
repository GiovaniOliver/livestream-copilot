"use client";

import { useEffect, useMemo } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "@/components/ui";

interface DebateDashboardProps {
  sessionId: string;
  wsUrl: string;
}

const ScaleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function DebateDashboard({ sessionId, wsUrl }: DebateDashboardProps) {
  const { connect, disconnect, outputs, isConnected } = useWebSocket();

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Process outputs for claims
  const claims = useMemo(() => {
    return outputs
      .filter((e) => {
        const payload = e.payload as any;
        return payload?.category === "CLAIM" || payload?.outputCategory === "CLAIM";
      })
      .map((e) => {
        const payload = e.payload as any;
        return {
          id: e.id,
          text: payload.text || payload.content || "Claim",
          speaker: payload.speaker || payload.metadata?.speaker || "Unknown",
          timestamp: formatTimestamp(e.ts),
          stance: payload.stance || payload.metadata?.stance || "neutral",
        };
      });
  }, [outputs]);

  // Process outputs for evidence
  const evidence = useMemo(() => {
    return outputs
      .filter((e) => {
        const payload = e.payload as any;
        return payload?.category === "EVIDENCE_CARD" || payload?.outputCategory === "EVIDENCE_CARD";
      })
      .map((e) => {
        const payload = e.payload as any;
        return {
          id: e.id,
          text: payload.text || payload.content || "Evidence",
          source: payload.source || payload.metadata?.source || "Unknown source",
          timestamp: formatTimestamp(e.ts),
          relatedClaim: payload.relatedClaim || payload.metadata?.relatedClaim,
        };
      });
  }, [outputs]);

  // Get stance badge color
  const getStanceBadge = (stance: string) => {
    switch (stance.toLowerCase()) {
      case "for":
      case "pro":
        return <Badge variant="success">{stance}</Badge>;
      case "against":
      case "con":
        return <Badge variant="error">{stance}</Badge>;
      default:
        return <Badge variant="default">{stance}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Claims Board */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <div className="flex items-center gap-2">
                <ScaleIcon />
                Claims
              </div>
            </CardTitle>
            <Badge variant="teal">{claims.length}</Badge>
          </div>
          <CardDescription>
            Key arguments and positions from the debate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <div className="py-8 text-center text-sm text-text-muted">
              <p>Connecting to live session...</p>
            </div>
          )}
          {isConnected && claims.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">
              <ScaleIcon />
              <p className="mt-2">No claims identified yet</p>
              <p className="mt-1 text-xs">Claims will appear as arguments are made</p>
            </div>
          )}
          <div className="space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-xl border border-stroke bg-surface p-3 transition-colors hover:bg-surface-hover"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm text-text">{claim.text}</p>
                  {getStanceBadge(claim.stance)}
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="font-medium">{claim.speaker}</span>
                  <span>{claim.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Evidence Dossier */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <div className="flex items-center gap-2">
                <DocumentIcon />
                Evidence
              </div>
            </CardTitle>
            <Badge variant="purple">{evidence.length}</Badge>
          </div>
          <CardDescription>
            Supporting facts and references cited
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected && (
            <div className="py-8 text-center text-sm text-text-muted">
              <p>Connecting to live session...</p>
            </div>
          )}
          {isConnected && evidence.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">
              <DocumentIcon />
              <p className="mt-2">No evidence cited yet</p>
              <p className="mt-1 text-xs">Evidence cards will appear when referenced</p>
            </div>
          )}
          <div className="space-y-3">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-stroke bg-surface p-3 transition-colors hover:bg-surface-hover"
              >
                <p className="mb-2 text-sm text-text">{item.text}</p>
                <div className="mb-2 rounded bg-bg-2 px-2 py-1">
                  <p className="text-xs text-text-muted">Source: {item.source}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{item.timestamp}</span>
                  {item.relatedClaim && (
                    <Badge variant="default" className="text-xs">
                      Linked to claim
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

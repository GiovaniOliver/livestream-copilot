"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ClaimCard } from "./ClaimCard";
import type { Claim, Speaker, ClaimConnection } from "./types";

export interface ClaimsGraphProps {
  claims: Claim[];
  connections: ClaimConnection[];
  speakers: Speaker[];
  selectedClaimId?: string | null;
  onSelectClaim?: (claim: Claim | null) => void;
  className?: string;
}

interface ClaimPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ClaimsGraph({
  claims,
  connections,
  speakers,
  selectedClaimId,
  onSelectClaim,
  className,
}: ClaimsGraphProps) {
  const [filterSpeaker, setFilterSpeaker] = useState<string | null>(null);
  const [claimPositions, setClaimPositions] = useState<ClaimPosition[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const claimRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Filter claims by speaker
  const filteredClaims = useMemo(() => {
    if (!filterSpeaker) return claims;
    return claims.filter((claim) => claim.speaker.id === filterSpeaker);
  }, [claims, filterSpeaker]);

  // Group claims by their hierarchy (main claims vs responses)
  const { mainClaims, responseClaims } = useMemo(() => {
    const main = filteredClaims.filter((c) => !c.parentClaimId);
    const responses = filteredClaims.filter((c) => c.parentClaimId);
    return { mainClaims: main, responseClaims: responses };
  }, [filteredClaims]);

  // Calculate positions after render
  useEffect(() => {
    const calculatePositions = () => {
      const positions: ClaimPosition[] = [];
      claimRefs.current.forEach((element, id) => {
        if (element && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const rect = element.getBoundingClientRect();
          positions.push({
            id,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
          });
        }
      });
      setClaimPositions(positions);
    };

    // Delay calculation to ensure DOM is updated
    const timer = setTimeout(calculatePositions, 100);
    return () => clearTimeout(timer);
  }, [filteredClaims]);

  const setClaimRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      claimRefs.current.set(id, element);
    } else {
      claimRefs.current.delete(id);
    }
  }, []);

  const handleSelectClaim = useCallback(
    (claim: Claim) => {
      if (selectedClaimId === claim.id) {
        onSelectClaim?.(null);
      } else {
        onSelectClaim?.(claim);
      }
    },
    [selectedClaimId, onSelectClaim]
  );

  // Filter connections to only include visible claims
  const visibleConnections = useMemo(() => {
    const claimIds = new Set(filteredClaims.map((c) => c.id));
    return connections.filter((conn) => claimIds.has(conn.from) && claimIds.has(conn.to));
  }, [connections, filteredClaims]);

  // Generate SVG paths for connections
  const connectionPaths = useMemo(() => {
    return visibleConnections.map((conn) => {
      const fromPos = claimPositions.find((p) => p.id === conn.from);
      const toPos = claimPositions.find((p) => p.id === conn.to);

      if (!fromPos || !toPos) return null;

      // Calculate control points for curved line
      const midY = (fromPos.y + toPos.y) / 2;
      const controlOffset = Math.abs(toPos.x - fromPos.x) * 0.3;

      const path = `M ${fromPos.x} ${fromPos.y + fromPos.height / 2}
                    C ${fromPos.x} ${midY + controlOffset},
                      ${toPos.x} ${midY - controlOffset},
                      ${toPos.x} ${toPos.y - toPos.height / 2}`;

      const strokeColor =
        conn.type === "supports"
          ? "#2EE59D"
          : conn.type === "rebuts"
          ? "#EF4444"
          : "#6B6B7B";

      return {
        id: `${conn.from}-${conn.to}`,
        path,
        strokeColor,
        type: conn.type,
      };
    });
  }, [visibleConnections, claimPositions]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header with filters */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Claims Graph</h2>
          <p className="text-xs text-text-muted">
            {filteredClaims.length} claims displayed
          </p>
        </div>

        {/* Speaker filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Filter by:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setFilterSpeaker(null)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                filterSpeaker === null
                  ? "bg-teal/20 text-teal"
                  : "bg-surface text-text-muted hover:bg-surface-hover"
              )}
            >
              All
            </button>
            {speakers.map((speaker) => (
              <button
                key={speaker.id}
                onClick={() => setFilterSpeaker(speaker.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  filterSpeaker === speaker.id
                    ? "bg-teal/20 text-teal"
                    : "bg-surface text-text-muted hover:bg-surface-hover"
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: speaker.color }}
                />
                {speaker.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-b border-stroke/50 px-4 py-2">
        <span className="text-xs text-text-dim">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-full bg-blue-500" />
          <span className="text-xs text-text-muted">Claim</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-full bg-success" />
          <span className="text-xs text-text-muted">Support</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-full bg-error" />
          <span className="text-xs text-text-muted">Rebuttal</span>
        </div>
        <div className="ml-4 flex items-center gap-1.5">
          <div className="h-0.5 w-6 bg-success" />
          <span className="text-xs text-text-muted">Supports</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-6 bg-error" />
          <span className="text-xs text-text-muted">Rebuts</span>
        </div>
      </div>

      {/* Graph container */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto p-6"
      >
        {/* SVG layer for connections */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ zIndex: 0 }}
        >
          <defs>
            <marker
              id="arrowhead-green"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#2EE59D" />
            </marker>
            <marker
              id="arrowhead-red"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#EF4444" />
            </marker>
            <marker
              id="arrowhead-gray"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#6B6B7B" />
            </marker>
          </defs>
          {connectionPaths.map(
            (conn) =>
              conn && (
                <path
                  key={conn.id}
                  d={conn.path}
                  stroke={conn.strokeColor}
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray={conn.type === "related" ? "5,5" : "none"}
                  markerEnd={`url(#arrowhead-${
                    conn.type === "supports"
                      ? "green"
                      : conn.type === "rebuts"
                      ? "red"
                      : "gray"
                  })`}
                  className="transition-opacity"
                  opacity={0.6}
                />
              )
          )}
        </svg>

        {/* Claims layout */}
        <div className="relative z-10 space-y-8">
          {/* Main claims row */}
          <div className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-dim">
              Main Claims
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mainClaims.map((claim) => (
                <div
                  key={claim.id}
                  ref={(el) => setClaimRef(claim.id, el)}
                >
                  <ClaimCard
                    claim={claim}
                    isSelected={selectedClaimId === claim.id}
                    onSelect={handleSelectClaim}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Response claims row */}
          {responseClaims.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-dim">
                Responses & Rebuttals
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {responseClaims.map((claim) => (
                  <div
                    key={claim.id}
                    ref={(el) => setClaimRef(claim.id, el)}
                  >
                    <ClaimCard
                      claim={claim}
                      isSelected={selectedClaimId === claim.id}
                      onSelect={handleSelectClaim}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {filteredClaims.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-text-dim"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="mt-3 text-sm text-text-muted">No claims to display</p>
              <p className="text-xs text-text-dim">
                Claims will appear here as the debate progresses
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

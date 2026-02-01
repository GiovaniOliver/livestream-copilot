"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ClaimsGraph } from "./ClaimsGraph";
import { EvidenceDossier } from "./EvidenceDossier";
import { ModeratorConsole } from "./ModeratorConsole";
import type { Claim } from "./types";
import {
  mockClaims,
  mockConnections,
  mockEvidence,
  mockSpeakers,
  mockSpeakerTimes,
  mockTopics,
  mockInterventionPrompts,
  moderatorActions,
} from "./mockData";
import { logger } from "@/lib/logger";

export interface ClaimsBoardProps {
  className?: string;
}

export function ClaimsBoard({ className }: ClaimsBoardProps) {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [prompts, setPrompts] = useState(mockInterventionPrompts);

  const handleSelectClaim = useCallback((claim: Claim | null) => {
    setSelectedClaim(claim);
  }, []);

  const handleAddEvidence = useCallback(() => {
    // In a real app, this would open a modal or form
    logger.debug("Add evidence for claim:", selectedClaim?.id);
  }, [selectedClaim]);

  const handleModeratorAction = useCallback((actionId: string) => {
    // In a real app, this would trigger the action
    logger.debug("Moderator action triggered:", actionId);
  }, []);

  const handleDismissPrompt = useCallback((promptId: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== promptId));
  }, []);

  return (
    <div
      className={cn(
        "flex h-screen w-full bg-bg-0",
        className
      )}
    >
      {/* Left Panel: Claims Graph (main area) */}
      <div className="flex flex-1 flex-col border-r border-stroke">
        <ClaimsGraph
          claims={mockClaims}
          connections={mockConnections}
          speakers={mockSpeakers}
          selectedClaimId={selectedClaim?.id}
          onSelectClaim={handleSelectClaim}
          className="h-full"
        />
      </div>

      {/* Right Panel: Split into two sections */}
      <div className="flex w-[400px] flex-col">
        {/* Right Top: Evidence Dossier */}
        <div className="flex-1 border-b border-stroke">
          <EvidenceDossier
            evidence={mockEvidence}
            selectedClaim={selectedClaim}
            onAddEvidence={handleAddEvidence}
            className="h-full"
          />
        </div>

        {/* Right Bottom: Moderator Console */}
        <div className="h-[45%] min-h-[350px]">
          <ModeratorConsole
            actions={moderatorActions}
            speakerTimes={mockSpeakerTimes}
            topics={mockTopics}
            interventionPrompts={prompts}
            onAction={handleModeratorAction}
            onDismissPrompt={handleDismissPrompt}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}

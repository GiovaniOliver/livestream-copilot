"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { LegalParty, TrialPhase } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface Participant {
  id: string;
  name: string;
  role: "prosecution" | "defense" | "judge" | "witness" | "clerk";
  party: LegalParty;
  isActive: boolean;
}

export interface CaseOverviewPanelProps {
  caseTitle: string;
  caseNumber?: string;
  participants: Participant[];
  currentPhase: TrialPhase;
  duration: string;
  evidenceCount: number;
  claimCount: number;
  objectionCount: number;
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const GavelIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// =============================================================================
// Constants
// =============================================================================

const PHASE_LABELS: Record<TrialPhase, string> = {
  opening: "Opening Statements",
  "prosecution-case": "Prosecution's Case",
  "defense-case": "Defense's Case",
  rebuttal: "Rebuttal",
  closing: "Closing Arguments",
  deliberation: "Deliberation",
  verdict: "Verdict",
};

const ROLE_STYLES: Record<Participant["role"], { badge: "error" | "teal" | "purple" | "warning" | "default" }> = {
  prosecution: { badge: "error" },
  defense: { badge: "teal" },
  judge: { badge: "purple" },
  witness: { badge: "warning" },
  clerk: { badge: "default" },
};

// =============================================================================
// Component
// =============================================================================

export function CaseOverviewPanel({
  caseTitle,
  caseNumber,
  participants,
  currentPhase,
  duration,
  evidenceCount,
  claimCount,
  objectionCount,
  className,
}: CaseOverviewPanelProps) {
  const groupedParticipants = useMemo((): {
    prosecution: Participant[];
    defense: Participant[];
    judge: Participant[];
    other: Participant[];
  } => {
    const groups = {
      prosecution: [] as Participant[],
      defense: [] as Participant[],
      judge: [] as Participant[],
      other: [] as Participant[],
    };

    participants.forEach((p) => {
      if (p.role === "prosecution") {
        groups.prosecution = [...groups.prosecution, p];
      } else if (p.role === "defense") {
        groups.defense = [...groups.defense, p];
      } else if (p.role === "judge") {
        groups.judge = [...groups.judge, p];
      } else {
        groups.other = [...groups.other, p];
      }
    });

    return groups;
  }, [participants]);

  return (
    <div className={cn("rounded-xl border border-stroke bg-bg-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple/10 text-purple">
            <GavelIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">{caseTitle}</h3>
            {caseNumber && (
              <p className="text-xs text-text-muted">Case #{caseNumber}</p>
            )}
          </div>
        </div>
        <Badge variant="teal">{PHASE_LABELS[currentPhase]}</Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-px border-b border-stroke bg-stroke">
        {[
          { label: "Duration", value: duration, icon: <ClockIcon /> },
          { label: "Evidence", value: String(evidenceCount) },
          { label: "Claims", value: String(claimCount) },
          { label: "Objections", value: String(objectionCount) },
        ].map((stat) => (
          <div key={stat.label} className="bg-bg-1 px-3 py-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-dim">{stat.label}</p>
            <p className="mt-0.5 text-sm font-bold text-text">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Participants */}
      <div className="p-4">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-dim">
          Participants
        </h4>
        <div className="space-y-3">
          {/* Judge */}
          {groupedParticipants.judge.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-purple">Judge</p>
              <div className="flex flex-wrap gap-2">
                {groupedParticipants.judge.map((p) => (
                  <ParticipantChip key={p.id} participant={p} />
                ))}
              </div>
            </div>
          )}

          {/* Prosecution & Defense side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-error">Prosecution</p>
              <div className="space-y-1">
                {groupedParticipants.prosecution.length === 0 ? (
                  <p className="text-xs text-text-dim">No participants</p>
                ) : (
                  groupedParticipants.prosecution.map((p) => (
                    <ParticipantChip key={p.id} participant={p} />
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-teal">Defense</p>
              <div className="space-y-1">
                {groupedParticipants.defense.length === 0 ? (
                  <p className="text-xs text-text-dim">No participants</p>
                ) : (
                  groupedParticipants.defense.map((p) => (
                    <ParticipantChip key={p.id} participant={p} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Other */}
          {groupedParticipants.other.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-text-dim">Other</p>
              <div className="flex flex-wrap gap-2">
                {groupedParticipants.other.map((p) => (
                  <ParticipantChip key={p.id} participant={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ParticipantChip({ participant }: { participant: Participant }) {
  const style = ROLE_STYLES[participant.role];
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg bg-surface px-2 py-1",
        participant.isActive && "ring-1 ring-teal/30"
      )}
    >
      <UserIcon />
      <span className="text-xs font-medium text-text">{participant.name}</span>
      {participant.isActive && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal" />
        </span>
      )}
    </div>
  );
}

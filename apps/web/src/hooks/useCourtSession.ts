/**
 * Custom hook for managing Court Session state with real-time WebSocket updates.
 *
 * Listens for OUTPUT_CREATED events with categories:
 * - CLAIM: Legal claims, allegations, and rebuttals
 * - EVIDENCE_CARD: Evidence items with exhibit references
 * - QUOTE: Witness testimony key points
 * - MODERATOR_PROMPT: Judicial or moderator interventions
 *
 * Derives:
 * - Evidence board items
 * - Legal claims and argument timeline
 * - Objections
 * - Verdict progress tracking
 * - Participant tracking
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import type { EventEnvelope } from "@livestream-copilot/shared";
import type {
  LegalEvidence,
  LegalClaim,
  Objection,
  VerdictProgress,
  TimelineEvent,
  TrialPhase,
  LegalParty,
  EvidenceType,
  EvidenceStatus,
  ObjectionType,
  ObjectionRuling,
} from "@/components/dashboards/court/types";
import type { Participant } from "@/components/dashboards/court/CaseOverviewPanel";

// =============================================================================
// Types
// =============================================================================

interface OutputPayload {
  outputId: string;
  category: string;
  title?: string;
  text: string;
  refs: string[];
  meta: Record<string, unknown>;
}

export interface UseCourtSessionReturn {
  // Core data
  evidence: LegalEvidence[];
  claims: LegalClaim[];
  objections: Objection[];
  timeline: TimelineEvent[];
  participants: Participant[];
  verdictProgress: VerdictProgress;

  // Derived stats
  evidenceCount: number;
  claimCount: number;
  objectionCount: number;
  prosecutionClaimCount: number;
  defenseClaimCount: number;

  // Connection state
  isConnected: boolean;

  // Selections
  selectedEvidenceId: string | null;
  selectEvidence: (id: string | null) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function extractParty(meta: Record<string, unknown>): LegalParty {
  const party = meta.party as string | undefined;
  if (party === "prosecution" || party === "defense" || party === "court") {
    return party;
  }
  const speaker = meta.speaker as string | undefined;
  if (speaker?.toLowerCase().includes("prosecut")) return "prosecution";
  if (speaker?.toLowerCase().includes("defen")) return "defense";
  if (speaker?.toLowerCase().includes("judge") || speaker?.toLowerCase().includes("court")) return "court";
  return "neutral";
}

function extractEvidenceType(meta: Record<string, unknown>): EvidenceType {
  const type = meta.evidenceType as string | undefined;
  if (type && ["document", "photo", "video", "audio", "physical", "testimony", "digital"].includes(type)) {
    return type as EvidenceType;
  }
  return "document";
}

function extractEvidenceStatus(meta: Record<string, unknown>): EvidenceStatus {
  const status = meta.status as string | undefined;
  if (status && ["admitted", "objected", "pending", "withdrawn"].includes(status)) {
    return status as EvidenceStatus;
  }
  return "pending";
}

function extractObjectionType(meta: Record<string, unknown>): ObjectionType {
  const type = meta.objectionType as string | undefined;
  if (type && [
    "hearsay", "relevance", "leading", "speculation", "argumentative",
    "compound", "asked_and_answered", "assumes_facts", "character", "foundation"
  ].includes(type)) {
    return type as ObjectionType;
  }
  return "other";
}

function extractObjectionRuling(meta: Record<string, unknown>): ObjectionRuling {
  const ruling = meta.ruling as string | undefined;
  if (ruling === "sustained" || ruling === "overruled") return ruling;
  return "pending";
}

function extractClaimStrength(meta: Record<string, unknown>): number {
  const strength = meta.strength as number | undefined;
  if (typeof strength === "number" && strength >= 0 && strength <= 100) return strength;
  return 50;
}

function isObjectionClaim(text: string, meta: Record<string, unknown>): boolean {
  const isObjection = meta.isObjection as boolean | undefined;
  if (isObjection === true) return true;
  return text.toLowerCase().startsWith("objection");
}

// =============================================================================
// Hook
// =============================================================================

export function useCourtSession(sessionId: string): UseCourtSessionReturn {
  const { events, isConnected } = useWebSocket();

  const [evidence, setEvidence] = useState<LegalEvidence[]>([]);
  const [claims, setClaims] = useState<LegalClaim[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [participantMap, setParticipantMap] = useState<Map<string, Participant>>(new Map());
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [processedEventIds] = useState<Set<string>>(new Set());

  // Process incoming WebSocket events
  useEffect(() => {
    const newEvents = events.filter(
      (e) =>
        (e.type === "OUTPUT_CREATED" || e.type === "OUTPUT_VALIDATED") &&
        !processedEventIds.has(e.id) &&
        (!e.sessionId || e.sessionId === sessionId)
    );

    if (newEvents.length === 0) return;

    newEvents.forEach((event) => {
      processedEventIds.add(event.id);

      if (event.type !== "OUTPUT_CREATED") return;

      const payload = event.payload as OutputPayload;
      const { category, text, meta, outputId } = payload;
      const title = payload.title ?? "";
      const ts = event.ts;
      const timestamp = formatTimestamp(ts);
      const party = extractParty(meta);

      // Track participants
      const speakerName = (meta.speaker as string) || (meta.speakerId as string);
      if (speakerName) {
        setParticipantMap((prev) => {
          if (prev.has(speakerName)) return prev;
          const role =
            party === "prosecution" ? "prosecution" as const :
            party === "defense" ? "defense" as const :
            party === "court" ? "judge" as const :
            "witness" as const;
          const newMap = new Map(prev);
          newMap.set(speakerName, {
            id: speakerName,
            name: speakerName,
            role,
            party,
            isActive: true,
          });
          return newMap;
        });
      }

      switch (category) {
        case "CLAIM": {
          if (isObjectionClaim(text, meta)) {
            // Route to objections
            const objection: Objection = {
              id: outputId || generateId(),
              type: extractObjectionType(meta),
              party,
              timestamp,
              sessionTimestamp: ts,
              context: text,
              ruling: extractObjectionRuling(meta),
              rulingReason: (meta.rulingReason as string) || undefined,
              witnessId: (meta.witnessId as string) || undefined,
              isAiGenerated: true,
            };
            setObjections((prev) => [...prev, objection]);

            // Add to timeline
            setTimeline((prev) => [...prev, {
              id: generateId(),
              type: "objection",
              title: `Objection: ${OBJECTION_TYPE_LABELS_SHORT[objection.type] || objection.type}`,
              description: text,
              timestamp,
              sessionTimestamp: ts,
              party,
              linkedIds: [objection.id],
              isKeyMoment: true,
              isAiGenerated: true,
            }]);
          } else {
            // Standard claim
            const claim: LegalClaim = {
              id: outputId || generateId(),
              text,
              party,
              timestamp,
              sessionTimestamp: ts,
              type: extractClaimType(meta),
              evidenceIds: (meta.evidenceIds as string[]) || [],
              witnessIds: (meta.witnessIds as string[]) || [],
              strength: extractClaimStrength(meta),
              isContested: (meta.isContested as boolean) || false,
              isAiGenerated: true,
            };
            setClaims((prev) => [...prev, claim]);

            setTimeline((prev) => [...prev, {
              id: generateId(),
              type: "evidence",
              title: title || `${party} claim`,
              description: text.length > 120 ? `${text.slice(0, 117)}...` : text,
              timestamp,
              sessionTimestamp: ts,
              party,
              linkedIds: [claim.id],
              isKeyMoment: claim.strength >= 70,
              isAiGenerated: true,
            }]);
          }
          break;
        }

        case "EVIDENCE_CARD": {
          const evidenceItem: LegalEvidence = {
            id: outputId || generateId(),
            label: title || `Exhibit ${evidence.length + 1}`,
            type: extractEvidenceType(meta),
            description: text,
            timestamp,
            sessionTimestamp: ts,
            status: extractEvidenceStatus(meta),
            submittedBy: party,
            linkedWitnessIds: (meta.witnessIds as string[]) || [],
            linkedClaimIds: (meta.claimIds as string[]) || [],
            linkedEvidenceIds: (meta.linkedEvidenceIds as string[]) || [],
            tags: (meta.tags as string[]) || [],
            notes: (meta.notes as string) || undefined,
            source: (meta.source as string) || undefined,
            isAiGenerated: true,
          };
          setEvidence((prev) => [...prev, evidenceItem]);

          setTimeline((prev) => [...prev, {
            id: generateId(),
            type: "evidence",
            title: `Evidence: ${evidenceItem.label}`,
            description: text.length > 120 ? `${text.slice(0, 117)}...` : text,
            timestamp,
            sessionTimestamp: ts,
            party,
            linkedIds: [evidenceItem.id],
            isKeyMoment: false,
            isAiGenerated: true,
          }]);
          break;
        }

        case "QUOTE": {
          // Treat quotes as testimony-based claims
          const claim: LegalClaim = {
            id: outputId || generateId(),
            text: title ? `"${text}" - ${title}` : `"${text}"`,
            party,
            timestamp,
            sessionTimestamp: ts,
            type: "claim",
            evidenceIds: [],
            witnessIds: (meta.witnessIds as string[]) || [],
            strength: extractClaimStrength(meta),
            isContested: false,
            isAiGenerated: true,
          };
          setClaims((prev) => [...prev, claim]);
          break;
        }

        case "MODERATOR_PROMPT": {
          // Track moderator/judge actions as timeline events
          setTimeline((prev) => [...prev, {
            id: generateId(),
            type: "ruling",
            title: title || "Judicial Direction",
            description: text,
            timestamp,
            sessionTimestamp: ts,
            party: "court",
            linkedIds: [],
            isKeyMoment: true,
            isAiGenerated: true,
          }]);
          break;
        }

        default:
          break;
      }
    });
  }, [events, sessionId, processedEventIds, evidence.length]);

  // Derive verdict progress from accumulated data
  const verdictProgress: VerdictProgress = useMemo(() => {
    const prosecutionClaims = claims.filter((c) => c.party === "prosecution");
    const defenseClaims = claims.filter((c) => c.party === "defense");

    const avgProsecutionStrength = prosecutionClaims.length > 0
      ? Math.round(prosecutionClaims.reduce((sum, c) => sum + c.strength, 0) / prosecutionClaims.length)
      : 0;
    const avgDefenseStrength = defenseClaims.length > 0
      ? Math.round(defenseClaims.reduce((sum, c) => sum + c.strength, 0) / defenseClaims.length)
      : 0;

    // Determine completed phases based on data patterns
    const completedPhases: TrialPhase[] = [];
    const currentPhase: TrialPhase = determineCurrentPhase(claims, evidence, objections);

    const phaseOrder: TrialPhase[] = [
      "opening", "prosecution-case", "defense-case", "rebuttal", "closing", "deliberation", "verdict",
    ];
    const currentIdx = phaseOrder.indexOf(currentPhase);
    phaseOrder.forEach((phase, idx) => {
      if (idx < currentIdx) {
        completedPhases.push(phase);
      }
    });

    return {
      phase: currentPhase,
      completedPhases,
      currentPhase,
      notes: generateNotes(claims, objections),
      factors: [],
      prosecutionStrength: avgProsecutionStrength,
      defenseStrength: avgDefenseStrength,
    };
  }, [claims, evidence, objections]);

  const participants = useMemo(() => Array.from(participantMap.values()), [participantMap]);

  const selectEvidence = useCallback((id: string | null) => {
    setSelectedEvidenceId(id);
  }, []);

  return {
    evidence,
    claims,
    objections,
    timeline,
    participants,
    verdictProgress,
    evidenceCount: evidence.length,
    claimCount: claims.length,
    objectionCount: objections.length,
    prosecutionClaimCount: claims.filter((c) => c.party === "prosecution").length,
    defenseClaimCount: claims.filter((c) => c.party === "defense").length,
    isConnected,
    selectedEvidenceId,
    selectEvidence,
  };
}

// =============================================================================
// Helper Functions (Private)
// =============================================================================

function extractClaimType(meta: Record<string, unknown>): LegalClaim["type"] {
  const type = meta.claimType as string | undefined;
  if (type === "allegation") return "allegation";
  if (type === "defense") return "defense";
  if (type === "rebuttal") return "rebuttal";
  return "claim";
}

function determineCurrentPhase(
  claims: LegalClaim[],
  evidence: LegalEvidence[],
  objections: Objection[]
): TrialPhase {
  const totalItems = claims.length + evidence.length;
  if (totalItems === 0) return "opening";

  const hasDefenseClaims = claims.some((c) => c.party === "defense");
  const hasRebuttals = claims.some((c) => c.type === "rebuttal");
  const prosecutionClaims = claims.filter((c) => c.party === "prosecution").length;
  const defenseClaims = claims.filter((c) => c.party === "defense").length;

  if (hasRebuttals && prosecutionClaims > 3 && defenseClaims > 3) return "closing";
  if (hasRebuttals) return "rebuttal";
  if (hasDefenseClaims && defenseClaims > 2) return "defense-case";
  if (hasDefenseClaims) return "defense-case";
  if (prosecutionClaims > 2) return "prosecution-case";
  return "opening";
}

function generateNotes(claims: LegalClaim[], objections: Objection[]): string[] {
  const notes: string[] = [];

  const contestedClaims = claims.filter((c) => c.isContested);
  if (contestedClaims.length > 0) {
    notes.push(`${contestedClaims.length} claims are currently contested`);
  }

  const sustainedObjections = objections.filter((o) => o.ruling === "sustained");
  if (sustainedObjections.length > 0) {
    notes.push(`${sustainedObjections.length} objections sustained`);
  }

  const strongClaims = claims.filter((c) => c.strength >= 80);
  if (strongClaims.length > 0) {
    notes.push(`${strongClaims.length} strong arguments identified`);
  }

  return notes;
}

const OBJECTION_TYPE_LABELS_SHORT: Record<string, string> = {
  hearsay: "Hearsay",
  relevance: "Relevance",
  leading: "Leading",
  speculation: "Speculation",
  argumentative: "Argumentative",
  compound: "Compound",
  asked_and_answered: "Asked & Answered",
  assumes_facts: "Assumes Facts",
  character: "Character",
  foundation: "Foundation",
  other: "Other",
};

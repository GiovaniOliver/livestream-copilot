// Court Session Dashboard Components
// Legal proceedings workflow for FluxBoard web app

// Panel components
export { CaseOverviewPanel } from "./CaseOverviewPanel";
export type { CaseOverviewPanelProps, Participant } from "./CaseOverviewPanel";

export { EvidenceBoard, EvidenceCard } from "./EvidenceBoard";
export type { EvidenceBoardProps, EvidenceCardProps } from "./EvidenceBoard";

export { ArgumentTimeline } from "./ArgumentTimeline";
export type { ArgumentTimelineProps } from "./ArgumentTimeline";

export { ObjectionLog } from "./ObjectionLog";
export type { ObjectionLogProps } from "./ObjectionLog";

export { VerdictTracker } from "./VerdictTracker";
export type { VerdictTrackerProps } from "./VerdictTracker";

export { RulingSummaryPanel } from "./RulingSummaryPanel";
export type { RulingSummaryPanelProps } from "./RulingSummaryPanel";

export { ActionPanel } from "./ActionPanel";
export type { ActionPanelProps } from "./ActionPanel";

// Types
export type {
  LegalEvidence,
  LegalClaim,
  Witness,
  Objection,
  Contradiction,
  Precedent,
  VerdictFactor,
  VerdictProgress,
  TimelineEvent,
  CredibilityScore,
  CredibilityFactor,
  CourtSessionState,
  EvidenceStatus,
  EvidenceType,
  LegalParty,
  WitnessRole,
  WitnessStatus,
  CredibilityLevel,
  ObjectionRuling,
  ObjectionType,
  TrialPhase,
  VerdictFactorType,
  TimelineEventType,
  CourtActionStatus,
} from "./types";

// Actions
export {
  COURT_ACTIONS,
  COURT_ACTION_GROUPS,
  getCourtActionById,
  getCourtAutoTriggerActions,
  getCourtActionsByGroup,
  initialCourtActionState,
} from "./actions";
export type { CourtActionState } from "./actions";

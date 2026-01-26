// Claims & Evidence Board Dashboard Components
// Debate workflow for FluxBoard web app

// Main dashboard
export { ClaimsBoard } from "./ClaimsBoard";
export type { ClaimsBoardProps } from "./ClaimsBoard";

// Core components
export { ClaimsGraph } from "./ClaimsGraph";
export type { ClaimsGraphProps } from "./ClaimsGraph";

export { EvidenceDossier } from "./EvidenceDossier";
export type { EvidenceDossierProps } from "./EvidenceDossier";

export { ModeratorConsole } from "./ModeratorConsole";
export type { ModeratorConsoleProps } from "./ModeratorConsole";

// Card components
export { ClaimCard } from "./ClaimCard";
export type { ClaimCardProps } from "./ClaimCard";

export { EvidenceCard } from "./EvidenceCard";
export type { EvidenceCardProps } from "./EvidenceCard";

export { ModeratorAction } from "./ModeratorAction";
export type { ModeratorActionProps } from "./ModeratorAction";

// Types
export type {
  Claim,
  ClaimType,
  VerificationStatus,
  Evidence,
  EvidenceSource,
  Speaker,
  SpeakerTime,
  Topic,
  InterventionPrompt,
  ModeratorActionConfig,
  ClaimConnection,
} from "./types";

// Mock data (for development/testing)
export {
  mockClaims,
  mockConnections,
  mockEvidence,
  mockSpeakers,
  mockSpeakerTimes,
  mockTopics,
  mockInterventionPrompts,
  moderatorActions,
} from "./mockData";

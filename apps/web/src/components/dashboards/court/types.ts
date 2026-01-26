// Types for Court Session Dashboard

/**
 * Evidence status in court proceedings
 */
export type EvidenceStatus = "admitted" | "objected" | "pending" | "withdrawn";

/**
 * Evidence type
 */
export type EvidenceType = "document" | "photo" | "video" | "audio" | "physical" | "testimony" | "digital";

/**
 * Legal party in proceedings
 */
export type LegalParty = "prosecution" | "defense" | "court" | "neutral";

/**
 * Witness role
 */
export type WitnessRole = "prosecution" | "defense" | "expert" | "character" | "fact";

/**
 * Witness testimony status
 */
export type WitnessStatus = "scheduled" | "testifying" | "cross-examined" | "redirect" | "completed" | "excused";

/**
 * Credibility assessment level
 */
export type CredibilityLevel = "high" | "medium" | "low" | "undetermined";

/**
 * Objection ruling
 */
export type ObjectionRuling = "sustained" | "overruled" | "pending";

/**
 * Objection type
 */
export type ObjectionType =
  | "hearsay"
  | "relevance"
  | "leading"
  | "speculation"
  | "argumentative"
  | "compound"
  | "asked_and_answered"
  | "assumes_facts"
  | "character"
  | "foundation"
  | "other";

/**
 * Trial phase
 */
export type TrialPhase =
  | "opening"
  | "prosecution-case"
  | "defense-case"
  | "rebuttal"
  | "closing"
  | "deliberation"
  | "verdict";

/**
 * Verdict factor type
 */
export type VerdictFactorType = "supporting" | "opposing" | "neutral";

/**
 * Timeline event type
 */
export type TimelineEventType =
  | "evidence"
  | "testimony"
  | "objection"
  | "ruling"
  | "recess"
  | "phase_change"
  | "key_moment";

/**
 * Evidence item in the case
 */
export interface LegalEvidence {
  id: string;
  label: string;
  type: EvidenceType;
  description: string;
  timestamp: string;
  sessionTimestamp: number;
  status: EvidenceStatus;
  submittedBy: LegalParty;
  linkedWitnessIds: string[];
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  tags: string[];
  notes?: string;
  source?: string;
  isAiGenerated?: boolean;
}

/**
 * Legal claim extracted from proceedings
 */
export interface LegalClaim {
  id: string;
  text: string;
  party: LegalParty;
  timestamp: string;
  sessionTimestamp: number;
  type: "claim" | "allegation" | "defense" | "rebuttal";
  evidenceIds: string[];
  witnessIds: string[];
  strength: number; // 0-100
  isContested: boolean;
  isAiGenerated?: boolean;
}

/**
 * Witness in the case
 */
export interface Witness {
  id: string;
  name: string;
  role: WitnessRole;
  party: LegalParty;
  status: WitnessStatus;
  timestamp: string;
  sessionTimestamp: number;
  keyPoints: string[];
  credibility: CredibilityScore;
  testimonySummary?: string;
  linkedEvidenceIds: string[];
  linkedClaimIds: string[];
  contradictions: string[];
  isAiGenerated?: boolean;
}

/**
 * Credibility score breakdown
 */
export interface CredibilityScore {
  overall: CredibilityLevel;
  score: number; // 0-100
  factors: CredibilityFactor[];
  lastUpdated: string;
}

/**
 * Individual credibility factor
 */
export interface CredibilityFactor {
  id: string;
  name: string;
  score: number; // -50 to +50 impact
  description: string;
  type: "positive" | "negative" | "neutral";
}

/**
 * Objection record
 */
export interface Objection {
  id: string;
  type: ObjectionType;
  party: LegalParty;
  timestamp: string;
  sessionTimestamp: number;
  context: string;
  ruling: ObjectionRuling;
  rulingReason?: string;
  witnessId?: string;
  isAiGenerated?: boolean;
}

/**
 * Contradiction found in testimony/evidence
 */
export interface Contradiction {
  id: string;
  description: string;
  severity: "minor" | "moderate" | "major";
  sourceA: {
    type: "witness" | "evidence" | "claim";
    id: string;
    excerpt: string;
  };
  sourceB: {
    type: "witness" | "evidence" | "claim";
    id: string;
    excerpt: string;
  };
  timestamp: string;
  isResolved: boolean;
  resolution?: string;
  isAiGenerated?: boolean;
}

/**
 * Case precedent reference
 */
export interface Precedent {
  id: string;
  caseName: string;
  citation: string;
  relevance: string;
  linkedClaimIds: string[];
  party: LegalParty;
  year?: number;
  court?: string;
  url?: string;
  isAiGenerated?: boolean;
}

/**
 * Verdict factor for decision analysis
 */
export interface VerdictFactor {
  id: string;
  description: string;
  type: VerdictFactorType;
  weight: number; // 0-100
  evidenceIds: string[];
  witnessIds: string[];
  isAiGenerated?: boolean;
}

/**
 * Timeline event for case chronology
 */
export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  timestamp: string;
  sessionTimestamp: number;
  party?: LegalParty;
  linkedIds: string[];
  isKeyMoment: boolean;
  isAiGenerated?: boolean;
}

/**
 * Verdict progress tracking
 */
export interface VerdictProgress {
  phase: TrialPhase;
  completedPhases: TrialPhase[];
  currentPhase: TrialPhase;
  notes: string[];
  factors: VerdictFactor[];
  prosecutionStrength: number; // 0-100
  defenseStrength: number; // 0-100
}

/**
 * Court session state
 */
export interface CourtSessionState {
  evidence: LegalEvidence[];
  claims: LegalClaim[];
  witnesses: Witness[];
  objections: Objection[];
  contradictions: Contradiction[];
  precedents: Precedent[];
  timeline: TimelineEvent[];
  verdictProgress: VerdictProgress;
  selectedEvidenceId: string | null;
  selectedWitnessId: string | null;
  selectedClaimId: string | null;
}

/**
 * Action status for Court actions
 */
export type CourtActionStatus = "idle" | "queued" | "processing" | "success" | "failed" | "cancelled" | "reviewing";

/**
 * Court-specific action result types
 */
export interface ClaimExtractionResult {
  claims: LegalClaim[];
  confidence: number;
}

export interface EvidenceLogResult {
  evidence: LegalEvidence;
  suggestedLinks: string[];
}

export interface WitnessTagResult {
  witnessId: string;
  keyPoints: string[];
  credibilityFactors: CredibilityFactor[];
}

export interface ContradictionResult {
  contradictions: Contradiction[];
  confidence: number;
}

export interface PrecedentResult {
  precedents: Precedent[];
  confidence: number;
}

export interface TestimonySummaryResult {
  witnessId: string;
  summary: string;
  keyPoints: string[];
}

export interface TimelineResult {
  events: TimelineEvent[];
  keyMoments: string[];
}

export interface CredibilityResult {
  witnessId: string;
  score: CredibilityScore;
  analysis: string;
}

export interface VerdictFactorsResult {
  factors: VerdictFactor[];
  summary: string;
}

export interface ObjectionResult {
  objection: Objection;
  suggestedRuling?: ObjectionRuling;
}

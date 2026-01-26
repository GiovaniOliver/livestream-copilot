// Types for Claims & Evidence Board

export type VerificationStatus = "unverified" | "verified" | "disputed";

export type ClaimType = "claim" | "support" | "rebuttal";

export interface Speaker {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

export interface Claim {
  id: string;
  text: string;
  speaker: Speaker;
  timestamp: string;
  type: ClaimType;
  verificationStatus: VerificationStatus;
  evidenceCount: number;
  relatedClaimIds: string[];
  parentClaimId?: string;
}

export interface EvidenceSource {
  name: string;
  url: string;
  type: "article" | "study" | "video" | "government" | "news";
}

export interface Evidence {
  id: string;
  claimId: string;
  summary: string;
  neutralSummary: string;
  source: EvidenceSource;
  credibilityScore: number;
  addedAt: string;
}

export interface ModeratorActionConfig {
  id: string;
  label: string;
  icon: "clarify" | "factcheck" | "time" | "next" | "pause" | "resume";
  variant: "default" | "warning" | "primary";
  description?: string;
}

export interface SpeakerTime {
  speakerId: string;
  speaker: Speaker;
  totalSeconds: number;
  allocatedSeconds: number;
}

export interface Topic {
  id: string;
  title: string;
  status: "upcoming" | "current" | "completed";
  allocatedMinutes: number;
  elapsedMinutes: number;
}

export interface InterventionPrompt {
  id: string;
  type: "suggestion" | "alert" | "info";
  message: string;
  priority: "low" | "medium" | "high";
  relatedClaimId?: string;
}

export interface ClaimConnection {
  from: string;
  to: string;
  type: "supports" | "rebuts" | "related";
}

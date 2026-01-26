import type {
  Claim,
  Evidence,
  Speaker,
  SpeakerTime,
  Topic,
  InterventionPrompt,
  ModeratorActionConfig,
  ClaimConnection,
} from "./types";

// Mock Speakers
export const mockSpeakers: Speaker[] = [
  {
    id: "speaker-1",
    name: "Dr. Sarah Chen",
    color: "#00D4C7",
  },
  {
    id: "speaker-2",
    name: "Prof. Marcus Webb",
    color: "#8B5CF6",
  },
];

// Mock Claims
export const mockClaims: Claim[] = [
  {
    id: "claim-1",
    text: "Renewable energy sources can fully replace fossil fuels within the next two decades with sufficient investment.",
    speaker: mockSpeakers[0],
    timestamp: "00:02:34",
    type: "claim",
    verificationStatus: "verified",
    evidenceCount: 3,
    relatedClaimIds: ["claim-2", "claim-3"],
  },
  {
    id: "claim-2",
    text: "The International Energy Agency projects a 50% renewable share by 2030 is achievable with current technology.",
    speaker: mockSpeakers[0],
    timestamp: "00:03:12",
    type: "support",
    verificationStatus: "verified",
    evidenceCount: 2,
    relatedClaimIds: ["claim-1"],
    parentClaimId: "claim-1",
  },
  {
    id: "claim-3",
    text: "Grid stability issues make 100% renewable energy impractical without breakthrough battery technology.",
    speaker: mockSpeakers[1],
    timestamp: "00:04:45",
    type: "rebuttal",
    verificationStatus: "disputed",
    evidenceCount: 2,
    relatedClaimIds: ["claim-1", "claim-4"],
    parentClaimId: "claim-1",
  },
  {
    id: "claim-4",
    text: "Current lithium-ion battery costs have dropped 89% since 2010, making storage increasingly viable.",
    speaker: mockSpeakers[0],
    timestamp: "00:05:28",
    type: "rebuttal",
    verificationStatus: "verified",
    evidenceCount: 4,
    relatedClaimIds: ["claim-3"],
    parentClaimId: "claim-3",
  },
  {
    id: "claim-5",
    text: "The economic transition away from fossil fuels will cause significant job losses in traditional energy sectors.",
    speaker: mockSpeakers[1],
    timestamp: "00:07:15",
    type: "claim",
    verificationStatus: "unverified",
    evidenceCount: 1,
    relatedClaimIds: ["claim-6"],
  },
  {
    id: "claim-6",
    text: "Studies show green energy creates 3 jobs for every 1 lost in fossil fuel industries.",
    speaker: mockSpeakers[0],
    timestamp: "00:08:02",
    type: "rebuttal",
    verificationStatus: "verified",
    evidenceCount: 2,
    relatedClaimIds: ["claim-5"],
    parentClaimId: "claim-5",
  },
  {
    id: "claim-7",
    text: "Nuclear energy should be considered as part of the clean energy mix for baseload power.",
    speaker: mockSpeakers[1],
    timestamp: "00:10:30",
    type: "claim",
    verificationStatus: "unverified",
    evidenceCount: 0,
    relatedClaimIds: [],
  },
];

// Mock Claim Connections for visualization
export const mockConnections: ClaimConnection[] = [
  { from: "claim-1", to: "claim-2", type: "supports" },
  { from: "claim-1", to: "claim-3", type: "rebuts" },
  { from: "claim-3", to: "claim-4", type: "rebuts" },
  { from: "claim-5", to: "claim-6", type: "rebuts" },
];

// Mock Evidence
export const mockEvidence: Evidence[] = [
  {
    id: "evidence-1",
    claimId: "claim-1",
    summary:
      "IEA Net Zero by 2050 report outlines pathway for renewable energy transition with key milestones.",
    neutralSummary:
      "The report provides a roadmap but notes significant policy changes and investments are required.",
    source: {
      name: "International Energy Agency",
      url: "https://www.iea.org/reports/net-zero-by-2050",
      type: "government",
    },
    credibilityScore: 95,
    addedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "evidence-2",
    claimId: "claim-1",
    summary:
      "IRENA study shows renewable capacity additions have been accelerating globally since 2015.",
    neutralSummary:
      "Renewable growth is strong but varies significantly by region and faces infrastructure challenges.",
    source: {
      name: "IRENA Global Renewables Outlook",
      url: "https://www.irena.org/publications",
      type: "study",
    },
    credibilityScore: 92,
    addedAt: "2024-01-15T10:35:00Z",
  },
  {
    id: "evidence-3",
    claimId: "claim-1",
    summary:
      "Bloomberg NEF analysis projects solar and wind to dominate new power generation by 2030.",
    neutralSummary:
      "Market analysis based on current trends; actual outcomes depend on policy and investment decisions.",
    source: {
      name: "Bloomberg New Energy Finance",
      url: "https://about.bnef.com/new-energy-outlook/",
      type: "news",
    },
    credibilityScore: 88,
    addedAt: "2024-01-15T10:40:00Z",
  },
  {
    id: "evidence-4",
    claimId: "claim-4",
    summary:
      "BloombergNEF Lithium-Ion Battery Price Survey shows 89% cost reduction from 2010 to 2023.",
    neutralSummary:
      "Battery costs have declined dramatically; however, raw material supply constraints may affect future pricing.",
    source: {
      name: "BloombergNEF Battery Price Survey",
      url: "https://about.bnef.com/blog/lithium-ion-battery-pack-prices/",
      type: "study",
    },
    credibilityScore: 90,
    addedAt: "2024-01-15T11:00:00Z",
  },
  {
    id: "evidence-5",
    claimId: "claim-3",
    summary:
      "MIT study highlights intermittency challenges in high-renewable grids without adequate storage.",
    neutralSummary:
      "Technical challenges exist but are being addressed through various storage and grid management solutions.",
    source: {
      name: "MIT Energy Initiative",
      url: "https://energy.mit.edu/research/",
      type: "study",
    },
    credibilityScore: 94,
    addedAt: "2024-01-15T11:15:00Z",
  },
];

// Mock Speaker Times
export const mockSpeakerTimes: SpeakerTime[] = [
  {
    speakerId: "speaker-1",
    speaker: mockSpeakers[0],
    totalSeconds: 342,
    allocatedSeconds: 600,
  },
  {
    speakerId: "speaker-2",
    speaker: mockSpeakers[1],
    totalSeconds: 298,
    allocatedSeconds: 600,
  },
];

// Mock Topics
export const mockTopics: Topic[] = [
  {
    id: "topic-1",
    title: "Renewable Energy Feasibility",
    status: "current",
    allocatedMinutes: 15,
    elapsedMinutes: 11,
  },
  {
    id: "topic-2",
    title: "Economic Impact of Energy Transition",
    status: "upcoming",
    allocatedMinutes: 15,
    elapsedMinutes: 0,
  },
  {
    id: "topic-3",
    title: "Nuclear Energy Role",
    status: "upcoming",
    allocatedMinutes: 10,
    elapsedMinutes: 0,
  },
  {
    id: "topic-4",
    title: "Policy Recommendations",
    status: "upcoming",
    allocatedMinutes: 10,
    elapsedMinutes: 0,
  },
];

// Mock Intervention Prompts
export const mockInterventionPrompts: InterventionPrompt[] = [
  {
    id: "prompt-1",
    type: "alert",
    message: "Claim about grid stability needs fact-checking - disputed by recent research",
    priority: "high",
    relatedClaimId: "claim-3",
  },
  {
    id: "prompt-2",
    type: "suggestion",
    message: "Consider asking for specific examples of grid stability solutions",
    priority: "medium",
    relatedClaimId: "claim-3",
  },
  {
    id: "prompt-3",
    type: "info",
    message: "Topic time nearly exhausted - 4 minutes remaining",
    priority: "low",
  },
];

// Moderator Quick Actions
export const moderatorActions: ModeratorActionConfig[] = [
  {
    id: "action-clarify",
    label: "Request Clarification",
    icon: "clarify",
    variant: "default",
    description: "Ask speaker to elaborate on their last point",
  },
  {
    id: "action-factcheck",
    label: "Fact-check Queue",
    icon: "factcheck",
    variant: "primary",
    description: "Add claim to fact-checking queue",
  },
  {
    id: "action-time",
    label: "Time Warning",
    icon: "time",
    variant: "warning",
    description: "Notify speaker of remaining time",
  },
  {
    id: "action-next",
    label: "Next Topic",
    icon: "next",
    variant: "default",
    description: "Move discussion to the next topic",
  },
];

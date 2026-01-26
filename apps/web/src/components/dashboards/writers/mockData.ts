// ============================================================================
// Script Studio - Mock Data
// Sample screenplay data for development and testing
// ============================================================================

import type {
  ScriptElement,
  ScriptInsertData,
  Beat,
  Note,
  Contributor,
  ScriptDocument,
} from "./types";

// ============================================================================
// Contributors
// ============================================================================

export const MOCK_CONTRIBUTORS: Contributor[] = [
  {
    id: "contrib-1",
    name: "Sarah Mitchell",
    role: "writer",
    color: "#8B5CF6", // purple
  },
  {
    id: "contrib-2",
    name: "Marcus Chen",
    role: "editor",
    color: "#00D4C7", // teal
  },
  {
    id: "contrib-3",
    name: "AI Assistant",
    role: "ai-assistant",
    color: "#2EE59D", // success green
  },
  {
    id: "contrib-4",
    name: "Jordan Hayes",
    role: "producer",
    color: "#FBBF24", // warning yellow
  },
];

// ============================================================================
// Script Elements
// ============================================================================

export const MOCK_SCRIPT_ELEMENTS: ScriptElement[] = [
  {
    id: "elem-1",
    type: "scene-heading",
    content: "INT. TECH STARTUP OFFICE - DAY",
  },
  {
    id: "elem-2",
    type: "action",
    content:
      "A sprawling open floor plan filled with standing desks, neon signs, and the constant hum of productivity. MAYA CHEN (32), sharp eyes behind designer frames, weaves through the chaos toward her corner office.",
  },
  {
    id: "elem-3",
    type: "character",
    content: "MAYA",
  },
  {
    id: "elem-4",
    type: "dialogue",
    content:
      "Tell me we didn't just lose the Meridian account.",
    speakerLabel: "MAYA",
  },
  {
    id: "elem-5",
    type: "action",
    content:
      "ALEX RIVERA (28), her right hand, spins in his chair to face her. His expression says everything.",
  },
  {
    id: "elem-6",
    type: "character",
    content: "ALEX",
  },
  {
    id: "elem-7",
    type: "parenthetical",
    content: "(wincing)",
  },
  {
    id: "elem-8",
    type: "dialogue",
    content:
      "Define 'lose.' If you mean they're exploring other options while questioning our entire methodology... then yes.",
    speakerLabel: "ALEX",
  },
  // Insert suggestion from AI
  {
    id: "elem-9",
    type: "action",
    content:
      "Maya stops mid-stride. Her jaw tightens. She takes a measured breath before responding.",
    isInsert: true,
    insertStatus: "pending",
    proposedBy: "contrib-3",
    timestamp: new Date("2024-01-15T10:30:00"),
  },
  {
    id: "elem-10",
    type: "character",
    content: "MAYA",
  },
  {
    id: "elem-11",
    type: "dialogue",
    content:
      "Get me the pitch deck. The original one, not the sanitized version. And coffee. Lots of coffee.",
    speakerLabel: "MAYA",
  },
  {
    id: "elem-12",
    type: "transition",
    content: "CUT TO:",
  },
  {
    id: "elem-13",
    type: "scene-heading",
    content: "INT. MAYA'S OFFICE - CONTINUOUS",
  },
  {
    id: "elem-14",
    type: "action",
    content:
      "Glass walls reveal the bustling floor below. Maya drops into her ergonomic chair, pulling up holographic displays with practiced gestures.",
  },
  // Another insert suggestion
  {
    id: "elem-15",
    type: "character",
    content: "MAYA",
    isInsert: true,
    insertStatus: "pending",
    proposedBy: "contrib-3",
  },
  {
    id: "elem-16",
    type: "parenthetical",
    content: "(to herself)",
    isInsert: true,
    insertStatus: "pending",
    proposedBy: "contrib-3",
  },
  {
    id: "elem-17",
    type: "dialogue",
    content: "Three years building this. I'm not letting it slip away now.",
    speakerLabel: "MAYA",
    isInsert: true,
    insertStatus: "pending",
    proposedBy: "contrib-3",
    timestamp: new Date("2024-01-15T10:35:00"),
  },
  {
    id: "elem-18",
    type: "action",
    content:
      "Her phone BUZZES. She glances at the screen - an unknown number. After a moment's hesitation, she answers.",
  },
  {
    id: "elem-19",
    type: "character",
    content: "MAYA",
  },
  {
    id: "elem-20",
    type: "dialogue",
    content: "Maya Chen.",
    speakerLabel: "MAYA",
  },
  {
    id: "elem-21",
    type: "character",
    content: "MYSTERIOUS VOICE (V.O.)",
  },
  {
    id: "elem-22",
    type: "dialogue",
    content:
      "Ms. Chen. We've been watching your company with great interest. I believe we can help each other.",
    speakerLabel: "MYSTERIOUS VOICE",
  },
];

// ============================================================================
// Script Inserts
// ============================================================================

export const MOCK_INSERTS: ScriptInsertData[] = [
  {
    id: "insert-1",
    elements: [MOCK_SCRIPT_ELEMENTS[8]], // The action line insert
    proposedBy: "contrib-3",
    proposedAt: new Date("2024-01-15T10:30:00"),
    status: "pending",
    reason: "Adding emotional beat to show Maya's reaction before she speaks",
  },
  {
    id: "insert-2",
    elements: [
      MOCK_SCRIPT_ELEMENTS[14],
      MOCK_SCRIPT_ELEMENTS[15],
      MOCK_SCRIPT_ELEMENTS[16],
    ], // The self-dialogue insert
    proposedBy: "contrib-3",
    proposedAt: new Date("2024-01-15T10:35:00"),
    status: "pending",
    reason: "Character moment revealing Maya's internal stakes and determination",
  },
];

// ============================================================================
// Beats
// ============================================================================

export const MOCK_BEATS: Beat[] = [
  // Act 1
  {
    id: "beat-1",
    title: "Opening Image",
    summary: "Maya navigating the chaotic startup office, establishing her world",
    act: 1,
    order: 1,
    status: "complete",
    sceneNumber: "1",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "beat-2",
    title: "Catalyst",
    summary: "Meridian account crisis threatens everything Maya built",
    act: 1,
    order: 2,
    status: "in-progress",
    sceneNumber: "2",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "beat-3",
    title: "Mysterious Call",
    summary: "Unknown caller offers help - opportunity or threat?",
    act: 1,
    order: 3,
    status: "in-progress",
    sceneNumber: "3",
    createdAt: new Date("2024-01-11"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "beat-4",
    title: "Debate",
    summary: "Maya weighs risks of accepting mysterious help",
    act: 1,
    order: 4,
    status: "draft",
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-12"),
  },
  // Act 2
  {
    id: "beat-5",
    title: "Break into Two",
    summary: "Maya takes the meeting, entering unfamiliar territory",
    act: 2,
    order: 1,
    status: "draft",
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13"),
  },
  {
    id: "beat-6",
    title: "B Story Introduction",
    summary: "Alex's loyalty questioned; corporate espionage subplot begins",
    act: 2,
    order: 2,
    status: "draft",
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13"),
  },
  {
    id: "beat-7",
    title: "Fun and Games",
    summary: "Maya and mysterious allies execute unconventional strategy",
    act: 2,
    order: 3,
    status: "draft",
    notes: "Need more conflict here",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "beat-8",
    title: "Midpoint",
    summary: "False victory - deal seems secured but at hidden cost",
    act: 2,
    order: 4,
    status: "draft",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
  },
  // Act 3
  {
    id: "beat-9",
    title: "All Is Lost",
    summary: "Betrayal revealed; Maya loses everything",
    act: 3,
    order: 1,
    status: "draft",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "beat-10",
    title: "Dark Night of the Soul",
    summary: "Maya confronts her compromises and who she's become",
    act: 3,
    order: 2,
    status: "draft",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "beat-11",
    title: "Finale",
    summary: "Maya reclaims her vision on her own terms",
    act: 3,
    order: 3,
    status: "draft",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
];

// ============================================================================
// Notes
// ============================================================================

export const MOCK_NOTES: Note[] = [
  {
    id: "note-1",
    title: "Maya's motivation unclear",
    content:
      "Why is Maya so attached to this company? Need flashback or dialogue to establish personal stakes beyond professional success.",
    category: "open-loop",
    priority: "high",
    proposedBy: "contrib-2",
    isResolved: false,
    createdAt: new Date("2024-01-14T09:00:00"),
    updatedAt: new Date("2024-01-14T09:00:00"),
    relatedBeatId: "beat-2",
  },
  {
    id: "note-2",
    title: "Alex character development",
    content:
      "Alex needs more dimension. Currently reads as generic sidekick. Consider giving him conflicting loyalties or personal agenda.",
    category: "character",
    priority: "medium",
    proposedBy: "contrib-1",
    isResolved: false,
    createdAt: new Date("2024-01-13T14:30:00"),
    updatedAt: new Date("2024-01-15T10:00:00"),
    tags: ["character", "alex", "b-story"],
  },
  {
    id: "note-3",
    title: "AI suggested internal monologue",
    content:
      "Added self-dialogue for Maya in Scene 3 to reveal internal stakes. Review for voice authenticity.",
    category: "attribution",
    priority: "low",
    proposedBy: "contrib-3",
    isResolved: false,
    createdAt: new Date("2024-01-15T10:35:00"),
    updatedAt: new Date("2024-01-15T10:35:00"),
    relatedSceneId: "elem-15",
  },
  {
    id: "note-4",
    title: "Meridian account payoff",
    content:
      "Setup the Meridian crisis but never fully resolved. Need scene in Act 3 showing aftermath.",
    category: "open-loop",
    priority: "urgent",
    proposedBy: "contrib-4",
    assignedTo: "contrib-1",
    isResolved: false,
    createdAt: new Date("2024-01-15T11:00:00"),
    updatedAt: new Date("2024-01-15T11:00:00"),
    relatedBeatId: "beat-11",
  },
  {
    id: "note-5",
    title: "Mysterious caller identity",
    content:
      "Track all hints about the mysterious caller. Currently: knows Maya's work, has resources, speaks with authority. Need breadcrumbs leading to reveal.",
    category: "open-loop",
    priority: "high",
    proposedBy: "contrib-1",
    isResolved: false,
    createdAt: new Date("2024-01-15T08:00:00"),
    updatedAt: new Date("2024-01-15T12:00:00"),
    relatedBeatId: "beat-3",
    tags: ["mystery", "antagonist", "plot"],
  },
  {
    id: "note-6",
    title: "Office setting research",
    content:
      "Confirmed: standing desks, holographic displays, neon aesthetic aligns with 2030s tech startup vibe established in series bible.",
    category: "general",
    priority: "low",
    proposedBy: "contrib-2",
    isResolved: true,
    createdAt: new Date("2024-01-12T16:00:00"),
    updatedAt: new Date("2024-01-13T09:00:00"),
  },
];

// ============================================================================
// Complete Script Document
// ============================================================================

export const MOCK_SCRIPT_DOCUMENT: ScriptDocument = {
  id: "doc-1",
  title: "SILICON SHADOWS",
  subtitle: "Pilot Episode - 'The Offer'",
  version: "1.3",
  elements: MOCK_SCRIPT_ELEMENTS,
  beats: MOCK_BEATS,
  notes: MOCK_NOTES,
  contributors: MOCK_CONTRIBUTORS,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-15"),
};

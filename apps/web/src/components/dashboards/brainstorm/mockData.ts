// Mock data for the Mind Map Room brainstorming dashboard

import type {
  MindMapNode,
  Idea,
  ActionItemData,
  BrainstormSession,
} from "./types";

// Create a date helper for mock data
const hoursAgo = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
};

const minutesAgo = (minutes: number): Date => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date;
};

const daysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Mock mind map nodes
export const mockNodes: MindMapNode[] = [
  // Central node
  {
    id: "node-1",
    text: "AI Livestream Assistant",
    parentId: null,
    children: ["node-2", "node-3", "node-4", "node-5"],
    x: 400,
    y: 300,
    category: "central",
    isExpanded: true,
    isRoot: true,
  },
  // First level - Features
  {
    id: "node-2",
    text: "Real-time Chat Analysis",
    parentId: "node-1",
    children: ["node-6", "node-7"],
    x: 150,
    y: 150,
    category: "feature",
    isExpanded: true,
    isRoot: false,
  },
  {
    id: "node-3",
    text: "Content Suggestions",
    parentId: "node-1",
    children: ["node-8"],
    x: 650,
    y: 150,
    category: "feature",
    isExpanded: true,
    isRoot: false,
  },
  {
    id: "node-4",
    text: "Audience Engagement",
    parentId: "node-1",
    children: ["node-9", "node-10"],
    x: 150,
    y: 450,
    category: "feature",
    isExpanded: true,
    isRoot: false,
  },
  {
    id: "node-5",
    text: "Analytics Dashboard",
    parentId: "node-1",
    children: [],
    x: 650,
    y: 450,
    category: "feature",
    isExpanded: true,
    isRoot: false,
  },
  // Second level
  {
    id: "node-6",
    text: "Sentiment tracking?",
    parentId: "node-2",
    children: [],
    x: 50,
    y: 80,
    category: "question",
    isExpanded: true,
    isRoot: false,
  },
  {
    id: "node-7",
    text: "Toxic comment filter",
    parentId: "node-2",
    children: [],
    x: 250,
    y: 80,
    category: "solution",
    isExpanded: true,
    isRoot: false,
  },
  {
    id: "node-8",
    text: "Topic detection slow",
    parentId: "node-3",
    children: [],
    x: 700,
    y: 80,
    category: "problem",
    isExpanded: true,
    isRoot: false,
  },
  {
    id: "node-9",
    text: "Poll automation",
    parentId: "node-4",
    children: [],
    x: 50,
    y: 520,
    category: "action",
    isExpanded: true,
    isRoot: false,
  },
  {
    id: "node-10",
    text: "Highlight moments",
    parentId: "node-4",
    children: [],
    x: 250,
    y: 520,
    category: "solution",
    isExpanded: true,
    isRoot: false,
  },
];

// Mock ideas from brainstorming session
export const mockIdeas: Idea[] = [
  {
    id: "idea-1",
    text: "What if we added automatic clip generation for viral moments?",
    speaker: "Sarah Chen",
    timestamp: minutesAgo(2),
    isStarred: true,
    isAddedToMap: false,
    tags: ["feature", "automation"],
  },
  {
    id: "idea-2",
    text: "The sentiment analysis could trigger alerts for negative spirals in chat",
    speaker: "Marcus Johnson",
    timestamp: minutesAgo(5),
    isStarred: false,
    isAddedToMap: true,
    tags: ["feature", "moderation"],
  },
  {
    id: "idea-3",
    text: "We should integrate with OBS for seamless scene switching",
    speaker: "Alex Rivera",
    timestamp: minutesAgo(8),
    isStarred: true,
    isAddedToMap: false,
    tags: ["integration", "streaming"],
  },
  {
    id: "idea-4",
    text: "Can we use GPT-4 for generating witty responses to common questions?",
    speaker: "Sarah Chen",
    timestamp: minutesAgo(12),
    isStarred: false,
    isAddedToMap: false,
    tags: ["AI", "engagement"],
  },
  {
    id: "idea-5",
    text: "Revenue tracking - show sponsorship ROI during streams",
    speaker: "Jordan Lee",
    timestamp: minutesAgo(15),
    isStarred: false,
    isAddedToMap: true,
    tags: ["analytics", "monetization"],
  },
  {
    id: "idea-6",
    text: "Multi-language support for international audiences",
    speaker: "Marcus Johnson",
    timestamp: minutesAgo(18),
    isStarred: true,
    isAddedToMap: false,
    tags: ["feature", "i18n"],
  },
  {
    id: "idea-7",
    text: "Raid coordination tools for community building",
    speaker: "Alex Rivera",
    timestamp: minutesAgo(22),
    isStarred: false,
    isAddedToMap: false,
    tags: ["community", "engagement"],
  },
  {
    id: "idea-8",
    text: "AI-powered thumbnail generator for VODs",
    speaker: "Sarah Chen",
    timestamp: minutesAgo(28),
    isStarred: true,
    isAddedToMap: false,
    tags: ["AI", "content"],
  },
  {
    id: "idea-9",
    text: "Predictive analytics for optimal stream times",
    speaker: "Jordan Lee",
    timestamp: minutesAgo(32),
    isStarred: false,
    isAddedToMap: true,
    tags: ["analytics", "scheduling"],
  },
  {
    id: "idea-10",
    text: "Collaboration mode for co-streaming with AI assistance",
    speaker: "Marcus Johnson",
    timestamp: minutesAgo(40),
    isStarred: false,
    isAddedToMap: false,
    tags: ["feature", "collaboration"],
  },
];

// Mock action items
export const mockActionItems: ActionItemData[] = [
  // All Ideas column
  {
    id: "action-1",
    text: "Research existing chat sentiment APIs",
    owner: null,
    dueDate: null,
    isComplete: false,
    column: "all",
    priority: "medium",
    createdAt: hoursAgo(2),
  },
  {
    id: "action-2",
    text: "Competitor analysis for clip generation",
    owner: null,
    dueDate: null,
    isComplete: false,
    column: "all",
    priority: "low",
    createdAt: hoursAgo(3),
  },
  {
    id: "action-3",
    text: "OBS WebSocket API documentation review",
    owner: null,
    dueDate: null,
    isComplete: false,
    column: "all",
    priority: "medium",
    createdAt: hoursAgo(4),
  },
  // Shortlist column
  {
    id: "action-4",
    text: "Prototype toxic comment detector",
    owner: "Alex Rivera",
    dueDate: daysFromNow(5),
    isComplete: false,
    column: "shortlist",
    priority: "high",
    createdAt: hoursAgo(5),
  },
  {
    id: "action-5",
    text: "Design poll automation UI mockups",
    owner: "Sarah Chen",
    dueDate: daysFromNow(3),
    isComplete: false,
    column: "shortlist",
    priority: "medium",
    createdAt: hoursAgo(6),
  },
  {
    id: "action-6",
    text: "Evaluate GPT-4 API costs for responses",
    owner: "Jordan Lee",
    dueDate: daysFromNow(7),
    isComplete: false,
    column: "shortlist",
    priority: "high",
    createdAt: hoursAgo(8),
  },
  // Action Items column
  {
    id: "action-7",
    text: "Set up Twitch OAuth integration",
    owner: "Marcus Johnson",
    dueDate: daysFromNow(2),
    isComplete: false,
    column: "action",
    priority: "high",
    createdAt: hoursAgo(10),
  },
  {
    id: "action-8",
    text: "Create sentiment analysis MVP",
    owner: "Alex Rivera",
    dueDate: daysFromNow(4),
    isComplete: false,
    column: "action",
    priority: "high",
    createdAt: hoursAgo(12),
  },
  {
    id: "action-9",
    text: "Draft technical spec for real-time chat",
    owner: "Jordan Lee",
    dueDate: daysFromNow(1),
    isComplete: true,
    column: "action",
    priority: "high",
    createdAt: hoursAgo(24),
  },
];

// Combined mock session
export const mockBrainstormSession: BrainstormSession = {
  id: "session-1",
  topic: "AI Livestream Assistant - Feature Brainstorm",
  createdAt: hoursAgo(1),
  nodes: mockNodes,
  ideas: mockIdeas,
  actionItems: mockActionItems,
};

// Speaker colors for consistent styling
export const speakerColors: Record<string, string> = {
  "Sarah Chen": "text-teal",
  "Marcus Johnson": "text-purple",
  "Alex Rivera": "text-success",
  "Jordan Lee": "text-warning",
};

// Mind Map Room - Brainstorming Workflow Dashboard
// Export all components for the brainstorming dashboard

// Main dashboard layout
export { MindMapRoom } from "./MindMapRoom";
export type { MindMapRoomProps } from "./MindMapRoom";

// Mind map components
export { MindMapCanvas } from "./MindMapCanvas";
export type { MindMapCanvasProps } from "./MindMapCanvas";

export { IdeaNode } from "./IdeaNode";
export type { IdeaNodeProps } from "./IdeaNode";

// Idea stream components
export { IdeaIntake } from "./IdeaIntake";
export type { IdeaIntakeProps } from "./IdeaIntake";

export { IdeaCard } from "./IdeaCard";
export type { IdeaCardProps } from "./IdeaCard";

// Decision funnel components
export { DecisionFunnel } from "./DecisionFunnel";
export type { DecisionFunnelProps } from "./DecisionFunnel";

export { ActionItem } from "./ActionItem";
export type { ActionItemProps } from "./ActionItem";

// Types
export type {
  MindMapNode,
  NodeCategory,
  Idea,
  FunnelColumn,
  ActionItemData,
  BrainstormSession,
} from "./types";

export { categoryColors } from "./types";

// Mock data (for development/demo purposes)
export {
  mockNodes,
  mockIdeas,
  mockActionItems,
  mockBrainstormSession,
  speakerColors,
} from "./mockData";

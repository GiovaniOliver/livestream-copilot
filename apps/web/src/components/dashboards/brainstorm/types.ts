// Types for the Mind Map Room brainstorming dashboard

export interface MindMapNode {
  id: string;
  text: string;
  parentId: string | null;
  children: string[];
  x: number;
  y: number;
  category: NodeCategory;
  isExpanded: boolean;
  isRoot: boolean;
  isEureka?: boolean;
  capturedAt?: Date;
  aiGenerated?: boolean;
}

// AI Agent Action Types for Mind Map Room
export type MindMapActionId =
  | "mind_map.capture_idea"
  | "mind_map.cluster_ideas"
  | "mind_map.find_connections"
  | "mind_map.expand_idea"
  | "mind_map.prioritize_ideas"
  | "mind_map.extract_action_items"
  | "mind_map.detect_duplicate"
  | "mind_map.synthesize_ideas"
  | "mind_map.generate_variations"
  | "mind_map.identify_eureka"
  | "mind_map.categorize_idea"
  | "mind_map.generate_session_summary";

export type ActionTriggerType = "manual" | "auto" | "both";
export type ActionState = "idle" | "queued" | "processing" | "success" | "failed" | "cancelled" | "reviewing";
export type TokenEstimate = "low" | "medium" | "high";

export interface MindMapAction {
  actionId: MindMapActionId;
  label: string;
  description: string;
  triggerType: ActionTriggerType;
  autoTriggerCondition?: string;
  icon: string;
  estimatedTokens: TokenEstimate;
  cooldownMs?: number;
  requiresSelection?: boolean;
}

export interface ActionExecution {
  id: string;
  actionId: MindMapActionId;
  state: ActionState;
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}

export interface IdeaConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  connectionType: "related" | "derived" | "contradicts" | "supports";
  strength: number; // 0-1
  aiGenerated: boolean;
}

export type NodeCategory =
  | "central"
  | "feature"
  | "problem"
  | "solution"
  | "question"
  | "action";

export interface Idea {
  id: string;
  text: string;
  speaker: string;
  timestamp: Date;
  isStarred: boolean;
  isAddedToMap: boolean;
  tags: string[];
}

export type FunnelColumn = "all" | "shortlist" | "action";

export interface ActionItemData {
  id: string;
  text: string;
  owner: string | null;
  dueDate: Date | null;
  isComplete: boolean;
  column: FunnelColumn;
  priority: "low" | "medium" | "high";
  createdAt: Date;
}

export interface BrainstormSession {
  id: string;
  topic: string;
  createdAt: Date;
  nodes: MindMapNode[];
  ideas: Idea[];
  actionItems: ActionItemData[];
}

// Node category styling
export const categoryColors: Record<NodeCategory, { bg: string; border: string; text: string }> = {
  central: {
    bg: "bg-gradient-to-br from-purple/30 to-teal/20",
    border: "border-purple",
    text: "text-text",
  },
  feature: {
    bg: "bg-teal/20",
    border: "border-teal/50",
    text: "text-teal-100",
  },
  problem: {
    bg: "bg-error/20",
    border: "border-error/50",
    text: "text-red-200",
  },
  solution: {
    bg: "bg-success/20",
    border: "border-success/50",
    text: "text-green-200",
  },
  question: {
    bg: "bg-warning/20",
    border: "border-warning/50",
    text: "text-yellow-200",
  },
  action: {
    bg: "bg-purple/20",
    border: "border-purple/50",
    text: "text-purple-200",
  },
};

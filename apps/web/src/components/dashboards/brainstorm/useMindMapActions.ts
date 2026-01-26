"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  MindMapAction,
  MindMapActionId,
  ActionExecution,
  ActionState,
  MindMapNode,
  Idea,
  ActionItemData,
  IdeaConnection,
} from "./types";

// Define all Mind Map actions based on the AI Agent Actions spec
export const MIND_MAP_ACTIONS: MindMapAction[] = [
  {
    actionId: "mind_map.capture_idea",
    label: "Capture Idea",
    description: "Extracts new ideas from discussion",
    triggerType: "auto",
    autoTriggerCondition: "When new concept language detected",
    icon: "lightbulb",
    estimatedTokens: "low",
    cooldownMs: 15000,
  },
  {
    actionId: "mind_map.cluster_ideas",
    label: "Cluster Ideas",
    description: "Groups related ideas together",
    triggerType: "both",
    icon: "grid",
    estimatedTokens: "medium",
    cooldownMs: 60000,
  },
  {
    actionId: "mind_map.find_connections",
    label: "Find Connections",
    description: "Identifies relationships between ideas",
    triggerType: "both",
    icon: "link",
    estimatedTokens: "medium",
    cooldownMs: 60000,
  },
  {
    actionId: "mind_map.expand_idea",
    label: "Expand Idea",
    description: "Develops an idea with sub-points",
    triggerType: "manual",
    icon: "expand",
    estimatedTokens: "medium",
    requiresSelection: true,
  },
  {
    actionId: "mind_map.prioritize_ideas",
    label: "Prioritize Ideas",
    description: "Ranks ideas by criteria",
    triggerType: "manual",
    icon: "sort",
    estimatedTokens: "medium",
  },
  {
    actionId: "mind_map.extract_action_items",
    label: "Extract Actions",
    description: "Converts ideas to action items",
    triggerType: "both",
    icon: "checklist",
    estimatedTokens: "medium",
  },
  {
    actionId: "mind_map.detect_duplicate",
    label: "Detect Duplicate",
    description: "Flags similar/duplicate ideas",
    triggerType: "auto",
    autoTriggerCondition: "When new idea captured (similarity check)",
    icon: "copy",
    estimatedTokens: "low",
    cooldownMs: 5000,
  },
  {
    actionId: "mind_map.synthesize_ideas",
    label: "Synthesize Ideas",
    description: "Combines ideas into new concept",
    triggerType: "manual",
    icon: "merge",
    estimatedTokens: "medium",
    requiresSelection: true,
  },
  {
    actionId: "mind_map.generate_variations",
    label: "Generate Variations",
    description: "Creates variations of an idea",
    triggerType: "manual",
    icon: "shuffle",
    estimatedTokens: "medium",
    requiresSelection: true,
  },
  {
    actionId: "mind_map.identify_eureka",
    label: "Identify Eureka",
    description: "Flags breakthrough moments",
    triggerType: "auto",
    autoTriggerCondition: "When excitement/breakthrough language detected",
    icon: "star",
    estimatedTokens: "low",
    cooldownMs: 30000,
  },
  {
    actionId: "mind_map.categorize_idea",
    label: "Categorize Idea",
    description: "Assigns category to new idea",
    triggerType: "auto",
    autoTriggerCondition: "Immediately after idea capture",
    icon: "tag",
    estimatedTokens: "low",
    cooldownMs: 5000,
  },
  {
    actionId: "mind_map.generate_session_summary",
    label: "Session Summary",
    description: "Creates overview of brainstorm session",
    triggerType: "manual",
    icon: "document",
    estimatedTokens: "high",
  },
];

export interface UseMindMapActionsOptions {
  nodes: MindMapNode[];
  ideas: Idea[];
  actionItems: ActionItemData[];
  onNodesChange?: (nodes: MindMapNode[]) => void;
  onIdeasChange?: (ideas: Idea[]) => void;
  onActionItemsChange?: (items: ActionItemData[]) => void;
  onConnectionsChange?: (connections: IdeaConnection[]) => void;
}

export interface UseMindMapActionsReturn {
  actions: MindMapAction[];
  executions: ActionExecution[];
  isAutoCaptureEnabled: boolean;
  isProcessing: boolean;
  activeAction: MindMapActionId | null;
  cooldowns: Map<MindMapActionId, number>;
  connections: IdeaConnection[];
  sessionSummary: SessionSummary | null;

  // Actions
  executeAction: (actionId: MindMapActionId, context?: ActionContext) => Promise<void>;
  cancelAction: (executionId: string) => void;
  toggleAutoCapture: () => void;
  generateSessionSummary: () => Promise<SessionSummary>;
  clearExecutions: () => void;
}

export interface ActionContext {
  selectedNodeIds?: string[];
  selectedIdeaIds?: string[];
  transcriptSegment?: string;
  customCriteria?: string;
}

export interface SessionSummary {
  id: string;
  generatedAt: Date;
  totalIdeas: number;
  totalNodes: number;
  totalConnections: number;
  totalActionItems: number;
  keyThemes: string[];
  topIdeas: { id: string; text: string; reason: string }[];
  clusters: { name: string; ideaCount: number }[];
  eurekaCount: number;
  nextSteps: string[];
}

export function useMindMapActions({
  nodes,
  ideas,
  actionItems,
  onNodesChange,
  onIdeasChange,
  onActionItemsChange,
  onConnectionsChange,
}: UseMindMapActionsOptions): UseMindMapActionsReturn {
  const [executions, setExecutions] = useState<ActionExecution[]>([]);
  const [isAutoCaptureEnabled, setIsAutoCaptureEnabled] = useState(true);
  const [activeAction, setActiveAction] = useState<MindMapActionId | null>(null);
  const [cooldowns, setCooldowns] = useState<Map<MindMapActionId, number>>(new Map());
  const [connections, setConnections] = useState<IdeaConnection[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  const cooldownTimers = useRef<Map<MindMapActionId, NodeJS.Timeout>>(new Map());

  // Check if any action is currently processing
  const isProcessing = executions.some(
    (e) => e.state === "processing" || e.state === "queued"
  );

  // Start cooldown for an action
  const startCooldown = useCallback((actionId: MindMapActionId, durationMs: number) => {
    const existingTimer = cooldownTimers.current.get(actionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    setCooldowns((prev) => new Map(prev).set(actionId, Date.now() + durationMs));

    const timer = setTimeout(() => {
      setCooldowns((prev) => {
        const next = new Map(prev);
        next.delete(actionId);
        return next;
      });
      cooldownTimers.current.delete(actionId);
    }, durationMs);

    cooldownTimers.current.set(actionId, timer);
  }, []);

  // Execute an action
  const executeAction = useCallback(
    async (actionId: MindMapActionId, context?: ActionContext) => {
      const action = MIND_MAP_ACTIONS.find((a) => a.actionId === actionId);
      if (!action) return;

      // Check cooldown
      const cooldownEnd = cooldowns.get(actionId);
      if (cooldownEnd && Date.now() < cooldownEnd) {
        console.log(`Action ${actionId} is on cooldown`);
        return;
      }

      // Check if selection is required
      if (action.requiresSelection && (!context?.selectedNodeIds?.length && !context?.selectedIdeaIds?.length)) {
        console.log(`Action ${actionId} requires a selection`);
        return;
      }

      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const execution: ActionExecution = {
        id: executionId,
        actionId,
        state: "processing",
        startedAt: new Date(),
      };

      setExecutions((prev) => [...prev, execution]);
      setActiveAction(actionId);

      try {
        // Simulate AI processing (in production, this would call actual AI service)
        await simulateActionExecution(actionId, context, {
          nodes,
          ideas,
          actionItems,
          onNodesChange,
          onIdeasChange,
          onActionItemsChange,
          onConnectionsChange: (newConnections) => {
            setConnections((prev) => [...prev, ...newConnections]);
            onConnectionsChange?.(newConnections);
          },
        });

        // Update execution state
        setExecutions((prev) =>
          prev.map((e) =>
            e.id === executionId
              ? { ...e, state: "success" as ActionState, completedAt: new Date() }
              : e
          )
        );

        // Start cooldown if applicable
        if (action.cooldownMs) {
          startCooldown(actionId, action.cooldownMs);
        }
      } catch (error) {
        setExecutions((prev) =>
          prev.map((e) =>
            e.id === executionId
              ? {
                  ...e,
                  state: "failed" as ActionState,
                  completedAt: new Date(),
                  error: error instanceof Error ? error.message : "Unknown error",
                }
              : e
          )
        );
      } finally {
        setActiveAction(null);
      }
    },
    [cooldowns, nodes, ideas, actionItems, onNodesChange, onIdeasChange, onActionItemsChange, onConnectionsChange, startCooldown]
  );

  // Cancel an action
  const cancelAction = useCallback((executionId: string) => {
    setExecutions((prev) =>
      prev.map((e) =>
        e.id === executionId && (e.state === "queued" || e.state === "processing")
          ? { ...e, state: "cancelled" as ActionState, completedAt: new Date() }
          : e
      )
    );
  }, []);

  // Toggle auto-capture
  const toggleAutoCapture = useCallback(() => {
    setIsAutoCaptureEnabled((prev) => !prev);
  }, []);

  // Generate session summary
  const generateSessionSummary = useCallback(async (): Promise<SessionSummary> => {
    const summary: SessionSummary = {
      id: `summary-${Date.now()}`,
      generatedAt: new Date(),
      totalIdeas: ideas.length,
      totalNodes: nodes.length,
      totalConnections: connections.length,
      totalActionItems: actionItems.filter((a) => a.column === "action").length,
      keyThemes: extractKeyThemes(ideas, nodes),
      topIdeas: ideas
        .filter((i) => i.isStarred)
        .slice(0, 5)
        .map((i) => ({
          id: i.id,
          text: i.text,
          reason: "Starred by participants",
        })),
      clusters: generateClusters(nodes),
      eurekaCount: nodes.filter((n) => n.isEureka).length,
      nextSteps: generateNextSteps(actionItems),
    };

    setSessionSummary(summary);
    return summary;
  }, [ideas, nodes, connections, actionItems]);

  // Clear executions
  const clearExecutions = useCallback(() => {
    setExecutions([]);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      cooldownTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return {
    actions: MIND_MAP_ACTIONS,
    executions,
    isAutoCaptureEnabled,
    isProcessing,
    activeAction,
    cooldowns,
    connections,
    sessionSummary,
    executeAction,
    cancelAction,
    toggleAutoCapture,
    generateSessionSummary,
    clearExecutions,
  };
}

// Helper functions for simulating AI actions
async function simulateActionExecution(
  actionId: MindMapActionId,
  context: ActionContext | undefined,
  state: {
    nodes: MindMapNode[];
    ideas: Idea[];
    actionItems: ActionItemData[];
    onNodesChange?: (nodes: MindMapNode[]) => void;
    onIdeasChange?: (ideas: Idea[]) => void;
    onActionItemsChange?: (items: ActionItemData[]) => void;
    onConnectionsChange?: (connections: IdeaConnection[]) => void;
  }
): Promise<void> {
  // Simulate processing delay based on token estimate
  const action = MIND_MAP_ACTIONS.find((a) => a.actionId === actionId);
  const delay = action?.estimatedTokens === "high" ? 3000 : action?.estimatedTokens === "medium" ? 2000 : 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  switch (actionId) {
    case "mind_map.capture_idea": {
      // Simulate capturing a new idea
      const newIdea: Idea = {
        id: `idea-${Date.now()}`,
        text: context?.transcriptSegment || "New captured idea from discussion",
        speaker: "AI Assistant",
        timestamp: new Date(),
        isStarred: false,
        isAddedToMap: false,
        tags: ["auto-captured"],
      };
      state.onIdeasChange?.([...state.ideas, newIdea]);
      break;
    }

    case "mind_map.find_connections": {
      // Simulate finding connections between nodes
      const newConnections: IdeaConnection[] = [];
      if (state.nodes.length >= 2) {
        const randomNode1 = state.nodes[Math.floor(Math.random() * state.nodes.length)];
        const randomNode2 = state.nodes.find((n) => n.id !== randomNode1.id);
        if (randomNode2) {
          newConnections.push({
            id: `conn-${Date.now()}`,
            fromNodeId: randomNode1.id,
            toNodeId: randomNode2.id,
            connectionType: "related",
            strength: Math.random() * 0.5 + 0.5,
            aiGenerated: true,
          });
        }
      }
      state.onConnectionsChange?.(newConnections);
      break;
    }

    case "mind_map.expand_idea": {
      // Simulate expanding an idea with sub-points
      const selectedNodeId = context?.selectedNodeIds?.[0];
      if (selectedNodeId) {
        const parentNode = state.nodes.find((n) => n.id === selectedNodeId);
        if (parentNode) {
          const subPoints = [
            { text: "Implementation approach", category: "solution" as const },
            { text: "Potential challenges", category: "problem" as const },
            { text: "Resource requirements", category: "question" as const },
          ];

          const newNodes: MindMapNode[] = subPoints.map((sp, index) => ({
            id: `node-${Date.now()}-${index}`,
            text: sp.text,
            parentId: selectedNodeId,
            children: [],
            x: parentNode.x + (index - 1) * 150,
            y: parentNode.y + 120,
            category: sp.category,
            isExpanded: true,
            isRoot: false,
            aiGenerated: true,
            capturedAt: new Date(),
          }));

          const updatedParent = {
            ...parentNode,
            children: [...parentNode.children, ...newNodes.map((n) => n.id)],
          };

          state.onNodesChange?.([
            ...state.nodes.filter((n) => n.id !== selectedNodeId),
            updatedParent,
            ...newNodes,
          ]);
        }
      }
      break;
    }

    case "mind_map.extract_action_items": {
      // Simulate extracting action items from ideas
      const starredIdeas = state.ideas.filter((i) => i.isStarred && !i.isAddedToMap);
      const newActionItems: ActionItemData[] = starredIdeas.slice(0, 3).map((idea, index) => ({
        id: `action-${Date.now()}-${index}`,
        text: `Follow up on: ${idea.text.substring(0, 50)}...`,
        owner: null,
        dueDate: null,
        isComplete: false,
        column: "all" as const,
        priority: "medium" as const,
        createdAt: new Date(),
      }));

      if (newActionItems.length > 0) {
        state.onActionItemsChange?.([...state.actionItems, ...newActionItems]);
      }
      break;
    }

    case "mind_map.identify_eureka": {
      // Simulate identifying eureka moments
      const recentNodes = state.nodes.filter((n) => !n.isEureka && !n.isRoot);
      if (recentNodes.length > 0) {
        const randomNode = recentNodes[Math.floor(Math.random() * recentNodes.length)];
        state.onNodesChange?.(
          state.nodes.map((n) =>
            n.id === randomNode.id ? { ...n, isEureka: true } : n
          )
        );
      }
      break;
    }

    case "mind_map.cluster_ideas": {
      // Simulate clustering - in production would use actual AI
      console.log("Clustering ideas based on semantic similarity...");
      break;
    }

    case "mind_map.prioritize_ideas": {
      // Simulate prioritization
      console.log("Prioritizing ideas based on criteria...");
      break;
    }

    case "mind_map.synthesize_ideas": {
      // Simulate synthesizing selected ideas
      const selectedIds = context?.selectedNodeIds || [];
      if (selectedIds.length >= 2) {
        const selectedNodes = state.nodes.filter((n) => selectedIds.includes(n.id));
        const synthesizedText = `Synthesized: ${selectedNodes.map((n) => n.text).join(" + ")}`;

        const newNode: MindMapNode = {
          id: `node-synth-${Date.now()}`,
          text: synthesizedText.substring(0, 60),
          parentId: null,
          children: [],
          x: Math.random() * 400 + 200,
          y: Math.random() * 200 + 200,
          category: "solution",
          isExpanded: true,
          isRoot: false,
          aiGenerated: true,
          capturedAt: new Date(),
        };

        state.onNodesChange?.([...state.nodes, newNode]);
      }
      break;
    }

    case "mind_map.generate_variations": {
      const selectedNodeId = context?.selectedNodeIds?.[0];
      if (selectedNodeId) {
        const originalNode = state.nodes.find((n) => n.id === selectedNodeId);
        if (originalNode) {
          const variations = [
            `${originalNode.text} (Alternative A)`,
            `${originalNode.text} (Alternative B)`,
          ];

          const newNodes: MindMapNode[] = variations.map((text, index) => ({
            id: `node-var-${Date.now()}-${index}`,
            text,
            parentId: originalNode.parentId,
            children: [],
            x: originalNode.x + (index + 1) * 100,
            y: originalNode.y + 80,
            category: originalNode.category,
            isExpanded: true,
            isRoot: false,
            aiGenerated: true,
            capturedAt: new Date(),
          }));

          state.onNodesChange?.([...state.nodes, ...newNodes]);
        }
      }
      break;
    }

    default:
      break;
  }
}

function extractKeyThemes(ideas: Idea[], nodes: MindMapNode[]): string[] {
  // In production, this would use NLP/AI to extract themes
  const allTags = ideas.flatMap((i) => i.tags);
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);
}

function generateClusters(nodes: MindMapNode[]): { name: string; ideaCount: number }[] {
  // In production, this would use actual clustering algorithms
  const categories = nodes.reduce((acc, node) => {
    if (!node.isRoot) {
      acc[node.category] = (acc[node.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categories).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    ideaCount: count,
  }));
}

function generateNextSteps(actionItems: ActionItemData[]): string[] {
  const pendingActions = actionItems
    .filter((a) => a.column === "action" && !a.isComplete)
    .slice(0, 3)
    .map((a) => a.text);

  if (pendingActions.length === 0) {
    return ["Review brainstorm results", "Assign owners to action items", "Schedule follow-up session"];
  }

  return pendingActions;
}

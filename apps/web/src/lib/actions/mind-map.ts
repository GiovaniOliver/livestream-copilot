/**
 * Mind Map Room (Brainstorming) Actions
 *
 * Purpose: Capture, cluster, and develop ideas during brainstorming sessions.
 */

import type { AgentAction } from "@/types/actions";

/**
 * Capture Idea
 * Extracts new ideas from discussion
 */
export const captureIdea: AgentAction = {
  actionId: "mind_map.capture_idea",
  label: "Capture Idea",
  description: "Extracts new ideas from brainstorming discussion",
  triggerType: "auto",
  autoTriggerCondition: "When new concept language detected",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript segment with potential ideas",
    },
  ],
  outputs: ["IDEA_NODE"],
  estimatedTokens: "low",
  icon: "light-bulb",
  cooldownMs: 15000,
  requiresTranscript: true,
  minTranscriptLength: 50,
};

/**
 * Cluster Ideas
 * Groups related ideas together
 */
export const clusterIdeas: AgentAction = {
  actionId: "mind_map.cluster_ideas",
  label: "Cluster Ideas",
  description: "Groups related ideas into thematic clusters",
  triggerType: "both",
  inputs: [
    {
      name: "ideas_list",
      type: "artifact",
      required: true,
      description: "List of captured ideas to cluster",
    },
  ],
  outputs: ["IDEA_NODE"],
  estimatedTokens: "medium",
  icon: "squares-2x2",
  cooldownMs: 60000,
};

/**
 * Find Connections
 * Identifies relationships between ideas
 */
export const findConnections: AgentAction = {
  actionId: "mind_map.find_connections",
  label: "Find Connections",
  description: "Identifies relationships and connections between ideas",
  triggerType: "both",
  inputs: [
    {
      name: "ideas_list",
      type: "artifact",
      required: true,
      description: "List of ideas to analyze for connections",
    },
  ],
  outputs: ["IDEA_NODE"],
  estimatedTokens: "medium",
  icon: "arrows-pointing-in",
  cooldownMs: 60000,
};

/**
 * Expand Idea
 * Develops an idea with sub-points
 */
export const expandIdea: AgentAction = {
  actionId: "mind_map.expand_idea",
  label: "Expand Idea",
  description: "Develops an idea with detailed sub-points and branches",
  triggerType: "manual",
  inputs: [
    {
      name: "idea_node",
      type: "artifact",
      required: true,
      description: "The idea to expand",
    },
    {
      name: "context",
      type: "context",
      required: false,
      description: "Session context for expansion direction",
    },
  ],
  outputs: ["IDEA_NODE"],
  estimatedTokens: "medium",
  icon: "arrows-pointing-out",
  cooldownMs: undefined,
};

/**
 * Prioritize Ideas
 * Ranks ideas by criteria
 */
export const prioritizeIdeas: AgentAction = {
  actionId: "mind_map.prioritize_ideas",
  label: "Prioritize Ideas",
  description: "Ranks ideas by specified criteria (impact, feasibility, etc.)",
  triggerType: "manual",
  inputs: [
    {
      name: "ideas_list",
      type: "artifact",
      required: true,
      description: "List of ideas to prioritize",
    },
    {
      name: "criteria",
      type: "user_input",
      required: true,
      description: "Criteria for prioritization (impact, cost, time, etc.)",
    },
  ],
  outputs: ["IDEA_NODE"],
  estimatedTokens: "medium",
  icon: "list-bullet",
  cooldownMs: undefined,
};

/**
 * Extract Action Items
 * Converts ideas to action items
 */
export const extractMindMapActionItems: AgentAction = {
  actionId: "mind_map.extract_action_items",
  label: "Extract Actions",
  description: "Converts brainstormed ideas into concrete action items",
  triggerType: "both",
  inputs: [
    {
      name: "ideas_list",
      type: "artifact",
      required: true,
      description: "List of ideas to convert to actions",
    },
    {
      name: "priorities",
      type: "artifact",
      required: false,
      description: "Priority rankings for ideas",
    },
  ],
  outputs: ["ACTION_ITEM"],
  estimatedTokens: "medium",
  icon: "clipboard-document-check",
  cooldownMs: 60000,
};

/**
 * Detect Duplicate
 * Flags similar/duplicate ideas
 */
export const detectDuplicate: AgentAction = {
  actionId: "mind_map.detect_duplicate",
  label: "Detect Duplicate",
  description: "Flags similar or duplicate ideas for consolidation",
  triggerType: "auto",
  autoTriggerCondition: "When new idea captured (similarity check)",
  inputs: [
    {
      name: "new_idea",
      type: "artifact",
      required: true,
      description: "Newly captured idea",
    },
    {
      name: "existing_ideas",
      type: "artifact",
      required: true,
      description: "List of existing ideas to check against",
    },
  ],
  outputs: ["IDEA_NODE"],
  estimatedTokens: "low",
  icon: "document-duplicate",
  cooldownMs: 15000,
};

/**
 * Synthesize Ideas
 * Combines ideas into new concept
 */
export const synthesizeIdeas: AgentAction = {
  actionId: "mind_map.synthesize_ideas",
  label: "Synthesize Ideas",
  description: "Combines multiple ideas into a new unified concept",
  triggerType: "manual",
  inputs: [
    {
      name: "selected_ideas",
      type: "selection",
      required: true,
      description: "Ideas selected for synthesis",
    },
  ],
  outputs: ["IDEA_NODE"],
  estimatedTokens: "medium",
  icon: "sparkles",
  cooldownMs: undefined,
};

/**
 * Generate Variations
 * Creates variations of an idea
 */
export const generateVariations: AgentAction = {
  actionId: "mind_map.generate_variations",
  label: "Generate Variations",
  description: "Creates alternative variations of an idea",
  triggerType: "manual",
  inputs: [
    {
      name: "idea_node",
      type: "artifact",
      required: true,
      description: "The idea to generate variations from",
    },
  ],
  outputs: ["IDEA_NODE"],
  estimatedTokens: "medium",
  icon: "variable",
  cooldownMs: undefined,
};

/**
 * Identify Eureka
 * Flags breakthrough moments
 */
export const identifyEureka: AgentAction = {
  actionId: "mind_map.identify_eureka",
  label: "Identify Eureka",
  description: "Flags breakthrough or \"aha!\" moments in discussion",
  triggerType: "auto",
  autoTriggerCondition: "When excitement/breakthrough language detected",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript with potential breakthrough",
    },
  ],
  outputs: ["QUOTE"],
  estimatedTokens: "low",
  icon: "bolt",
  cooldownMs: 15000,
  requiresTranscript: true,
};

/**
 * Categorize Idea
 * Assigns category to new idea
 */
export const categorizeIdea: AgentAction = {
  actionId: "mind_map.categorize_idea",
  label: "Categorize Idea",
  description: "Assigns category or theme to a newly captured idea",
  triggerType: "auto",
  autoTriggerCondition: "Immediately after idea capture",
  inputs: [
    {
      name: "idea_node",
      type: "artifact",
      required: true,
      description: "The idea to categorize",
    },
    {
      name: "categories",
      type: "context",
      required: false,
      description: "Existing categories to choose from",
    },
  ],
  outputs: ["IDEA_NODE"],
  estimatedTokens: "low",
  icon: "tag",
  cooldownMs: 15000,
};

/**
 * Generate Session Summary
 * Creates overview of brainstorm session
 */
export const generateSessionSummary: AgentAction = {
  actionId: "mind_map.generate_session_summary",
  label: "Session Summary",
  description: "Creates comprehensive overview of the brainstorm session",
  triggerType: "manual",
  inputs: [
    {
      name: "all_ideas",
      type: "artifact",
      required: true,
      description: "All captured ideas from session",
    },
    {
      name: "connections",
      type: "artifact",
      required: false,
      description: "Identified connections between ideas",
    },
  ],
  outputs: ["EPISODE_META"],
  estimatedTokens: "high",
  icon: "document-chart-bar",
  cooldownMs: undefined,
};

/**
 * All Mind Map Room actions
 */
export const mindMapActions: AgentAction[] = [
  captureIdea,
  clusterIdeas,
  findConnections,
  expandIdea,
  prioritizeIdeas,
  extractMindMapActionItems,
  detectDuplicate,
  synthesizeIdeas,
  generateVariations,
  identifyEureka,
  categorizeIdea,
  generateSessionSummary,
];

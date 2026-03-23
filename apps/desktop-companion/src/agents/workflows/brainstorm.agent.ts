/**
 * Brainstorm Agent
 *
 * Specialized agent for brainstorming workflows.
 * Generates idea nodes, action items, and captures key insights.
 */

import type { EventEnvelope } from "@livestream-copilot/shared";
import { BaseAgent } from "../base.js";
import { complete } from "../client.js";
import { getBrainstormSystemPrompt } from "../prompts.js";
import type { AgentConfig, AgentContext, AgentOutput, WorkflowType } from "../types.js";

/**
 * Brainstorm output categories.
 */
const BRAINSTORM_CATEGORIES = ["IDEA_NODE", "ACTION_ITEM", "QUOTE"] as const;

/**
 * Idea extraction result.
 */
interface IdeaAnalysis {
  hasIdeas: boolean;
  ideas: Array<{
    concept: string;
    description: string;
    author: string;
    category: string;
    buildOn?: string;
    confidence: number;
  }>;
}

/**
 * Semantic relationship types between ideas.
 */
type ConnectionRelationType =
  | "builds_on"
  | "contradicts"
  | "extends"
  | "combines";

/**
 * A detected connection between two ideas with semantic metadata.
 */
interface IdeaConnection {
  fromId: string;
  fromConcept: string;
  toId: string;
  toConcept: string;
  relationType: ConnectionRelationType;
  description: string;
  strength: number;
}

/**
 * Connection detection result from LLM analysis.
 */
interface ConnectionResult {
  hasConnections: boolean;
  connections: Array<{
    idea1: string;
    idea2: string;
    relationType: ConnectionRelationType;
    relationship: string;
    strength: number;
    sharedThemes?: string[];
  }>;
}

/**
 * Agent specialized for brainstorming workflows.
 */
export class BrainstormAgent extends BaseAgent {
  readonly name = "brainstorm-agent";
  readonly workflow: WorkflowType = "brainstorm";
  readonly triggerEvents = [
    "TRANSCRIPT_SEGMENT",
    "MOMENT_MARKER",
  ];

  // Track brainstorm context
  private ideas: Map<string, { concept: string; author: string; category: string }> = new Map();
  private categories: Set<string> = new Set();
  private ideaConnections: IdeaConnection[] = [];

  // Thresholds
  private readonly ideaConfidenceThreshold = 0.4;
  private readonly connectionStrengthThreshold = 0.3;
  private readonly minTranscriptLength = 100;

  constructor(config?: Partial<AgentConfig>) {
    super(config);
  }

  /**
   * Generate outputs for an event.
   */
  protected async generateOutputs(
    event: EventEnvelope,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    const outputs: AgentOutput[] = [];

    switch (event.type) {
      case "TRANSCRIPT_SEGMENT":
        outputs.push(...(await this.processTranscriptSegment(event, context)));
        break;

      case "MOMENT_MARKER":
        outputs.push(...(await this.processMomentMarker(event, context)));
        break;
    }

    return outputs;
  }

  /**
   * Process transcript segment - extract ideas, connections, and insights.
   */
  private async processTranscriptSegment(
    event: EventEnvelope,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    const transcript = this.buildTranscriptContext(event, context);

    if (transcript.length < this.minTranscriptLength) {
      return [];
    }

    const outputs: AgentOutput[] = [];

    // Extract new ideas from the conversation
    const ideaAnalysis = await this.extractIdeas(transcript, context);

    if (ideaAnalysis.hasIdeas) {
      for (const idea of ideaAnalysis.ideas) {
        if (idea.confidence >= this.ideaConfidenceThreshold) {
          const ideaId = `idea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          this.ideas.set(ideaId, {
            concept: idea.concept,
            author: idea.author,
            category: idea.category,
          });
          this.categories.add(idea.category);

          // Check if this idea references a previous one via buildOn
          const buildOnConnection = idea.buildOn
            ? this.findBuildOnConnection(ideaId, idea.concept, idea.buildOn)
            : undefined;

          if (buildOnConnection) {
            this.ideaConnections = [...this.ideaConnections, buildOnConnection];
          }

          // Find existing connections for this new idea
          const existingConnections = this.getConnectionsForIdea(ideaId, idea.concept);

          outputs.push({
            category: "IDEA_NODE",
            title: idea.concept,
            text: idea.description,
            refs: [event.id],
            meta: {
              ideaId,
              author: idea.author,
              ideaCategory: idea.category,
              buildsOn: idea.buildOn,
              confidence: idea.confidence,
              position: this.ideas.size,
              connections: existingConnections.map((conn) => ({
                targetId: conn.fromId === ideaId ? conn.toId : conn.fromId,
                targetConcept: conn.fromId === ideaId ? conn.toConcept : conn.fromConcept,
                relationType: conn.relationType,
                description: conn.description,
                strength: conn.strength,
              })),
              connectionCount: existingConnections.length,
            },
          });
        }
      }
    }

    // Detect connections between ideas
    if (this.ideas.size > 1) {
      const newConnections = await this.detectConnections(transcript, context);
      if (newConnections.hasConnections) {
        const resolvedConnections = this.resolveConnections(newConnections.connections);
        this.ideaConnections = [...this.ideaConnections, ...resolvedConnections];

        this.agentLogger.debug(
          {
            newConnections: resolvedConnections.length,
            totalConnections: this.ideaConnections.length,
          },
          "Idea connections updated"
        );
      }
    }

    // Generate action items from ideas
    const actionItems = await this.generateActionItems(transcript, context);
    outputs.push(...actionItems);

    // Capture eureka moments and key insights
    const insights = await this.captureInsights(transcript, context);
    outputs.push(...insights);

    return outputs;
  }

  /**
   * Process moment marker - capture explicit ideas or breakthroughs.
   */
  private async processMomentMarker(
    event: EventEnvelope,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    const payload = (event as any).payload as {
      label: string;
      t: number;
      confidence?: number;
      notes?: string;
    };

    const outputs: AgentOutput[] = [];

    // Treat marker as a key idea
    const ideaId = `idea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.ideas.set(ideaId, {
      concept: payload.label,
      author: "Marked",
      category: "highlighted",
    });

    // Detect connections to existing ideas for the marked idea
    const markerConnections = this.getConnectionsForIdea(ideaId, payload.label);

    outputs.push({
      category: "IDEA_NODE",
      title: payload.label,
      text: payload.notes || payload.label,
      refs: [event.id],
      meta: {
        ideaId,
        timestamp: payload.t,
        manuallyMarked: true,
        highlighted: true,
        position: this.ideas.size,
        connections: markerConnections.map((conn) => ({
          targetId: conn.fromId === ideaId ? conn.toId : conn.fromId,
          targetConcept: conn.fromId === ideaId ? conn.toConcept : conn.fromConcept,
          relationType: conn.relationType,
          description: conn.description,
          strength: conn.strength,
        })),
        connectionCount: markerConnections.length,
      },
    });

    // Generate immediate action item for breakthrough ideas
    if (payload.notes && payload.notes.length > 20) {
      const actionItem = await this.expandIdeaToAction(payload.label, payload.notes, context);
      if (actionItem) {
        outputs.push({
          category: "ACTION_ITEM",
          title: `Explore: ${payload.label}`,
          text: actionItem,
          refs: [event.id],
          meta: {
            fromIdea: ideaId,
            priority: "high",
          },
        });
      }
    }

    return outputs;
  }

  /**
   * Extract ideas from transcript.
   */
  private async extractIdeas(
    transcript: string,
    context: AgentContext
  ): Promise<IdeaAnalysis> {
    try {
      const existingIdeas = Array.from(this.ideas.values())
        .slice(-10)
        .map((i) => i.concept);

      const prompt = `Extract ideas and concepts from this brainstorming session.

SESSION: ${context.title || "Brainstorm Session"}
PARTICIPANTS: ${context.participants.join(", ")}

EXISTING IDEAS CAPTURED:
${existingIdeas.length > 0 ? existingIdeas.map((i) => `- ${i}`).join("\n") : "None yet"}

TRANSCRIPT:
"""
${transcript.slice(-800)}
"""

Identify NEW ideas being proposed. Look for:
- New concepts or suggestions
- Variations or improvements on existing ideas
- Creative connections being made
- Problems being identified (as idea seeds)

Respond with JSON:
{
  "hasIdeas": boolean,
  "ideas": [
    {
      "concept": "Brief idea name (max 50 chars)",
      "description": "What the idea is about (2-3 sentences)",
      "author": "Who proposed it",
      "category": "General category (e.g., 'feature', 'marketing', 'technical', 'design')",
      "buildOn": "Name of existing idea this builds on, if any",
      "confidence": 0.0-1.0
    }
  ]
}

Only include genuinely new ideas with confidence > 0.4. If no new ideas, return hasIdeas: false.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 700,
        temperature: 0.5,
        systemPrompt: getBrainstormSystemPrompt(context),
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to extract ideas");
    }

    return { hasIdeas: false, ideas: [] };
  }

  /**
   * Detect semantic connections between ideas.
   * Classifies relationships as builds_on, contradicts, extends, or combines.
   */
  private async detectConnections(
    transcript: string,
    context: AgentContext
  ): Promise<ConnectionResult> {
    try {
      const recentIdeas = Array.from(this.ideas.entries())
        .slice(-8)
        .map(([id, idea]) => `- "${idea.concept}" [${idea.category}] (id: ${id})`);

      const existingConnectionSummary = this.ideaConnections
        .slice(-5)
        .map((c) => `${c.fromConcept} --[${c.relationType}]--> ${c.toConcept}`)
        .join("\n");

      const prompt = `Identify semantic connections between ideas in this brainstorming session.

CURRENT IDEAS:
${recentIdeas.join("\n")}

EXISTING CONNECTIONS (already detected):
${existingConnectionSummary || "None yet"}

RECENT DISCUSSION:
"""
${transcript.slice(-500)}
"""

Find meaningful NEW connections between ideas. Classify each connection with a relationship type:
- "builds_on": idea2 directly builds upon or improves idea1
- "contradicts": ideas are in tension or offer opposing approaches
- "extends": idea2 takes idea1 into a new direction or domain
- "combines": ideas can be merged into a stronger concept

Also assess connection strength (0.0-1.0):
- 1.0: Explicitly discussed connection between the ideas
- 0.7-0.9: Strong implicit connection, shared concepts
- 0.4-0.6: Moderate connection, related themes
- 0.1-0.3: Weak/tangential connection

Respond with JSON:
{
  "hasConnections": boolean,
  "connections": [
    {
      "idea1": "First idea name (exact match from list)",
      "idea2": "Second idea name (exact match from list)",
      "relationType": "builds_on" | "contradicts" | "extends" | "combines",
      "relationship": "Brief description of how they connect",
      "strength": 0.0-1.0,
      "sharedThemes": ["theme1", "theme2"]
    }
  ]
}

Only include connections with strength >= ${this.connectionStrengthThreshold}. Do NOT duplicate connections already listed above. Return hasConnections: false if no meaningful NEW links.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 500,
        temperature: 0.4,
        systemPrompt: "You identify meaningful semantic connections between brainstorming ideas. Be precise about relationship types.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to detect connections");
    }

    return { hasConnections: false, connections: [] };
  }

  /**
   * Resolve LLM connection results to tracked IdeaConnection objects.
   * Matches idea names to stored idea IDs using fuzzy matching.
   */
  private resolveConnections(
    rawConnections: ConnectionResult["connections"]
  ): IdeaConnection[] {
    const resolved: IdeaConnection[] = [];

    for (const conn of rawConnections) {
      if (conn.strength < this.connectionStrengthThreshold) {
        continue;
      }

      const fromMatch = this.findIdeaByName(conn.idea1);
      const toMatch = this.findIdeaByName(conn.idea2);

      if (!fromMatch || !toMatch) {
        this.agentLogger.debug(
          { idea1: conn.idea1, idea2: conn.idea2 },
          "Could not resolve idea names to IDs, skipping connection"
        );
        continue;
      }

      // Avoid duplicate connections
      const isDuplicate = this.ideaConnections.some(
        (existing) =>
          (existing.fromId === fromMatch.id && existing.toId === toMatch.id) ||
          (existing.fromId === toMatch.id && existing.toId === fromMatch.id)
      );

      if (isDuplicate) {
        continue;
      }

      const validRelationType = this.validateRelationType(conn.relationType);

      resolved.push({
        fromId: fromMatch.id,
        fromConcept: fromMatch.concept,
        toId: toMatch.id,
        toConcept: toMatch.concept,
        relationType: validRelationType,
        description: conn.relationship,
        strength: Math.max(0, Math.min(1, conn.strength)),
      });
    }

    return resolved;
  }

  /**
   * Find an idea by name using fuzzy matching.
   * Returns the best matching idea ID and concept, or null if no match.
   */
  private findIdeaByName(
    name: string
  ): { id: string; concept: string } | null {
    const nameLower = name.toLowerCase().trim();

    // Exact match first
    for (const [id, idea] of this.ideas.entries()) {
      if (idea.concept.toLowerCase() === nameLower) {
        return { id, concept: idea.concept };
      }
    }

    // Substring / partial match
    let bestMatch: { id: string; concept: string; score: number } | null = null;

    for (const [id, idea] of this.ideas.entries()) {
      const conceptLower = idea.concept.toLowerCase();

      // Check if one contains the other
      if (conceptLower.includes(nameLower) || nameLower.includes(conceptLower)) {
        const score = Math.min(nameLower.length, conceptLower.length) /
          Math.max(nameLower.length, conceptLower.length);

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id, concept: idea.concept, score };
        }
      }

      // Word overlap check
      const nameWords = new Set(nameLower.split(/\s+/).filter((w) => w.length > 2));
      const conceptWords = new Set(conceptLower.split(/\s+/).filter((w) => w.length > 2));

      let overlap = 0;
      for (const word of nameWords) {
        if (conceptWords.has(word)) {
          overlap += 1;
        }
      }

      if (nameWords.size > 0 && conceptWords.size > 0) {
        const overlapScore = overlap / Math.max(nameWords.size, conceptWords.size);
        if (overlapScore > 0.4 && (!bestMatch || overlapScore > bestMatch.score)) {
          bestMatch = { id, concept: idea.concept, score: overlapScore };
        }
      }
    }

    return bestMatch ? { id: bestMatch.id, concept: bestMatch.concept } : null;
  }

  /**
   * Validate and normalize a relationship type from LLM output.
   */
  private validateRelationType(raw: string): ConnectionRelationType {
    const valid: ConnectionRelationType[] = ["builds_on", "contradicts", "extends", "combines"];
    const normalized = raw.toLowerCase().trim() as ConnectionRelationType;

    if (valid.includes(normalized)) {
      return normalized;
    }

    // Map common variations
    if (raw.includes("build") || raw.includes("improve")) return "builds_on";
    if (raw.includes("contradict") || raw.includes("oppos") || raw.includes("tension")) return "contradicts";
    if (raw.includes("extend") || raw.includes("expand")) return "extends";
    if (raw.includes("combin") || raw.includes("merg") || raw.includes("synerg")) return "combines";

    return "extends"; // Default fallback
  }

  /**
   * Find a build-on connection when a new idea references a previous one.
   */
  private findBuildOnConnection(
    newIdeaId: string,
    newConcept: string,
    buildsOnName: string
  ): IdeaConnection | null {
    const parentMatch = this.findIdeaByName(buildsOnName);

    if (!parentMatch) {
      return null;
    }

    return {
      fromId: parentMatch.id,
      fromConcept: parentMatch.concept,
      toId: newIdeaId,
      toConcept: newConcept,
      relationType: "builds_on",
      description: `"${newConcept}" builds on "${parentMatch.concept}"`,
      strength: 0.8,
    };
  }

  /**
   * Get all connections involving a specific idea.
   */
  private getConnectionsForIdea(ideaId: string, concept: string): IdeaConnection[] {
    return this.ideaConnections.filter(
      (conn) =>
        conn.fromId === ideaId ||
        conn.toId === ideaId ||
        conn.fromConcept.toLowerCase() === concept.toLowerCase() ||
        conn.toConcept.toLowerCase() === concept.toLowerCase()
    );
  }

  /**
   * Generate action items from ideas.
   */
  private async generateActionItems(
    transcript: string,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    // Only generate action items periodically
    if (this.ideas.size % 4 !== 0 || this.ideas.size === 0) {
      return [];
    }

    try {
      const recentIdeas = Array.from(this.ideas.values()).slice(-5);

      const prompt = `Generate action items to explore ideas from this brainstorming session.

SESSION: ${context.title || "Brainstorm"}
CATEGORIES DISCUSSED: ${Array.from(this.categories).join(", ")}

RECENT IDEAS:
${recentIdeas.map((i) => `- ${i.concept}: ${i.category}`).join("\n")}

CURRENT DISCUSSION:
"""
${transcript.slice(-400)}
"""

Generate 1-2 specific next steps to explore or develop these ideas:
- Research to validate an idea
- Prototypes to build
- People to talk to
- Experiments to run

Respond with JSON:
{
  "actions": [
    {
      "task": "Specific actionable task",
      "forIdea": "Which idea this supports",
      "priority": "high" | "medium" | "low",
      "effort": "low" | "medium" | "high"
    }
  ]
}`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 400,
        temperature: 0.5,
        systemPrompt: "You generate practical next steps from brainstorming sessions.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.actions)) {
          return parsed.actions.map((action: { task: string; forIdea?: string; priority?: string; effort?: string }) => ({
            category: "ACTION_ITEM" as const,
            text: action.task,
            meta: {
              forIdea: action.forIdea,
              priority: action.priority || "medium",
              effort: action.effort,
              source: "brainstorm_synthesis",
            },
          }));
        }
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate action items");
    }

    return [];
  }

  /**
   * Capture eureka moments and key insights.
   */
  private async captureInsights(
    transcript: string,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    if (transcript.length < 300) {
      return [];
    }

    try {
      const prompt = `Capture eureka moments and key insights from this brainstorming session.

TRANSCRIPT:
"""
${transcript.slice(-500)}
"""

Look for:
- "Aha!" moments where something clicks
- Unexpected connections being made
- Key realizations or breakthroughs
- Particularly creative or novel thoughts

Respond with JSON:
{
  "insights": [
    {
      "quote": "The actual statement or insight",
      "speaker": "Who said it",
      "significance": "Why this is notable"
    }
  ]
}

Only capture 1-2 truly standout moments. Return empty array if nothing remarkable.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 400,
        temperature: 0.5,
        systemPrompt: "You identify breakthrough moments in creative sessions.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.insights)) {
          return parsed.insights.map((insight: { quote: string; speaker?: string; significance?: string }) => ({
            category: "QUOTE" as const,
            text: insight.quote,
            meta: {
              speaker: insight.speaker,
              significance: insight.significance,
              type: "eureka_moment",
            },
          }));
        }
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to capture insights");
    }

    return [];
  }

  /**
   * Expand a marked idea into an action item.
   */
  private async expandIdeaToAction(
    label: string,
    notes: string,
    context: AgentContext
  ): Promise<string | null> {
    try {
      const prompt = `Create a specific action item from this brainstorming idea.

IDEA: ${label}
DETAILS: ${notes}
SESSION: ${context.title || "Brainstorm"}

Generate a single, specific, actionable next step to explore or develop this idea.
Be concrete about what to do, not vague.

Respond with ONLY the action item text, no explanation.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 100,
        temperature: 0.5,
        systemPrompt: "You turn creative ideas into actionable next steps.",
      });

      return response.content.trim();
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to expand idea to action");
      return null;
    }
  }

  /**
   * Get brainstorm session statistics.
   */
  getBrainstormStats(): {
    totalIdeas: number;
    categories: string[];
    connections: number;
    topContributors: Record<string, number>;
  } {
    const contributors: Record<string, number> = {};
    for (const idea of this.ideas.values()) {
      contributors[idea.author] = (contributors[idea.author] || 0) + 1;
    }

    return {
      totalIdeas: this.ideas.size,
      categories: Array.from(this.categories),
      connections: this.ideaConnections.length,
      topContributors: contributors,
    };
  }

  /**
   * Get idea map for visualization.
   */
  getIdeaMap(): {
    nodes: Array<{ id: string; concept: string; category: string; author: string }>;
    edges: Array<{
      from: string;
      to: string;
      fromConcept: string;
      toConcept: string;
      relationType: ConnectionRelationType;
      description: string;
      strength: number;
    }>;
  } {
    const nodes = Array.from(this.ideas.entries()).map(([id, idea]) => ({
      id,
      concept: idea.concept,
      category: idea.category,
      author: idea.author,
    }));

    const edges = this.ideaConnections.map((conn) => ({
      from: conn.fromId,
      to: conn.toId,
      fromConcept: conn.fromConcept,
      toConcept: conn.toConcept,
      relationType: conn.relationType,
      description: conn.description,
      strength: conn.strength,
    }));

    return {
      nodes,
      edges,
    };
  }

  /**
   * Reset brainstorm tracking for new session.
   */
  resetBrainstormContext(): void {
    this.ideas.clear();
    this.categories.clear();
    this.ideaConnections = [];
  }
}

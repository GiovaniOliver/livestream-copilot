/**
 * Podcast Agent
 *
 * Specialized agent for podcast recording workflows.
 * Generates episode metadata, chapters, quotes, action items, and clip titles.
 */

import type { EventEnvelope } from "@livestream-copilot/shared";
import { BaseAgent } from "../base.js";
import { complete } from "../client.js";
import { getPodcastSystemPrompt } from "../prompts.js";
import type { AgentConfig, AgentContext, AgentOutput, WorkflowType } from "../types.js";

/**
 * Podcast-specific output categories.
 */
const PODCAST_CATEGORIES = [
  "EPISODE_META",
  "CHAPTER_MARKER",
  "QUOTE",
  "ACTION_ITEM",
  "CLIP_TITLE",
] as const;

/**
 * Agent specialized for podcast workflows.
 */
export class PodcastAgent extends BaseAgent {
  readonly name = "podcast-agent";
  readonly workflow: WorkflowType = "podcast";
  readonly triggerEvents = [
    "TRANSCRIPT_SEGMENT",
    "MOMENT_MARKER",
    "ARTIFACT_CLIP_CREATED",
  ];

  // Track topics discussed for episode meta generation
  private topicsDiscussed: string[] = [];
  private keyPoints: string[] = [];

  // Thresholds
  private readonly minTranscriptLength = 150;

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

      case "ARTIFACT_CLIP_CREATED":
        outputs.push(...(await this.processClipCreated(event, context)));
        break;
    }

    return outputs;
  }

  /**
   * Process transcript segment.
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

    // Analyze content for podcast elements
    const analysis = await this.analyzeContent(transcript, context);

    // Add chapter markers for topic changes
    if (analysis.newTopic) {
      outputs.push({
        category: "CHAPTER_MARKER",
        text: analysis.newTopic,
        refs: [event.id],
        meta: {
          topicTransition: true,
        },
      });
      this.topicsDiscussed.push(analysis.newTopic);
    }

    // Extract action items
    for (const action of analysis.actionItems) {
      outputs.push({
        category: "ACTION_ITEM",
        text: action.task,
        refs: [event.id],
        meta: {
          assignee: action.assignee,
          context: action.context,
        },
      });
    }

    // Extract quotes
    for (const quote of analysis.quotes) {
      outputs.push({
        category: "QUOTE",
        text: quote.text,
        refs: [event.id],
        meta: {
          speaker: quote.speaker,
          context: quote.context,
        },
      });
    }

    // Track key points for episode summary
    if (analysis.keyPoint) {
      this.keyPoints.push(analysis.keyPoint);
    }

    return outputs;
  }

  /**
   * Process moment marker.
   */
  private async processMomentMarker(
    event: EventEnvelope,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    const payload = (event as any).payload as {
      label: string;
      t: number;
      notes?: string;
    };

    const outputs: AgentOutput[] = [];

    // Add chapter marker
    outputs.push({
      category: "CHAPTER_MARKER",
      text: payload.label,
      refs: [event.id],
      meta: {
        timestamp: payload.t,
        notes: payload.notes,
        manual: true,
      },
    });

    return outputs;
  }

  /**
   * Process clip created.
   */
  private async processClipCreated(
    event: EventEnvelope,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    const payload = (event as any).payload as {
      artifactId: string;
      t0: number;
      t1: number;
    };

    const outputs: AgentOutput[] = [];

    // Generate clip title
    const clipTitle = await this.generateClipTitle(context);
    if (clipTitle) {
      outputs.push({
        category: "CLIP_TITLE",
        title: clipTitle,
        text: clipTitle,
        refs: [event.id, payload.artifactId],
        meta: {
          duration: payload.t1 - payload.t0,
        },
      });
    }

    return outputs;
  }

  /**
   * Analyze transcript content for podcast elements.
   */
  private async analyzeContent(
    transcript: string,
    context: AgentContext
  ): Promise<{
    newTopic: string | null;
    actionItems: Array<{ task: string; assignee?: string; context?: string }>;
    quotes: Array<{ text: string; speaker?: string; context?: string }>;
    keyPoint: string | null;
  }> {
    try {
      const systemPrompt = getPodcastSystemPrompt(context);

      const prompt = `Analyze this podcast transcript segment and extract relevant content.

TRANSCRIPT:
"""
${transcript.slice(-600)}
"""

CURRENT TOPICS COVERED: ${this.topicsDiscussed.slice(-5).join(", ") || "None yet"}
PARTICIPANTS: ${context.participants.join(", ") || "Unknown hosts"}

Analyze for:
1. New topic/subject changes (if the conversation shifted to a new topic)
2. Action items or follow-ups mentioned
3. Notable quotes worth highlighting
4. Key points or insights

Respond with JSON:
{
  "newTopic": "topic name if changed, or null",
  "actionItems": [
    { "task": "what needs to be done", "assignee": "who mentioned it", "context": "brief context" }
  ],
  "quotes": [
    { "text": "the quote", "speaker": "who said it", "context": "why it's notable" }
  ],
  "keyPoint": "main insight from this segment, or null"
}

Be selective - only include genuinely notable items.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 600,
        temperature: 0.5,
        systemPrompt,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to analyze podcast content");
    }

    return { newTopic: null, actionItems: [], quotes: [], keyPoint: null };
  }

  /**
   * Generate a clip title for podcast content.
   */
  private async generateClipTitle(context: AgentContext): Promise<string | null> {
    try {
      const prompt = `Generate a professional podcast clip title (max 100 chars).

PODCAST: ${context.title || "Podcast Episode"}
HOSTS: ${context.participants.join(", ") || "The hosts"}
RECENT DISCUSSION:
"""
${context.recentTranscript.slice(-300)}
"""

Create a title that:
- Is professional and informative
- Highlights the key topic or insight
- Works for podcast platforms

Respond with ONLY the title text.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 50,
        temperature: 0.6,
        systemPrompt: "You create professional podcast clip titles.",
      });

      return response.content.trim().slice(0, 100);
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate podcast clip title");
      return null;
    }
  }

  /**
   * Generate episode metadata (called at session end).
   */
  async generateEpisodeMeta(context: AgentContext): Promise<AgentOutput | null> {
    try {
      const prompt = `Generate podcast episode metadata based on this session.

PODCAST: ${context.title || "Podcast Episode"}
HOSTS: ${context.participants.join(", ")}
TOPICS DISCUSSED: ${this.topicsDiscussed.join(", ")}
KEY POINTS: ${this.keyPoints.slice(0, 10).join("; ")}

Generate:
1. An engaging episode title (max 100 chars)
2. A compelling description (2-3 sentences)
3. Relevant tags/keywords (5-10 items)

Respond with JSON:
{
  "title": "episode title",
  "description": "episode description",
  "tags": ["tag1", "tag2", ...]
}`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 400,
        temperature: 0.7,
        systemPrompt: "You create professional podcast episode metadata.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: "EPISODE_META",
          title: parsed.title,
          text: parsed.description,
          meta: {
            tags: parsed.tags,
            topicsDiscussed: this.topicsDiscussed,
            keyPointsCount: this.keyPoints.length,
          },
        };
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate episode meta");
    }

    return null;
  }

  /**
   * Reset session state.
   */
  resetSession(): void {
    this.topicsDiscussed = [];
    this.keyPoints = [];
  }
}

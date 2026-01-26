/**
 * Streamer Agent
 *
 * Specialized agent for live streamer workflows.
 * Generates social posts, clip titles, chapter markers, and quotes.
 */

import type { EventEnvelope } from "@livestream-copilot/shared";
import { BaseAgent } from "../base.js";
import { complete, getDefaultModel, getDefaultMaxTokens } from "../client.js";
import { getStreamerSystemPrompt, getMomentDetectionPrompt } from "../prompts.js";
import type { AgentConfig, AgentContext, AgentOutput, WorkflowType } from "../types.js";

/**
 * Streamer-specific output categories.
 */
const STREAMER_CATEGORIES = ["SOCIAL_POST", "CLIP_TITLE", "CHAPTER_MARKER", "QUOTE"] as const;

/**
 * Moment detection result.
 */
interface MomentResult {
  clipWorthiness: number;
  moments: Array<{
    label: string;
    confidence: number;
    reason: string;
  }>;
}

/**
 * Agent specialized for live streamer workflows.
 */
export class StreamerAgent extends BaseAgent {
  readonly name = "streamer-agent";
  readonly workflow: WorkflowType = "streamer";
  readonly triggerEvents = [
    "TRANSCRIPT_SEGMENT",
    "MOMENT_MARKER",
    "ARTIFACT_CLIP_CREATED",
  ];

  // Thresholds for content generation
  private readonly momentThreshold = 0.6;
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

      case "ARTIFACT_CLIP_CREATED":
        outputs.push(...(await this.processClipCreated(event, context)));
        break;
    }

    return outputs;
  }

  /**
   * Process transcript segment - analyze for moments and generate social content.
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

    // Detect notable moments in the transcript
    const moments = await this.detectMoments(transcript);

    if (moments.clipWorthiness >= this.momentThreshold) {
      // Generate social post for high-value moments
      const socialPost = await this.generateSocialPost(transcript, moments);
      if (socialPost) {
        outputs.push({
          category: "SOCIAL_POST",
          text: socialPost,
          refs: [event.id],
          meta: {
            clipWorthiness: moments.clipWorthiness,
            source: "transcript_analysis",
          },
        });
      }

      // Add chapter marker suggestion
      for (const moment of moments.moments) {
        if (moment.confidence >= this.momentThreshold) {
          outputs.push({
            category: "CHAPTER_MARKER",
            text: moment.label,
            refs: [event.id],
            meta: {
              confidence: moment.confidence,
              reason: moment.reason,
            },
          });
        }
      }
    }

    // Extract quotes from notable content
    const quotes = await this.extractQuotes(transcript, context);
    outputs.push(...quotes);

    return outputs;
  }

  /**
   * Process moment marker - generate content for explicitly marked moments.
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

    // Generate social post for the marked moment
    const socialPost = await this.generateMomentSocialPost(
      payload.label,
      payload.notes,
      context
    );

    if (socialPost) {
      outputs.push({
        category: "SOCIAL_POST",
        text: socialPost,
        refs: [event.id],
        meta: {
          markerLabel: payload.label,
          timestamp: payload.t,
          confidence: payload.confidence,
        },
      });
    }

    // Add chapter marker
    outputs.push({
      category: "CHAPTER_MARKER",
      text: payload.label,
      refs: [event.id],
      meta: {
        timestamp: payload.t,
        notes: payload.notes,
      },
    });

    return outputs;
  }

  /**
   * Process clip created - generate title and social content for the clip.
   */
  private async processClipCreated(
    event: EventEnvelope,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    const payload = (event as any).payload as {
      artifactId: string;
      path: string;
      t0: number;
      t1: number;
    };

    const outputs: AgentOutput[] = [];

    // Generate clip title based on recent transcript context
    const clipTitle = await this.generateClipTitle(context);
    if (clipTitle) {
      outputs.push({
        category: "CLIP_TITLE",
        title: clipTitle,
        text: clipTitle,
        refs: [event.id, payload.artifactId],
        meta: {
          duration: payload.t1 - payload.t0,
          clipPath: payload.path,
        },
      });
    }

    // Generate social post for clip
    const clipSocialPost = await this.generateClipSocialPost(clipTitle, context);
    if (clipSocialPost) {
      outputs.push({
        category: "SOCIAL_POST",
        text: clipSocialPost,
        refs: [event.id, payload.artifactId],
        meta: {
          clipTitle,
          artifactId: payload.artifactId,
          source: "clip_created",
        },
      });
    }

    return outputs;
  }

  /**
   * Detect notable moments in transcript.
   */
  private async detectMoments(transcript: string): Promise<MomentResult> {
    try {
      const systemPrompt = "You are an AI that analyzes live stream transcripts to identify exciting, funny, or notable moments.";
      const userPrompt = getMomentDetectionPrompt(transcript);

      const response = await complete({
        messages: [{ role: "user", content: userPrompt }],
        model: this.config.model,
        maxTokens: 500,
        temperature: 0.5,
        systemPrompt,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to detect moments");
    }

    return { clipWorthiness: 0, moments: [] };
  }

  /**
   * Generate a social post from transcript content.
   */
  private async generateSocialPost(
    transcript: string,
    moments: MomentResult
  ): Promise<string | null> {
    try {
      const prompt = `Generate a short, engaging social media post (max 280 chars) for this stream moment.

TRANSCRIPT:
"""
${transcript.slice(-500)}
"""

DETECTED MOMENTS:
${moments.moments.map((m) => `- ${m.label} (${m.reason})`).join("\n")}

Create a post that:
- Is exciting and shareable
- Uses appropriate streaming/gaming language
- May include 1-2 relevant emojis
- Fits Twitter/X character limit

Respond with ONLY the post text, no quotes or formatting.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 100,
        temperature: 0.8,
        systemPrompt: "You create viral social media posts for streamers.",
      });

      return response.content.trim().slice(0, 280);
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate social post");
      return null;
    }
  }

  /**
   * Generate social post for a manually marked moment.
   */
  private async generateMomentSocialPost(
    label: string,
    notes: string | undefined,
    context: AgentContext
  ): Promise<string | null> {
    try {
      const prompt = `Generate a social media post (max 280 chars) for this stream highlight.

STREAM: ${context.title || "Live Stream"}
MOMENT: ${label}
${notes ? `NOTES: ${notes}` : ""}

Create an engaging post that captures this moment.
Respond with ONLY the post text.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 100,
        temperature: 0.8,
        systemPrompt: "You create viral social media posts for streamers.",
      });

      return response.content.trim().slice(0, 280);
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate moment social post");
      return null;
    }
  }

  /**
   * Generate a clip title.
   */
  private async generateClipTitle(context: AgentContext): Promise<string | null> {
    try {
      const prompt = `Generate a catchy, clickable clip title (max 100 chars) for a stream clip.

STREAM: ${context.title || "Live Stream"}
STREAMER: ${context.participants[0] || "Streamer"}
RECENT CONTEXT:
"""
${context.recentTranscript.slice(-300)}
"""

Create a title that:
- Is engaging and clickworthy
- Describes the highlight moment
- Works for YouTube/TikTok

Respond with ONLY the title text.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 50,
        temperature: 0.7,
        systemPrompt: "You create viral clip titles for streamers.",
      });

      return response.content.trim().slice(0, 100);
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate clip title");
      return null;
    }
  }

  /**
   * Generate social post for a clip.
   */
  private async generateClipSocialPost(
    clipTitle: string | null,
    context: AgentContext
  ): Promise<string | null> {
    try {
      const prompt = `Generate a social media post (max 280 chars) to share a new clip.

STREAM: ${context.title || "Live Stream"}
CLIP TITLE: ${clipTitle || "Epic Moment"}

Create an engaging post that promotes watching the clip.
Respond with ONLY the post text.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 100,
        temperature: 0.8,
        systemPrompt: "You create viral social media posts for streamers.",
      });

      return response.content.trim().slice(0, 280);
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate clip social post");
      return null;
    }
  }

  /**
   * Extract notable quotes from transcript.
   */
  private async extractQuotes(
    transcript: string,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    if (transcript.length < 200) {
      return [];
    }

    try {
      const prompt = `Extract memorable, funny, or notable quotes from this stream transcript.

TRANSCRIPT:
"""
${transcript.slice(-500)}
"""

Find quotes that:
- Are funny, insightful, or memorable
- Would be shareable or quotable
- Capture the personality of the speaker

Respond with JSON:
{
  "quotes": [
    { "text": "quote text", "speaker": "speaker name or unknown" }
  ]
}

Only include 1-2 truly notable quotes. If nothing stands out, return empty array.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 300,
        temperature: 0.5,
        systemPrompt: "You identify memorable quotes from live streams.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.quotes)) {
          return parsed.quotes.map((q: { text: string; speaker?: string }) => ({
            category: "QUOTE" as const,
            text: q.text,
            meta: { speaker: q.speaker },
          }));
        }
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to extract quotes");
    }

    return [];
  }
}

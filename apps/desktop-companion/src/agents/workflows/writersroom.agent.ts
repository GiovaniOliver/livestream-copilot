/**
 * Writers Room Agent
 *
 * Specialized agent for writers room workflows.
 * Generates story beats, script inserts, quotes, and action items.
 */

import type { EventEnvelope } from "@livestream-copilot/shared";
import { BaseAgent } from "../base.js";
import { complete } from "../client.js";
import { getWritersRoomSystemPrompt } from "../prompts.js";
import type { AgentConfig, AgentContext, AgentOutput, WorkflowType } from "../types.js";

/**
 * Writers Room output categories.
 */
const WRITERS_ROOM_CATEGORIES = ["BEAT", "SCRIPT_INSERT", "QUOTE", "ACTION_ITEM"] as const;

/**
 * Story beat detection result.
 */
interface BeatAnalysis {
  hasNewBeat: boolean;
  beats: Array<{
    label: string;
    type: "plot_point" | "character_moment" | "scene_transition" | "conflict" | "resolution";
    description: string;
    confidence: number;
  }>;
}

/**
 * Script suggestion result.
 */
interface ScriptSuggestion {
  type: "dialogue" | "action" | "scene_heading" | "transition";
  content: string;
  context: string;
}

/**
 * Agent specialized for writers room workflows.
 */
export class WritersRoomAgent extends BaseAgent {
  readonly name = "writers-room-agent";
  readonly workflow: WorkflowType = "writers_room";
  readonly triggerEvents = [
    "TRANSCRIPT_SEGMENT",
    "MOMENT_MARKER",
  ];

  // Track story context
  private storyBeats: string[] = [];
  private characterNotes: Map<string, string[]> = new Map();
  private currentScene: string | null = null;

  // Thresholds
  private readonly beatConfidenceThreshold = 0.5;
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
    }

    return outputs;
  }

  /**
   * Process transcript segment - analyze for story beats and dialogue ideas.
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

    // Analyze for story beats
    const beatAnalysis = await this.analyzeForBeats(transcript, context);

    if (beatAnalysis.hasNewBeat) {
      for (const beat of beatAnalysis.beats) {
        if (beat.confidence >= this.beatConfidenceThreshold) {
          this.storyBeats.push(beat.label);

          outputs.push({
            category: "BEAT",
            title: beat.label,
            text: beat.description,
            refs: [event.id],
            meta: {
              beatType: beat.type,
              confidence: beat.confidence,
              storyPosition: this.storyBeats.length,
            },
          });
        }
      }
    }

    // Generate script suggestions from discussion
    const scriptSuggestions = await this.generateScriptSuggestions(transcript, context);
    for (const suggestion of scriptSuggestions) {
      outputs.push({
        category: "SCRIPT_INSERT",
        title: `${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} Suggestion`,
        text: suggestion.content,
        refs: [event.id],
        meta: {
          scriptType: suggestion.type,
          context: suggestion.context,
        },
      });
    }

    // Extract quotable dialogue ideas
    const quotes = await this.extractDialogueIdeas(transcript, context);
    outputs.push(...quotes);

    return outputs;
  }

  /**
   * Process moment marker - capture explicit story points.
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

    // Add as a story beat
    this.storyBeats.push(payload.label);

    outputs.push({
      category: "BEAT",
      title: payload.label,
      text: payload.notes || payload.label,
      refs: [event.id],
      meta: {
        beatType: "plot_point",
        timestamp: payload.t,
        storyPosition: this.storyBeats.length,
        manuallyMarked: true,
      },
    });

    // Generate script insert based on the marker
    const scriptInsert = await this.expandBeatToScript(payload.label, payload.notes, context);
    if (scriptInsert) {
      outputs.push({
        category: "SCRIPT_INSERT",
        title: `Scene: ${payload.label}`,
        text: scriptInsert,
        refs: [event.id],
        meta: {
          fromMarker: true,
          markerLabel: payload.label,
        },
      });
    }

    return outputs;
  }

  /**
   * Analyze transcript for story beats.
   */
  private async analyzeForBeats(
    transcript: string,
    context: AgentContext
  ): Promise<BeatAnalysis> {
    try {
      const prompt = `Analyze this writers room discussion for story beats and plot points.

PROJECT: ${context.title || "Untitled Project"}
PARTICIPANTS: ${context.participants.join(", ")}

PREVIOUS BEATS DISCUSSED:
${this.storyBeats.slice(-5).map((b, i) => `${i + 1}. ${b}`).join("\n") || "None yet"}

TRANSCRIPT:
"""
${transcript.slice(-800)}
"""

Identify any NEW story beats being discussed. Look for:
- Plot points and story developments
- Character moments and revelations
- Scene transitions or settings
- Conflicts introduced or resolved
- Thematic elements

Respond with JSON:
{
  "hasNewBeat": boolean,
  "beats": [
    {
      "label": "Brief label (max 50 chars)",
      "type": "plot_point" | "character_moment" | "scene_transition" | "conflict" | "resolution",
      "description": "What this beat accomplishes in the story",
      "confidence": 0.0-1.0
    }
  ]
}

Only include beats with confidence > 0.5. If nothing new, return hasNewBeat: false with empty array.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 500,
        temperature: 0.4,
        systemPrompt: getWritersRoomSystemPrompt(context),
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to analyze for beats");
    }

    return { hasNewBeat: false, beats: [] };
  }

  /**
   * Generate script suggestions from discussion.
   */
  private async generateScriptSuggestions(
    transcript: string,
    context: AgentContext
  ): Promise<ScriptSuggestion[]> {
    try {
      const prompt = `Based on this writers room discussion, generate script suggestions.

PROJECT: ${context.title || "Untitled Project"}

DISCUSSION:
"""
${transcript.slice(-600)}
"""

Generate 0-2 script suggestions that capture ideas being discussed. These can be:
- dialogue: Character lines being workshopped
- action: Scene descriptions or action beats
- scene_heading: Scene locations mentioned
- transition: Scene transitions discussed

Respond with JSON:
{
  "suggestions": [
    {
      "type": "dialogue" | "action" | "scene_heading" | "transition",
      "content": "The actual script content in proper format",
      "context": "What sparked this suggestion"
    }
  ]
}

For dialogue, use character names in caps followed by their line.
For action, use present tense prose.
Only include genuinely useful suggestions. Return empty array if nothing concrete.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 600,
        temperature: 0.6,
        systemPrompt: "You are a professional screenwriter capturing ideas from a writers room discussion.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || [];
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate script suggestions");
    }

    return [];
  }

  /**
   * Extract quotable dialogue ideas from discussion.
   */
  private async extractDialogueIdeas(
    transcript: string,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    if (transcript.length < 300) {
      return [];
    }

    try {
      const prompt = `Extract memorable dialogue ideas or lines being discussed in this writers room session.

TRANSCRIPT:
"""
${transcript.slice(-500)}
"""

Look for:
- Character lines being pitched or workshopped
- Memorable one-liners or zingers
- Key dialogue moments for scenes
- Thematic statements or callbacks

Respond with JSON:
{
  "quotes": [
    {
      "text": "The actual line or dialogue",
      "character": "Character name if specified, or null",
      "context": "What scene/moment this is for"
    }
  ]
}

Only include 1-2 truly notable dialogue ideas. Return empty array if nothing stands out.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 400,
        temperature: 0.5,
        systemPrompt: "You capture memorable dialogue from writers room discussions.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.quotes)) {
          return parsed.quotes.map((q: { text: string; character?: string; context?: string }) => ({
            category: "QUOTE" as const,
            text: q.text,
            meta: {
              character: q.character,
              sceneContext: q.context,
              type: "dialogue_idea",
            },
          }));
        }
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to extract dialogue ideas");
    }

    return [];
  }

  /**
   * Expand a story beat marker into script content.
   */
  private async expandBeatToScript(
    label: string,
    notes: string | undefined,
    context: AgentContext
  ): Promise<string | null> {
    try {
      const prompt = `Expand this story beat into a brief script excerpt.

PROJECT: ${context.title || "Untitled Project"}
BEAT: ${label}
${notes ? `NOTES: ${notes}` : ""}

RECENT CONTEXT:
"""
${context.recentTranscript.slice(-300)}
"""

Write a brief script excerpt (3-5 lines) that captures this beat.
Use proper screenplay format with character names in CAPS for dialogue.

Respond with ONLY the script excerpt, no explanation.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 300,
        temperature: 0.7,
        systemPrompt: "You are a screenwriter creating script excerpts from story beats.",
      });

      return response.content.trim();
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to expand beat to script");
      return null;
    }
  }

  /**
   * Get current story context for prompts.
   */
  getStoryContext(): { beats: string[]; currentScene: string | null } {
    return {
      beats: [...this.storyBeats],
      currentScene: this.currentScene,
    };
  }

  /**
   * Reset story tracking for new session.
   */
  resetStoryContext(): void {
    this.storyBeats = [];
    this.characterNotes.clear();
    this.currentScene = null;
  }
}

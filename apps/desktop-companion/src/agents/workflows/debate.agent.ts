/**
 * Debate Agent
 *
 * Specialized agent for debate workflows.
 * Generates claims, evidence cards, quotes, and moderator prompts.
 */

import type { EventEnvelope } from "@livestream-copilot/shared";
import { BaseAgent } from "../base.js";
import { complete } from "../client.js";
import { getDebateSystemPrompt } from "../prompts.js";
import type { AgentConfig, AgentContext, AgentOutput, WorkflowType } from "../types.js";

/**
 * Debate output categories.
 */
const DEBATE_CATEGORIES = ["CLAIM", "EVIDENCE_CARD", "QUOTE", "MODERATOR_PROMPT"] as const;

/**
 * Claim analysis result.
 */
interface ClaimAnalysis {
  hasClaims: boolean;
  claims: Array<{
    statement: string;
    speaker: string;
    type: "assertion" | "counterclaim" | "rebuttal" | "concession";
    confidence: number;
    topic: string;
  }>;
}

/**
 * Evidence detection result.
 */
interface EvidenceResult {
  hasEvidence: boolean;
  evidence: Array<{
    citation: string;
    type: "statistic" | "source" | "example" | "expert_opinion" | "anecdote";
    supportsClaim: string;
    credibilityScore: number;
  }>;
}

/**
 * Agent specialized for debate workflows.
 */
export class DebateAgent extends BaseAgent {
  readonly name = "debate-agent";
  readonly workflow: WorkflowType = "debate";
  readonly triggerEvents = [
    "TRANSCRIPT_SEGMENT",
    "MOMENT_MARKER",
  ];

  // Track debate context
  private claims: Map<string, { statement: string; speaker: string }> = new Map();
  private topics: Set<string> = new Set();
  private speakerPositions: Map<string, string[]> = new Map();

  // Thresholds
  private readonly claimConfidenceThreshold = 0.5;
  private readonly evidenceCredibilityThreshold = 0.4;
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
   * Process transcript segment - analyze for claims, evidence, and notable moments.
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

    // Analyze for claims
    const claimAnalysis = await this.analyzeForClaims(transcript, context);

    if (claimAnalysis.hasClaims) {
      for (const claim of claimAnalysis.claims) {
        if (claim.confidence >= this.claimConfidenceThreshold) {
          const claimId = `claim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          this.claims.set(claimId, { statement: claim.statement, speaker: claim.speaker });
          this.topics.add(claim.topic);

          // Track speaker positions
          const speakerClaims = this.speakerPositions.get(claim.speaker) || [];
          speakerClaims.push(claim.statement);
          this.speakerPositions.set(claim.speaker, speakerClaims);

          outputs.push({
            category: "CLAIM",
            title: `${claim.type.charAt(0).toUpperCase() + claim.type.slice(1)}: ${claim.topic}`,
            text: claim.statement,
            refs: [event.id],
            meta: {
              claimId,
              speaker: claim.speaker,
              claimType: claim.type,
              topic: claim.topic,
              confidence: claim.confidence,
            },
          });
        }
      }
    }

    // Analyze for evidence
    const evidenceAnalysis = await this.analyzeForEvidence(transcript, context);

    if (evidenceAnalysis.hasEvidence) {
      for (const evidence of evidenceAnalysis.evidence) {
        if (evidence.credibilityScore >= this.evidenceCredibilityThreshold) {
          outputs.push({
            category: "EVIDENCE_CARD",
            title: `${evidence.type.charAt(0).toUpperCase() + evidence.type.slice(1).replace("_", " ")}`,
            text: evidence.citation,
            refs: [event.id],
            meta: {
              evidenceType: evidence.type,
              supportsClaim: evidence.supportsClaim,
              credibilityScore: evidence.credibilityScore,
            },
          });
        }
      }
    }

    // Extract notable quotes from the debate
    const quotes = await this.extractDebateQuotes(transcript, context);
    outputs.push(...quotes);

    // Generate moderator prompts when appropriate
    const moderatorPrompts = await this.generateModeratorPrompts(transcript, context);
    outputs.push(...moderatorPrompts);

    return outputs;
  }

  /**
   * Process moment marker - capture explicit debate moments.
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

    // Treat markers as significant claims or moments
    outputs.push({
      category: "CLAIM",
      title: payload.label,
      text: payload.notes || payload.label,
      refs: [event.id],
      meta: {
        timestamp: payload.t,
        manuallyMarked: true,
        claimType: "assertion",
      },
    });

    // Generate moderator follow-up based on marker
    const followUpPrompt = await this.generateFollowUpPrompt(payload.label, payload.notes, context);
    if (followUpPrompt) {
      outputs.push({
        category: "MODERATOR_PROMPT",
        title: "Follow-up Question",
        text: followUpPrompt,
        refs: [event.id],
        meta: {
          basedOn: payload.label,
          promptType: "follow_up",
        },
      });
    }

    return outputs;
  }

  /**
   * Analyze transcript for claims and assertions.
   */
  private async analyzeForClaims(
    transcript: string,
    context: AgentContext
  ): Promise<ClaimAnalysis> {
    try {
      const prompt = `Analyze this debate transcript for claims and assertions.

DEBATE: ${context.title || "Untitled Debate"}
PARTICIPANTS: ${context.participants.join(", ")}

PREVIOUS TOPICS DISCUSSED:
${Array.from(this.topics).slice(-5).join(", ") || "None yet"}

TRANSCRIPT:
"""
${transcript.slice(-800)}
"""

Identify claims, assertions, counterclaims, and rebuttals. Look for:
- Main arguments being made
- Responses to opposing arguments
- Concessions or acknowledgments
- New points being introduced

Respond with JSON:
{
  "hasClaims": boolean,
  "claims": [
    {
      "statement": "The actual claim being made",
      "speaker": "Speaker name or identifier",
      "type": "assertion" | "counterclaim" | "rebuttal" | "concession",
      "confidence": 0.0-1.0,
      "topic": "Brief topic category"
    }
  ]
}

Only include claims with confidence > 0.5. If no clear claims, return hasClaims: false.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 600,
        temperature: 0.4,
        systemPrompt: getDebateSystemPrompt(context),
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to analyze for claims");
    }

    return { hasClaims: false, claims: [] };
  }

  /**
   * Analyze transcript for evidence and citations.
   */
  private async analyzeForEvidence(
    transcript: string,
    context: AgentContext
  ): Promise<EvidenceResult> {
    try {
      const prompt = `Identify evidence and citations in this debate transcript.

TRANSCRIPT:
"""
${transcript.slice(-600)}
"""

Look for:
- Statistics and data points
- References to sources, studies, or experts
- Specific examples given as evidence
- Expert opinions cited
- Personal anecdotes used as evidence

Respond with JSON:
{
  "hasEvidence": boolean,
  "evidence": [
    {
      "citation": "The evidence as stated",
      "type": "statistic" | "source" | "example" | "expert_opinion" | "anecdote",
      "supportsClaim": "What claim this evidence supports",
      "credibilityScore": 0.0-1.0
    }
  ]
}

Only include evidence that was actually cited. If no evidence, return hasEvidence: false.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 500,
        temperature: 0.3,
        systemPrompt: "You identify and evaluate evidence quality in debates.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to analyze for evidence");
    }

    return { hasEvidence: false, evidence: [] };
  }

  /**
   * Extract notable quotes from the debate.
   */
  private async extractDebateQuotes(
    transcript: string,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    if (transcript.length < 300) {
      return [];
    }

    try {
      const prompt = `Extract powerful or notable quotes from this debate.

TRANSCRIPT:
"""
${transcript.slice(-500)}
"""

Look for:
- Strong rhetorical statements
- Memorable one-liners
- Key arguments stated concisely
- Moments of sharp exchange

Respond with JSON:
{
  "quotes": [
    {
      "text": "The quote",
      "speaker": "Speaker name",
      "significance": "Why this quote matters"
    }
  ]
}

Only include 1-2 truly standout quotes. Return empty array if nothing notable.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 400,
        temperature: 0.5,
        systemPrompt: "You identify memorable moments in debates.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.quotes)) {
          return parsed.quotes.map((q: { text: string; speaker?: string; significance?: string }) => ({
            category: "QUOTE" as const,
            text: q.text,
            meta: {
              speaker: q.speaker,
              significance: q.significance,
              type: "debate_quote",
            },
          }));
        }
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to extract debate quotes");
    }

    return [];
  }

  /**
   * Generate moderator prompts based on debate flow.
   */
  private async generateModeratorPrompts(
    transcript: string,
    context: AgentContext
  ): Promise<AgentOutput[]> {
    // Only generate prompts periodically
    if (this.claims.size % 5 !== 0 || this.claims.size === 0) {
      return [];
    }

    try {
      const recentClaims = Array.from(this.claims.values()).slice(-5);
      const prompt = `Generate moderator questions or prompts for this debate.

DEBATE: ${context.title || "Debate"}
PARTICIPANTS: ${context.participants.join(", ")}

RECENT CLAIMS MADE:
${recentClaims.map((c) => `- ${c.speaker}: "${c.statement}"`).join("\n")}

CURRENT DISCUSSION:
"""
${transcript.slice(-400)}
"""

Generate 1-2 questions a moderator could ask to:
- Clarify positions
- Challenge unsupported claims
- Bridge to related topics
- Encourage deeper engagement

Respond with JSON:
{
  "prompts": [
    {
      "question": "The moderator question",
      "target": "Who should answer (or 'all')",
      "purpose": "What this question aims to achieve"
    }
  ]
}`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 400,
        temperature: 0.6,
        systemPrompt: "You are an expert debate moderator generating thoughtful questions.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.prompts)) {
          return parsed.prompts.map((p: { question: string; target?: string; purpose?: string }) => ({
            category: "MODERATOR_PROMPT" as const,
            text: p.question,
            meta: {
              target: p.target,
              purpose: p.purpose,
              promptType: "discussion_guide",
            },
          }));
        }
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate moderator prompts");
    }

    return [];
  }

  /**
   * Generate follow-up prompt for a marked moment.
   */
  private async generateFollowUpPrompt(
    label: string,
    notes: string | undefined,
    context: AgentContext
  ): Promise<string | null> {
    try {
      const prompt = `Generate a moderator follow-up question for this debate moment.

DEBATE: ${context.title || "Debate"}
MOMENT MARKED: ${label}
${notes ? `NOTES: ${notes}` : ""}

Create a single probing question that:
- Digs deeper into this moment
- Encourages elaboration or challenge
- Maintains fair moderation

Respond with ONLY the question, no explanation.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 100,
        temperature: 0.6,
        systemPrompt: "You are a skilled debate moderator.",
      });

      return response.content.trim();
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to generate follow-up prompt");
      return null;
    }
  }

  /**
   * Get debate statistics.
   */
  getDebateStats(): {
    totalClaims: number;
    topics: string[];
    speakerBreakdown: Record<string, number>;
  } {
    const speakerBreakdown: Record<string, number> = {};
    for (const [speaker, claims] of this.speakerPositions) {
      speakerBreakdown[speaker] = claims.length;
    }

    return {
      totalClaims: this.claims.size,
      topics: Array.from(this.topics),
      speakerBreakdown,
    };
  }

  /**
   * Reset debate tracking for new session.
   */
  resetDebateContext(): void {
    this.claims.clear();
    this.topics.clear();
    this.speakerPositions.clear();
  }
}

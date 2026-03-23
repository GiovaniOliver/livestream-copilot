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
 * Raw evidence detection result from LLM analysis.
 */
interface RawEvidenceResult {
  hasEvidence: boolean;
  evidence: Array<{
    citation: string;
    type: "statistic" | "source" | "example" | "expert_opinion" | "anecdote";
    supportsClaim: string;
    sourceReliability?: number;
    isRecent?: boolean;
    recencyIndicator?: string;
    hasCorroboration?: boolean;
    corroboratingDetails?: string;
  }>;
}

/**
 * Evidence detection result with computed credibility scores.
 */
interface EvidenceResult {
  hasEvidence: boolean;
  evidence: Array<{
    citation: string;
    type: "statistic" | "source" | "example" | "expert_opinion" | "anecdote";
    supportsClaim: string;
    credibilityScore: number;
    credibilityBreakdown: CredibilityBreakdown;
  }>;
}

/**
 * Breakdown of how the credibility score was computed.
 */
interface CredibilityBreakdown {
  sourceReliability: number;
  recencyScore: number;
  relevanceScore: number;
  corroborationScore: number;
  evidenceTypeWeight: number;
  rawScores: {
    sourceReliability: number;
    recency: number;
    relevance: number;
    corroboration: number;
    typeWeight: number;
  };
}

/**
 * Weights for each credibility factor.
 */
const CREDIBILITY_WEIGHTS = {
  sourceReliability: 0.30,
  recency: 0.15,
  relevance: 0.25,
  corroboration: 0.15,
  evidenceType: 0.15,
} as const;

/**
 * Evidence type weight mapping.
 * Statistics carry the most weight; anecdotes the least.
 */
const EVIDENCE_TYPE_WEIGHTS: Record<string, number> = {
  statistic: 1.0,
  source: 0.85,
  expert_opinion: 0.7,
  example: 0.5,
  anecdote: 0.3,
};

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
              credibilityBreakdown: {
                sourceReliability: evidence.credibilityBreakdown.rawScores.sourceReliability,
                recency: evidence.credibilityBreakdown.rawScores.recency,
                relevance: evidence.credibilityBreakdown.rawScores.relevance,
                corroboration: evidence.credibilityBreakdown.rawScores.corroboration,
                evidenceTypeWeight: evidence.credibilityBreakdown.rawScores.typeWeight,
              },
              weights: CREDIBILITY_WEIGHTS,
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
   * Extracts raw evidence factors from LLM, then computes credibility scores deterministically.
   */
  private async analyzeForEvidence(
    transcript: string,
    context: AgentContext
  ): Promise<EvidenceResult> {
    try {
      const activeClaims = Array.from(this.claims.values())
        .slice(-5)
        .map((c) => c.statement);

      const rawResult = await this.extractRawEvidence(transcript, activeClaims);

      if (!rawResult.hasEvidence || rawResult.evidence.length === 0) {
        return { hasEvidence: false, evidence: [] };
      }

      const scoredEvidence = rawResult.evidence.map((raw) => {
        const breakdown = this.computeCredibilityScore(raw, activeClaims);
        return {
          citation: raw.citation,
          type: raw.type,
          supportsClaim: raw.supportsClaim,
          credibilityScore: this.computeFinalScore(breakdown),
          credibilityBreakdown: breakdown,
        };
      });

      return {
        hasEvidence: true,
        evidence: scoredEvidence,
      };
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to analyze for evidence");
    }

    return { hasEvidence: false, evidence: [] };
  }

  /**
   * Extract raw evidence factors from the LLM.
   * The LLM identifies evidence and provides qualitative assessments;
   * credibility scoring is done deterministically afterward.
   */
  private async extractRawEvidence(
    transcript: string,
    activeClaims: string[]
  ): Promise<RawEvidenceResult> {
    try {
      const prompt = `Identify evidence and citations in this debate transcript.

TRANSCRIPT:
"""
${transcript.slice(-600)}
"""

ACTIVE CLAIMS IN DEBATE:
${activeClaims.length > 0 ? activeClaims.map((c) => `- ${c}`).join("\n") : "None identified yet"}

Look for:
- Statistics and data points
- References to sources, studies, or experts
- Specific examples given as evidence
- Expert opinions cited
- Personal anecdotes used as evidence

For each piece of evidence, assess:
1. sourceReliability (0.0-1.0): How reliable is the source? Named institutions/journals = high (0.8-1.0), named experts = medium-high (0.6-0.8), unnamed "studies show" = low (0.2-0.4), no source = very low (0.0-0.2)
2. isRecent: Does the evidence reference recent data/events? true/false
3. recencyIndicator: Any time reference mentioned (e.g., "2024 study", "last year", "decades ago")
4. hasCorroboration: Is this evidence supported by other evidence or claims in the debate? true/false
5. corroboratingDetails: Brief note on what corroborates it, if anything

Respond with JSON:
{
  "hasEvidence": boolean,
  "evidence": [
    {
      "citation": "The evidence as stated",
      "type": "statistic" | "source" | "example" | "expert_opinion" | "anecdote",
      "supportsClaim": "What claim this evidence supports",
      "sourceReliability": 0.0-1.0,
      "isRecent": true/false,
      "recencyIndicator": "time reference or null",
      "hasCorroboration": true/false,
      "corroboratingDetails": "what corroborates it or null"
    }
  ]
}

Only include evidence that was actually cited. If no evidence, return hasEvidence: false.`;

      const response = await complete({
        messages: [{ role: "user", content: prompt }],
        model: this.config.model,
        maxTokens: 600,
        temperature: 0.3,
        systemPrompt: "You identify and evaluate evidence quality in debates. Be precise about source reliability assessments.",
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.agentLogger.error({ err: error }, "Failed to extract raw evidence");
    }

    return { hasEvidence: false, evidence: [] };
  }

  /**
   * Compute the credibility breakdown for a piece of evidence.
   * Each factor is scored 0-1 and weighted to produce a final composite score.
   */
  private computeCredibilityScore(
    raw: RawEvidenceResult["evidence"][number],
    activeClaims: string[]
  ): CredibilityBreakdown {
    // 1. Source reliability: use LLM assessment, clamp to 0-1
    const sourceReliability = Math.max(0, Math.min(1, raw.sourceReliability ?? 0.3));

    // 2. Recency score: recent evidence scores higher
    const recencyScore = this.scoreRecency(raw.isRecent, raw.recencyIndicator);

    // 3. Relevance: how well the evidence connects to active claims
    const relevanceScore = this.scoreRelevance(raw.supportsClaim, activeClaims);

    // 4. Corroboration: evidence supported by other evidence scores higher
    const corroborationScore = raw.hasCorroboration ? 0.8 : 0.2;

    // 5. Evidence type weight: statistics > expert_opinion > example > anecdote
    const evidenceTypeWeight = EVIDENCE_TYPE_WEIGHTS[raw.type] ?? 0.5;

    return {
      sourceReliability: sourceReliability * CREDIBILITY_WEIGHTS.sourceReliability,
      recencyScore: recencyScore * CREDIBILITY_WEIGHTS.recency,
      relevanceScore: relevanceScore * CREDIBILITY_WEIGHTS.relevance,
      corroborationScore: corroborationScore * CREDIBILITY_WEIGHTS.corroboration,
      evidenceTypeWeight: evidenceTypeWeight * CREDIBILITY_WEIGHTS.evidenceType,
      rawScores: {
        sourceReliability,
        recency: recencyScore,
        relevance: relevanceScore,
        corroboration: corroborationScore,
        typeWeight: evidenceTypeWeight,
      },
    };
  }

  /**
   * Compute the final credibility score from a breakdown.
   * Returns a value between 0 and 1.
   */
  private computeFinalScore(breakdown: CredibilityBreakdown): number {
    const raw =
      breakdown.sourceReliability +
      breakdown.recencyScore +
      breakdown.relevanceScore +
      breakdown.corroborationScore +
      breakdown.evidenceTypeWeight;

    return Math.round(raw * 100) / 100;
  }

  /**
   * Score recency of evidence based on time indicators.
   */
  private scoreRecency(
    isRecent: boolean | undefined,
    recencyIndicator: string | undefined
  ): number {
    if (!recencyIndicator && isRecent === undefined) {
      return 0.5; // Unknown recency gets neutral score
    }

    if (isRecent === false) {
      return 0.3;
    }

    if (!recencyIndicator) {
      return isRecent ? 0.7 : 0.5;
    }

    const indicator = recencyIndicator.toLowerCase();

    // Very recent references
    if (/\b(2025|2026|this year|this month|today|yesterday|last week)\b/.test(indicator)) {
      return 1.0;
    }

    // Recent references
    if (/\b(2024|2023|last year|recent|latest|new)\b/.test(indicator)) {
      return 0.8;
    }

    // Moderately recent
    if (/\b(2020|2021|2022|few years|past decade)\b/.test(indicator)) {
      return 0.6;
    }

    // Older references
    if (/\b(20[01]\d|decades? ago|historical|classic)\b/.test(indicator)) {
      return 0.3;
    }

    return isRecent ? 0.7 : 0.4;
  }

  /**
   * Score how relevant the evidence is to active claims in the debate.
   */
  private scoreRelevance(
    supportsClaim: string,
    activeClaims: string[]
  ): number {
    if (!supportsClaim || activeClaims.length === 0) {
      return 0.5; // Neutral when no claims to compare against
    }

    const supportsLower = supportsClaim.toLowerCase();
    const supportsWords = new Set(
      supportsLower.split(/\s+/).filter((w) => w.length > 3)
    );

    let bestOverlap = 0;

    for (const claim of activeClaims) {
      const claimWords = new Set(
        claim.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      );

      let overlap = 0;
      for (const word of supportsWords) {
        if (claimWords.has(word)) {
          overlap += 1;
        }
      }

      const unionSize = Math.max(1, new Set([...supportsWords, ...claimWords]).size);
      const overlapRatio = overlap / unionSize;
      bestOverlap = Math.max(bestOverlap, overlapRatio);
    }

    // Scale: 0 overlap = 0.2 (some baseline relevance since LLM matched it),
    // perfect overlap = 1.0
    return Math.min(1.0, 0.2 + bestOverlap * 3.2);
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

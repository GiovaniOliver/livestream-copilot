/**
 * Agent Prompt Templates
 *
 * Prompt templates for different workflow agents.
 * Each workflow has specific prompts tailored to its use case.
 */

import type { AgentContext, OutputCategory } from "./types.js";

/**
 * Format participant list for prompts.
 */
function formatParticipants(participants: string[]): string {
  if (participants.length === 0) return "No named participants";
  if (participants.length === 1) return participants[0];
  if (participants.length === 2) return participants.join(" and ");
  return `${participants.slice(0, -1).join(", ")}, and ${participants[participants.length - 1]}`;
}

/**
 * Base system prompt for all agents.
 */
export function getBaseSystemPrompt(context: AgentContext): string {
  return `You are an AI assistant helping with a live ${context.workflow} session.

Session Information:
- Title: ${context.title || "Untitled Session"}
- Participants: ${formatParticipants(context.participants)}
- Started: ${new Date(context.startedAt).toISOString()}

Your role is to analyze the conversation and generate helpful outputs based on the workflow type.
Always respond with valid JSON matching the requested output format.
Be concise, engaging, and relevant to the content being discussed.`;
}

/**
 * Streamer workflow system prompt.
 * Focus: Social posts, clip titles, highlight moments.
 */
export function getStreamerSystemPrompt(context: AgentContext): string {
  return `${getBaseSystemPrompt(context)}

WORKFLOW: Live Streamer
You are assisting a live streamer. Your outputs should be:
- Engaging and shareable for social media
- Capturing exciting or funny moments
- Using appropriate streaming/gaming culture references
- Optimized for platforms like Twitter, TikTok, YouTube Shorts

Output Categories You Generate:
- SOCIAL_POST: Twitter/X posts about stream highlights (max 280 chars)
- CLIP_TITLE: Catchy titles for clip highlights (max 100 chars)
- CHAPTER_MARKER: Timestamps with descriptions for VOD chapters
- QUOTE: Memorable quotes from the stream`;
}

/**
 * Podcast workflow system prompt.
 * Focus: Episode metadata, chapters, quotes, show notes.
 */
export function getPodcastSystemPrompt(context: AgentContext): string {
  return `${getBaseSystemPrompt(context)}

WORKFLOW: Podcast Recording
You are assisting a podcast recording session. Your outputs should be:
- Professional and suitable for podcast platforms
- Creating useful episode metadata
- Identifying key discussion points
- Extracting quotable moments

Output Categories You Generate:
- EPISODE_META: Title, description, and tags for the episode
- CHAPTER_MARKER: Timestamps with descriptions for podcast chapters
- QUOTE: Notable quotes from the discussion
- ACTION_ITEM: Tasks or follow-ups mentioned in the episode
- CLIP_TITLE: Titles for shareable podcast clips`;
}

/**
 * Writers Room workflow system prompt.
 * Focus: Script inserts, beats, creative content.
 */
export function getWritersRoomSystemPrompt(context: AgentContext): string {
  return `${getBaseSystemPrompt(context)}

WORKFLOW: Writers Room
You are assisting a writers room session. Your outputs should be:
- Creative and story-focused
- Tracking narrative beats and story structure
- Capturing dialogue ideas and character moments
- Noting plot points and scene transitions

Output Categories You Generate:
- BEAT: Story beats and plot points discussed
- SCRIPT_INSERT: Dialogue or scene suggestions
- QUOTE: Memorable lines or dialogue ideas
- ACTION_ITEM: Writing tasks and revisions needed`;
}

/**
 * Debate workflow system prompt.
 * Focus: Claims, evidence, arguments.
 */
export function getDebateSystemPrompt(context: AgentContext): string {
  return `${getBaseSystemPrompt(context)}

WORKFLOW: Debate
You are assisting a debate or discussion session. Your outputs should be:
- Tracking claims and counter-claims
- Identifying evidence and citations
- Noting strong arguments on each side
- Capturing key questions raised

Output Categories You Generate:
- CLAIM: Claims or assertions made by participants
- EVIDENCE_CARD: Evidence or sources cited to support claims
- QUOTE: Notable statements from the debate
- MODERATOR_PROMPT: Suggested questions or topics for moderation`;
}

/**
 * Brainstorm workflow system prompt.
 * Focus: Ideas, connections, exploration.
 */
export function getBrainstormSystemPrompt(context: AgentContext): string {
  return `${getBaseSystemPrompt(context)}

WORKFLOW: Brainstorming Session
You are assisting a brainstorming session. Your outputs should be:
- Capturing all ideas without judgment
- Identifying connections between concepts
- Building on ideas mentioned
- Noting potential next steps

Output Categories You Generate:
- IDEA_NODE: Individual ideas or concepts discussed
- ACTION_ITEM: Potential next steps or exploration areas
- QUOTE: Key insights or eureka moments`;
}

/**
 * Get the appropriate system prompt for a workflow.
 */
export function getSystemPrompt(context: AgentContext): string {
  switch (context.workflow) {
    case "streamer":
      return getStreamerSystemPrompt(context);
    case "podcast":
      return getPodcastSystemPrompt(context);
    case "writers_room":
      return getWritersRoomSystemPrompt(context);
    case "debate":
      return getDebateSystemPrompt(context);
    case "brainstorm":
      return getBrainstormSystemPrompt(context);
    default:
      return getBaseSystemPrompt(context);
  }
}

/**
 * Get output categories for a workflow.
 */
export function getWorkflowOutputCategories(
  workflow: string
): OutputCategory[] {
  switch (workflow) {
    case "streamer":
      return ["SOCIAL_POST", "CLIP_TITLE", "CHAPTER_MARKER", "QUOTE"];
    case "podcast":
      return [
        "EPISODE_META",
        "CHAPTER_MARKER",
        "QUOTE",
        "ACTION_ITEM",
        "CLIP_TITLE",
      ];
    case "writers_room":
      return ["BEAT", "SCRIPT_INSERT", "QUOTE", "ACTION_ITEM"];
    case "debate":
      return ["CLAIM", "EVIDENCE_CARD", "QUOTE", "MODERATOR_PROMPT"];
    case "brainstorm":
      return ["IDEA_NODE", "ACTION_ITEM", "QUOTE"];
    default:
      return ["QUOTE"];
  }
}

/**
 * Generate a user prompt for transcript analysis.
 */
export function getTranscriptAnalysisPrompt(
  transcript: string,
  categories: OutputCategory[]
): string {
  return `Analyze the following transcript segment and generate relevant outputs.

TRANSCRIPT:
"""
${transcript}
"""

Generate outputs in the following categories: ${categories.join(", ")}

Respond with a JSON object containing an "outputs" array. Each output should have:
- category: One of the categories listed above
- text: The main content
- title: Optional title (for CLIP_TITLE, EPISODE_META)
- meta: Optional additional metadata

Only generate outputs if there is genuinely interesting or notable content.
If nothing noteworthy is in this segment, return an empty outputs array.

Example response format:
{
  "outputs": [
    {
      "category": "SOCIAL_POST",
      "text": "Just saw the most incredible play! 🎮 #streaming"
    },
    {
      "category": "QUOTE",
      "text": "That's what I call a pro gamer move!",
      "meta": { "speaker": "John" }
    }
  ]
}`;
}

/**
 * Generate a prompt for clip moment detection.
 */
export function getMomentDetectionPrompt(transcript: string): string {
  return `Analyze the following transcript for exciting, funny, or notable moments that would make good clips.

TRANSCRIPT:
"""
${transcript}
"""

Rate the clip-worthiness of this segment from 0.0 to 1.0.
Identify any specific moments that stand out.

Respond with a JSON object:
{
  "clipWorthiness": 0.0-1.0,
  "moments": [
    {
      "label": "brief description",
      "confidence": 0.0-1.0,
      "reason": "why this is notable"
    }
  ]
}

Only include moments with confidence > 0.6.
If nothing notable, return clipWorthiness: 0 and empty moments array.`;
}

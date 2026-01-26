/**
 * Podcast Console Actions
 *
 * Purpose: Assist podcast production with chapters, notes, quotes, and promotional content.
 */

import type { AgentAction } from "@/types/actions";

/**
 * Detect Chapter
 * Identifies topic changes for chapter markers
 */
export const detectChapter: AgentAction = {
  actionId: "podcast.detect_chapter",
  label: "Detect Chapter",
  description: "Identifies topic changes for chapter markers",
  triggerType: "auto",
  autoTriggerCondition:
    "When topic shift detected (semantic similarity < 0.5)",
  inputs: [
    {
      name: "transcript",
      type: "transcript",
      required: true,
      description: "Current transcript segment",
    },
    {
      name: "previous_topics",
      type: "context",
      required: false,
      description: "List of previously identified topics",
    },
  ],
  outputs: ["CHAPTER_MARKER"],
  estimatedTokens: "medium",
  icon: "bookmark",
  cooldownMs: 30000,
  requiresTranscript: true,
  minTranscriptLength: 150,
};

/**
 * Extract Quote
 * Pulls notable, shareable quotes
 */
export const extractQuote: AgentAction = {
  actionId: "podcast.extract_quote",
  label: "Extract Quote",
  description: "Pulls notable, shareable quotes from the conversation",
  triggerType: "both",
  autoTriggerCondition: "When quote confidence > 0.6",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript segment to analyze for quotes",
    },
  ],
  outputs: ["QUOTE"],
  estimatedTokens: "low",
  icon: "chat-bubble-left-right",
  cooldownMs: 15000,
  requiresTranscript: true,
  minTranscriptLength: 50,
};

/**
 * Generate Show Notes
 * Creates structured show notes
 */
export const generateShowNotes: AgentAction = {
  actionId: "podcast.generate_show_notes",
  label: "Generate Show Notes",
  description: "Creates structured show notes for the episode",
  triggerType: "manual",
  inputs: [
    {
      name: "full_transcript",
      type: "transcript",
      required: true,
      description: "Complete episode transcript",
    },
    {
      name: "topics",
      type: "context",
      required: false,
      description: "List of discussed topics",
    },
    {
      name: "guests",
      type: "context",
      required: false,
      description: "Guest information",
    },
  ],
  outputs: ["EPISODE_META"],
  estimatedTokens: "high",
  icon: "document-text",
  cooldownMs: 60000,
  requiresTranscript: true,
  minTranscriptLength: 500,
};

/**
 * Generate Episode Description
 * Writes compelling episode description
 */
export const generateEpisodeDescription: AgentAction = {
  actionId: "podcast.generate_episode_description",
  label: "Episode Description",
  description: "Writes compelling episode description for podcast platforms",
  triggerType: "manual",
  inputs: [
    {
      name: "transcript_summary",
      type: "transcript",
      required: true,
      description: "Summary or full transcript",
    },
    {
      name: "topics",
      type: "context",
      required: false,
      description: "Key topics covered",
    },
    {
      name: "guests",
      type: "context",
      required: false,
      description: "Guest information",
    },
  ],
  outputs: ["EPISODE_META"],
  estimatedTokens: "medium",
  icon: "newspaper",
  cooldownMs: undefined,
  requiresTranscript: true,
};

/**
 * Detect Soundbite
 * Identifies compelling audio clips
 */
export const detectSoundbite: AgentAction = {
  actionId: "podcast.detect_soundbite",
  label: "Detect Soundbite",
  description: "Identifies compelling audio clips for promotion",
  triggerType: "auto",
  autoTriggerCondition: "Every 60s, when quote confidence > 0.6",
  inputs: [
    {
      name: "transcript",
      type: "transcript",
      required: true,
      description: "Current transcript segment",
    },
    {
      name: "audio_energy",
      type: "context",
      required: false,
      description: "Audio energy/emotion metrics",
    },
  ],
  outputs: ["CHAPTER_MARKER"],
  estimatedTokens: "medium",
  icon: "speaker-wave",
  cooldownMs: 30000,
  requiresTranscript: true,
};

/**
 * Generate Guest Introduction
 * Creates guest bio/introduction text
 */
export const generateGuestIntro: AgentAction = {
  actionId: "podcast.generate_guest_intro",
  label: "Guest Introduction",
  description: "Creates guest bio/introduction text",
  triggerType: "manual",
  inputs: [
    {
      name: "guest_info",
      type: "user_input",
      required: true,
      description: "Guest information and background",
    },
    {
      name: "context",
      type: "context",
      required: false,
      description: "Episode context and theme",
    },
  ],
  outputs: ["EPISODE_META"],
  estimatedTokens: "low",
  icon: "user",
  cooldownMs: undefined,
};

/**
 * Summarize Topic
 * Creates summary of discussed topic
 */
export const summarizeTopic: AgentAction = {
  actionId: "podcast.summarize_topic",
  label: "Summarize Topic",
  description: "Creates a concise summary of a discussed topic",
  triggerType: "both",
  inputs: [
    {
      name: "topic_transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript segment covering the topic",
    },
  ],
  outputs: ["EPISODE_META"],
  estimatedTokens: "medium",
  icon: "clipboard-document-list",
  cooldownMs: 30000,
  requiresTranscript: true,
  minTranscriptLength: 100,
};

/**
 * Detect Sponsor Read
 * Identifies sponsor segments for timestamps
 */
export const detectSponsorRead: AgentAction = {
  actionId: "podcast.detect_sponsor_read",
  label: "Detect Sponsor Read",
  description: "Identifies sponsor segments for timestamps",
  triggerType: "auto",
  autoTriggerCondition: "When sponsor-related keywords detected",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Current transcript segment",
    },
  ],
  outputs: ["CHAPTER_MARKER"],
  estimatedTokens: "low",
  icon: "banknotes",
  cooldownMs: 60000,
  requiresTranscript: true,
};

/**
 * Extract Action Items
 * Pulls mentioned tasks, links, recommendations
 */
export const extractActionItems: AgentAction = {
  actionId: "podcast.extract_action_items",
  label: "Extract Action Items",
  description: "Pulls mentioned tasks, links, and recommendations",
  triggerType: "both",
  autoTriggerCondition: "When action-oriented language detected",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript segment to analyze",
    },
  ],
  outputs: ["ACTION_ITEM"],
  estimatedTokens: "medium",
  icon: "check-circle",
  cooldownMs: 30000,
  requiresTranscript: true,
};

/**
 * Generate Promo Clip Text
 * Creates promotional text for clip teasers
 */
export const generatePromoClipText: AgentAction = {
  actionId: "podcast.generate_promo_clip_text",
  label: "Promo Clip Text",
  description: "Creates promotional text for clip teasers",
  triggerType: "manual",
  inputs: [
    {
      name: "clip_context",
      type: "context",
      required: true,
      description: "Context about the clip",
    },
    {
      name: "episode_title",
      type: "user_input",
      required: false,
      description: "Episode title for reference",
    },
  ],
  outputs: ["SOCIAL_POST"],
  estimatedTokens: "low",
  icon: "film",
  cooldownMs: undefined,
};

/**
 * Generate Timestamps
 * Creates YouTube-style timestamp list
 */
export const generateTimestamps: AgentAction = {
  actionId: "podcast.generate_timestamps",
  label: "Generate Timestamps",
  description: "Creates YouTube-style timestamp list for the episode",
  triggerType: "manual",
  inputs: [
    {
      name: "chapters",
      type: "artifact",
      required: true,
      description: "List of detected chapters",
    },
    {
      name: "full_transcript",
      type: "transcript",
      required: true,
      description: "Complete episode transcript",
    },
  ],
  outputs: ["CHAPTER_MARKER"],
  estimatedTokens: "medium",
  icon: "clock",
  cooldownMs: undefined,
  requiresTranscript: true,
};

/**
 * All Podcast Console actions
 */
export const podcastActions: AgentAction[] = [
  detectChapter,
  extractQuote,
  generateShowNotes,
  generateEpisodeDescription,
  detectSoundbite,
  generateGuestIntro,
  summarizeTopic,
  detectSponsorRead,
  extractActionItems,
  generatePromoClipText,
  generateTimestamps,
];

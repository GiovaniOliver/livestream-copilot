/**
 * Content Creator (Streamer) Actions
 *
 * Purpose: Help streamers create clips, social content, and engagement during live sessions.
 */

import type { AgentAction } from "@/types/actions";

/**
 * Detect Clip Moment
 * Analyzes transcript for clip-worthy moments (funny, epic, fails)
 */
export const detectClipMoment: AgentAction = {
  actionId: "content_creator.detect_clip_moment",
  label: "Detect Clip Moment",
  description:
    "Analyzes transcript for clip-worthy moments including funny, epic, or fail moments",
  triggerType: "auto",
  autoTriggerCondition:
    "Every 30s of new transcript, or on high-energy audio detection",
  inputs: [
    {
      name: "transcript",
      type: "transcript",
      required: true,
      description: "Recent transcript segment to analyze",
    },
    {
      name: "mood_context",
      type: "context",
      required: false,
      description: "Current mood/energy context of the stream",
    },
  ],
  outputs: ["CHAPTER_MARKER"],
  estimatedTokens: "medium",
  icon: "video-camera",
  cooldownMs: 15000,
  requiresTranscript: true,
  minTranscriptLength: 100,
};

/**
 * Generate Clip Title
 * Creates catchy, clickable title for a clip
 */
export const generateClipTitle: AgentAction = {
  actionId: "content_creator.generate_clip_title",
  label: "Generate Clip Title",
  description: "Creates catchy, clickable title for a clip",
  triggerType: "both",
  autoTriggerCondition: "When clip is created or moment is marked",
  inputs: [
    {
      name: "clip_context",
      type: "context",
      required: true,
      description: "Context about the clip content",
    },
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript of the clip moment",
    },
  ],
  outputs: ["CLIP_TITLE"],
  estimatedTokens: "low",
  icon: "pencil",
  cooldownMs: undefined,
  requiresTranscript: true,
};

/**
 * Generate Social Post
 * Creates platform-optimized social media post
 */
export const generateSocialPost: AgentAction = {
  actionId: "content_creator.generate_social_post",
  label: "Generate Social Post",
  description: "Creates platform-optimized social media post",
  triggerType: "both",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Relevant transcript content",
    },
    {
      name: "platform",
      type: "user_input",
      required: true,
      description: "Target platform (Twitter, Instagram, TikTok, etc.)",
    },
    {
      name: "clip_ref",
      type: "artifact",
      required: false,
      description: "Reference to associated clip",
    },
  ],
  outputs: ["SOCIAL_POST"],
  estimatedTokens: "low",
  icon: "share",
  cooldownMs: undefined,
  requiresTranscript: true,
};

/**
 * Generate Hashtags
 * Generates trending/relevant hashtags for content
 */
export const generateHashtags: AgentAction = {
  actionId: "content_creator.generate_hashtags",
  label: "Generate Hashtags",
  description: "Generates trending/relevant hashtags for content",
  triggerType: "manual",
  inputs: [
    {
      name: "transcript",
      type: "transcript",
      required: true,
      description: "Transcript content to analyze for hashtags",
    },
    {
      name: "platform",
      type: "user_input",
      required: true,
      description: "Target platform",
    },
    {
      name: "content_type",
      type: "user_input",
      required: false,
      description: "Type of content (gaming, IRL, music, etc.)",
    },
  ],
  outputs: ["SOCIAL_POST"],
  estimatedTokens: "low",
  icon: "hashtag",
  cooldownMs: undefined,
  requiresTranscript: true,
};

/**
 * Generate Thumbnail Text
 * Creates text overlay suggestions for thumbnails
 */
export const generateThumbnailText: AgentAction = {
  actionId: "content_creator.generate_thumbnail_text",
  label: "Thumbnail Text",
  description: "Creates text overlay suggestions for thumbnails",
  triggerType: "manual",
  inputs: [
    {
      name: "clip_context",
      type: "context",
      required: true,
      description: "Context about the clip/video",
    },
    {
      name: "title",
      type: "user_input",
      required: false,
      description: "Video/clip title for reference",
    },
  ],
  outputs: ["CLIP_TITLE"],
  estimatedTokens: "low",
  icon: "photo",
  cooldownMs: undefined,
};

/**
 * Highlight Moments
 * Identifies and ranks best moments from session
 */
export const highlightMoments: AgentAction = {
  actionId: "content_creator.highlight_moments",
  label: "Highlight Moments",
  description: "Identifies and ranks best moments from session",
  triggerType: "auto",
  autoTriggerCondition: "At session end, or every 15 minutes",
  inputs: [
    {
      name: "full_transcript",
      type: "transcript",
      required: true,
      description: "Complete session transcript",
    },
    {
      name: "moments_list",
      type: "artifact",
      required: false,
      description: "Previously identified moments",
    },
  ],
  outputs: ["CHAPTER_MARKER"],
  estimatedTokens: "high",
  icon: "star",
  cooldownMs: 120000,
  requiresTranscript: true,
  minTranscriptLength: 500,
};

/**
 * Generate Engagement Hook
 * Creates opening hooks for clips/posts
 */
export const generateEngagementHook: AgentAction = {
  actionId: "content_creator.generate_engagement_hook",
  label: "Engagement Hook",
  description: "Creates opening hooks for clips/posts",
  triggerType: "both",
  autoTriggerCondition: "When clip_worthiness > 0.7",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript of the clip/content",
    },
    {
      name: "target_platform",
      type: "user_input",
      required: true,
      description: "Target platform for the hook",
    },
  ],
  outputs: ["SOCIAL_POST"],
  estimatedTokens: "low",
  icon: "sparkles",
  cooldownMs: 30000,
  requiresTranscript: true,
};

/**
 * Generate CTA
 * Creates call-to-action text for posts
 */
export const generateCTA: AgentAction = {
  actionId: "content_creator.generate_cta",
  label: "Generate CTA",
  description: "Creates call-to-action text for posts",
  triggerType: "manual",
  inputs: [
    {
      name: "content_context",
      type: "context",
      required: true,
      description: "Context of the content",
    },
    {
      name: "goal",
      type: "user_input",
      required: true,
      description: "Goal of the CTA (subscribe, follow, etc.)",
    },
    {
      name: "platform",
      type: "user_input",
      required: true,
      description: "Target platform",
    },
  ],
  outputs: ["SOCIAL_POST"],
  estimatedTokens: "low",
  icon: "megaphone",
  cooldownMs: undefined,
};

/**
 * Rate Clip Worthiness
 * Scores transcript segment for viral potential
 */
export const rateClipWorthiness: AgentAction = {
  actionId: "content_creator.rate_clip_worthiness",
  label: "Rate Clip Worthiness",
  description: "Scores transcript segment for viral potential",
  triggerType: "auto",
  autoTriggerCondition: "When clip is created or moment is marked",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript of the potential clip",
    },
  ],
  outputs: ["CHAPTER_MARKER"],
  estimatedTokens: "low",
  icon: "chart-bar",
  cooldownMs: 15000,
  requiresTranscript: true,
  minTranscriptLength: 50,
};

/**
 * Generate Thread
 * Creates multi-post thread from content
 */
export const generateThread: AgentAction = {
  actionId: "content_creator.generate_thread",
  label: "Generate Thread",
  description: "Creates multi-post thread from content",
  triggerType: "manual",
  inputs: [
    {
      name: "transcript_segment",
      type: "transcript",
      required: true,
      description: "Transcript content for the thread",
    },
    {
      name: "platform",
      type: "user_input",
      required: true,
      description: "Target platform (Twitter/X, Threads, etc.)",
    },
  ],
  outputs: ["SOCIAL_POST"],
  estimatedTokens: "medium",
  icon: "queue-list",
  cooldownMs: undefined,
  requiresTranscript: true,
  minTranscriptLength: 200,
};

/**
 * All Content Creator actions
 */
export const contentCreatorActions: AgentAction[] = [
  detectClipMoment,
  generateClipTitle,
  generateSocialPost,
  generateHashtags,
  generateThumbnailText,
  highlightMoments,
  generateEngagementHook,
  generateCTA,
  rateClipWorthiness,
  generateThread,
];

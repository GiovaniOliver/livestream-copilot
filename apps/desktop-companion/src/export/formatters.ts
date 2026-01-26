/**
 * Platform-specific formatters for social media content
 *
 * Provides formatting functions that optimize content for each platform's
 * character limits, threading support, and style conventions.
 */

import type {
  SocialPlatform,
  PlatformConstraints,
  FormattedPost,
  FormatOptions,
  ThreadSplitOptions,
} from './types.js';
import { PLATFORM_CONSTRAINTS } from './types.js';

/**
 * Format text for a specific platform
 */
export function formatForPlatform(
  text: string,
  platform: SocialPlatform,
  options: FormatOptions = {}
): FormattedPost {
  const constraints = PLATFORM_CONSTRAINTS[platform];
  const warnings: string[] = [];

  // Extract and optimize hashtags
  const { content: contentWithoutHashtags, hashtags } = extractHashtags(text);

  let formattedContent = contentWithoutHashtags;

  // Apply platform-specific formatting
  switch (platform) {
    case 'TWITTER':
      formattedContent = formatForTwitter(formattedContent, hashtags, options, constraints);
      break;
    case 'LINKEDIN':
      formattedContent = formatForLinkedIn(formattedContent, hashtags, options, constraints);
      break;
    case 'INSTAGRAM':
      formattedContent = formatForInstagram(formattedContent, hashtags, options, constraints);
      break;
    case 'TIKTOK':
      formattedContent = formatForTikTok(formattedContent, hashtags, options, constraints);
      break;
    case 'YOUTUBE':
      formattedContent = formatForYouTube(formattedContent, hashtags, options, constraints);
      break;
    case 'FACEBOOK':
      formattedContent = formatForFacebook(formattedContent, hashtags, options, constraints);
      break;
    case 'THREADS':
      formattedContent = formatForThreads(formattedContent, hashtags, options, constraints);
      break;
    case 'BLUESKY':
      formattedContent = formatForBluesky(formattedContent, hashtags, options, constraints);
      break;
  }

  // Check if content needs to be split into threads
  const needsThread = formattedContent.length > constraints.maxLength;
  const isThread = needsThread && constraints.supportsThreads;

  let finalContent = formattedContent;
  let threadParts: string[] | undefined;

  if (isThread) {
    threadParts = splitIntoThread(formattedContent, {
      maxLength: constraints.maxLength,
      preserveSentences: true,
      addNumbers: true,
      addContinuationMarkers: platform === 'TWITTER',
    });
    finalContent = threadParts[0];
  } else if (needsThread && !constraints.supportsThreads) {
    // Truncate if platform doesn't support threads
    finalContent = truncateText(formattedContent, constraints.maxLength);
    warnings.push(`Content truncated to ${constraints.maxLength} characters`);
  }

  const characterCount = finalContent.length;
  const truncated = characterCount < formattedContent.length && !isThread;

  if (characterCount > constraints.maxLength * 0.9) {
    warnings.push(`Content is close to ${platform} character limit`);
  }

  return {
    platform,
    content: finalContent,
    isThread,
    threadParts,
    hashtags,
    characterCount,
    truncated,
    warnings,
  };
}

/**
 * Format content for Twitter/X
 */
function formatForTwitter(
  content: string,
  hashtags: string[],
  options: FormatOptions,
  constraints: PlatformConstraints
): string {
  let formatted = content.trim();

  // Optimize hashtags (max 2-3 for best engagement)
  const maxHashtags = options.maxHashtags ?? 3;
  const selectedHashtags = hashtags.slice(0, Math.min(hashtags.length, maxHashtags));

  // Add line breaks for readability
  formatted = formatted.replace(/\. /g, '.\n\n');

  // Add hashtags at the end
  if (selectedHashtags.length > 0) {
    formatted += '\n\n' + selectedHashtags.join(' ');
  }

  return formatted;
}

/**
 * Format content for LinkedIn
 */
function formatForLinkedIn(
  content: string,
  hashtags: string[],
  options: FormatOptions,
  constraints: PlatformConstraints
): string {
  let formatted = content.trim();

  // Professional tone adjustments
  if (options.professionalTone !== false) {
    formatted = enhanceProfessionalTone(formatted);
  }

  // Add line breaks for readability (LinkedIn encourages white space)
  formatted = formatted.replace(/\. /g, '.\n\n');

  // Add relevant hashtags (3-5 is optimal for LinkedIn)
  const maxHashtags = options.maxHashtags ?? 5;
  const selectedHashtags = hashtags.slice(0, Math.min(hashtags.length, maxHashtags));

  if (selectedHashtags.length > 0) {
    formatted += '\n\n' + selectedHashtags.join(' ');
  }

  // Add call to action if requested
  if (options.includeCallToAction) {
    formatted += '\n\nWhat are your thoughts? Share in the comments below.';
  }

  return formatted;
}

/**
 * Format content for Instagram
 */
function formatForInstagram(
  content: string,
  hashtags: string[],
  options: FormatOptions,
  constraints: PlatformConstraints
): string {
  let formatted = content.trim();

  // Make content more casual and engaging
  if (options.casualTone !== false) {
    formatted = enhanceCasualTone(formatted);
  }

  // Add line breaks for visual appeal
  formatted = formatted.replace(/\. /g, '.\n\n');

  // Instagram allows more hashtags (up to 30, but 10-15 is optimal)
  const maxHashtags = options.maxHashtags ?? 15;
  const selectedHashtags = hashtags.slice(0, Math.min(hashtags.length, maxHashtags));

  // Add hashtags (common practice is to add them as a comment, but we'll include them)
  if (selectedHashtags.length > 0) {
    formatted += '\n\n' + selectedHashtags.join(' ');
  }

  return formatted;
}

/**
 * Format content for TikTok
 */
function formatForTikTok(
  content: string,
  hashtags: string[],
  options: FormatOptions,
  constraints: PlatformConstraints
): string {
  let formatted = content.trim();

  // Short, punchy content for TikTok
  formatted = makeContentPunchy(formatted);

  // TikTok hashtags (trending + niche)
  const maxHashtags = options.maxHashtags ?? 10;
  const selectedHashtags = hashtags.slice(0, Math.min(hashtags.length, maxHashtags));

  if (selectedHashtags.length > 0) {
    formatted += '\n\n' + selectedHashtags.join(' ');
  }

  return formatted;
}

/**
 * Format content for YouTube
 */
function formatForYouTube(
  content: string,
  hashtags: string[],
  options: FormatOptions,
  constraints: PlatformConstraints
): string {
  let formatted = content.trim();

  // Add chapter timestamps if content has time markers
  formatted = addYouTubeTimestamps(formatted);

  // Add line breaks for description readability
  formatted = formatted.replace(/\. /g, '.\n\n');

  // YouTube allows hashtags in description (max 15, first 3 show above title)
  const maxHashtags = options.maxHashtags ?? 5;
  const selectedHashtags = hashtags.slice(0, Math.min(hashtags.length, maxHashtags));

  if (selectedHashtags.length > 0) {
    formatted += '\n\n' + selectedHashtags.join(' ');
  }

  // Add call to action
  if (options.includeCallToAction !== false) {
    formatted += '\n\nLike, Subscribe, and hit the notification bell!';
  }

  return formatted;
}

/**
 * Format content for Facebook
 */
function formatForFacebook(
  content: string,
  hashtags: string[],
  options: FormatOptions,
  constraints: PlatformConstraints
): string {
  let formatted = content.trim();

  // Add line breaks
  formatted = formatted.replace(/\. /g, '.\n\n');

  // Facebook hashtags (fewer is better, 1-3)
  const maxHashtags = options.maxHashtags ?? 3;
  const selectedHashtags = hashtags.slice(0, Math.min(hashtags.length, maxHashtags));

  if (selectedHashtags.length > 0) {
    formatted += '\n\n' + selectedHashtags.join(' ');
  }

  return formatted;
}

/**
 * Format content for Threads
 */
function formatForThreads(
  content: string,
  hashtags: string[],
  options: FormatOptions,
  constraints: PlatformConstraints
): string {
  let formatted = content.trim();

  // Threads is similar to Twitter but shorter
  const maxHashtags = options.maxHashtags ?? 3;
  const selectedHashtags = hashtags.slice(0, Math.min(hashtags.length, maxHashtags));

  if (selectedHashtags.length > 0) {
    formatted += '\n\n' + selectedHashtags.join(' ');
  }

  return formatted;
}

/**
 * Format content for Bluesky
 */
function formatForBluesky(
  content: string,
  hashtags: string[],
  options: FormatOptions,
  constraints: PlatformConstraints
): string {
  let formatted = content.trim();

  // Similar to Twitter
  const maxHashtags = options.maxHashtags ?? 3;
  const selectedHashtags = hashtags.slice(0, Math.min(hashtags.length, maxHashtags));

  if (selectedHashtags.length > 0) {
    formatted += '\n\n' + selectedHashtags.join(' ');
  }

  return formatted;
}

/**
 * Extract hashtags from text
 */
function extractHashtags(text: string): { content: string; hashtags: string[] } {
  const hashtagRegex = /#[\w]+/g;
  const hashtags = text.match(hashtagRegex) || [];
  const content = text.replace(hashtagRegex, '').trim();

  return { content, hashtags };
}

/**
 * Split content into thread parts
 */
export function splitIntoThread(
  text: string,
  options: ThreadSplitOptions
): string[] {
  const { maxLength, preserveSentences, addNumbers, addContinuationMarkers } = options;
  const parts: string[] = [];

  if (text.length <= maxLength) {
    return [text];
  }

  let remaining = text;
  let partNumber = 1;

  while (remaining.length > 0) {
    let splitPoint = maxLength;

    // Reserve space for numbering and continuation markers
    const prefix = addNumbers ? `${partNumber}/ ` : '';
    const suffix = addContinuationMarkers && remaining.length > maxLength ? '...' : '';
    const reservedSpace = prefix.length + suffix.length;
    const availableLength = maxLength - reservedSpace;

    if (remaining.length <= availableLength) {
      // Last part
      parts.push(prefix + remaining);
      break;
    }

    if (preserveSentences) {
      // Try to split at sentence boundary
      const sentences = remaining.substring(0, availableLength).split('. ');
      if (sentences.length > 1) {
        // Keep all complete sentences except the last incomplete one
        splitPoint = sentences.slice(0, -1).join('. ').length + 1;
      } else {
        // No sentence boundary found, split at word boundary
        const lastSpace = remaining.substring(0, availableLength).lastIndexOf(' ');
        splitPoint = lastSpace > 0 ? lastSpace : availableLength;
      }
    } else {
      // Split at word boundary
      const lastSpace = remaining.substring(0, availableLength).lastIndexOf(' ');
      splitPoint = lastSpace > 0 ? lastSpace : availableLength;
    }

    const part = remaining.substring(0, splitPoint).trim();
    parts.push(prefix + part + suffix);

    remaining = remaining.substring(splitPoint).trim();
    partNumber++;
  }

  // Add total count to first part if numbering
  if (addNumbers && parts.length > 1) {
    parts[0] = parts[0].replace(/^(\d+)\//, `$1/${parts.length}`);
  }

  return parts;
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to truncate at sentence boundary
  const truncated = text.substring(0, maxLength - 3);
  const lastPeriod = truncated.lastIndexOf('.');

  if (lastPeriod > maxLength * 0.7) {
    return truncated.substring(0, lastPeriod + 1);
  }

  // Truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength - 3) + '...';
}

/**
 * Enhance professional tone
 */
function enhanceProfessionalTone(text: string): string {
  return text
    .replace(/\b(cool|awesome|amazing)\b/gi, 'excellent')
    .replace(/\b(gonna|wanna)\b/gi, (match) =>
      match.toLowerCase() === 'gonna' ? 'going to' : 'want to'
    )
    .replace(/!!+/g, '.')
    .trim();
}

/**
 * Enhance casual tone
 */
function enhanceCasualTone(text: string): string {
  // Add emojis at appropriate places (this is a simple implementation)
  return text.trim();
}

/**
 * Make content punchy for short-form platforms
 */
function makeContentPunchy(text: string): string {
  return text
    .split('. ')
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0)
    .slice(0, 3) // Keep only first 3 sentences for punchiness
    .join('. ') + '.';
}

/**
 * Add YouTube chapter timestamps
 */
function addYouTubeTimestamps(text: string): string {
  // Look for time patterns like "at 1:23" or "1:23 -"
  const timestampRegex = /(?:at\s)?(\d{1,2}):(\d{2})(?:\s*[-:]\s*)?/gi;

  if (!timestampRegex.test(text)) {
    return text;
  }

  // Add chapter heading if timestamps exist
  return '⏱️ CHAPTERS\n' + text.replace(timestampRegex, (match, minutes, seconds) => {
    return `\n${minutes}:${seconds} `;
  });
}

/**
 * Optimize hashtags for engagement
 */
export function optimizeHashtags(
  hashtags: string[],
  platform: SocialPlatform,
  maxCount?: number
): string[] {
  const constraints = PLATFORM_CONSTRAINTS[platform];

  if (!constraints.supportsHashtags) {
    return [];
  }

  // Remove duplicates and sort by length (shorter hashtags often perform better)
  const uniqueHashtags = Array.from(new Set(hashtags))
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    .sort((a, b) => a.length - b.length);

  // Determine optimal count based on platform
  let optimalCount: number;
  switch (platform) {
    case 'TWITTER':
    case 'THREADS':
    case 'BLUESKY':
      optimalCount = 3;
      break;
    case 'FACEBOOK':
      optimalCount = 2;
      break;
    case 'LINKEDIN':
      optimalCount = 5;
      break;
    case 'INSTAGRAM':
    case 'TIKTOK':
      optimalCount = 10;
      break;
    case 'YOUTUBE':
      optimalCount = 5;
      break;
    default:
      optimalCount = 3;
  }

  const finalCount = maxCount ?? optimalCount;
  return uniqueHashtags.slice(0, finalCount);
}

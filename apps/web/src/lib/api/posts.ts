/**
 * Posts API methods for FluxBoard Producer Desk
 *
 * Provides API methods for managing social posts (approve, publish, schedule, delete)
 * Posts are a specialized view of outputs with category "SOCIAL_POST"
 * Enhanced with comprehensive Zod schema validation for runtime type safety
 */

import { z } from "zod";
import { apiClient, type RequestOptions } from "./client";
import { apiResponseSchema, outputInfoSchema, type OutputStatus } from "./schemas";
import type { OutputInfo } from "./outputs";

/**
 * Post status types
 */
export type PostStatus = "draft" | "approved" | "published" | "scheduled";

/**
 * Post information schema
 */
const postInfoSchema = outputInfoSchema.extend({
  status: z.enum(["draft", "approved", "published", "scheduled"]),
  scheduledFor: z.string().datetime().optional(),
});

/**
 * Post mutation response schema
 */
const postMutationResponseSchema = apiResponseSchema(
  z.object({
    post: postInfoSchema.optional(),
    output: outputInfoSchema.optional(),
    message: z.string().optional(),
  })
);

/**
 * Schedule post response schema
 */
const schedulePostResponseSchema = apiResponseSchema(
  z.object({
    post: postInfoSchema.optional(),
    output: outputInfoSchema.optional(),
    scheduledFor: z.string().datetime(),
    message: z.string().optional(),
  })
);

/**
 * Post information from the API
 */
export interface PostInfo extends OutputInfo {
  status: PostStatus;
  scheduledFor?: string;
}

/**
 * Create request options with optional auth header
 */
function withAuth(accessToken?: string, options: RequestOptions = {}): RequestOptions {
  if (!accessToken) return options;

  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

/**
 * Approve a post (changes status from draft to approved)
 * @param postId - Post/Output ID
 * @param token - Optional auth token
 */
export async function approvePost(postId: string, token?: string): Promise<PostInfo> {
  const response = await apiClient.post(
    `/api/posts/${encodeURIComponent(postId)}/approve`,
    postMutationResponseSchema,
    {},
    withAuth(token)
  );

  const post = response.data.post || response.data.output;
  if (!post) {
    throw new Error("Post not returned from approve operation");
  }

  return post as PostInfo;
}

/**
 * Publish a post immediately
 * @param postId - Post/Output ID
 * @param token - Optional auth token
 */
export async function publishPost(postId: string, token?: string): Promise<PostInfo> {
  const response = await apiClient.post(
    `/api/posts/${encodeURIComponent(postId)}/publish`,
    postMutationResponseSchema,
    {},
    withAuth(token)
  );

  const post = response.data.post || response.data.output;
  if (!post) {
    throw new Error("Post not returned from publish operation");
  }

  return post as PostInfo;
}

/**
 * Schedule a post for future publication
 * @param postId - Post/Output ID
 * @param scheduledFor - Date/time to publish
 * @param token - Optional auth token
 */
export async function schedulePost(
  postId: string,
  scheduledFor: Date,
  token?: string
): Promise<PostInfo> {
  const response = await apiClient.post(
    `/api/posts/${encodeURIComponent(postId)}/schedule`,
    schedulePostResponseSchema,
    { scheduledFor: scheduledFor.toISOString() },
    withAuth(token)
  );

  const post = response.data.post || response.data.output;
  if (!post) {
    throw new Error("Post not returned from schedule operation");
  }

  return {
    ...post,
    scheduledFor: response.data.scheduledFor,
  } as PostInfo;
}

/**
 * Delete a post
 * @param postId - Post/Output ID
 * @param token - Optional auth token
 */
export async function deletePost(postId: string, token?: string): Promise<void> {
  await apiClient.delete(
    `/api/posts/${encodeURIComponent(postId)}`,
    postMutationResponseSchema,
    withAuth(token)
  );
}

/**
 * Update a post's content
 * @param postId - Post/Output ID
 * @param updates - Fields to update
 * @param token - Optional auth token
 */
export async function updatePost(
  postId: string,
  updates: {
    text?: string;
    title?: string;
    platform?: string;
    meta?: Record<string, unknown>;
  },
  token?: string
): Promise<PostInfo> {
  const response = await apiClient.patch(
    `/api/posts/${encodeURIComponent(postId)}`,
    postMutationResponseSchema,
    updates,
    withAuth(token)
  );

  const post = response.data.post || response.data.output;
  if (!post) {
    throw new Error("Post not returned from update operation");
  }

  return post as PostInfo;
}

/**
 * Posts API methods for FluxBoard Producer Desk
 *
 * Provides API methods for managing social posts (approve, publish, schedule, delete)
 * Posts are a specialized view of outputs with category "SOCIAL_POST"
 */

import { apiClient, type RequestOptions } from "./client";
import type { OutputInfo, OutputStatus } from "./outputs";

/**
 * Post status types
 */
export type PostStatus = "draft" | "approved" | "published" | "scheduled";

/**
 * Post information from the API
 */
export interface PostInfo extends OutputInfo {
  status: PostStatus;
  scheduledFor?: string;
}

/**
 * Response from post mutation operations
 */
interface PostMutationResponse {
  success: boolean;
  data: {
    post?: PostInfo;
    output?: OutputInfo;
    message?: string;
  };
}

/**
 * Response from schedule operation
 */
interface SchedulePostResponse {
  success: boolean;
  data: {
    post?: PostInfo;
    output?: OutputInfo;
    scheduledFor: string;
    message?: string;
  };
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
  const response = await apiClient.post<PostMutationResponse>(
    `/api/posts/${encodeURIComponent(postId)}/approve`,
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
  const response = await apiClient.post<PostMutationResponse>(
    `/api/posts/${encodeURIComponent(postId)}/publish`,
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
  const response = await apiClient.post<SchedulePostResponse>(
    `/api/posts/${encodeURIComponent(postId)}/schedule`,
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
  await apiClient.delete<PostMutationResponse>(
    `/api/posts/${encodeURIComponent(postId)}`,
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
  const response = await apiClient.patch<PostMutationResponse>(
    `/api/posts/${encodeURIComponent(postId)}`,
    updates,
    withAuth(token)
  );

  const post = response.data.post || response.data.output;
  if (!post) {
    throw new Error("Post not returned from update operation");
  }

  return post as PostInfo;
}

/**
 * Custom hook for managing social posts in the Producer Desk
 *
 * This hook provides:
 * - Post mutation operations (approve, publish, schedule, delete)
 * - Loading and error states for each operation
 * - Integration with auth context
 * - Callbacks for success/error handling
 */

import { useState, useCallback } from "react";
import {
  approvePost as apiApprovePost,
  publishPost as apiPublishPost,
  schedulePost as apiSchedulePost,
  deletePost as apiDeletePost,
  type PostInfo,
} from "@/lib/api/posts";
import { useAuth } from "@/lib/contexts/AuthContext";
import { logger } from "@/lib/logger";

/**
 * Loading state for each operation
 */
interface PostOperationState {
  isApproving: boolean;
  isPublishing: boolean;
  isScheduling: boolean;
  isDeleting: boolean;
}

/**
 * Return type for usePosts hook
 */
export interface UsePostsReturn {
  // Loading states
  operationState: PostOperationState;
  isOperating: boolean;

  // Error state
  error: string | null;
  clearError: () => void;

  // Operations
  approvePost: (postId: string, onSuccess?: (post: PostInfo) => void) => Promise<boolean>;
  publishPost: (postId: string, onSuccess?: (post: PostInfo) => void) => Promise<boolean>;
  schedulePost: (postId: string, scheduledFor: Date, onSuccess?: (post: PostInfo) => void) => Promise<boolean>;
  deletePost: (postId: string, onSuccess?: () => void) => Promise<boolean>;
}

/**
 * Hook for post mutation operations
 *
 * @example
 * ```tsx
 * const { approvePost, publishPost, isOperating, error } = usePosts();
 *
 * const handleApprove = async (postId: string) => {
 *   const success = await approvePost(postId, (post) => {
 *     logger.debug('Post approved:', post);
 *     refreshPosts(); // Refresh the post list
 *   });
 * };
 * ```
 */
export function usePosts(): UsePostsReturn {
  const [operationState, setOperationState] = useState<PostOperationState>({
    isApproving: false,
    isPublishing: false,
    isScheduling: false,
    isDeleting: false,
  });
  const [error, setError] = useState<string | null>(null);

  const { accessToken } = useAuth();

  const isOperating =
    operationState.isApproving ||
    operationState.isPublishing ||
    operationState.isScheduling ||
    operationState.isDeleting;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Approve a post
   */
  const approvePost = useCallback(
    async (postId: string, onSuccess?: (post: PostInfo) => void): Promise<boolean> => {
      setOperationState((prev) => ({ ...prev, isApproving: true }));
      setError(null);

      try {
        const post = await apiApprovePost(postId, accessToken || undefined);
        onSuccess?.(post);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to approve post";
        setError(message);
        logger.error("Failed to approve post:", err);
        return false;
      } finally {
        setOperationState((prev) => ({ ...prev, isApproving: false }));
      }
    },
    [accessToken]
  );

  /**
   * Publish a post immediately
   */
  const publishPost = useCallback(
    async (postId: string, onSuccess?: (post: PostInfo) => void): Promise<boolean> => {
      setOperationState((prev) => ({ ...prev, isPublishing: true }));
      setError(null);

      try {
        const post = await apiPublishPost(postId, accessToken || undefined);
        onSuccess?.(post);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to publish post";
        setError(message);
        logger.error("Failed to publish post:", err);
        return false;
      } finally {
        setOperationState((prev) => ({ ...prev, isPublishing: false }));
      }
    },
    [accessToken]
  );

  /**
   * Schedule a post for future publication
   */
  const schedulePost = useCallback(
    async (
      postId: string,
      scheduledFor: Date,
      onSuccess?: (post: PostInfo) => void
    ): Promise<boolean> => {
      setOperationState((prev) => ({ ...prev, isScheduling: true }));
      setError(null);

      try {
        const post = await apiSchedulePost(postId, scheduledFor, accessToken || undefined);
        onSuccess?.(post);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to schedule post";
        setError(message);
        logger.error("Failed to schedule post:", err);
        return false;
      } finally {
        setOperationState((prev) => ({ ...prev, isScheduling: false }));
      }
    },
    [accessToken]
  );

  /**
   * Delete a post
   */
  const deletePost = useCallback(
    async (postId: string, onSuccess?: () => void): Promise<boolean> => {
      setOperationState((prev) => ({ ...prev, isDeleting: true }));
      setError(null);

      try {
        await apiDeletePost(postId, accessToken || undefined);
        onSuccess?.();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete post";
        setError(message);
        logger.error("Failed to delete post:", err);
        return false;
      } finally {
        setOperationState((prev) => ({ ...prev, isDeleting: false }));
      }
    },
    [accessToken]
  );

  return {
    operationState,
    isOperating,
    error,
    clearError,
    approvePost,
    publishPost,
    schedulePost,
    deletePost,
  };
}

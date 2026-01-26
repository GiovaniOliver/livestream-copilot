"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  AgentAction,
  ActionStatus,
  ActionExecution,
  ActionResult,
  ClipTitleResult,
  SocialPostResult,
  ClipMomentResult,
} from "./types";
import {
  getContentCreatorActions,
  getContentCreatorAutoActions,
} from "./types";

// ============================================================
// Action Hook State
// ============================================================

interface UseActionsState {
  executions: ActionExecution[];
  autoTriggerEnabled: Record<string, boolean>;
  cooldowns: Record<string, number>;
  clipTitles: ClipTitleResult[];
  socialPosts: SocialPostResult[];
  clipMoments: ClipMomentResult[];
  isExpanded: boolean;
}

interface UseActionsReturn {
  // State
  actions: AgentAction[];
  autoActions: AgentAction[];
  executions: ActionExecution[];
  isExpanded: boolean;
  clipTitles: ClipTitleResult[];
  socialPosts: SocialPostResult[];
  clipMoments: ClipMomentResult[];

  // Actions
  executeAction: (actionId: string, inputs?: Record<string, unknown>) => Promise<void>;
  cancelAction: (executionId: string) => void;
  toggleAutoTrigger: (actionId: string) => void;
  isAutoTriggerEnabled: (actionId: string) => boolean;
  isOnCooldown: (actionId: string) => boolean;
  getCooldownRemaining: (actionId: string) => number;
  getExecutionStatus: (actionId: string) => ActionStatus | null;
  getActiveExecutions: () => ActionExecution[];
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  clearResults: () => void;

  // Result handlers
  addClipTitle: (result: ClipTitleResult) => void;
  addSocialPost: (result: SocialPostResult) => void;
  addClipMoment: (result: ClipMomentResult) => void;
  updateSocialPostStatus: (id: string, status: SocialPostResult["status"]) => void;
}

// ============================================================
// useActions Hook
// ============================================================

export function useActions(): UseActionsReturn {
  const [state, setState] = useState<UseActionsState>({
    executions: [],
    autoTriggerEnabled: {},
    cooldowns: {},
    clipTitles: [],
    socialPosts: [],
    clipMoments: [],
    isExpanded: true,
  });

  const cooldownTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Get all actions for Content Creator
  const actions = getContentCreatorActions();
  const autoActions = getContentCreatorAutoActions();

  // Initialize auto-trigger settings
  useEffect(() => {
    const initialAutoTrigger: Record<string, boolean> = {};
    autoActions.forEach((action) => {
      // Auto-trigger is enabled by default for auto actions
      initialAutoTrigger[action.actionId] = true;
    });
    setState((prev) => ({
      ...prev,
      autoTriggerEnabled: { ...initialAutoTrigger, ...prev.autoTriggerEnabled },
    }));
  }, [autoActions]);

  // Generate unique execution ID
  const generateExecutionId = useCallback(() => {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Execute an action
  const executeAction = useCallback(
    async (actionId: string, inputs?: Record<string, unknown>) => {
      const action = actions.find((a) => a.actionId === actionId);
      if (!action) {
        console.error(`Action not found: ${actionId}`);
        return;
      }

      // Check cooldown
      if (state.cooldowns[actionId] && state.cooldowns[actionId] > Date.now()) {
        console.warn(`Action ${actionId} is on cooldown`);
        return;
      }

      const executionId = generateExecutionId();
      const execution: ActionExecution = {
        id: executionId,
        actionId,
        status: "processing",
        startedAt: Date.now(),
        progress: 0,
      };

      // Add execution to state
      setState((prev) => ({
        ...prev,
        executions: [...prev.executions, execution],
      }));

      try {
        // Simulate action processing (replace with actual API call)
        await simulateActionExecution(action, inputs, (progress) => {
          setState((prev) => ({
            ...prev,
            executions: prev.executions.map((e) =>
              e.id === executionId ? { ...e, progress } : e
            ),
          }));
        });

        // Mark as success
        setState((prev) => ({
          ...prev,
          executions: prev.executions.map((e) =>
            e.id === executionId
              ? { ...e, status: "success", completedAt: Date.now(), progress: 100 }
              : e
          ),
        }));

        // Set cooldown if defined
        if (action.cooldownMs) {
          const cooldownEnd = Date.now() + action.cooldownMs;
          setState((prev) => ({
            ...prev,
            cooldowns: { ...prev.cooldowns, [actionId]: cooldownEnd },
          }));

          // Clear cooldown after timeout
          if (cooldownTimers.current[actionId]) {
            clearTimeout(cooldownTimers.current[actionId]);
          }
          cooldownTimers.current[actionId] = setTimeout(() => {
            setState((prev) => {
              const newCooldowns = { ...prev.cooldowns };
              delete newCooldowns[actionId];
              return { ...prev, cooldowns: newCooldowns };
            });
          }, action.cooldownMs);
        }
      } catch (error) {
        // Mark as failed
        setState((prev) => ({
          ...prev,
          executions: prev.executions.map((e) =>
            e.id === executionId
              ? {
                  ...e,
                  status: "failed",
                  completedAt: Date.now(),
                  error: error instanceof Error ? error.message : "Unknown error",
                }
              : e
          ),
        }));
      }
    },
    [actions, state.cooldowns, generateExecutionId]
  );

  // Cancel an action
  const cancelAction = useCallback((executionId: string) => {
    setState((prev) => ({
      ...prev,
      executions: prev.executions.map((e) =>
        e.id === executionId && e.status === "processing"
          ? { ...e, status: "cancelled", completedAt: Date.now() }
          : e
      ),
    }));
  }, []);

  // Toggle auto-trigger for an action
  const toggleAutoTrigger = useCallback((actionId: string) => {
    setState((prev) => ({
      ...prev,
      autoTriggerEnabled: {
        ...prev.autoTriggerEnabled,
        [actionId]: !prev.autoTriggerEnabled[actionId],
      },
    }));
  }, []);

  // Check if auto-trigger is enabled
  const isAutoTriggerEnabled = useCallback(
    (actionId: string) => {
      return state.autoTriggerEnabled[actionId] ?? false;
    },
    [state.autoTriggerEnabled]
  );

  // Check if action is on cooldown
  const isOnCooldown = useCallback(
    (actionId: string) => {
      const cooldownEnd = state.cooldowns[actionId];
      return cooldownEnd ? cooldownEnd > Date.now() : false;
    },
    [state.cooldowns]
  );

  // Get cooldown remaining time
  const getCooldownRemaining = useCallback(
    (actionId: string) => {
      const cooldownEnd = state.cooldowns[actionId];
      if (!cooldownEnd) return 0;
      const remaining = cooldownEnd - Date.now();
      return remaining > 0 ? remaining : 0;
    },
    [state.cooldowns]
  );

  // Get execution status for an action
  const getExecutionStatus = useCallback(
    (actionId: string): ActionStatus | null => {
      const execution = state.executions
        .filter((e) => e.actionId === actionId)
        .sort((a, b) => b.startedAt - a.startedAt)[0];
      return execution?.status ?? null;
    },
    [state.executions]
  );

  // Get active executions
  const getActiveExecutions = useCallback(() => {
    return state.executions.filter((e) => e.status === "processing");
  }, [state.executions]);

  // Set expanded state
  const setExpanded = useCallback((expanded: boolean) => {
    setState((prev) => ({ ...prev, isExpanded: expanded }));
  }, []);

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  // Clear all results
  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      executions: [],
      clipTitles: [],
      socialPosts: [],
      clipMoments: [],
    }));
  }, []);

  // Add clip title result
  const addClipTitle = useCallback((result: ClipTitleResult) => {
    setState((prev) => ({
      ...prev,
      clipTitles: [...prev.clipTitles, result],
    }));
  }, []);

  // Add social post result
  const addSocialPost = useCallback((result: SocialPostResult) => {
    setState((prev) => ({
      ...prev,
      socialPosts: [...prev.socialPosts, result],
    }));
  }, []);

  // Add clip moment result
  const addClipMoment = useCallback((result: ClipMomentResult) => {
    setState((prev) => ({
      ...prev,
      clipMoments: [...prev.clipMoments, result],
    }));
  }, []);

  // Update social post status
  const updateSocialPostStatus = useCallback(
    (id: string, status: SocialPostResult["status"]) => {
      setState((prev) => ({
        ...prev,
        socialPosts: prev.socialPosts.map((post) =>
          post.id === id ? { ...post, status } : post
        ),
      }));
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(cooldownTimers.current).forEach(clearTimeout);
    };
  }, []);

  return {
    actions,
    autoActions,
    executions: state.executions,
    isExpanded: state.isExpanded,
    clipTitles: state.clipTitles,
    socialPosts: state.socialPosts,
    clipMoments: state.clipMoments,
    executeAction,
    cancelAction,
    toggleAutoTrigger,
    isAutoTriggerEnabled,
    isOnCooldown,
    getCooldownRemaining,
    getExecutionStatus,
    getActiveExecutions,
    setExpanded,
    toggleExpanded,
    clearResults,
    addClipTitle,
    addSocialPost,
    addClipMoment,
    updateSocialPostStatus,
  };
}

// ============================================================
// Simulation Helper (Replace with actual API calls)
// ============================================================

async function simulateActionExecution(
  action: AgentAction,
  _inputs?: Record<string, unknown>,
  onProgress?: (progress: number) => void
): Promise<ActionResult> {
  // Simulate processing time based on token estimate
  const processingTimes = {
    low: 1000,
    medium: 2000,
    high: 4000,
  };

  const totalTime = processingTimes[action.estimatedTokens];
  const steps = 10;
  const stepTime = totalTime / steps;

  for (let i = 1; i <= steps; i++) {
    await new Promise((resolve) => setTimeout(resolve, stepTime));
    onProgress?.(Math.round((i / steps) * 100));
  }

  return {
    actionId: action.actionId,
    status: "success",
    timestamp: Date.now(),
    data: {},
    confidence: 0.85,
  };
}

export default useActions;

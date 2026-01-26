"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MindMapAction, MindMapActionId, ActionExecution } from "./types";
import { Button } from "@/components/ui/Button";

export interface MindMapActionPanelProps {
  actions: MindMapAction[];
  executions: ActionExecution[];
  isProcessing: boolean;
  activeAction: MindMapActionId | null;
  cooldowns: Map<MindMapActionId, number>;
  selectedNodeIds?: string[];
  onExecuteAction: (actionId: MindMapActionId) => void;
  onGenerateSummary: () => void;
  className?: string;
}

// Action icons mapping
const actionIcons: Record<string, React.ReactNode> = {
  lightbulb: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  grid: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  link: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  expand: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  sort: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  ),
  checklist: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  copy: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  merge: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  shuffle: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  star: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  tag: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  document: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

// Token color mapping
const tokenColors: Record<string, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-error",
};

// Group actions by type
const manualActions: MindMapActionId[] = [
  "mind_map.expand_idea",
  "mind_map.prioritize_ideas",
  "mind_map.synthesize_ideas",
  "mind_map.generate_variations",
];

const autoActions: MindMapActionId[] = [
  "mind_map.capture_idea",
  "mind_map.detect_duplicate",
  "mind_map.identify_eureka",
  "mind_map.categorize_idea",
];

const hybridActions: MindMapActionId[] = [
  "mind_map.cluster_ideas",
  "mind_map.find_connections",
  "mind_map.extract_action_items",
];

function MindMapActionPanel({
  actions,
  executions,
  isProcessing,
  activeAction,
  cooldowns,
  selectedNodeIds = [],
  onExecuteAction,
  onGenerateSummary,
  className,
}: MindMapActionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"manual" | "ai-assist" | "history">("manual");

  // Get recent executions
  const recentExecutions = executions.slice(-5).reverse();

  // Check if action is on cooldown
  const isOnCooldown = (actionId: MindMapActionId): boolean => {
    const cooldownEnd = cooldowns.get(actionId);
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  };

  // Get remaining cooldown time
  const getCooldownRemaining = (actionId: MindMapActionId): number => {
    const cooldownEnd = cooldowns.get(actionId);
    if (!cooldownEnd) return 0;
    return Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
  };

  // Check if action can be executed
  const canExecute = (action: MindMapAction): boolean => {
    if (isProcessing && activeAction === action.actionId) return false;
    if (isOnCooldown(action.actionId)) return false;
    if (action.requiresSelection && selectedNodeIds.length === 0) return false;
    return true;
  };

  // Filter actions by category
  const getActionsByCategory = (category: "manual" | "auto" | "hybrid") => {
    const categoryActions = category === "manual" ? manualActions : category === "auto" ? autoActions : hybridActions;
    return actions.filter((a) => categoryActions.includes(a.actionId));
  };

  // Render action button
  const renderActionButton = (action: MindMapAction) => {
    const isActive = activeAction === action.actionId;
    const onCooldown = isOnCooldown(action.actionId);
    const cooldownTime = getCooldownRemaining(action.actionId);
    const executable = canExecute(action);
    const needsSelection = action.requiresSelection && selectedNodeIds.length === 0;

    return (
      <button
        key={action.actionId}
        onClick={() => executable && onExecuteAction(action.actionId)}
        disabled={!executable}
        className={cn(
          "group relative flex items-center gap-3 w-full rounded-xl border p-3 text-left transition-all duration-200",
          executable
            ? "border-stroke bg-bg-0 hover:bg-surface hover:border-teal/30 cursor-pointer"
            : "border-stroke/50 bg-bg-0/50 cursor-not-allowed opacity-60",
          isActive && "border-teal bg-teal/10"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
            isActive ? "bg-teal/20 text-teal" : "bg-surface text-text-muted group-hover:text-teal"
          )}
        >
          {isActive ? (
            <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            actionIcons[action.icon]
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text truncate">{action.label}</span>
            {action.triggerType === "auto" && (
              <span className="flex-shrink-0 rounded-full bg-purple/20 px-1.5 py-0.5 text-[10px] text-purple">
                AUTO
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted truncate">{action.description}</p>
        </div>

        {/* Status indicators */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Token estimate */}
          <span className={cn("text-[10px]", tokenColors[action.estimatedTokens])}>
            {action.estimatedTokens.toUpperCase()}
          </span>

          {/* Cooldown timer */}
          {onCooldown && (
            <span className="text-xs text-text-dim">{cooldownTime}s</span>
          )}

          {/* Needs selection indicator */}
          {needsSelection && (
            <span className="text-[10px] text-warning">Select node</span>
          )}
        </div>
      </button>
    );
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-stroke bg-bg-1 px-4 py-2 text-sm text-text-muted",
          "hover:bg-surface hover:text-text transition-colors",
          className
        )}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        AI Actions
        {isProcessing && (
          <span className="ml-2 h-2 w-2 rounded-full bg-teal animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col bg-bg-1 rounded-2xl border border-stroke overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple/30 to-teal/20 border border-purple/30">
            <svg className="h-4 w-4 text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">AI Actions</h3>
            <p className="text-xs text-text-muted">Brainstorming tools</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(false)}
          className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stroke">
        {[
          { id: "manual" as const, label: "Manual" },
          { id: "ai-assist" as const, label: "AI Assist" },
          { id: "history" as const, label: "History" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-teal text-teal bg-teal/5"
                : "text-text-muted hover:text-text hover:bg-surface"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-h-[400px]">
        {activeTab === "manual" && (
          <div className="space-y-3">
            <div className="mb-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Manual Actions
              </h4>
              <div className="space-y-2">
                {getActionsByCategory("manual").map(renderActionButton)}
              </div>
            </div>

            <div className="mb-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Hybrid Actions
              </h4>
              <div className="space-y-2">
                {getActionsByCategory("hybrid").map(renderActionButton)}
              </div>
            </div>
          </div>
        )}

        {activeTab === "ai-assist" && (
          <div className="space-y-3">
            <div className="mb-4 p-3 rounded-xl bg-purple/10 border border-purple/20">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-purple">Auto-Triggered Actions</span>
              </div>
              <p className="text-xs text-text-muted">
                These actions run automatically during your session based on detected patterns.
              </p>
            </div>

            <div className="space-y-2">
              {getActionsByCategory("auto").map((action) => (
                <div
                  key={action.actionId}
                  className="flex items-center gap-3 rounded-xl border border-stroke bg-bg-0 p-3"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-text-muted">
                    {actionIcons[action.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">{action.label}</span>
                      <span className="flex-shrink-0 rounded-full bg-purple/20 px-1.5 py-0.5 text-[10px] text-purple">
                        AUTO
                      </span>
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {action.autoTriggerCondition || action.description}
                    </p>
                  </div>
                  {isOnCooldown(action.actionId) && (
                    <span className="text-xs text-text-dim">
                      {getCooldownRemaining(action.actionId)}s
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-2">
            {recentExecutions.length > 0 ? (
              recentExecutions.map((execution) => {
                const action = actions.find((a) => a.actionId === execution.actionId);
                return (
                  <div
                    key={execution.id}
                    className="flex items-center gap-3 rounded-xl border border-stroke bg-bg-0 p-3"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                        execution.state === "success" && "bg-success/20 text-success",
                        execution.state === "failed" && "bg-error/20 text-error",
                        execution.state === "processing" && "bg-teal/20 text-teal",
                        execution.state === "cancelled" && "bg-surface text-text-dim"
                      )}
                    >
                      {execution.state === "success" && (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {execution.state === "failed" && (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {execution.state === "processing" && (
                        <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {execution.state === "cancelled" && (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-text">{action?.label}</span>
                      <p className="text-xs text-text-muted">
                        {execution.startedAt.toLocaleTimeString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs capitalize",
                        execution.state === "success" && "text-success",
                        execution.state === "failed" && "text-error",
                        execution.state === "processing" && "text-teal",
                        execution.state === "cancelled" && "text-text-dim"
                      )}
                    >
                      {execution.state}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg
                  className="mb-3 h-10 w-10 text-text-dim"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-text-muted">No actions yet</p>
                <p className="text-xs text-text-dim">Actions will appear here as they run</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Summary Button */}
      <div className="border-t border-stroke p-4">
        <Button
          variant="primary"
          size="md"
          onClick={onGenerateSummary}
          disabled={isProcessing}
          className="w-full"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Generate Session Summary
        </Button>
      </div>
    </div>
  );
}

export { MindMapActionPanel };

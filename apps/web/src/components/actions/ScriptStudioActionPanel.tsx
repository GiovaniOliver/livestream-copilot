"use client";

import { type FC, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  type AgentAction,
  type ActionStatus,
  type PlotPointType,
  type ScriptFormatType,
  SCRIPT_STUDIO_ACTIONS,
  PLOT_POINT_COLORS,
  PLOT_POINT_LABELS,
  TOKEN_ESTIMATE_RANGES,
} from "./types";

// ============================================================================
// Script Studio Action Panel
// AI-powered actions for screenwriting and playwriting workflows
// ============================================================================

interface ActionButtonState {
  status: ActionStatus;
  progress?: number;
  lastRun?: Date;
}

export interface ScriptStudioActionPanelProps {
  formatType?: ScriptFormatType;
  currentPageNumber?: number;
  selectedText?: string;
  onActionTrigger?: (actionId: string, inputs?: Record<string, unknown>) => void;
  onActionCancel?: (actionId: string) => void;
  className?: string;
}

// Icon components for actions
const ActionIcons: Record<string, FC<{ className?: string }>> = {
  "scene-heading": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  analyze: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  dialogue: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  character: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  "plot-point": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  "act-break": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  conflict: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  subtext: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  "action-line": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  transition: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  arc: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
  montage: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  stage: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  timer: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "format-check": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  default: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

// Group actions by category
const ACTION_GROUPS = [
  {
    id: "formatting",
    label: "Formatting",
    description: "Script element generation",
    actionIds: [
      "script_studio.generate_slugline",
      "script_studio.generate_action_line",
      "script_studio.suggest_transition",
      "script_studio.generate_stage_direction",
    ],
  },
  {
    id: "analysis",
    label: "Analysis",
    description: "Scene and dialogue analysis",
    actionIds: [
      "script_studio.analyze_scene_structure",
      "script_studio.polish_dialogue",
      "script_studio.check_character_voice",
      "script_studio.analyze_subtext",
    ],
  },
  {
    id: "structure",
    label: "Structure",
    description: "Story structure and pacing",
    actionIds: [
      "script_studio.detect_plot_point",
      "script_studio.suggest_act_break",
      "script_studio.identify_conflict",
      "script_studio.track_character_arc",
    ],
  },
  {
    id: "production",
    label: "Production",
    description: "Format and timing",
    actionIds: [
      "script_studio.check_format_compliance",
      "script_studio.estimate_page_timing",
      "script_studio.detect_montage",
    ],
  },
];

const ScriptStudioActionPanel: FC<ScriptStudioActionPanelProps> = ({
  formatType = "film",
  currentPageNumber,
  selectedText,
  onActionTrigger,
  onActionCancel,
  className,
}) => {
  const [actionStates, setActionStates] = useState<Record<string, ActionButtonState>>({});
  const [expandedGroup, setExpandedGroup] = useState<string | null>("formatting");
  const [showAutoTriggerSettings, setShowAutoTriggerSettings] = useState(false);
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState<Record<string, boolean>>({
    "script_studio.detect_plot_point": true,
    "script_studio.identify_conflict": true,
    "script_studio.detect_montage": false,
  });

  const handleActionClick = useCallback(
    (action: AgentAction) => {
      const currentState = actionStates[action.actionId];

      // If processing, allow cancel
      if (currentState?.status === "processing") {
        onActionCancel?.(action.actionId);
        setActionStates((prev) => ({
          ...prev,
          [action.actionId]: { status: "cancelled" },
        }));
        return;
      }

      // Start the action
      setActionStates((prev) => ({
        ...prev,
        [action.actionId]: { status: "processing", progress: 0 },
      }));

      onActionTrigger?.(action.actionId, {
        selectedText,
        pageNumber: currentPageNumber,
        formatType,
      });

      // Simulate progress (in real implementation, this would be driven by actual progress)
      const interval = setInterval(() => {
        setActionStates((prev) => {
          const current = prev[action.actionId];
          if (!current || current.status !== "processing") {
            clearInterval(interval);
            return prev;
          }
          const newProgress = (current.progress || 0) + Math.random() * 30;
          if (newProgress >= 100) {
            clearInterval(interval);
            return {
              ...prev,
              [action.actionId]: { status: "success", lastRun: new Date() },
            };
          }
          return {
            ...prev,
            [action.actionId]: { ...current, progress: Math.min(newProgress, 99) },
          };
        });
      }, 500);
    },
    [actionStates, onActionTrigger, onActionCancel, selectedText, currentPageNumber, formatType]
  );

  const toggleAutoTrigger = useCallback((actionId: string) => {
    setAutoTriggerEnabled((prev) => ({
      ...prev,
      [actionId]: !prev[actionId],
    }));
  }, []);

  const getActionById = (actionId: string): AgentAction | undefined => {
    return SCRIPT_STUDIO_ACTIONS.find((a) => a.actionId === actionId);
  };

  const renderActionButton = (action: AgentAction) => {
    const state = actionStates[action.actionId];
    const IconComponent = ActionIcons[action.icon] || ActionIcons.default;
    const isProcessing = state?.status === "processing";
    const isSuccess = state?.status === "success";
    const tokenInfo = TOKEN_ESTIMATE_RANGES[action.estimatedTokens];
    const isAutoEnabled = autoTriggerEnabled[action.actionId];
    const hasAutoTrigger = action.triggerType === "auto" || action.triggerType === "both";

    return (
      <button
        key={action.actionId}
        onClick={() => handleActionClick(action)}
        className={cn(
          "group relative flex items-start gap-3 w-full p-3 rounded-lg",
          "border transition-all duration-200",
          isProcessing
            ? "border-teal/50 bg-teal/5"
            : isSuccess
              ? "border-success/30 bg-success/5"
              : "border-stroke bg-bg-1 hover:bg-bg-2 hover:border-stroke",
          "focus:outline-none focus:ring-2 focus:ring-teal/50"
        )}
        disabled={isProcessing}
      >
        {/* Icon */}
        <div
          className={cn(
            "shrink-0 flex items-center justify-center w-8 h-8 rounded-lg",
            isProcessing
              ? "bg-teal/20 text-teal"
              : isSuccess
                ? "bg-success/20 text-success"
                : "bg-surface text-text-muted group-hover:text-teal group-hover:bg-teal/10"
          )}
        >
          {isProcessing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <IconComponent className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text">{action.label}</span>
            {hasAutoTrigger && (
              <span
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-medium rounded",
                  isAutoEnabled ? "bg-teal/10 text-teal" : "bg-surface text-text-dim"
                )}
              >
                {isAutoEnabled ? "Auto" : "Manual"}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted line-clamp-1 mt-0.5">{action.description}</p>

          {/* Progress bar */}
          {isProcessing && state?.progress !== undefined && (
            <div className="mt-2 h-1 rounded-full bg-bg-2 overflow-hidden">
              <div
                className="h-full bg-teal transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Token estimate badge */}
        <div className="shrink-0">
          <span
            className={cn(
              "px-2 py-1 text-[10px] font-medium rounded",
              action.estimatedTokens === "low"
                ? "bg-success/10 text-success"
                : action.estimatedTokens === "medium"
                  ? "bg-warning/10 text-warning"
                  : "bg-error/10 text-error"
            )}
          >
            {tokenInfo.label}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className={cn("flex flex-col bg-bg-0 border-l border-stroke", className)}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-stroke bg-bg-1">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-text">AI Actions</h3>
        </div>
        <button
          onClick={() => setShowAutoTriggerSettings(!showAutoTriggerSettings)}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            showAutoTriggerSettings
              ? "bg-teal/10 text-teal"
              : "text-text-muted hover:text-text hover:bg-surface"
          )}
          title="Auto-trigger settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Auto-trigger settings panel */}
      {showAutoTriggerSettings && (
        <div className="shrink-0 p-3 border-b border-stroke bg-bg-1/50">
          <p className="text-xs font-medium text-text mb-2">Auto-Trigger Actions</p>
          <div className="space-y-2">
            {SCRIPT_STUDIO_ACTIONS.filter(
              (a) => a.triggerType === "auto" || a.triggerType === "both"
            ).map((action) => (
              <label
                key={action.actionId}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={autoTriggerEnabled[action.actionId] || false}
                  onChange={() => toggleAutoTrigger(action.actionId)}
                  className="w-3.5 h-3.5 rounded border-stroke text-teal focus:ring-teal/50"
                />
                <span className="text-xs text-text-muted">{action.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Selection context */}
      {selectedText && (
        <div className="shrink-0 px-4 py-2 border-b border-stroke bg-purple/5">
          <p className="text-[10px] font-medium text-purple mb-1">Selected Text</p>
          <p className="text-xs text-text-muted line-clamp-2">{selectedText}</p>
        </div>
      )}

      {/* Action groups */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {ACTION_GROUPS.map((group) => {
          const isExpanded = expandedGroup === group.id;
          const groupActions = group.actionIds
            .map(getActionById)
            .filter((a): a is AgentAction => a !== undefined);

          return (
            <div
              key={group.id}
              className="rounded-lg border border-stroke overflow-hidden"
            >
              {/* Group header */}
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2",
                  "bg-bg-1 hover:bg-bg-2 transition-colors",
                  "focus:outline-none"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text">{group.label}</span>
                  <span className="text-[10px] text-text-dim">({groupActions.length})</span>
                </div>
                <svg
                  className={cn(
                    "w-4 h-4 text-text-muted transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Group content */}
              {isExpanded && (
                <div className="p-2 space-y-2 bg-bg-0">
                  {groupActions.map(renderActionButton)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer with format type indicator */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-stroke bg-bg-1">
        <div className="flex items-center gap-2 text-xs text-text-dim">
          <span>Format:</span>
          <span className="px-2 py-0.5 bg-surface rounded text-text-muted capitalize">
            {formatType.replace("_", " ")}
          </span>
        </div>
        {currentPageNumber !== undefined && (
          <span className="text-xs text-text-dim">Page {currentPageNumber}</span>
        )}
      </div>
    </div>
  );
};

export { ScriptStudioActionPanel };

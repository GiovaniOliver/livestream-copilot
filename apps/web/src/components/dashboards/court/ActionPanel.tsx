"use client";

import { forwardRef, useState, useCallback, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  COURT_ACTIONS,
  COURT_ACTION_GROUPS,
  getCourtActionsByGroup,
  type CourtActionState,
  initialCourtActionState,
} from "./actions";
import type { AgentAction } from "@/components/actions/types";

// Icons
const ClipboardDocumentListIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);

const DocumentTextIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const TagIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const ExclamationTriangleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const ScaleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
  </svg>
);

const HandRaisedIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15m.002 0h-.002" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const QuestionMarkCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

const FlagIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
  </svg>
);

const DocumentCheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
  </svg>
);

const DocumentMagnifyingGlassIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);

const ToggleOnIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

// Icon mapping
const iconComponents: Record<string, React.FC> = {
  claim: ClipboardDocumentListIcon,
  evidence: DocumentTextIcon,
  tag: TagIcon,
  contradiction: ExclamationTriangleIcon,
  precedent: BookOpenIcon,
  timeline: ClockIcon,
  credibility: ShieldCheckIcon,
  verdict: ScaleIcon,
  objection: HandRaisedIcon,
  strength: ChartBarIcon,
  questions: QuestionMarkCircleIcon,
  closing: FlagIcon,
  ruling: DocumentCheckIcon,
  summary: DocumentMagnifyingGlassIcon,
};

// Token estimate styles
const tokenStyles: Record<string, { color: string; label: string }> = {
  low: { color: "text-success", label: "Low" },
  medium: { color: "text-warning", label: "Med" },
  high: { color: "text-error", label: "High" },
};

export interface ActionPanelProps extends HTMLAttributes<HTMLDivElement> {
  actionState?: CourtActionState;
  onActionTrigger?: (actionId: string) => void;
  onAutoTriggerToggle?: (actionId: string, enabled: boolean) => void;
  isSessionActive?: boolean;
}

interface ActionButtonProps {
  action: AgentAction;
  state: CourtActionState;
  onTrigger: (actionId: string) => void;
  onAutoToggle: (actionId: string, enabled: boolean) => void;
  isSessionActive: boolean;
}

const ActionButton = ({
  action,
  state,
  onTrigger,
  onAutoToggle,
  isSessionActive,
}: ActionButtonProps) => {
  const IconComponent = iconComponents[action.icon] || DocumentTextIcon;
  const tokenStyle = tokenStyles[action.estimatedTokens];
  const isAutoEnabled = state.autoTriggerEnabled[action.actionId] ?? false;
  const isProcessing = state.currentAction === action.actionId;
  const isOnCooldown = (state.cooldowns[action.actionId] ?? 0) > Date.now();
  const canTrigger = isSessionActive && !isProcessing && !isOnCooldown;

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-stroke bg-bg-1 p-3 transition-all duration-200",
        "hover:border-teal/30 hover:bg-bg-2",
        isProcessing && "border-teal/50 bg-teal/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              isProcessing ? "bg-teal/20 text-teal" : "bg-surface text-text-muted"
            )}
          >
            <IconComponent />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-text truncate">{action.label}</h4>
              {action.triggerType !== "manual" && (
                <span className="flex h-4 items-center rounded bg-purple/10 px-1.5 text-[10px] font-medium text-purple">
                  AUTO
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-text-dim line-clamp-2">
              {action.description}
            </p>
          </div>
        </div>

        {/* Token estimate */}
        <div className="flex flex-col items-end gap-1">
          <span className={cn("text-[10px] font-medium", tokenStyle.color)}>
            {tokenStyle.label}
          </span>
        </div>
      </div>

      {/* Action controls */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Auto-trigger toggle for applicable actions */}
          {action.triggerType !== "manual" && (
            <button
              type="button"
              onClick={() => onAutoToggle(action.actionId, !isAutoEnabled)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
                isAutoEnabled
                  ? "bg-teal/10 text-teal hover:bg-teal/20"
                  : "bg-surface text-text-dim hover:bg-bg-2 hover:text-text-muted"
              )}
            >
              <ToggleOnIcon />
              <span>{isAutoEnabled ? "On" : "Off"}</span>
            </button>
          )}
        </div>

        {/* Manual trigger button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTrigger(action.actionId)}
          disabled={!canTrigger}
          isLoading={isProcessing}
          className={cn(
            "gap-1.5 h-7 px-2.5 text-xs",
            canTrigger && "hover:bg-teal/10 hover:text-teal"
          )}
        >
          {!isProcessing && <PlayIcon />}
          {isProcessing ? "Running..." : isOnCooldown ? "Cooldown" : "Run"}
        </Button>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-lg bg-bg-2">
          <div className="h-full w-1/3 animate-pulse bg-teal" />
        </div>
      )}
    </div>
  );
};

interface ActionGroupProps {
  groupKey: string;
  group: {
    label: string;
    description: string;
    actionIds: string[];
  };
  actions: AgentAction[];
  state: CourtActionState;
  onTrigger: (actionId: string) => void;
  onAutoToggle: (actionId: string, enabled: boolean) => void;
  isSessionActive: boolean;
}

const ActionGroup = ({
  groupKey,
  group,
  actions,
  state,
  onTrigger,
  onAutoToggle,
  isSessionActive,
}: ActionGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-stroke bg-surface/50">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-bg-2/50 transition-colors"
      >
        <div>
          <h3 className="text-sm font-semibold text-text">{group.label}</h3>
          <p className="mt-0.5 text-xs text-text-dim">{group.description}</p>
        </div>
        <ChevronDownIcon />
      </button>

      {isExpanded && (
        <div className="space-y-2 p-3 pt-0">
          {actions.map((action) => (
            <ActionButton
              key={action.actionId}
              action={action}
              state={state}
              onTrigger={onTrigger}
              onAutoToggle={onAutoToggle}
              isSessionActive={isSessionActive}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ActionPanel = forwardRef<HTMLDivElement, ActionPanelProps>(
  (
    {
      actionState = initialCourtActionState,
      onActionTrigger,
      onAutoTriggerToggle,
      isSessionActive = false,
      className,
      ...props
    },
    ref
  ) => {
    const handleTrigger = useCallback(
      (actionId: string) => {
        onActionTrigger?.(actionId);
      },
      [onActionTrigger]
    );

    const handleAutoToggle = useCallback(
      (actionId: string, enabled: boolean) => {
        onAutoTriggerToggle?.(actionId, enabled);
      },
      [onAutoTriggerToggle]
    );

    // Calculate active auto-triggers count
    const activeAutoTriggers = Object.values(actionState.autoTriggerEnabled).filter(Boolean).length;
    const totalAutoTriggers = COURT_ACTIONS.filter(
      (a) => a.triggerType === "auto" || a.triggerType === "both"
    ).length;

    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-4", className)}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon />
            <h2 className="text-base font-semibold text-text">AI Actions</h2>
          </div>
          <Badge variant={isSessionActive ? "teal" : "default"}>
            {isSessionActive ? "Live" : "Inactive"}
          </Badge>
        </div>

        {/* Auto-trigger status */}
        <div className="flex items-center justify-between rounded-lg bg-surface/50 px-3 py-2">
          <span className="text-xs text-text-muted">Auto-triggers active</span>
          <span className="text-xs font-medium text-teal">
            {activeAutoTriggers}/{totalAutoTriggers}
          </span>
        </div>

        {/* Action groups */}
        <div className="space-y-3">
          {Object.entries(COURT_ACTION_GROUPS).map(([key, group]) => {
            const actions = getCourtActionsByGroup(key as keyof typeof COURT_ACTION_GROUPS);
            return (
              <ActionGroup
                key={key}
                groupKey={key}
                group={group}
                actions={actions}
                state={actionState}
                onTrigger={handleTrigger}
                onAutoToggle={handleAutoToggle}
                isSessionActive={isSessionActive}
              />
            );
          })}
        </div>

        {/* Queue status */}
        {actionState.queuedActions.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-warning">
              <ClockIcon />
              <span>{actionState.queuedActions.length} actions queued</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ActionPanel.displayName = "ActionPanel";

export { ActionPanel };

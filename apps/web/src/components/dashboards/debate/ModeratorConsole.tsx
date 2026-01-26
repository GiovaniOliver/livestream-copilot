"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ModeratorAction } from "./ModeratorAction";
import type {
  ModeratorActionConfig,
  SpeakerTime,
  Topic,
  InterventionPrompt,
} from "./types";

export interface ModeratorConsoleProps {
  actions: ModeratorActionConfig[];
  speakerTimes: SpeakerTime[];
  topics: Topic[];
  interventionPrompts: InterventionPrompt[];
  onAction?: (actionId: string) => void;
  onDismissPrompt?: (promptId: string) => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const promptTypeStyles: Record<
  InterventionPrompt["type"],
  { bg: string; border: string; icon: React.ReactNode }
> = {
  alert: {
    bg: "bg-error/10",
    border: "border-error/30",
    icon: (
      <svg
        className="h-4 w-4 text-error"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  suggestion: {
    bg: "bg-teal/10",
    border: "border-teal/30",
    icon: (
      <svg
        className="h-4 w-4 text-teal"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
  info: {
    bg: "bg-purple/10",
    border: "border-purple/30",
    icon: (
      <svg
        className="h-4 w-4 text-purple"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

export function ModeratorConsole({
  actions,
  speakerTimes,
  topics,
  interventionPrompts,
  onAction,
  onDismissPrompt,
  className,
}: ModeratorConsoleProps) {
  // Get current topic
  const currentTopic = useMemo(
    () => topics.find((t) => t.status === "current"),
    [topics]
  );

  // Sort prompts by priority
  const sortedPrompts = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...interventionPrompts].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }, [interventionPrompts]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-b border-stroke px-4 py-3">
        <h2 className="text-lg font-semibold text-text">Moderator Console</h2>
        <p className="text-xs text-text-muted">
          Intervention tools and debate monitoring
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Intervention Prompts */}
        {sortedPrompts.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-dim">
              Suggested Interventions
            </h3>
            <div className="space-y-2">
              {sortedPrompts.map((prompt) => {
                const style = promptTypeStyles[prompt.type];
                return (
                  <div
                    key={prompt.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-3",
                      style.bg,
                      style.border
                    )}
                  >
                    <div className="flex-shrink-0 pt-0.5">{style.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text">{prompt.message}</p>
                      {prompt.priority === "high" && (
                        <span className="mt-1 inline-block rounded-full bg-error/20 px-2 py-0.5 text-[10px] font-medium text-error">
                          High Priority
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDismissPrompt?.(prompt.id)}
                      className="flex-shrink-0 text-text-dim hover:text-text-muted"
                      aria-label="Dismiss"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-dim">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {actions.map((action) => (
              <ModeratorAction
                key={action.id}
                action={action}
                size="sm"
                onClick={() => onAction?.(action.id)}
              />
            ))}
          </div>
        </div>

        {/* Speaker Time Tracking */}
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-dim">
            Speaker Time
          </h3>
          <div className="space-y-3">
            {speakerTimes.map((st) => {
              const percentage = (st.totalSeconds / st.allocatedSeconds) * 100;
              const isNearLimit = percentage >= 80;
              const isOverLimit = percentage >= 100;

              return (
                <div key={st.speakerId}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: st.speaker.color }}
                      />
                      <span className="text-sm text-text">
                        {st.speaker.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isOverLimit
                          ? "text-error"
                          : isNearLimit
                          ? "text-warning"
                          : "text-text-muted"
                      )}
                    >
                      {formatTime(st.totalSeconds)} /{" "}
                      {formatTime(st.allocatedSeconds)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isOverLimit
                          ? "bg-error"
                          : isNearLimit
                          ? "bg-warning"
                          : "bg-teal"
                      )}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Topic Progress */}
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-dim">
            Topic Progress
          </h3>
          <div className="space-y-2">
            {topics.map((topic, index) => {
              const percentage =
                topic.status === "completed"
                  ? 100
                  : (topic.elapsedMinutes / topic.allocatedMinutes) * 100;

              return (
                <div
                  key={topic.id}
                  className={cn(
                    "rounded-lg border p-3",
                    topic.status === "current"
                      ? "border-teal/30 bg-teal/5"
                      : "border-stroke/50 bg-surface/30"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-xs text-text-muted">
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          topic.status === "current"
                            ? "text-text"
                            : topic.status === "completed"
                            ? "text-text-muted line-through"
                            : "text-text-muted"
                        )}
                      >
                        {topic.title}
                      </span>
                    </div>
                    {topic.status === "current" && (
                      <span className="rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-medium text-teal">
                        LIVE
                      </span>
                    )}
                    {topic.status === "completed" && (
                      <svg
                        className="h-4 w-4 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  {topic.status !== "upcoming" && (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            topic.status === "completed"
                              ? "bg-success"
                              : "bg-teal"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-dim">
                        {topic.elapsedMinutes}/{topic.allocatedMinutes}m
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

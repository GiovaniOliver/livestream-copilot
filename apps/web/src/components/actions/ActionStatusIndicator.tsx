"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ActionStatus, AgentAction } from "./types";

export interface AutoTriggerStatus {
  actionId: string;
  label: string;
  isEnabled: boolean;
  isRunning: boolean;
  lastTriggeredAt?: number;
  nextTriggerAt?: number;
  cooldownMs?: number;
}

export interface ActionStatusIndicatorProps {
  triggers: AutoTriggerStatus[];
  className?: string;
}

export function ActionStatusIndicator({
  triggers,
  className,
}: ActionStatusIndicatorProps) {
  const [now, setNow] = useState(Date.now());

  // Update time every second for countdown display
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = triggers.filter((t) => t.isEnabled).length;
  const runningCount = triggers.filter((t) => t.isRunning).length;

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return "Ready";
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className={cn("rounded-xl border border-stroke bg-bg-1 p-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg",
            runningCount > 0 ? "bg-teal/20 text-teal" : "bg-surface text-text-muted"
          )}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="text-xs font-medium text-text">Auto-Triggers</span>
        </div>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-medium",
          activeCount > 0 ? "bg-teal/10 text-teal" : "bg-surface text-text-muted"
        )}>
          {activeCount} active
        </span>
      </div>

      {/* Trigger list */}
      <div className="space-y-2">
        {triggers.map((trigger) => {
          const cooldownRemaining = trigger.nextTriggerAt
            ? Math.max(0, trigger.nextTriggerAt - now)
            : 0;
          const isOnCooldown = cooldownRemaining > 0;

          return (
            <div
              key={trigger.actionId}
              className={cn(
                "flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors",
                trigger.isRunning
                  ? "bg-teal/10"
                  : trigger.isEnabled
                    ? "bg-surface/50"
                    : "bg-transparent opacity-50"
              )}
            >
              <div className="flex items-center gap-2">
                {/* Status indicator dot */}
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  trigger.isRunning
                    ? "bg-teal animate-pulse"
                    : trigger.isEnabled
                      ? isOnCooldown
                        ? "bg-warning"
                        : "bg-success"
                      : "bg-text-dim"
                )} />
                <span className={cn(
                  "font-medium",
                  trigger.isEnabled ? "text-text" : "text-text-muted"
                )}>
                  {trigger.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {trigger.isRunning ? (
                  <span className="flex items-center gap-1 text-teal">
                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Running
                  </span>
                ) : isOnCooldown ? (
                  <span className="text-warning">
                    {formatTimeRemaining(cooldownRemaining)}
                  </span>
                ) : trigger.isEnabled ? (
                  <span className="text-success">Ready</span>
                ) : (
                  <span className="text-text-dim">Off</span>
                )}
              </div>
            </div>
          );
        })}

        {triggers.length === 0 && (
          <p className="py-2 text-center text-xs text-text-muted">
            No auto-triggers configured
          </p>
        )}
      </div>
    </div>
  );
}

// Larger variant for dashboard display
export interface ActionStatusBannerProps {
  chapterDetection: {
    isEnabled: boolean;
    isRunning: boolean;
    chaptersDetected: number;
  };
  soundbiteScanning: {
    isEnabled: boolean;
    isRunning: boolean;
    soundbitesFound: number;
  };
  actionItemExtraction: {
    isEnabled: boolean;
    isRunning: boolean;
    itemsExtracted: number;
  };
  className?: string;
}

export function ActionStatusBanner({
  chapterDetection,
  soundbiteScanning,
  actionItemExtraction,
  className,
}: ActionStatusBannerProps) {
  return (
    <div className={cn(
      "flex items-center gap-4 rounded-xl border border-stroke bg-bg-1 px-4 py-3",
      className
    )}>
      {/* Chapter Detection */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          chapterDetection.isRunning
            ? "bg-teal/20 text-teal"
            : chapterDetection.isEnabled
              ? "bg-teal/10 text-teal"
              : "bg-surface text-text-muted"
        )}>
          {chapterDetection.isRunning ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-text">
            Chapter Detection
          </p>
          <p className="text-[10px] text-text-muted">
            {chapterDetection.isRunning
              ? "Scanning..."
              : `${chapterDetection.chaptersDetected} detected`
            }
          </p>
        </div>
        <span className={cn(
          "h-2 w-2 rounded-full",
          chapterDetection.isRunning
            ? "bg-teal animate-pulse"
            : chapterDetection.isEnabled
              ? "bg-success"
              : "bg-text-dim"
        )} />
      </div>

      <div className="h-8 w-px bg-stroke" />

      {/* Soundbite Scanning */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          soundbiteScanning.isRunning
            ? "bg-purple/20 text-purple"
            : soundbiteScanning.isEnabled
              ? "bg-purple/10 text-purple"
              : "bg-surface text-text-muted"
        )}>
          {soundbiteScanning.isRunning ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-text">
            Soundbite Scanning
          </p>
          <p className="text-[10px] text-text-muted">
            {soundbiteScanning.isRunning
              ? "Analyzing..."
              : `${soundbiteScanning.soundbitesFound} found`
            }
          </p>
        </div>
        <span className={cn(
          "h-2 w-2 rounded-full",
          soundbiteScanning.isRunning
            ? "bg-purple animate-pulse"
            : soundbiteScanning.isEnabled
              ? "bg-success"
              : "bg-text-dim"
        )} />
      </div>

      <div className="h-8 w-px bg-stroke" />

      {/* Action Item Extraction */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          actionItemExtraction.isRunning
            ? "bg-warning/20 text-warning"
            : actionItemExtraction.isEnabled
              ? "bg-warning/10 text-warning"
              : "bg-surface text-text-muted"
        )}>
          {actionItemExtraction.isRunning ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-text">
            Action Items
          </p>
          <p className="text-[10px] text-text-muted">
            {actionItemExtraction.isRunning
              ? "Extracting..."
              : `${actionItemExtraction.itemsExtracted} extracted`
            }
          </p>
        </div>
        <span className={cn(
          "h-2 w-2 rounded-full",
          actionItemExtraction.isRunning
            ? "bg-warning animate-pulse"
            : actionItemExtraction.isEnabled
              ? "bg-success"
              : "bg-text-dim"
        )} />
      </div>
    </div>
  );
}

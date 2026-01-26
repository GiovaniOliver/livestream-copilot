"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChapterTimeline } from "./ChapterTimeline";
import { QuoteBank } from "./QuoteBank";
import { PromoDrafts } from "./PromoDrafts";
import { PublishingChecklist } from "./PublishingChecklist";
import { mockEpisode } from "./mockData";
import type { Chapter, Quote, PromoDraft, ChecklistItem, PodcastEpisode } from "./types";

export interface PodcastConsoleProps {
  episode?: PodcastEpisode;
  className?: string;
}

export function PodcastConsole({
  episode: initialEpisode = mockEpisode,
  className,
}: PodcastConsoleProps) {
  const [episode, setEpisode] = useState<PodcastEpisode>(initialEpisode);

  const handleChaptersChange = useCallback((chapters: Chapter[]) => {
    setEpisode((prev) => ({ ...prev, chapters }));
  }, []);

  const handleQuotesChange = useCallback((quotes: Quote[]) => {
    setEpisode((prev) => ({ ...prev, quotes }));
  }, []);

  const handleDraftsChange = useCallback((promoDrafts: PromoDraft[]) => {
    setEpisode((prev) => ({ ...prev, promoDrafts }));
  }, []);

  const handleChecklistChange = useCallback((checklist: ChecklistItem[]) => {
    setEpisode((prev) => ({ ...prev, checklist }));
  }, []);

  const handleTimestampClick = useCallback((timestamp: number) => {
    console.log("Jump to timestamp:", timestamp);
    // In a real app, this would control a media player
  }, []);

  const handleExport = useCallback(() => {
    console.log("Exporting episode:", episode);
    // In a real app, this would trigger an export workflow
    alert("Episode export started! Check your downloads.");
  }, [episode]);

  return (
    <div className={cn("min-h-screen bg-bg-0 p-6", className)}>
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">{episode.title}</h1>
            <p className="text-sm text-text-muted">
              Podcast Console | Episode ID: {episode.id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status badge */}
            <span className="flex items-center gap-2 rounded-full border border-teal/30 bg-teal/10 px-4 py-1.5 text-sm font-medium text-teal">
              <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
              Editing
            </span>
            {/* Settings button */}
            <button className="rounded-xl border border-stroke bg-bg-1 p-2.5 text-text-muted transition-colors hover:bg-surface hover:text-text">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top: Chapter Timeline (Full Width) */}
        <div className="lg:col-span-12">
          <ChapterTimeline
            chapters={episode.chapters}
            totalDuration={episode.duration}
            onChaptersChange={handleChaptersChange}
          />
        </div>

        {/* Left: Quote Bank */}
        <div className="lg:col-span-5">
          <QuoteBank
            quotes={episode.quotes}
            onQuotesChange={handleQuotesChange}
            onTimestampClick={handleTimestampClick}
          />
        </div>

        {/* Right: Promo Drafts */}
        <div className="lg:col-span-7">
          <PromoDrafts
            promoDrafts={episode.promoDrafts}
            onDraftsChange={handleDraftsChange}
          />
        </div>

        {/* Bottom: Publishing Checklist (Full Width) */}
        <div className="lg:col-span-12">
          <PublishingChecklist
            checklist={episode.checklist}
            onChecklistChange={handleChecklistChange}
            onExport={handleExport}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 flex items-center justify-between border-t border-stroke pt-6">
        <p className="text-xs text-text-dim">
          Last saved: {new Date().toLocaleTimeString()} | Auto-save enabled
        </p>
        <div className="flex items-center gap-4">
          <button className="text-sm text-text-muted transition-colors hover:text-text">
            Preview Episode
          </button>
          <button className="rounded-xl border border-purple/30 bg-purple/10 px-4 py-2 text-sm font-medium text-purple transition-all hover:bg-purple/20">
            Save Draft
          </button>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from "@/components/ui";

export interface ClipData {
  id: string;
  artifactId: string;
  title: string;
  hookVariants: string[];
  thumbnailUrl: string;
  duration: number;
  timestamp: string;
  status: "processing" | "ready" | "exported";
  createdAt: Date;
  startTime: number;
  endTime: number;
}

interface ClipBinProps {
  clips: ClipData[];
  onPreview: (clip: ClipData) => void;
  onExport: (clip: ClipData) => void;
  onEditHook: (clipId: string, hookIndex: number) => void;
  isConnected: boolean;
}

const FilmIcon = () => (
  <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
  </svg>
);

const PlayIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

function getStatusColor(status: ClipData["status"]): string {
  switch (status) {
    case "processing":
      return "bg-yellow-500/20 text-yellow-400";
    case "ready":
      return "bg-green-500/20 text-green-400";
    case "exported":
      return "bg-purple-500/20 text-purple-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

export function ClipBin({
  clips,
  onPreview,
  onExport,
  onEditHook,
  isConnected,
}: ClipBinProps) {
  const [selectedHookIndex, setSelectedHookIndex] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const getSelectedHook = (clip: ClipData): string => {
    const index = selectedHookIndex[clip.id] ?? 0;
    return clip.hookVariants[index] || clip.title;
  };

  return (
    <Card variant="elevated" className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Clip Bin
              <Badge variant="purple">{clips.length}</Badge>
            </CardTitle>
            <CardDescription>
              Video clips with hook variants
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-purple/20 text-purple"
                  : "text-text-muted hover:bg-surface-hover"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-purple/20 text-purple"
                  : "text-text-muted hover:bg-surface-hover"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="animate-pulse">
              <FilmIcon />
            </div>
            <p className="mt-3 text-sm text-text-muted">Connecting to live stream...</p>
          </div>
        )}

        {isConnected && clips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FilmIcon />
            <p className="mt-3 text-sm text-text-muted">No clips captured yet</p>
            <p className="mt-1 text-xs text-text-muted">
              Clips will appear here as they're captured from your stream
            </p>
          </div>
        )}

        {isConnected && clips.length > 0 && (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
                : "space-y-3"
            }
          >
            {clips.map((clip) => (
              <div
                key={clip.id}
                className={`group relative overflow-hidden rounded-xl border border-stroke bg-surface transition-all hover:border-purple/50 hover:shadow-lg ${
                  viewMode === "list" ? "flex gap-4 p-3" : ""
                }`}
              >
                {/* Thumbnail */}
                <div
                  className={`relative ${
                    viewMode === "grid" ? "aspect-video" : "h-20 w-32 flex-shrink-0"
                  } overflow-hidden bg-surface-elevated`}
                >
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FilmIcon />
                    </div>
                  )}

                  {/* Duration badge */}
                  <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                    {formatDuration(clip.duration)}
                  </div>

                  {/* Play overlay on hover */}
                  <div
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => onPreview(clip)}
                  >
                    <div className="rounded-full bg-white/90 p-2">
                      <PlayIcon />
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="absolute left-1 top-1">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(clip.status)}`}>
                      {clip.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className={viewMode === "grid" ? "p-3" : "flex-1 py-1"}>
                  {/* Title */}
                  <h4 className="mb-1 line-clamp-1 text-sm font-medium text-text">
                    {clip.title}
                  </h4>

                  {/* Hook variants */}
                  {clip.hookVariants.length > 0 && (
                    <div className="mb-2">
                      <p className="mb-1 line-clamp-2 text-xs text-text-muted">
                        {getSelectedHook(clip)}
                      </p>
                      {clip.hookVariants.length > 1 && (
                        <div className="flex flex-wrap gap-1">
                          {clip.hookVariants.map((_, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() =>
                                setSelectedHookIndex((prev) => ({
                                  ...prev,
                                  [clip.id]: index,
                                }))
                              }
                              className={`flex h-5 w-5 items-center justify-center rounded text-[10px] transition-colors ${
                                (selectedHookIndex[clip.id] ?? 0) === index
                                  ? "bg-purple text-white"
                                  : "bg-surface-elevated text-text-muted hover:bg-surface-hover"
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => onEditHook(clip.id, selectedHookIndex[clip.id] ?? 0)}
                            className="flex h-5 items-center gap-0.5 rounded bg-surface-elevated px-1.5 text-[10px] text-text-muted transition-colors hover:bg-surface-hover"
                          >
                            <EditIcon />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamp and actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">{clip.timestamp}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs"
                        onClick={() => onPreview(clip)}
                      >
                        <PlayIcon />
                        <span className="hidden sm:inline">Preview</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs text-purple hover:text-purple-400"
                        onClick={() => onExport(clip)}
                      >
                        <DownloadIcon />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ClipBin;

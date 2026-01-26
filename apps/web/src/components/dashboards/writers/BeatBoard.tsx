"use client";

import { type FC, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { BeatBoardProps, Beat, ActNumber } from "./types";
import { ACT_COLORS } from "./types";
import { BeatCard } from "./BeatCard";

// ============================================================================
// Beat Board Component
// Kanban-style board for organizing story beats by act
// ============================================================================

const BeatBoard: FC<BeatBoardProps> = ({
  beats,
  onBeatReorder,
  onBeatUpdate,
  onBeatAdd,
  onBeatDelete,
}) => {
  const [draggedBeat, setDraggedBeat] = useState<Beat | null>(null);
  const [dragOverAct, setDragOverAct] = useState<ActNumber | null>(null);
  const [isAddingBeat, setIsAddingBeat] = useState<ActNumber | null>(null);
  const [newBeatTitle, setNewBeatTitle] = useState("");

  const getBeatsForAct = useCallback(
    (act: ActNumber): Beat[] => {
      return beats
        .filter((beat) => beat.act === act)
        .sort((a, b) => a.order - b.order);
    },
    [beats]
  );

  const acts: ActNumber[] = [1, 2, 3];

  const handleDragStart = (beat: Beat) => {
    setDraggedBeat(beat);
  };

  const handleDragEnd = () => {
    setDraggedBeat(null);
    setDragOverAct(null);
  };

  const handleDragOver = (e: React.DragEvent, act: ActNumber) => {
    e.preventDefault();
    setDragOverAct(act);
  };

  const handleDrop = (e: React.DragEvent, act: ActNumber) => {
    e.preventDefault();
    if (draggedBeat) {
      const beatsInAct = getBeatsForAct(act);
      const newOrder = beatsInAct.length + 1;
      onBeatReorder?.(draggedBeat.id, newOrder, act);
    }
    setDraggedBeat(null);
    setDragOverAct(null);
  };

  const handleAddBeat = (act: ActNumber) => {
    if (newBeatTitle.trim()) {
      const beatsInAct = getBeatsForAct(act);
      onBeatAdd?.({
        title: newBeatTitle.trim(),
        summary: "",
        act,
        order: beatsInAct.length + 1,
        status: "draft",
      });
      setNewBeatTitle("");
      setIsAddingBeat(null);
    }
  };

  const getActStats = (act: ActNumber) => {
    const actBeats = getBeatsForAct(act);
    const complete = actBeats.filter((b) => b.status === "complete").length;
    const inProgress = actBeats.filter((b) => b.status === "in-progress").length;
    return { total: actBeats.length, complete, inProgress };
  };

  return (
    <div className="h-full flex flex-col bg-bg-0">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-stroke">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-teal"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-text">Beat Board</h3>
        </div>
        <span className="text-xs text-text-muted">{beats.length} beats</span>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-4">
          {acts.map((act) => {
            const actColors = ACT_COLORS[act];
            const stats = getActStats(act);
            const actBeats = getBeatsForAct(act);

            return (
              <div
                key={act}
                className={cn(
                  "rounded-lg border transition-colors duration-200",
                  dragOverAct === act
                    ? "border-teal bg-teal/5"
                    : "border-stroke bg-bg-1"
                )}
                onDragOver={(e) => handleDragOver(e, act)}
                onDrop={(e) => handleDrop(e, act)}
                onDragLeave={() => setDragOverAct(null)}
              >
                {/* Act header */}
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2 border-b",
                    "rounded-t-lg",
                    actColors.bg
                  )}
                  style={{
                    borderColor:
                      act === 1
                        ? "rgba(139, 92, 246, 0.2)"
                        : act === 2
                          ? "rgba(0, 212, 199, 0.2)"
                          : "rgba(251, 191, 36, 0.2)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-bold", actColors.text)}>
                      ACT {act}
                    </span>
                    <span className="text-xs text-text-dim">
                      {stats.complete}/{stats.total} complete
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAddingBeat(act)}
                    className={cn(
                      "p-1 rounded-md",
                      "text-text-muted hover:text-teal hover:bg-teal/10",
                      "transition-colors duration-150"
                    )}
                    title={`Add beat to Act ${act}`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>

                {/* Beats list */}
                <div className="p-2 space-y-2">
                  {actBeats.map((beat) => (
                    <div
                      key={beat.id}
                      draggable
                      onDragStart={() => handleDragStart(beat)}
                      onDragEnd={handleDragEnd}
                    >
                      <BeatCard
                        beat={beat}
                        isDragging={draggedBeat?.id === beat.id}
                        onEdit={onBeatUpdate}
                        onDelete={onBeatDelete}
                      />
                    </div>
                  ))}

                  {/* Add beat form */}
                  {isAddingBeat === act && (
                    <div className="rounded-lg border border-stroke p-3 bg-bg-2">
                      <input
                        type="text"
                        value={newBeatTitle}
                        onChange={(e) => setNewBeatTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddBeat(act);
                          if (e.key === "Escape") setIsAddingBeat(null);
                        }}
                        placeholder="Beat title..."
                        className={cn(
                          "w-full px-2 py-1.5 text-sm rounded-md",
                          "bg-bg-1 border border-stroke text-text",
                          "placeholder:text-text-dim",
                          "focus:outline-none focus:ring-2 focus:ring-teal/50"
                        )}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleAddBeat(act)}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md",
                            "bg-teal/10 text-teal border border-teal/30",
                            "hover:bg-teal/20 transition-colors"
                          )}
                        >
                          Add Beat
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingBeat(null);
                            setNewBeatTitle("");
                          }}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md",
                            "text-text-muted hover:text-text",
                            "transition-colors"
                          )}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {actBeats.length === 0 && isAddingBeat !== act && (
                    <div className="py-4 text-center">
                      <p className="text-xs text-text-dim">No beats in Act {act}</p>
                      <button
                        onClick={() => setIsAddingBeat(act)}
                        className={cn(
                          "mt-2 text-xs text-teal hover:underline",
                          "transition-colors duration-150"
                        )}
                      >
                        Add first beat
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {stats.total > 0 && (
                  <div className="px-3 pb-2">
                    <div className="h-1 rounded-full bg-bg-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success transition-all duration-300"
                        style={{
                          width: `${(stats.complete / stats.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer stats */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-stroke text-xs text-text-dim">
        <span>
          {beats.filter((b) => b.status === "complete").length} of {beats.length}{" "}
          complete
        </span>
        <span>Drag beats to reorder</span>
      </div>
    </div>
  );
};

export { BeatBoard };

"use client";

import { type FC, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { TranscriptLine, WriterNote } from "@/hooks/useWritersCorner";

// ============================================================================
// Writing Pad Component
// Live transcript display with writer notes sidebar
// ============================================================================

interface WritingPadProps {
  readonly transcriptLines: readonly TranscriptLine[];
  readonly writerNotes: readonly WriterNote[];
  readonly onAddNote: (text: string) => void;
  readonly onRemoveNote: (id: string) => void;
}

// Icons
const PencilSquareIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const TrashIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const MicrophoneIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
    />
  </svg>
);

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Speaker color mapping for consistent color assignments
const SPEAKER_COLORS = [
  "text-teal",
  "text-purple",
  "text-warning",
  "text-success",
  "text-error",
  "text-teal-400",
  "text-purple-400",
] as const;

function getSpeakerColor(speakerId: string, speakerIndex: Map<string, number>): string {
  if (!speakerIndex.has(speakerId)) {
    speakerIndex.set(speakerId, speakerIndex.size);
  }
  const index = speakerIndex.get(speakerId) ?? 0;
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

const WritingPad: FC<WritingPadProps> = ({
  transcriptLines,
  writerNotes,
  onAddNote,
  onRemoveNote,
}) => {
  const [noteInput, setNoteInput] = useState("");
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const speakerIndexRef = useRef<Map<string, number>>(new Map());

  // Auto-scroll to bottom when new transcript lines arrive
  useEffect(() => {
    if (isAutoScroll && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptLines.length, isAutoScroll]);

  const handleAddNote = () => {
    if (noteInput.trim()) {
      onAddNote(noteInput);
      setNoteInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Transcript area */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col lg:flex-row gap-4">
          {/* Live Transcript */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MicrophoneIcon className="h-4 w-4 text-teal" />
                <h4 className="text-sm font-medium text-text">Live Transcript</h4>
                {transcriptLines.length > 0 && (
                  <span className="text-xs text-text-dim">
                    {transcriptLines.length} lines
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAutoScroll((prev) => !prev)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-colors",
                  isAutoScroll
                    ? "bg-teal/10 text-teal border border-teal/30"
                    : "bg-surface text-text-muted"
                )}
                aria-label={isAutoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
              >
                {isAutoScroll ? "Auto-scroll on" : "Auto-scroll off"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-bg-2 p-4 font-mono text-sm">
              {transcriptLines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center">
                  <MicrophoneIcon className="h-10 w-10 text-text-dim mb-3" />
                  <p className="text-text-muted text-center">
                    Waiting for transcript...
                  </p>
                  <p className="text-xs text-text-dim text-center mt-1">
                    Speech will appear here in real-time
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transcriptLines.map((line) => {
                    const speakerColor = getSpeakerColor(
                      line.speakerId ?? "unknown",
                      speakerIndexRef.current
                    );
                    return (
                      <div key={line.id} className="group flex gap-3">
                        <span className="shrink-0 text-xs text-text-dim tabular-nums pt-0.5">
                          {formatTime(line.t0)}
                        </span>
                        <div className="min-w-0">
                          <span className={cn("text-xs font-semibold uppercase", speakerColor)}>
                            {line.speakerId ?? "Unknown"}
                          </span>
                          <p className="text-text leading-relaxed">{line.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Writer Notes */}
          <div className="w-full lg:w-72 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <PencilSquareIcon className="h-4 w-4 text-purple" />
              <h4 className="text-sm font-medium text-text">Writer Notes</h4>
              {writerNotes.length > 0 && (
                <span className="text-xs text-text-dim">{writerNotes.length}</span>
              )}
            </div>

            {/* Note input */}
            <div className="mb-3">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a note... (Enter to save)"
                rows={2}
                className={cn(
                  "w-full resize-none rounded-lg border bg-bg-2 px-3 py-2 text-sm text-text",
                  "border-stroke placeholder:text-text-dim",
                  "focus:outline-none focus:ring-2 focus:ring-purple/50 focus:border-purple"
                )}
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteInput.trim()}
                className={cn(
                  "mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  noteInput.trim()
                    ? "bg-purple/10 text-purple border border-purple/30 hover:bg-purple/20"
                    : "bg-surface text-text-dim cursor-not-allowed"
                )}
              >
                Add Note
              </button>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {writerNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-8">
                  <PencilSquareIcon className="h-8 w-8 text-text-dim mb-2" />
                  <p className="text-xs text-text-muted">No notes yet</p>
                </div>
              ) : (
                writerNotes.map((note) => (
                  <div
                    key={note.id}
                    className="group rounded-lg border border-stroke bg-bg-2 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-text leading-relaxed">{note.text}</p>
                      <button
                        type="button"
                        onClick={() => onRemoveNote(note.id)}
                        className="shrink-0 p-1 rounded text-text-dim opacity-0 group-hover:opacity-100 hover:text-error transition-all"
                        aria-label="Remove note"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-text-dim">
                      {new Date(note.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { WritingPad };

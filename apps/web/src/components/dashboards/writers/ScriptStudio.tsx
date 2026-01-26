"use client";

import { type FC, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type {
  ScriptStudioProps,
  ScriptElement,
  Beat,
  Note,
  ActNumber,
} from "./types";
import { ScriptPage } from "./ScriptPage";
import { BeatBoard } from "./BeatBoard";
import { NotesStack } from "./NotesStack";
import {
  MOCK_SCRIPT_DOCUMENT,
  MOCK_SCRIPT_ELEMENTS,
  MOCK_BEATS,
  MOCK_NOTES,
  MOCK_CONTRIBUTORS,
} from "./mockData";

// ============================================================================
// Script Studio Dashboard
// Main layout with 3-panel view: ScriptPage, BeatBoard, NotesStack
// ============================================================================

const ScriptStudio: FC<ScriptStudioProps> = ({
  documentId,
  initialDocument,
  onSave,
}) => {
  // Use initial document or mock data
  const document = initialDocument || MOCK_SCRIPT_DOCUMENT;

  // State management
  const [elements, setElements] = useState<ScriptElement[]>(
    document.elements || MOCK_SCRIPT_ELEMENTS
  );
  const [beats, setBeats] = useState<Beat[]>(document.beats || MOCK_BEATS);
  const [notes, setNotes] = useState<Note[]>(document.notes || MOCK_NOTES);

  // Panel visibility state (for responsive)
  const [showBeatBoard, setShowBeatBoard] = useState(true);
  const [showNotesStack, setShowNotesStack] = useState(true);

  // ============================================================================
  // Script Element Handlers
  // ============================================================================

  const handleElementUpdate = useCallback((updatedElement: ScriptElement) => {
    setElements((prev) =>
      prev.map((el) => (el.id === updatedElement.id ? updatedElement : el))
    );
  }, []);

  const handleInsertAccept = useCallback((insertId: string) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.isInsert && el.id.includes(insertId.replace("insert-", ""))) {
          return { ...el, insertStatus: "accepted", isInsert: false };
        }
        return el;
      })
    );
  }, []);

  const handleInsertReject = useCallback((insertId: string) => {
    setElements((prev) =>
      prev.filter(
        (el) =>
          !(el.isInsert && el.id.includes(insertId.replace("insert-", "")))
      )
    );
  }, []);

  // ============================================================================
  // Beat Handlers
  // ============================================================================

  const handleBeatReorder = useCallback(
    (beatId: string, newOrder: number, newAct?: ActNumber) => {
      setBeats((prev) => {
        const beat = prev.find((b) => b.id === beatId);
        if (!beat) return prev;

        const updatedBeat = {
          ...beat,
          order: newOrder,
          act: newAct || beat.act,
          updatedAt: new Date(),
        };

        return prev.map((b) => (b.id === beatId ? updatedBeat : b));
      });
    },
    []
  );

  const handleBeatUpdate = useCallback((updatedBeat: Beat) => {
    setBeats((prev) =>
      prev.map((b) =>
        b.id === updatedBeat.id
          ? { ...updatedBeat, updatedAt: new Date() }
          : b
      )
    );
  }, []);

  const handleBeatAdd = useCallback(
    (newBeat: Omit<Beat, "id" | "createdAt" | "updatedAt">) => {
      const beat: Beat = {
        ...newBeat,
        id: `beat-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setBeats((prev) => [...prev, beat]);
    },
    []
  );

  const handleBeatDelete = useCallback((beatId: string) => {
    setBeats((prev) => prev.filter((b) => b.id !== beatId));
  }, []);

  // ============================================================================
  // Note Handlers
  // ============================================================================

  const handleNoteUpdate = useCallback((updatedNote: Note) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === updatedNote.id
          ? { ...updatedNote, updatedAt: new Date() }
          : n
      )
    );
  }, []);

  const handleNoteAdd = useCallback(
    (newNote: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
      const note: Note = {
        ...newNote,
        id: `note-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setNotes((prev) => [...prev, note]);
    },
    []
  );

  const handleNoteResolve = useCallback((noteId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, isResolved: true, updatedAt: new Date() }
          : n
      )
    );
  }, []);

  const handleNoteDelete = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  // ============================================================================
  // Save Handler
  // ============================================================================

  const handleSave = useCallback(() => {
    const updatedDocument = {
      ...document,
      elements,
      beats,
      notes,
      updatedAt: new Date(),
    };
    onSave?.(updatedDocument);
  }, [document, elements, beats, notes, onSave]);

  return (
    <div className="h-screen w-full flex flex-col bg-bg-0 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-stroke bg-bg-1">
        <div className="flex items-center gap-4">
          {/* Logo / Back */}
          <button
            className={cn(
              "p-2 rounded-lg",
              "text-text-muted hover:text-text hover:bg-surface",
              "transition-colors duration-150"
            )}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          {/* Document info */}
          <div>
            <h1 className="text-lg font-bold text-text">{document.title}</h1>
            <p className="text-xs text-text-muted">
              {document.subtitle} - v{document.version}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Panel toggles */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface">
            <button
              onClick={() => setShowBeatBoard(!showBeatBoard)}
              className={cn(
                "p-1.5 rounded-md transition-colors duration-150",
                showBeatBoard
                  ? "text-teal bg-teal/10"
                  : "text-text-muted hover:text-text"
              )}
              title="Toggle Beat Board"
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
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowNotesStack(!showNotesStack)}
              className={cn(
                "p-1.5 rounded-md transition-colors duration-150",
                showNotesStack
                  ? "text-purple bg-purple/10"
                  : "text-text-muted hover:text-text"
              )}
              title="Toggle Notes Stack"
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </button>
          </div>

          {/* Contributors */}
          <div className="flex -space-x-2">
            {MOCK_CONTRIBUTORS.slice(0, 4).map((contributor) => (
              <div
                key={contributor.id}
                className={cn(
                  "w-8 h-8 rounded-full border-2 border-bg-1",
                  "flex items-center justify-center text-xs font-medium text-white"
                )}
                style={{ backgroundColor: contributor.color }}
                title={contributor.name}
              >
                {contributor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
            ))}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl",
              "bg-gradient-brand border border-teal/40 text-text",
              "shadow-card hover:-translate-y-0.5 hover:shadow-glow",
              "transition-all duration-200"
            )}
          >
            Save Draft
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Script Page (main area) */}
        <div
          className={cn(
            "flex-1 min-w-0 border-r border-stroke",
            "transition-all duration-300"
          )}
        >
          <ScriptPage
            elements={elements}
            onElementUpdate={handleElementUpdate}
            onInsertAccept={handleInsertAccept}
            onInsertReject={handleInsertReject}
          />
        </div>

        {/* Right Panels Container */}
        <div
          className={cn(
            "shrink-0 flex flex-col",
            "transition-all duration-300",
            showBeatBoard || showNotesStack ? "w-80" : "w-0"
          )}
        >
          {/* Right Top - Beat Board */}
          {showBeatBoard && (
            <div
              className={cn(
                "border-b border-stroke",
                "transition-all duration-300",
                showNotesStack ? "h-1/2" : "h-full"
              )}
            >
              <BeatBoard
                beats={beats}
                onBeatReorder={handleBeatReorder}
                onBeatUpdate={handleBeatUpdate}
                onBeatAdd={handleBeatAdd}
                onBeatDelete={handleBeatDelete}
              />
            </div>
          )}

          {/* Right Bottom - Notes Stack */}
          {showNotesStack && (
            <div
              className={cn(
                "transition-all duration-300",
                showBeatBoard ? "h-1/2" : "h-full"
              )}
            >
              <NotesStack
                notes={notes}
                contributors={MOCK_CONTRIBUTORS}
                onNoteUpdate={handleNoteUpdate}
                onNoteAdd={handleNoteAdd}
                onNoteResolve={handleNoteResolve}
                onNoteDelete={handleNoteDelete}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer status bar */}
      <footer className="shrink-0 flex items-center justify-between px-6 py-2 border-t border-stroke bg-bg-1">
        <div className="flex items-center gap-4 text-xs text-text-dim">
          <span>Script Studio</span>
          <span>|</span>
          <span>{elements.length} script elements</span>
          <span>|</span>
          <span>{beats.length} beats</span>
          <span>|</span>
          <span>{notes.filter((n) => !n.isResolved).length} open notes</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-dim">
          <span>Autosave enabled</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { ScriptStudio };

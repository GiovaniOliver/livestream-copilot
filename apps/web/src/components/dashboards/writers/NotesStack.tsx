"use client";

import { type FC, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { NotesStackProps, Note, NoteCategory, NotePriority } from "./types";
import { CATEGORY_LABELS } from "./types";
import { NoteCard } from "./NoteCard";

// ============================================================================
// Notes Stack Component
// Collapsible notes panel organized by category
// ============================================================================

type FilterType = "all" | NoteCategory;
type SortType = "priority" | "date" | "category";

const NotesStack: FC<NotesStackProps> = ({
  notes,
  contributors,
  onNoteUpdate,
  onNoteAdd,
  onNoteResolve,
  onNoteDelete,
}) => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("priority");
  const [showResolved, setShowResolved] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<NoteCategory>("general");

  const getContributor = (id: string) =>
    contributors.find((c) => c.id === id);

  const priorityOrder: Record<NotePriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const filteredAndSortedNotes = useMemo(() => {
    let result = [...notes];

    // Filter by resolved status
    if (!showResolved) {
      result = result.filter((note) => !note.isResolved);
    }

    // Filter by category
    if (filter !== "all") {
      result = result.filter((note) => note.category === filter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case "priority":
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case "date":
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return result;
  }, [notes, filter, sort, showResolved]);

  const toggleNoteExpanded = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const handleAddNote = () => {
    if (newNoteTitle.trim()) {
      onNoteAdd?.({
        title: newNoteTitle.trim(),
        content: "",
        category: newNoteCategory,
        priority: "medium",
        proposedBy: contributors[0]?.id || "unknown",
        isResolved: false,
      });
      setNewNoteTitle("");
      setNewNoteCategory("general");
      setIsAddingNote(false);
    }
  };

  const getCategoryCount = (category: NoteCategory | "all"): number => {
    if (category === "all") {
      return showResolved
        ? notes.length
        : notes.filter((n) => !n.isResolved).length;
    }
    return notes.filter(
      (n) => n.category === category && (showResolved || !n.isResolved)
    ).length;
  };

  const unresolvedCount = notes.filter((n) => !n.isResolved).length;
  const urgentCount = notes.filter(
    (n) => n.priority === "urgent" && !n.isResolved
  ).length;

  return (
    <div className="h-full flex flex-col bg-bg-0">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-stroke">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple"
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
            <h3 className="text-sm font-semibold text-text">Notes Stack</h3>
          </div>
          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-error/10 text-error border border-error/30">
                {urgentCount} urgent
              </span>
            )}
            <span className="text-xs text-text-muted">
              {unresolvedCount} open
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(
            ["all", "open-loop", "character", "attribution", "general"] as const
          ).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-2 py-1 text-xs rounded-md transition-colors duration-150",
                filter === cat
                  ? "bg-teal/10 text-teal border border-teal/30"
                  : "bg-surface text-text-muted hover:text-text hover:bg-surface-hover"
              )}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat]} (
              {getCategoryCount(cat)})
            </button>
          ))}
        </div>
      </div>

      {/* Sort and options bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-stroke-subtle bg-bg-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-dim">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className={cn(
              "px-2 py-1 text-xs rounded-md",
              "bg-surface border border-stroke text-text",
              "focus:outline-none focus:ring-2 focus:ring-teal/50"
            )}
          >
            <option value="priority">Priority</option>
            <option value="date">Date</option>
            <option value="category">Category</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className={cn(
                "w-3.5 h-3.5 rounded border-stroke",
                "bg-surface text-teal",
                "focus:ring-2 focus:ring-teal/50 focus:ring-offset-0"
              )}
            />
            <span className="text-xs text-text-muted">Show resolved</span>
          </label>

          <button
            onClick={() => setIsAddingNote(true)}
            className={cn(
              "p-1.5 rounded-md",
              "text-text-muted hover:text-teal hover:bg-teal/10",
              "transition-colors duration-150"
            )}
            title="Add note"
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
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {/* Add note form */}
        {isAddingNote && (
          <div className="rounded-lg border border-stroke p-3 bg-bg-1">
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddNote();
                if (e.key === "Escape") setIsAddingNote(false);
              }}
              placeholder="Note title..."
              className={cn(
                "w-full px-2 py-1.5 text-sm rounded-md mb-2",
                "bg-bg-2 border border-stroke text-text",
                "placeholder:text-text-dim",
                "focus:outline-none focus:ring-2 focus:ring-teal/50"
              )}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <select
                value={newNoteCategory}
                onChange={(e) =>
                  setNewNoteCategory(e.target.value as NoteCategory)
                }
                className={cn(
                  "px-2 py-1 text-xs rounded-md",
                  "bg-bg-2 border border-stroke text-text",
                  "focus:outline-none focus:ring-2 focus:ring-teal/50"
                )}
              >
                <option value="general">General</option>
                <option value="open-loop">Open Loop</option>
                <option value="character">Character</option>
                <option value="attribution">Attribution</option>
              </select>
              <button
                onClick={handleAddNote}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md",
                  "bg-teal/10 text-teal border border-teal/30",
                  "hover:bg-teal/20 transition-colors"
                )}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNoteTitle("");
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

        {/* Notes */}
        {filteredAndSortedNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            contributor={getContributor(note.proposedBy)}
            isExpanded={expandedNotes.has(note.id)}
            onToggleExpand={() => toggleNoteExpanded(note.id)}
            onResolve={onNoteResolve}
            onEdit={onNoteUpdate}
            onDelete={onNoteDelete}
          />
        ))}

        {/* Empty state */}
        {filteredAndSortedNotes.length === 0 && !isAddingNote && (
          <div className="py-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-text-dim mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-sm text-text-muted mb-2">
              {filter === "all"
                ? "No notes yet"
                : `No ${CATEGORY_LABELS[filter as NoteCategory].toLowerCase()} notes`}
            </p>
            <button
              onClick={() => setIsAddingNote(true)}
              className={cn(
                "text-sm text-teal hover:underline",
                "transition-colors duration-150"
              )}
            >
              Add your first note
            </button>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="shrink-0 px-4 py-2 border-t border-stroke bg-bg-1">
        <div className="flex items-center justify-between text-xs text-text-dim">
          <span>
            {filteredAndSortedNotes.length} note
            {filteredAndSortedNotes.length !== 1 && "s"} shown
          </span>
          <span>
            {notes.filter((n) => n.isResolved).length} resolved
          </span>
        </div>
      </div>
    </div>
  );
};

export { NotesStack };

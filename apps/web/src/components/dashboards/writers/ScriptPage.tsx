"use client";

import { type FC, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ScriptPageProps, ScriptElement, ScriptInsertData } from "./types";
import { ScriptInsert } from "./ScriptInsert";
import { MOCK_CONTRIBUTORS, MOCK_INSERTS } from "./mockData";
import { logger } from "@/lib/logger";

// ============================================================================
// Script Page Component
// Main screenplay formatting view with inline editing and insert suggestions
// ============================================================================

const ScriptPage: FC<ScriptPageProps> = ({
  elements,
  onElementUpdate,
  onInsertAccept,
  onInsertReject,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // Group consecutive insert elements together
  const groupedElements = useCallback(() => {
    const groups: Array<{
      type: "element" | "insert";
      data: ScriptElement | ScriptInsertData;
    }> = [];

    let currentInsertGroup: ScriptElement[] = [];
    let currentInsertBy: string | undefined;

    elements.forEach((element, index) => {
      if (element.isInsert && element.insertStatus === "pending") {
        // Check if this continues an existing insert group
        if (
          currentInsertGroup.length === 0 ||
          currentInsertBy === element.proposedBy
        ) {
          currentInsertGroup.push(element);
          currentInsertBy = element.proposedBy;
        } else {
          // Flush existing group and start new one
          if (currentInsertGroup.length > 0) {
            const insertData: ScriptInsertData = {
              id: `insert-${currentInsertGroup[0].id}`,
              elements: currentInsertGroup,
              proposedBy: currentInsertBy || "unknown",
              proposedAt: currentInsertGroup[0].timestamp || new Date(),
              status: "pending",
            };
            groups.push({ type: "insert", data: insertData });
          }
          currentInsertGroup = [element];
          currentInsertBy = element.proposedBy;
        }
      } else {
        // Flush any pending insert group
        if (currentInsertGroup.length > 0) {
          const existingInsert = MOCK_INSERTS.find((ins) =>
            ins.elements.some((el) => el.id === currentInsertGroup[0].id)
          );
          const insertData: ScriptInsertData = existingInsert || {
            id: `insert-${currentInsertGroup[0].id}`,
            elements: currentInsertGroup,
            proposedBy: currentInsertBy || "unknown",
            proposedAt: currentInsertGroup[0].timestamp || new Date(),
            status: "pending",
          };
          groups.push({ type: "insert", data: insertData });
          currentInsertGroup = [];
          currentInsertBy = undefined;
        }
        groups.push({ type: "element", data: element });
      }
    });

    // Flush any remaining insert group
    if (currentInsertGroup.length > 0) {
      const existingInsert = MOCK_INSERTS.find((ins) =>
        ins.elements.some((el) => el.id === currentInsertGroup[0].id)
      );
      const insertData: ScriptInsertData = existingInsert || {
        id: `insert-${currentInsertGroup[0].id}`,
        elements: currentInsertGroup,
        proposedBy: currentInsertBy || "unknown",
        proposedAt: currentInsertGroup[0].timestamp || new Date(),
        status: "pending",
      };
      groups.push({ type: "insert", data: insertData });
    }

    return groups;
  }, [elements]);

  const handleDoubleClick = (element: ScriptElement) => {
    setEditingId(element.id);
    setEditingContent(element.content);
  };

  const handleBlur = (element: ScriptElement) => {
    if (editingContent !== element.content) {
      onElementUpdate?.({
        ...element,
        content: editingContent,
      });
    }
    setEditingId(null);
    setEditingContent("");
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    element: ScriptElement
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur(element);
    }
    if (e.key === "Escape") {
      setEditingId(null);
      setEditingContent("");
    }
  };

  const renderElement = (element: ScriptElement): React.ReactNode => {
    const isEditing = editingId === element.id;
    const baseClasses = "font-mono leading-relaxed";

    const editableWrapper = (
      content: React.ReactNode,
      additionalClasses: string = ""
    ) => (
      <div
        className={cn(
          "group relative cursor-text",
          "hover:bg-surface/30 rounded px-1 -mx-1",
          "transition-colors duration-150",
          isEditing && "bg-surface/50"
        )}
        onDoubleClick={() => handleDoubleClick(element)}
      >
        {isEditing ? (
          <textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            onBlur={() => handleBlur(element)}
            onKeyDown={(e) => handleKeyDown(e, element)}
            className={cn(
              baseClasses,
              additionalClasses,
              "w-full bg-transparent border-none outline-none resize-none",
              "focus:ring-2 focus:ring-teal/30 rounded"
            )}
            autoFocus
            rows={Math.ceil(editingContent.length / 60) || 1}
          />
        ) : (
          <>
            {content}
            <span
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "text-[10px] text-text-dim"
              )}
            >
              Double-click to edit
            </span>
          </>
        )}
      </div>
    );

    switch (element.type) {
      case "scene-heading":
        return (
          <div className={cn(baseClasses, "mt-6 mb-3")}>
            {editableWrapper(
              <h3 className="text-sm font-bold text-text uppercase tracking-wide">
                {element.content}
              </h3>,
              "text-sm font-bold text-text uppercase tracking-wide"
            )}
          </div>
        );

      case "action":
        return (
          <div className={cn(baseClasses, "my-2 max-w-[90%]")}>
            {editableWrapper(
              <p className="text-sm text-text-muted">{element.content}</p>,
              "text-sm text-text-muted"
            )}
          </div>
        );

      case "character":
        return (
          <div className={cn(baseClasses, "mt-4 mb-0")}>
            {editableWrapper(
              <p className="text-sm font-semibold text-teal uppercase text-center">
                {element.content}
              </p>,
              "text-sm font-semibold text-teal uppercase text-center"
            )}
          </div>
        );

      case "parenthetical":
        return (
          <div className={cn(baseClasses, "my-0")}>
            {editableWrapper(
              <p className="text-sm text-text-muted italic text-center">
                {element.content}
              </p>,
              "text-sm text-text-muted italic text-center"
            )}
          </div>
        );

      case "dialogue":
        return (
          <div className={cn(baseClasses, "mb-2")}>
            <div className="max-w-[60%] mx-auto">
              {editableWrapper(
                <p className="text-sm text-text">{element.content}</p>,
                "text-sm text-text"
              )}
            </div>
            {element.speakerLabel && (
              <div className="absolute -left-16 top-0 text-[10px] text-text-dim opacity-50">
                [{element.speakerLabel}]
              </div>
            )}
          </div>
        );

      case "transition":
        return (
          <div className={cn(baseClasses, "my-4")}>
            {editableWrapper(
              <p className="text-sm text-text-muted uppercase text-right pr-8">
                {element.content}
              </p>,
              "text-sm text-text-muted uppercase text-right pr-8"
            )}
          </div>
        );

      default:
        return (
          <div className={cn(baseClasses, "my-2")}>
            {editableWrapper(
              <p className="text-sm text-text">{element.content}</p>,
              "text-sm text-text"
            )}
          </div>
        );
    }
  };

  const handleInsertAccept = (insertId: string) => {
    onInsertAccept?.(insertId);
    // In a real implementation, this would update the elements state
    logger.debug("Accepted insert:", insertId);
  };

  const handleInsertReject = (insertId: string) => {
    onInsertReject?.(insertId);
    // In a real implementation, this would remove the insert elements
    logger.debug("Rejected insert:", insertId);
  };

  const getContributor = (id: string) =>
    MOCK_CONTRIBUTORS.find((c) => c.id === id);

  return (
    <div className="h-full flex flex-col bg-bg-0">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-stroke bg-bg-1">
        <div className="flex items-center gap-3">
          <button
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg",
              "bg-surface hover:bg-surface-hover text-text-muted hover:text-text",
              "transition-colors duration-150"
            )}
          >
            Scene Heading
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg",
              "bg-surface hover:bg-surface-hover text-text-muted hover:text-text",
              "transition-colors duration-150"
            )}
          >
            Action
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg",
              "bg-surface hover:bg-surface-hover text-text-muted hover:text-text",
              "transition-colors duration-150"
            )}
          >
            Character
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg",
              "bg-surface hover:bg-surface-hover text-text-muted hover:text-text",
              "transition-colors duration-150"
            )}
          >
            Dialogue
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-dim">
            {elements.filter((e) => e.isInsert && e.insertStatus === "pending")
              .length}{" "}
            pending inserts
          </span>
          <button
            className={cn(
              "p-2 rounded-lg",
              "text-text-muted hover:text-text hover:bg-surface",
              "transition-colors duration-150"
            )}
            title="View all suggestions"
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
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Script content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-8 px-12">
          {/* Page styling to mimic screenplay format */}
          <div
            className={cn(
              "bg-bg-1 border border-stroke rounded-lg",
              "shadow-elevated p-8 min-h-[800px]"
            )}
          >
            {groupedElements().map((group, index) => {
              if (group.type === "insert") {
                const insert = group.data as ScriptInsertData;
                return (
                  <ScriptInsert
                    key={insert.id}
                    insert={insert}
                    contributor={getContributor(insert.proposedBy)}
                    onAccept={handleInsertAccept}
                    onReject={handleInsertReject}
                  />
                );
              } else {
                const element = group.data as ScriptElement;
                return (
                  <div key={element.id} className="relative">
                    {renderElement(element)}
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-stroke bg-bg-1">
        <div className="flex items-center gap-4 text-xs text-text-dim">
          <span>Page 1 of 12</span>
          <span>{elements.length} elements</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-dim">Last saved 2 min ago</span>
          <div className="w-2 h-2 rounded-full bg-success" title="All changes saved" />
        </div>
      </div>
    </div>
  );
};

export { ScriptPage };

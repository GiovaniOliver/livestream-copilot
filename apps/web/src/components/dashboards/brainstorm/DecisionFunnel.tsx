"use client";

import { useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import type { ActionItemData, FunnelColumn } from "./types";
import { ActionItem } from "./ActionItem";
import { logger } from "@/lib/logger";

export interface DecisionFunnelProps {
  items: ActionItemData[];
  onItemsChange?: (items: ActionItemData[]) => void;
  className?: string;
}

interface ColumnConfig {
  id: FunnelColumn;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const columns: ColumnConfig[] = [
  {
    id: "all",
    title: "All Ideas",
    description: "Collected ideas",
    color: "text-purple",
    bgColor: "bg-purple/10",
  },
  {
    id: "shortlist",
    title: "Shortlist",
    description: "Worth exploring",
    color: "text-teal",
    bgColor: "bg-teal/10",
  },
  {
    id: "action",
    title: "Action Items",
    description: "Ready to execute",
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

function DecisionFunnel({ items, onItemsChange, className }: DecisionFunnelProps) {
  const [dragOverColumn, setDragOverColumn] = useState<FunnelColumn | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Get items by column
  const getItemsByColumn = (columnId: FunnelColumn) =>
    items.filter((item) => item.column === columnId);

  // Handle drag start
  const handleDragStart = (e: DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverColumn(null);
  };

  // Handle drag over column
  const handleDragOver = (e: DragEvent, columnId: FunnelColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  // Handle drop
  const handleDrop = (e: DragEvent, targetColumn: FunnelColumn) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");

    if (itemId) {
      const updatedItems = items.map((item) =>
        item.id === itemId ? { ...item, column: targetColumn } : item
      );
      onItemsChange?.(updatedItems);
    }

    setDragOverColumn(null);
    setDraggedItemId(null);
  };

  // Toggle complete
  const handleComplete = (itemId: string) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, isComplete: !item.isComplete } : item
    );
    onItemsChange?.(updatedItems);
  };

  // Edit item (placeholder)
  const handleEdit = (itemId: string) => {
    logger.debug("Edit item:", itemId);
    // Would open an edit modal in production
  };

  // Stats
  const completedCount = items.filter((i) => i.isComplete && i.column === "action").length;
  const totalActionItems = items.filter((i) => i.column === "action").length;

  return (
    <div className={cn("flex h-full flex-col bg-bg-1 rounded-2xl border border-stroke", className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-stroke p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Decision Funnel</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Drag items to prioritize
            </p>
          </div>
          {totalActionItems > 0 && (
            <div className="text-right">
              <span className="text-2xl font-bold text-success">
                {completedCount}/{totalActionItems}
              </span>
              <p className="text-xs text-text-muted">actions done</p>
            </div>
          )}
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid h-full grid-cols-3 gap-3">
          {columns.map((column) => {
            const columnItems = getItemsByColumn(column.id);
            const isOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                className="flex flex-col min-h-0"
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column header */}
                <div className={cn("rounded-t-xl px-3 py-2", column.bgColor)}>
                  <div className="flex items-center justify-between">
                    <h4 className={cn("text-sm font-semibold", column.color)}>
                      {column.title}
                    </h4>
                    <span className="text-xs text-text-muted">
                      {columnItems.length}
                    </span>
                  </div>
                  <p className="text-xs text-text-dim mt-0.5">
                    {column.description}
                  </p>
                </div>

                {/* Column content */}
                <div
                  className={cn(
                    "flex-1 overflow-y-auto rounded-b-xl border border-t-0 border-stroke bg-bg-0/50 p-2",
                    "transition-colors duration-200",
                    isOver && "bg-surface border-teal/30"
                  )}
                >
                  <div className="space-y-2">
                    {columnItems.length > 0 ? (
                      columnItems.map((item) => (
                        <ActionItem
                          key={item.id}
                          item={item}
                          onComplete={handleComplete}
                          onEdit={handleEdit}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedItemId === item.id}
                        />
                      ))
                    ) : (
                      <div
                        className={cn(
                          "flex h-24 items-center justify-center rounded-xl border-2 border-dashed",
                          isOver ? "border-teal/50 bg-teal/5" : "border-stroke"
                        )}
                      >
                        <p className="text-xs text-text-dim">
                          {isOver ? "Drop here" : "No items"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 border-t border-stroke p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-bg-0">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple via-teal to-success transition-all duration-500"
                style={{
                  width: `${items.length > 0 ? ((items.filter((i) => i.column === "action").length / items.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <span className="text-xs text-text-muted">
            {Math.round(
              items.length > 0
                ? (items.filter((i) => i.column === "action").length / items.length) * 100
                : 0
            )}
            % to action
          </span>
        </div>
      </div>
    </div>
  );
}

export { DecisionFunnel };

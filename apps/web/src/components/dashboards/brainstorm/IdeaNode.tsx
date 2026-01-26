"use client";

import { forwardRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { MindMapNode, NodeCategory } from "./types";
import { categoryColors } from "./types";

export interface IdeaNodeProps {
  node: MindMapNode;
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: (nodeId: string) => void;
  onExpand?: (nodeId: string) => void;
  onAddChild?: (nodeId: string) => void;
  onDragStart?: (nodeId: string, e: MouseEvent) => void;
}

const categoryIcons: Record<NodeCategory, string> = {
  central: "",
  feature: "",
  problem: "",
  solution: "",
  question: "?",
  action: "",
};

const IdeaNode = forwardRef<HTMLDivElement, IdeaNodeProps>(
  (
    {
      node,
      isSelected = false,
      isDragging = false,
      onSelect,
      onExpand,
      onAddChild,
      onDragStart,
    },
    ref
  ) => {
    const colors = categoryColors[node.category];
    const hasChildren = node.children.length > 0;
    const icon = categoryIcons[node.category];

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      onSelect?.(node.id);
    };

    const handleDoubleClick = (e: MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onExpand?.(node.id);
      }
    };

    const handleAddClick = (e: MouseEvent) => {
      e.stopPropagation();
      onAddChild?.(node.id);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        onDragStart?.(node.id, e);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "absolute cursor-grab select-none",
          "transition-all duration-200 ease-out",
          isDragging && "cursor-grabbing z-50 opacity-80"
        )}
        style={{
          left: node.x,
          top: node.y,
          transform: "translate(-50%, -50%)",
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
      >
        {/* Node container */}
        <div
          className={cn(
            "relative rounded-2xl border-2 px-4 py-3",
            "backdrop-blur-sm shadow-elevated",
            "transition-all duration-200",
            colors.bg,
            colors.border,
            isSelected && "ring-2 ring-teal ring-offset-2 ring-offset-bg-0",
            node.isRoot && "px-6 py-4",
            !isDragging && "hover:scale-105 hover:shadow-glow"
          )}
        >
          {/* Category indicator */}
          {icon && (
            <span
              className={cn(
                "absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center",
                "rounded-full bg-bg-1 border border-stroke text-xs font-bold",
                colors.text
              )}
            >
              {icon}
            </span>
          )}

          {/* Node text */}
          <span
            className={cn(
              "block text-center font-medium",
              colors.text,
              node.isRoot ? "text-lg" : "text-sm",
              "max-w-[180px] truncate"
            )}
          >
            {node.text}
          </span>

          {/* Expand/collapse indicator */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand?.(node.id);
              }}
              className={cn(
                "absolute -bottom-2 left-1/2 -translate-x-1/2",
                "flex h-5 w-5 items-center justify-center",
                "rounded-full bg-bg-1 border border-stroke",
                "text-xs text-text-muted hover:text-text hover:bg-bg-2",
                "transition-colors duration-150"
              )}
            >
              {node.isExpanded ? "-" : "+"}
            </button>
          )}

          {/* Add child button */}
          <button
            onClick={handleAddClick}
            className={cn(
              "absolute -right-2 top-1/2 -translate-y-1/2",
              "flex h-6 w-6 items-center justify-center",
              "rounded-full bg-teal/20 border border-teal/40",
              "text-teal text-sm font-bold",
              "opacity-0 hover:opacity-100 group-hover:opacity-100",
              "transition-all duration-150 hover:scale-110 hover:bg-teal/30",
              isSelected && "opacity-100"
            )}
          >
            +
          </button>

          {/* Children count badge */}
          {hasChildren && !node.isExpanded && (
            <span
              className={cn(
                "absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center",
                "rounded-full bg-purple/30 border border-purple/50",
                "text-xs font-medium text-purple-200"
              )}
            >
              {node.children.length}
            </span>
          )}
        </div>
      </div>
    );
  }
);

IdeaNode.displayName = "IdeaNode";

export { IdeaNode };

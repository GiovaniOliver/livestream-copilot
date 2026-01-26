"use client";

import { useState, useCallback, useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { MindMapNode, NodeCategory } from "./types";
import { IdeaNode } from "./IdeaNode";
import { Button } from "@/components/ui/Button";

export interface MindMapCanvasProps {
  nodes: MindMapNode[];
  onNodesChange?: (nodes: MindMapNode[]) => void;
  className?: string;
}

interface ConnectionLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  category: NodeCategory;
}

function MindMapCanvas({
  nodes,
  onNodesChange,
  className,
}: MindMapCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Calculate connection lines between nodes
  const connectionLines: ConnectionLine[] = nodes
    .filter((node) => node.parentId && node.isExpanded)
    .map((node) => {
      const parentNode = nodes.find((n) => n.id === node.parentId);
      if (!parentNode || !parentNode.isExpanded) return null;
      return {
        id: `${parentNode.id}-${node.id}`,
        from: { x: parentNode.x, y: parentNode.y },
        to: { x: node.x, y: node.y },
        category: node.category,
      };
    })
    .filter((line): line is ConnectionLine => line !== null);

  // Node selection
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  // Node expansion toggle
  const handleNodeExpand = useCallback(
    (nodeId: string) => {
      const updatedNodes = nodes.map((node) =>
        node.id === nodeId ? { ...node, isExpanded: !node.isExpanded } : node
      );
      onNodesChange?.(updatedNodes);
    },
    [nodes, onNodesChange]
  );

  // Add child node
  const handleAddChild = useCallback(
    (parentId: string) => {
      const parentNode = nodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const angle = Math.random() * Math.PI * 2;
      const distance = 150;

      const newNode: MindMapNode = {
        id: `node-${Date.now()}`,
        text: "New Idea",
        parentId,
        children: [],
        x: parentNode.x + Math.cos(angle) * distance,
        y: parentNode.y + Math.sin(angle) * distance,
        category: "feature",
        isExpanded: true,
        isRoot: false,
      };

      const updatedNodes = nodes.map((node) =>
        node.id === parentId
          ? { ...node, children: [...node.children, newNode.id] }
          : node
      );

      onNodesChange?.([...updatedNodes, newNode]);
    },
    [nodes, onNodesChange]
  );

  // Drag start
  const handleDragStart = useCallback(
    (nodeId: string, e: MouseEvent) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      setDraggedNodeId(nodeId);
      setDragOffset({
        x: mouseX - node.x,
        y: mouseY - node.y,
      });
    },
    [nodes, pan, zoom]
  );

  // Mouse move for dragging
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();

      // Handle node dragging
      if (draggedNodeId) {
        const mouseX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - pan.y) / zoom;

        const updatedNodes = nodes.map((node) =>
          node.id === draggedNodeId
            ? {
                ...node,
                x: mouseX - dragOffset.x,
                y: mouseY - dragOffset.y,
              }
            : node
        );

        onNodesChange?.(updatedNodes);
      }

      // Handle panning
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [draggedNodeId, dragOffset, isPanning, nodes, onNodesChange, pan, panStart, zoom]
  );

  // Mouse up
  const handleMouseUp = useCallback(() => {
    setDraggedNodeId(null);
    setIsPanning(false);
  }, []);

  // Canvas mouse down for panning
  const handleCanvasMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-bg")) {
        setIsPanning(true);
        setPanStart({
          x: e.clientX - pan.x,
          y: e.clientY - pan.y,
        });
        setSelectedNodeId(null);
      }
    },
    [pan]
  );

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Get visible nodes (based on parent expansion)
  const visibleNodes = nodes.filter((node) => {
    if (node.isRoot) return true;
    const parent = nodes.find((n) => n.id === node.parentId);
    return parent?.isExpanded ?? false;
  });

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-bg-0 rounded-2xl", className)}>
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-8 w-8 p-0 bg-bg-1 border border-stroke"
        >
          +
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-8 w-8 p-0 bg-bg-1 border border-stroke"
        >
          -
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomReset}
          className="h-8 w-8 p-0 bg-bg-1 border border-stroke text-xs"
        >
          1:1
        </Button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute bottom-4 right-4 z-20 px-3 py-1 bg-bg-1 rounded-full border border-stroke text-xs text-text-muted">
        {Math.round(zoom * 100)}%
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={cn(
          "canvas-bg absolute inset-0",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid pattern background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-stroke"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Transformed content */}
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Connection lines SVG */}
          <svg
            className="absolute pointer-events-none"
            style={{
              width: "2000px",
              height: "2000px",
              overflow: "visible",
            }}
          >
            {connectionLines.map((line) => (
              <g key={line.id}>
                {/* Glow effect */}
                <line
                  x1={line.from.x}
                  y1={line.from.y}
                  x2={line.to.x}
                  y2={line.to.y}
                  stroke={line.category === "central" ? "#8B5CF6" : "#00D4C7"}
                  strokeWidth="4"
                  strokeOpacity="0.2"
                  strokeLinecap="round"
                />
                {/* Main line */}
                <line
                  x1={line.from.x}
                  y1={line.from.y}
                  x2={line.to.x}
                  y2={line.to.y}
                  stroke={line.category === "central" ? "#8B5CF6" : "#00D4C7"}
                  strokeWidth="2"
                  strokeOpacity="0.6"
                  strokeLinecap="round"
                  strokeDasharray={line.category === "question" ? "5,5" : "none"}
                />
              </g>
            ))}
          </svg>

          {/* Nodes */}
          {visibleNodes.map((node) => (
            <IdeaNode
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              isDragging={draggedNodeId === node.id}
              onSelect={handleNodeSelect}
              onExpand={handleNodeExpand}
              onAddChild={handleAddChild}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      </div>

      {/* Help text */}
      <div className="absolute bottom-4 left-4 z-20 text-xs text-text-dim">
        Drag to move nodes | Double-click to expand/collapse | Click + to add child
      </div>
    </div>
  );
}

export { MindMapCanvas };

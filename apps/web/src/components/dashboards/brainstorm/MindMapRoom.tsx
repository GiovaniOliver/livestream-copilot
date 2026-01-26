"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { MindMapNode, Idea, ActionItemData } from "./types";
import { MindMapCanvas } from "./MindMapCanvas";
import { IdeaIntake } from "./IdeaIntake";
import { DecisionFunnel } from "./DecisionFunnel";
import { mockNodes, mockIdeas, mockActionItems } from "./mockData";
import { useIdeas, type Idea as ApiIdea, type ActionItem as ApiActionItem } from "@/hooks/useIdeas";

export interface MindMapRoomProps {
  sessionId?: string;
  sessionTopic?: string;
  initialNodes?: MindMapNode[];
  initialIdeas?: Idea[];
  initialActionItems?: ActionItemData[];
  className?: string;
}

/**
 * Transform API idea to component Idea format
 */
function transformApiIdea(apiIdea: ApiIdea): Idea {
  return {
    id: apiIdea.id,
    text: apiIdea.text,
    speaker: apiIdea.speaker,
    timestamp: apiIdea.timestamp,
    isStarred: apiIdea.isStarred,
    isAddedToMap: apiIdea.isAddedToMap,
    tags: apiIdea.tags,
  };
}

/**
 * Transform API action item to component ActionItemData format
 */
function transformApiActionItem(apiItem: ApiActionItem): ActionItemData {
  return {
    id: apiItem.id,
    text: apiItem.text,
    owner: apiItem.owner,
    dueDate: apiItem.dueDate,
    isComplete: apiItem.isComplete,
    column: apiItem.column,
    priority: apiItem.priority,
    createdAt: apiItem.createdAt,
  };
}

function MindMapRoom({
  sessionId,
  sessionTopic = "AI Livestream Assistant - Feature Brainstorm",
  initialNodes = mockNodes,
  initialIdeas = mockIdeas,
  initialActionItems = mockActionItems,
  className,
}: MindMapRoomProps) {
  // Fetch real data if sessionId is provided
  const {
    ideas: apiIdeas,
    actionItems: apiActionItems,
    isLoading,
    error,
    isConnected,
    refresh,
    starIdea,
    addToMap,
  } = useIdeas(sessionId || "", { autoRefresh: true });

  // State for all brainstorm data - start with initial/mock, update when API data loads
  const [nodes, setNodes] = useState<MindMapNode[]>(initialNodes);
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [actionItems, setActionItems] = useState<ActionItemData[]>(initialActionItems);

  // Update local state when API data loads (only if sessionId is provided and data exists)
  useEffect(() => {
    if (sessionId && apiIdeas.length > 0 && !isLoading) {
      setIdeas(apiIdeas.map(transformApiIdea));
    }
  }, [sessionId, apiIdeas, isLoading]);

  useEffect(() => {
    if (sessionId && apiActionItems.length > 0 && !isLoading) {
      setActionItems(apiActionItems.map(transformApiActionItem));
    }
  }, [sessionId, apiActionItems, isLoading]);

  // Handlers for state updates
  const handleNodesChange = (updatedNodes: MindMapNode[]) => {
    setNodes(updatedNodes);
  };

  const handleIdeasChange = (updatedIdeas: Idea[]) => {
    setIdeas(updatedIdeas);
  };

  const handleActionItemsChange = (updatedItems: ActionItemData[]) => {
    setActionItems(updatedItems);
  };

  // Stats for header
  const totalNodes = nodes.length;
  const totalIdeas = ideas.length;
  const starredIdeas = ideas.filter((i) => i.isStarred).length;
  const actionItemsCount = actionItems.filter((i) => i.column === "action").length;

  return (
    <div className={cn("flex h-screen flex-col bg-bg-0", className)}>
      {/* Header */}
      <header className="flex-shrink-0 border-b border-stroke bg-bg-1 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Session info */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple/30 to-teal/20 border border-purple/30">
                <svg
                  className="h-5 w-5 text-purple"
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
              </div>
              <div>
                <h1 className="text-xl font-bold text-text">{sessionTopic}</h1>
                <p className="text-sm text-text-muted">Mind Map Brainstorming Session</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal">{totalNodes}</p>
              <p className="text-xs text-text-muted">Nodes</p>
            </div>
            <div className="h-8 w-px bg-stroke" />
            <div className="text-center">
              <p className="text-2xl font-bold text-purple">{totalIdeas}</p>
              <p className="text-xs text-text-muted">Ideas</p>
            </div>
            <div className="h-8 w-px bg-stroke" />
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{starredIdeas}</p>
              <p className="text-xs text-text-muted">Starred</p>
            </div>
            <div className="h-8 w-px bg-stroke" />
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{actionItemsCount}</p>
              <p className="text-xs text-text-muted">Actions</p>
            </div>

            {/* Live indicator */}
            <div className="ml-4 flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 border border-success/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-sm font-medium text-success">Live Session</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left: Mind Map Canvas (main area) */}
        <div className="flex-1 min-w-0">
          <MindMapCanvas
            nodes={nodes}
            onNodesChange={handleNodesChange}
            className="h-full"
          />
        </div>

        {/* Right: Side panels */}
        <div className="flex w-[400px] flex-shrink-0 flex-col gap-4">
          {/* Top: Idea Intake */}
          <div className="h-1/2 min-h-0">
            <IdeaIntake
              ideas={ideas}
              onIdeasChange={handleIdeasChange}
              className="h-full"
            />
          </div>

          {/* Bottom: Decision Funnel */}
          <div className="h-1/2 min-h-0">
            <DecisionFunnel
              items={actionItems}
              onItemsChange={handleActionItemsChange}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Footer toolbar */}
      <footer className="flex-shrink-0 border-t border-stroke bg-bg-1 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <button className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-text transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-text transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>

            <div className="h-6 w-px bg-stroke" />

            {/* Add node categories */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Add:</span>
              <button className="rounded-lg bg-teal/10 px-2 py-1 text-xs text-teal hover:bg-teal/20 transition-colors">
                Feature
              </button>
              <button className="rounded-lg bg-error/10 px-2 py-1 text-xs text-error hover:bg-error/20 transition-colors">
                Problem
              </button>
              <button className="rounded-lg bg-success/10 px-2 py-1 text-xs text-success hover:bg-success/20 transition-colors">
                Solution
              </button>
              <button className="rounded-lg bg-warning/10 px-2 py-1 text-xs text-warning hover:bg-warning/20 transition-colors">
                Question
              </button>
              <button className="rounded-lg bg-purple/10 px-2 py-1 text-xs text-purple hover:bg-purple/20 transition-colors">
                Action
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Export */}
            <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-text-muted hover:bg-surface hover:text-text transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export
            </button>

            {/* Share */}
            <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple/20 to-teal/20 border border-purple/30 px-4 py-1.5 text-sm font-medium text-text hover:from-purple/30 hover:to-teal/30 transition-all">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Session
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { MindMapRoom };

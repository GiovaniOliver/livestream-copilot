"use client";

/**
 * Custom hook for managing Writers Corner dashboard state
 *
 * Processes WebSocket events (OUTPUT_CREATED) into structured data
 * for the Writers Corner dashboard panels: Writing Pad, Character Tracker,
 * Dialogue Suggestions, Scene Navigator, and Action Items.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface TranscriptLine {
  readonly id: string;
  readonly speakerId: string | null;
  readonly text: string;
  readonly t0: number;
  readonly t1: number;
}

export interface WriterNote {
  readonly id: string;
  readonly text: string;
  readonly createdAt: number;
}

export interface CharacterInfo {
  readonly id: string;
  readonly name: string;
  readonly dialogueCount: number;
  readonly traits: readonly string[];
  readonly lastSpokenAt: number;
}

export interface DialogueSuggestion {
  readonly id: string;
  readonly character: string;
  readonly originalLine: string;
  readonly suggestedLine: string;
  readonly context: string;
  readonly status: "pending" | "accepted" | "rejected";
  readonly createdAt: number;
}

export interface SceneBeat {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly timestamp: number;
  readonly status: "active" | "completed" | "upcoming";
  readonly order: number;
}

export interface ActionItem {
  readonly id: string;
  readonly text: string;
  readonly assignee: string | null;
  readonly priority: "low" | "medium" | "high";
  readonly isComplete: boolean;
  readonly createdAt: number;
}

export interface WritersCornerStats {
  readonly transcriptLineCount: number;
  readonly characterCount: number;
  readonly suggestionCount: number;
  readonly sceneCount: number;
  readonly actionItemCount: number;
  readonly pendingSuggestions: number;
}

export interface UseWritersCornerReturn {
  readonly transcriptLines: readonly TranscriptLine[];
  readonly writerNotes: readonly WriterNote[];
  readonly characters: readonly CharacterInfo[];
  readonly suggestions: readonly DialogueSuggestion[];
  readonly scenes: readonly SceneBeat[];
  readonly actionItems: readonly ActionItem[];
  readonly stats: WritersCornerStats;
  readonly isConnected: boolean;

  readonly addWriterNote: (text: string) => void;
  readonly removeWriterNote: (id: string) => void;
  readonly acceptSuggestion: (id: string) => void;
  readonly rejectSuggestion: (id: string) => void;
  readonly toggleActionItem: (id: string) => void;
  readonly exportScript: () => string;
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractTraitsFromMeta(meta: Record<string, unknown>): readonly string[] {
  const traits = meta.traits;
  if (Array.isArray(traits)) {
    return traits.filter((t): t is string => typeof t === "string");
  }
  return [];
}

function extractPriority(meta: Record<string, unknown>): ActionItem["priority"] {
  const priority = meta.priority;
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return "medium";
}

function extractAssignee(meta: Record<string, unknown>): string | null {
  const assignee = meta.assignee;
  if (typeof assignee === "string" && assignee.length > 0) {
    return assignee;
  }
  return null;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ============================================================================
// Hook
// ============================================================================

export function useWritersCorner(sessionId: string): UseWritersCornerReturn {
  const [transcriptLines, setTranscriptLines] = useState<readonly TranscriptLine[]>([]);
  const [writerNotes, setWriterNotes] = useState<readonly WriterNote[]>([]);
  const [characters, setCharacters] = useState<readonly CharacterInfo[]>([]);
  const [suggestions, setSuggestions] = useState<readonly DialogueSuggestion[]>([]);
  const [scenes, setScenes] = useState<readonly SceneBeat[]>([]);
  const [actionItems, setActionItems] = useState<readonly ActionItem[]>([]);

  const { isConnected, events, transcripts, outputs } = useWebSocket();
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  /**
   * Process TRANSCRIPT_SEGMENT events into transcript lines
   * and update character dialogue counts.
   */
  useEffect(() => {
    const newTranscripts = transcripts.filter(
      (e) => !processedEventIdsRef.current.has(`transcript-${e.id}`)
    );

    if (newTranscripts.length === 0) return;

    const newLines: TranscriptLine[] = [];
    const speakerUpdates: Map<string, { count: number; lastSpokenAt: number }> = new Map();

    for (const event of newTranscripts) {
      processedEventIdsRef.current.add(`transcript-${event.id}`);

      if (event.type !== "TRANSCRIPT_SEGMENT") continue;

      const { speakerId, text, t0, t1 } = event.payload;
      const speaker = speakerId ?? "Unknown Speaker";

      newLines.push({
        id: event.id,
        speakerId: speaker,
        text,
        t0,
        t1,
      });

      const existing = speakerUpdates.get(speaker);
      if (existing) {
        speakerUpdates.set(speaker, {
          count: existing.count + 1,
          lastSpokenAt: Math.max(existing.lastSpokenAt, t1),
        });
      } else {
        speakerUpdates.set(speaker, { count: 1, lastSpokenAt: t1 });
      }
    }

    if (newLines.length > 0) {
      setTranscriptLines((prev) => [...prev, ...newLines]);

      setCharacters((prev) => {
        let updated = [...prev];
        for (const [name, data] of speakerUpdates) {
          const existingIdx = updated.findIndex((c) => c.name === name);
          if (existingIdx >= 0) {
            const existing = updated[existingIdx];
            updated = [
              ...updated.slice(0, existingIdx),
              {
                ...existing,
                dialogueCount: existing.dialogueCount + data.count,
                lastSpokenAt: Math.max(existing.lastSpokenAt, data.lastSpokenAt),
              },
              ...updated.slice(existingIdx + 1),
            ];
          } else {
            updated = [
              ...updated,
              {
                id: generateId(),
                name,
                dialogueCount: data.count,
                traits: [],
                lastSpokenAt: data.lastSpokenAt,
              },
            ];
          }
        }
        return updated;
      });
    }
  }, [transcripts]);

  /**
   * Process OUTPUT_CREATED events into domain-specific data:
   * - BEAT -> SceneBeat
   * - SCRIPT_INSERT -> DialogueSuggestion
   * - QUOTE -> CharacterInfo trait enrichment
   * - ACTION_ITEM -> ActionItem
   */
  useEffect(() => {
    const newOutputs = outputs.filter(
      (e) => !processedEventIdsRef.current.has(`output-${e.id}`)
    );

    if (newOutputs.length === 0) return;

    const newScenes: SceneBeat[] = [];
    const newSuggestions: DialogueSuggestion[] = [];
    const newActionItems: ActionItem[] = [];
    const traitUpdates: Map<string, string[]> = new Map();

    for (const event of newOutputs) {
      processedEventIdsRef.current.add(`output-${event.id}`);

      if (event.type !== "OUTPUT_CREATED") continue;

      const { category, title, text, meta } = event.payload;

      switch (category) {
        case "BEAT": {
          newScenes.push({
            id: event.payload.outputId,
            title: title ?? "Untitled Beat",
            description: text,
            timestamp: event.ts,
            status: "completed",
            order: scenes.length + newScenes.length + 1,
          });
          break;
        }

        case "SCRIPT_INSERT": {
          const characterName = (meta.character as string) ?? "Unknown";
          const originalLine = (meta.originalLine as string) ?? "";
          newSuggestions.push({
            id: event.payload.outputId,
            character: characterName,
            originalLine,
            suggestedLine: text,
            context: title ?? "",
            status: "pending",
            createdAt: event.ts,
          });
          break;
        }

        case "QUOTE": {
          const quoteSpeaker = (meta.speaker as string) ?? (meta.character as string);
          if (typeof quoteSpeaker === "string") {
            const existingTraits = traitUpdates.get(quoteSpeaker) ?? [];
            const newTraits = extractTraitsFromMeta(meta);
            traitUpdates.set(quoteSpeaker, [...existingTraits, ...newTraits]);
          }
          break;
        }

        case "ACTION_ITEM": {
          newActionItems.push({
            id: event.payload.outputId,
            text: text,
            assignee: extractAssignee(meta),
            priority: extractPriority(meta),
            isComplete: false,
            createdAt: event.ts,
          });
          break;
        }

        default:
          break;
      }
    }

    if (newScenes.length > 0) {
      setScenes((prev) => [...prev, ...newScenes]);
    }

    if (newSuggestions.length > 0) {
      setSuggestions((prev) => [...prev, ...newSuggestions]);
    }

    if (newActionItems.length > 0) {
      setActionItems((prev) => [...prev, ...newActionItems]);
    }

    if (traitUpdates.size > 0) {
      setCharacters((prev) => {
        let updated = [...prev];
        for (const [name, traits] of traitUpdates) {
          const idx = updated.findIndex((c) => c.name === name);
          if (idx >= 0) {
            const existing = updated[idx];
            const mergedTraits = Array.from(new Set([...existing.traits, ...traits]));
            updated = [
              ...updated.slice(0, idx),
              { ...existing, traits: mergedTraits },
              ...updated.slice(idx + 1),
            ];
          } else if (traits.length > 0) {
            updated = [
              ...updated,
              {
                id: generateId(),
                name,
                dialogueCount: 0,
                traits,
                lastSpokenAt: 0,
              },
            ];
          }
        }
        return updated;
      });
    }
  }, [outputs, scenes.length]);

  // ============================================================================
  // Actions
  // ============================================================================

  const addWriterNote = useCallback((text: string) => {
    if (!text.trim()) return;
    const note: WriterNote = {
      id: generateId(),
      text: text.trim(),
      createdAt: Date.now(),
    };
    setWriterNotes((prev) => [note, ...prev]);
  }, []);

  const removeWriterNote = useCallback((id: string) => {
    setWriterNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const acceptSuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "accepted" as const } : s))
    );
  }, []);

  const rejectSuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "rejected" as const } : s))
    );
  }, []);

  const toggleActionItem = useCallback((id: string) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isComplete: !item.isComplete } : item))
    );
  }, []);

  const exportScript = useCallback((): string => {
    const header = "# Writers Corner - Session Export\n\n";
    const transcriptSection =
      "## Transcript\n\n" +
      transcriptLines
        .map((line) => `[${formatTimestamp(line.t0)}] ${line.speakerId ?? "Unknown"}: ${line.text}`)
        .join("\n") +
      "\n\n";

    const notesSection =
      writerNotes.length > 0
        ? "## Writer Notes\n\n" + writerNotes.map((n) => `- ${n.text}`).join("\n") + "\n\n"
        : "";

    const charactersSection =
      characters.length > 0
        ? "## Characters\n\n" +
          characters
            .map(
              (c) =>
                `### ${c.name}\n- Dialogue count: ${c.dialogueCount}\n- Traits: ${c.traits.length > 0 ? c.traits.join(", ") : "None detected"}`
            )
            .join("\n\n") +
          "\n\n"
        : "";

    const scenesSection =
      scenes.length > 0
        ? "## Scene Beats\n\n" +
          scenes.map((s, i) => `${i + 1}. **${s.title}** - ${s.description}`).join("\n") +
          "\n\n"
        : "";

    const actionsSection =
      actionItems.length > 0
        ? "## Action Items\n\n" +
          actionItems
            .map(
              (a) =>
                `- [${a.isComplete ? "x" : " "}] ${a.text}${a.assignee ? ` (@${a.assignee})` : ""} [${a.priority}]`
            )
            .join("\n") +
          "\n"
        : "";

    return header + transcriptSection + notesSection + charactersSection + scenesSection + actionsSection;
  }, [transcriptLines, writerNotes, characters, scenes, actionItems]);

  // ============================================================================
  // Derived Stats
  // ============================================================================

  const stats: WritersCornerStats = useMemo(
    () => ({
      transcriptLineCount: transcriptLines.length,
      characterCount: characters.length,
      suggestionCount: suggestions.length,
      sceneCount: scenes.length,
      actionItemCount: actionItems.length,
      pendingSuggestions: suggestions.filter((s) => s.status === "pending").length,
    }),
    [transcriptLines, characters, suggestions, scenes, actionItems]
  );

  return {
    transcriptLines,
    writerNotes,
    characters,
    suggestions,
    scenes,
    actionItems,
    stats,
    isConnected,
    addWriterNote,
    removeWriterNote,
    acceptSuggestion,
    rejectSuggestion,
    toggleActionItem,
    exportScript,
  };
}

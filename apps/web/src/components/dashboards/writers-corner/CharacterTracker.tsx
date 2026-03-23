"use client";

import { type FC, useState } from "react";
import { cn } from "@/lib/utils";
import type { CharacterInfo } from "@/hooks/useWritersCorner";

// ============================================================================
// Character Tracker Component
// Cards for each speaker with dialogue count and detected traits
// ============================================================================

interface CharacterTrackerProps {
  readonly characters: readonly CharacterInfo[];
}

// Icons
const UserIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

const ChatBubbleIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
    />
  </svg>
);

// Avatar colors for speaker differentiation
const AVATAR_COLORS = [
  { bg: "bg-teal/20", text: "text-teal", ring: "ring-teal/30" },
  { bg: "bg-purple/20", text: "text-purple", ring: "ring-purple/30" },
  { bg: "bg-warning/20", text: "text-warning", ring: "ring-warning/30" },
  { bg: "bg-success/20", text: "text-success", ring: "ring-success/30" },
  { bg: "bg-error/20", text: "text-error", ring: "ring-error/30" },
] as const;

function getAvatarColor(index: number): (typeof AVATAR_COLORS)[number] {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const CharacterCard: FC<{
  character: CharacterInfo;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ character, index, isExpanded, onToggle }) => {
  const colors = getAvatarColor(index);

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200 cursor-pointer",
        isExpanded
          ? "bg-bg-1 border-teal/30"
          : "bg-surface border-stroke hover:border-stroke"
      )}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-expanded={isExpanded}
      aria-label={`Character: ${character.name}`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Avatar */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2",
            colors.bg,
            colors.text,
            colors.ring
          )}
        >
          <span className="text-sm font-bold">{getInitials(character.name)}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text truncate">{character.name}</h4>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1">
              <ChatBubbleIcon className="h-3 w-3 text-text-dim" />
              <span className="text-xs text-text-muted">
                {character.dialogueCount} {character.dialogueCount === 1 ? "line" : "lines"}
              </span>
            </div>
            {character.traits.length > 0 && (
              <span className="text-xs text-text-dim">
                {character.traits.length} {character.traits.length === 1 ? "trait" : "traits"}
              </span>
            )}
          </div>
        </div>

        {/* Dialogue count badge */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
            colors.bg,
            colors.text
          )}
        >
          {character.dialogueCount}
        </div>
      </div>

      {/* Expanded traits */}
      {isExpanded && character.traits.length > 0 && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-13 border-t border-stroke-subtle pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-dim mb-2">
              Detected Traits
            </p>
            <div className="flex flex-wrap gap-1.5">
              {character.traits.map((trait, i) => (
                <span
                  key={`${trait}-${i}`}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded-full border",
                    colors.bg,
                    colors.text,
                    "border-current/20"
                  )}
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CharacterTracker: FC<CharacterTrackerProps> = ({ characters }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Sort by dialogue count descending
  const sortedCharacters = [...characters].sort((a, b) => b.dialogueCount - a.dialogueCount);

  return (
    <div className="space-y-2">
      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-8">
          <UserIcon className="h-10 w-10 text-text-dim mb-3" />
          <p className="text-sm text-text-muted">No speakers detected</p>
          <p className="text-xs text-text-dim mt-1">
            Characters will appear as speakers are identified
          </p>
        </div>
      ) : (
        sortedCharacters.map((character, index) => (
          <CharacterCard
            key={character.id}
            character={character}
            index={index}
            isExpanded={expandedIds.has(character.id)}
            onToggle={() => toggleExpand(character.id)}
          />
        ))
      )}
    </div>
  );
};

export { CharacterTracker };

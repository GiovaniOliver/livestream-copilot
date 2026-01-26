"use client";

import { forwardRef, useState, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { LegalEvidence, EvidenceStatus, EvidenceType, LegalParty } from "./types";

// Icons
const DocumentTextIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const PhotoIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const VideoCameraIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const MicrophoneIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

const CubeIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const ComputerDesktopIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

// Type to icon mapping
const typeIcons: Record<EvidenceType, React.FC> = {
  document: DocumentTextIcon,
  photo: PhotoIcon,
  video: VideoCameraIcon,
  audio: MicrophoneIcon,
  physical: CubeIcon,
  testimony: ChatBubbleIcon,
  digital: ComputerDesktopIcon,
};

// Status styles
const statusStyles: Record<EvidenceStatus, { badge: "success" | "warning" | "error" | "default"; label: string }> = {
  admitted: { badge: "success", label: "Admitted" },
  objected: { badge: "error", label: "Objected" },
  pending: { badge: "warning", label: "Pending" },
  withdrawn: { badge: "default", label: "Withdrawn" },
};

// Party styles
const partyStyles: Record<LegalParty, { bg: string; text: string; border: string }> = {
  prosecution: { bg: "bg-error/10", text: "text-error", border: "border-error/30" },
  defense: { bg: "bg-teal/10", text: "text-teal", border: "border-teal/30" },
  court: { bg: "bg-purple/10", text: "text-purple", border: "border-purple/30" },
  neutral: { bg: "bg-surface", text: "text-text-muted", border: "border-stroke" },
};

export interface EvidenceCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  evidence: LegalEvidence;
  isSelected?: boolean;
  onSelect?: (evidence: LegalEvidence) => void;
  onViewLinks?: (evidence: LegalEvidence) => void;
  compact?: boolean;
}

const EvidenceCard = forwardRef<HTMLDivElement, EvidenceCardProps>(
  ({ evidence, isSelected = false, onSelect, onViewLinks, compact = false, className, ...props }, ref) => {
    const TypeIcon = typeIcons[evidence.type];
    const status = statusStyles[evidence.status];
    const party = partyStyles[evidence.submittedBy];
    const totalLinks =
      evidence.linkedWitnessIds.length +
      evidence.linkedClaimIds.length +
      evidence.linkedEvidenceIds.length;

    const handleClick = () => {
      onSelect?.(evidence);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect?.(evidence);
      }
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative cursor-pointer rounded-xl border transition-all duration-200",
          "hover:border-teal/30",
          party.border,
          isSelected && "ring-2 ring-teal ring-offset-2 ring-offset-bg-0",
          compact ? "p-3" : "p-4",
          className
        )}
        {...props}
      >
        {/* Party indicator strip */}
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-1 rounded-l-xl",
            evidence.submittedBy === "prosecution" && "bg-error",
            evidence.submittedBy === "defense" && "bg-teal",
            evidence.submittedBy === "court" && "bg-purple",
            evidence.submittedBy === "neutral" && "bg-text-muted"
          )}
        />

        <div className="pl-3">
          {/* Header */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", party.bg, party.text)}>
                <TypeIcon />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-bg-2 px-2 py-0.5 text-xs font-bold text-text">
                    {evidence.label}
                  </span>
                  {evidence.isAiGenerated && (
                    <span className="flex items-center gap-0.5 text-purple">
                      <SparklesIcon />
                    </span>
                  )}
                </div>
                <span className="text-xs capitalize text-text-dim">{evidence.type}</span>
              </div>
            </div>
            <Badge variant={status.badge}>{status.label}</Badge>
          </div>

          {/* Description */}
          <p className={cn("text-sm text-text leading-relaxed", compact && "line-clamp-2")}>
            {evidence.description}
          </p>

          {/* Tags */}
          {evidence.tags.length > 0 && !compact && (
            <div className="mt-2 flex flex-wrap gap-1">
              {evidence.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <ClockIcon />
                <span>{evidence.timestamp}</span>
              </div>

              {totalLinks > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewLinks?.(evidence);
                  }}
                  className="flex items-center gap-1.5 text-xs text-teal hover:text-teal-300 transition-colors"
                >
                  <LinkIcon />
                  <span>{totalLinks} linked</span>
                </button>
              )}
            </div>

            <Badge
              variant={evidence.submittedBy === "prosecution" ? "error" : evidence.submittedBy === "defense" ? "teal" : "default"}
              className="text-[10px] px-2 py-0.5"
            >
              {evidence.submittedBy.charAt(0).toUpperCase() + evidence.submittedBy.slice(1)}
            </Badge>
          </div>
        </div>
      </div>
    );
  }
);

EvidenceCard.displayName = "EvidenceCard";

export interface EvidenceBoardProps extends HTMLAttributes<HTMLDivElement> {
  evidence: LegalEvidence[];
  selectedEvidenceId?: string | null;
  onSelectEvidence?: (evidence: LegalEvidence) => void;
  onAddEvidence?: () => void;
  onViewLinks?: (evidence: LegalEvidence) => void;
  filterStatus?: EvidenceStatus | "all";
  filterParty?: LegalParty | "all";
}

const EvidenceBoard = forwardRef<HTMLDivElement, EvidenceBoardProps>(
  (
    {
      evidence,
      selectedEvidenceId,
      onSelectEvidence,
      onAddEvidence,
      onViewLinks,
      filterStatus = "all",
      filterParty = "all",
      className,
      ...props
    },
    ref
  ) => {
    const [activeFilter, setActiveFilter] = useState<"all" | "prosecution" | "defense">("all");

    // Filter evidence
    const filteredEvidence = evidence.filter((e) => {
      if (activeFilter !== "all" && e.submittedBy !== activeFilter) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (filterParty !== "all" && e.submittedBy !== filterParty) return false;
      return true;
    });

    // Count by party
    const prosecutionCount = evidence.filter((e) => e.submittedBy === "prosecution").length;
    const defenseCount = evidence.filter((e) => e.submittedBy === "defense").length;

    return (
      <div ref={ref} className={cn("flex flex-col", className)} {...props}>
        {/* Header with filters */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === "all"
                  ? "bg-teal/10 text-teal"
                  : "bg-surface text-text-muted hover:bg-bg-2"
              )}
            >
              All ({evidence.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("prosecution")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === "prosecution"
                  ? "bg-error/10 text-error"
                  : "bg-surface text-text-muted hover:bg-bg-2"
              )}
            >
              Prosecution ({prosecutionCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("defense")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === "defense"
                  ? "bg-teal/10 text-teal"
                  : "bg-surface text-text-muted hover:bg-bg-2"
              )}
            >
              Defense ({defenseCount})
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={onAddEvidence} className="gap-1">
            <PlusIcon />
            Add Evidence
          </Button>
        </div>

        {/* Evidence grid */}
        {filteredEvidence.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
              <DocumentTextIcon />
            </div>
            <p className="text-sm text-text-muted">No evidence items found</p>
            <p className="mt-1 text-xs text-text-dim">
              Add evidence items as they are presented in the session
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredEvidence.map((item) => (
              <EvidenceCard
                key={item.id}
                evidence={item}
                isSelected={selectedEvidenceId === item.id}
                onSelect={onSelectEvidence}
                onViewLinks={onViewLinks}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

EvidenceBoard.displayName = "EvidenceBoard";

export { EvidenceBoard, EvidenceCard };

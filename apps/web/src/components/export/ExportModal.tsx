"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PlatformSelector } from "./PlatformSelector";
import { ExportFormatOptions } from "./ExportFormatOptions";
import { CopyToClipboard } from "./CopyToClipboard";
import { DownloadButton } from "./DownloadButton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type {
  SocialPlatform,
  ExportContent,
  ExportFormatOptions as ExportFormatOptionsType,
  ExportRequest,
  HashtagSuggestion,
  CaptionTemplate,
} from "./types";
import { PLATFORM_CONFIGS, DEFAULT_CAPTION_TEMPLATES } from "./types";
import { logger } from "@/lib/logger";

// ============================================================
// Icons
// ============================================================

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18m9-9H3m15.657-6.657l-12.728 12.728M20.485 3.515L3.515 20.485" />
    </svg>
  );
}

// ============================================================
// ExportModal Component
// ============================================================

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ExportContent | null;
  onExport: (request: ExportRequest) => Promise<void> | Promise<unknown>;
  hashtagSuggestions?: HashtagSuggestion[];
  captionTemplates?: CaptionTemplate[];
}

export function ExportModal({
  isOpen,
  onClose,
  content,
  onExport,
  hashtagSuggestions = [],
  captionTemplates = DEFAULT_CAPTION_TEMPLATES,
}: ExportModalProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customFilename, setCustomFilename] = useState("");
  const [formatOptions, setFormatOptions] = useState<ExportFormatOptionsType>({
    format: "mp4",
    quality: "1080p",
    aspectRatio: "16:9",
    includeCaptions: false,
    includeWatermark: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [step, setStep] = useState<"platforms" | "format" | "caption" | "preview">("platforms");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && content) {
      setCaption(content.caption || content.title);
      setCustomFilename(
        content.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
      setStep("platforms");
    } else if (!isOpen) {
      // Reset after modal closes
      setTimeout(() => {
        setSelectedPlatforms([]);
        setCaption("");
        setHashtags([]);
        setHashtagInput("");
        setSelectedTemplate(null);
        setCustomFilename("");
        setFormatOptions({
          format: "mp4",
          quality: "1080p",
          aspectRatio: "16:9",
          includeCaptions: false,
          includeWatermark: false,
        });
        setStep("platforms");
      }, 300);
    }
  }, [isOpen, content]);

  // Calculate available aspect ratios based on selected platforms
  const availableAspectRatios = useMemo(() => {
    if (selectedPlatforms.length === 0) return undefined;

    const ratioSets = selectedPlatforms.map(
      (platform) => new Set(PLATFORM_CONFIGS[platform].aspectRatios)
    );

    // Find common aspect ratios
    const commonRatios = ratioSets.reduce((acc, set) => {
      return new Set([...acc].filter((ratio) => set.has(ratio)));
    });

    return Array.from(commonRatios);
  }, [selectedPlatforms]);

  // Character count and validation
  const characterCount = caption.length;
  const maxCharacters = useMemo(() => {
    if (selectedPlatforms.length === 0) return null;
    return Math.min(
      ...selectedPlatforms.map((p) => PLATFORM_CONFIGS[p].characterLimit)
    );
  }, [selectedPlatforms]);

  const isOverLimit = maxCharacters !== null && characterCount > maxCharacters;

  // Handle hashtag input
  const handleAddHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput("");
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddHashtag();
    } else if (e.key === "Backspace" && hashtagInput === "" && hashtags.length > 0) {
      handleRemoveHashtag(hashtags[hashtags.length - 1]);
    }
  };

  // Apply caption template
  const handleApplyTemplate = (templateId: string) => {
    const template = captionTemplates.find((t) => t.id === templateId);
    if (!template || !content) return;

    let result = template.template;
    result = result.replace("{title}", content.title);
    result = result.replace("{description}", content.caption || "");
    result = result.replace("{hashtags}", hashtags.map((t) => `#${t}`).join(" "));
    result = result.replace("{link}", "");

    setCaption(result);
    setSelectedTemplate(templateId);
  };

  // Handle export
  const handleExport = async () => {
    if (!content || selectedPlatforms.length === 0) return;

    setIsExporting(true);

    try {
      await onExport({
        contentId: content.id,
        platforms: selectedPlatforms,
        caption,
        hashtags,
        formatOptions,
        customFilename,
      });

      // Success - close modal after brief delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      logger.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle navigation
  const handleNext = () => {
    if (step === "platforms" && selectedPlatforms.length > 0) {
      setStep("format");
    } else if (step === "format") {
      setStep("caption");
    } else if (step === "caption") {
      setStep("preview");
    }
  };

  const handleBack = () => {
    if (step === "format") {
      setStep("platforms");
    } else if (step === "caption") {
      setStep("format");
    } else if (step === "preview") {
      setStep("caption");
    }
  };

  const canProceed = selectedPlatforms.length > 0 && !isOverLimit;

  if (!isOpen || !content) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-stroke bg-bg-1 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-text">Export Content</h2>
            <p className="mt-1 text-sm text-text-muted">
              {content.type === "clip" ? "Clip" : "Post"}: {content.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text"
            aria-label="Close modal"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 border-b border-stroke bg-bg-0 px-6 py-3">
          {[
            { id: "platforms", label: "Platforms" },
            { id: "format", label: "Format" },
            { id: "caption", label: "Caption" },
            { id: "preview", label: "Preview" },
          ].map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                  step === s.id
                    ? "border-teal bg-teal text-bg-0"
                    : "border-stroke bg-surface text-text-muted"
                )}
              >
                {index + 1}
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium transition-colors",
                  step === s.id ? "text-text" : "text-text-muted"
                )}
              >
                {s.label}
              </span>
              {index < 3 && (
                <div className="mx-4 h-0.5 w-8 bg-stroke" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 220px)" }}>
          {/* Step 1: Platform Selection */}
          {step === "platforms" && (
            <PlatformSelector
              selectedPlatforms={selectedPlatforms}
              onChange={setSelectedPlatforms}
              showLabels
              size="md"
            />
          )}

          {/* Step 2: Format Options */}
          {step === "format" && (
            <ExportFormatOptions
              options={formatOptions}
              onChange={setFormatOptions}
              availableAspectRatios={availableAspectRatios}
            />
          )}

          {/* Step 3: Caption & Hashtags */}
          {step === "caption" && (
            <div className="space-y-6">
              {/* Caption Templates */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-text">
                  Caption Templates
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {captionTemplates
                    .filter((t) =>
                      t.platforms.some((p) => selectedPlatforms.includes(p))
                    )
                    .map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleApplyTemplate(template.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all duration-200",
                          selectedTemplate === template.id
                            ? "border-teal bg-teal/10"
                            : "border-stroke bg-surface hover:bg-surface-hover hover:border-stroke-subtle"
                        )}
                      >
                        <SparklesIcon className="h-4 w-4 text-purple" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text">
                            {template.name}
                          </div>
                          <div className="text-xs text-text-muted line-clamp-1">
                            {template.template}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Caption Input */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-text">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write your caption..."
                  className={cn(
                    "w-full resize-none rounded-lg border bg-surface p-3 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-teal",
                    isOverLimit ? "border-error" : "border-stroke"
                  )}
                  rows={6}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isOverLimit ? "text-error" : "text-text-muted"
                    )}
                  >
                    {characterCount}
                    {maxCharacters && ` / ${maxCharacters}`} characters
                  </span>
                  {isOverLimit && (
                    <span className="text-xs text-error">
                      Caption too long for selected platforms
                    </span>
                  )}
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-text">
                  Hashtags
                </label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-stroke bg-surface p-3">
                  {hashtags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="teal"
                      className="flex items-center gap-1.5"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveHashtag(tag)}
                        className="ml-1 text-teal hover:text-teal-400"
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add hashtag..."
                    className="min-w-[120px] flex-1 bg-transparent text-sm text-text placeholder:text-text-dim focus:outline-none"
                  />
                </div>

                {/* Hashtag Suggestions */}
                {hashtagSuggestions.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-text-muted">
                      <HashIcon className="h-3.5 w-3.5" />
                      <span>Suggested hashtags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hashtagSuggestions
                        .filter((s) => !hashtags.includes(s.tag))
                        .slice(0, 10)
                        .map((suggestion) => (
                          <button
                            key={suggestion.tag}
                            type="button"
                            onClick={() => {
                              setHashtags([...hashtags, suggestion.tag]);
                            }}
                            className="rounded-full border border-stroke bg-surface px-3 py-1 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                          >
                            #{suggestion.tag}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Preview & Export */}
          {step === "preview" && (
            <div className="space-y-6">
              {/* Preview */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-text">
                  Preview
                </label>
                <div className="rounded-xl border border-stroke bg-surface p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedPlatforms.map((platform) => {
                      const config = PLATFORM_CONFIGS[platform];
                      return (
                        <Badge key={platform} variant="teal">
                          {config.name}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-text">
                    {caption}
                  </p>
                  {hashtags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {hashtags.map((tag) => (
                        <span key={tag} className="text-sm text-teal">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Copy to Clipboard */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-text">
                  Copy Caption
                </label>
                <CopyToClipboard
                  text={`${caption}\n\n${hashtags.map((t) => `#${t}`).join(" ")}`}
                  variant="textarea"
                  showPreview
                />
              </div>

              {/* Custom Filename */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-text">
                  Custom Filename (Optional)
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder="my-video-export"
                  className="w-full rounded-lg border border-stroke bg-surface px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stroke px-6 py-4">
          <div>
            {step !== "platforms" && (
              <Button
                variant="ghost"
                size="md"
                onClick={handleBack}
                disabled={isExporting}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="md" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            {step !== "preview" ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                disabled={!canProceed}
              >
                Next
              </Button>
            ) : (
              <DownloadButton
                onDownload={handleExport}
                filename={customFilename || content.title}
                variant="primary"
                size="md"
                showProgress
                disabled={!canProceed || isExporting}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;

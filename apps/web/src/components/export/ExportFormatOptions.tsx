"use client";

import { cn } from "@/lib/utils";
import type {
  ExportFormatOptions as ExportFormatOptionsType,
  ExportFormat,
  VideoQuality,
  AspectRatio,
} from "./types";

// ============================================================
// Icons
// ============================================================

function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ============================================================
// Format Configuration
// ============================================================

const FORMAT_CONFIG: Record<ExportFormat, { label: string; extension: string }> = {
  mp4: { label: "MP4", extension: ".mp4" },
  mov: { label: "MOV", extension: ".mov" },
  webm: { label: "WebM", extension: ".webm" },
};

const QUALITY_CONFIG: Record<VideoQuality, { label: string; resolution: string }> = {
  "1080p": { label: "1080p", resolution: "1920x1080" },
  "720p": { label: "720p", resolution: "1280x720" },
  "480p": { label: "480p", resolution: "854x480" },
};

const ASPECT_RATIO_CONFIG: Record<AspectRatio, { label: string; icon: React.ReactNode }> = {
  "16:9": {
    label: "Landscape",
    icon: (
      <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="1" width="46" height="30" rx="2" />
      </svg>
    ),
  },
  "9:16": {
    label: "Portrait",
    icon: (
      <svg className="h-12 w-8" viewBox="0 0 32 48" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="1" width="30" height="46" rx="2" />
      </svg>
    ),
  },
  "1:1": {
    label: "Square",
    icon: (
      <svg className="h-10 w-10" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="1" width="38" height="38" rx="2" />
      </svg>
    ),
  },
  "4:5": {
    label: "Vertical",
    icon: (
      <svg className="h-12 w-10" viewBox="0 0 40 48" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="1" width="38" height="46" rx="2" />
      </svg>
    ),
  },
};

// ============================================================
// ExportFormatOptions Component
// ============================================================

export interface ExportFormatOptionsProps {
  options: ExportFormatOptionsType;
  onChange: (options: ExportFormatOptionsType) => void;
  availableAspectRatios?: AspectRatio[];
  disabled?: boolean;
}

export function ExportFormatOptions({
  options,
  onChange,
  availableAspectRatios,
  disabled = false,
}: ExportFormatOptionsProps) {
  const handleFormatChange = (format: ExportFormat) => {
    onChange({ ...options, format });
  };

  const handleQualityChange = (quality: VideoQuality) => {
    onChange({ ...options, quality });
  };

  const handleAspectRatioChange = (aspectRatio: AspectRatio) => {
    onChange({ ...options, aspectRatio });
  };

  const handleToggleCaptions = () => {
    onChange({ ...options, includeCaptions: !options.includeCaptions });
  };

  const handleToggleWatermark = () => {
    onChange({ ...options, includeWatermark: !options.includeWatermark });
  };

  const aspectRatiosToShow = availableAspectRatios || Object.keys(ASPECT_RATIO_CONFIG) as AspectRatio[];

  return (
    <div className={cn("space-y-6", disabled && "opacity-60 pointer-events-none")}>
      {/* Format Selection */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-text">
          Video Format
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(FORMAT_CONFIG) as [ExportFormat, typeof FORMAT_CONFIG[ExportFormat]][]).map(
            ([format, config]) => (
              <button
                key={format}
                type="button"
                onClick={() => handleFormatChange(format)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 px-4 py-3 transition-all duration-200",
                  options.format === format
                    ? "border-teal bg-teal/10 shadow-glow"
                    : "border-stroke bg-surface hover:bg-surface-hover hover:border-stroke-subtle"
                )}
                aria-label={`Select ${config.label} format`}
                aria-pressed={options.format === format}
              >
                <span
                  className={cn(
                    "text-sm font-semibold",
                    options.format === format ? "text-teal" : "text-text"
                  )}
                >
                  {config.label}
                </span>
                <span className="mt-0.5 text-xs text-text-muted">
                  {config.extension}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Quality Selection */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-text">
          Video Quality
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(QUALITY_CONFIG) as [VideoQuality, typeof QUALITY_CONFIG[VideoQuality]][]).map(
            ([quality, config]) => (
              <button
                key={quality}
                type="button"
                onClick={() => handleQualityChange(quality)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 px-4 py-3 transition-all duration-200",
                  options.quality === quality
                    ? "border-purple bg-purple/10 shadow-glow"
                    : "border-stroke bg-surface hover:bg-surface-hover hover:border-stroke-subtle"
                )}
                aria-label={`Select ${config.label} quality`}
                aria-pressed={options.quality === quality}
              >
                <span
                  className={cn(
                    "text-sm font-semibold",
                    options.quality === quality ? "text-purple" : "text-text"
                  )}
                >
                  {config.label}
                </span>
                <span className="mt-0.5 text-xs text-text-muted">
                  {config.resolution}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Aspect Ratio Selection */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-text">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-4 gap-3">
          {aspectRatiosToShow.map((ratio) => {
            const config = ASPECT_RATIO_CONFIG[ratio];
            return (
              <button
                key={ratio}
                type="button"
                onClick={() => handleAspectRatioChange(ratio)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 px-3 py-4 transition-all duration-200",
                  options.aspectRatio === ratio
                    ? "border-teal bg-teal/10 shadow-glow"
                    : "border-stroke bg-surface hover:bg-surface-hover hover:border-stroke-subtle"
                )}
                aria-label={`Select ${ratio} aspect ratio (${config.label})`}
                aria-pressed={options.aspectRatio === ratio}
              >
                <div
                  className={cn(
                    "flex items-center justify-center",
                    options.aspectRatio === ratio ? "text-teal" : "text-text-muted"
                  )}
                >
                  {config.icon}
                </div>
                <div className="text-center">
                  <div
                    className={cn(
                      "text-xs font-semibold",
                      options.aspectRatio === ratio ? "text-teal" : "text-text"
                    )}
                  >
                    {ratio}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {config.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Options */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-text">
          Additional Options
        </label>
        <div className="space-y-2">
          {/* Include Captions Toggle */}
          <label className="flex items-center justify-between rounded-lg border border-stroke bg-surface p-3 cursor-pointer transition-colors hover:bg-surface-hover">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200",
                  options.includeCaptions
                    ? "border-teal bg-teal"
                    : "border-stroke bg-bg-0"
                )}
              >
                {options.includeCaptions && (
                  <CheckIcon className="h-3 w-3 text-bg-0" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-text">
                  Include Captions
                </div>
                <div className="text-xs text-text-muted">
                  Burn captions into the video
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={options.includeCaptions || false}
              onChange={handleToggleCaptions}
              className="sr-only"
              aria-label="Include captions in export"
            />
          </label>

          {/* Include Watermark Toggle */}
          <label className="flex items-center justify-between rounded-lg border border-stroke bg-surface p-3 cursor-pointer transition-colors hover:bg-surface-hover">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200",
                  options.includeWatermark
                    ? "border-teal bg-teal"
                    : "border-stroke bg-bg-0"
                )}
              >
                {options.includeWatermark && (
                  <CheckIcon className="h-3 w-3 text-bg-0" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-text">
                  Include Watermark
                </div>
                <div className="text-xs text-text-muted">
                  Add your logo or branding
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={options.includeWatermark || false}
              onChange={handleToggleWatermark}
              className="sr-only"
              aria-label="Include watermark in export"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default ExportFormatOptions;

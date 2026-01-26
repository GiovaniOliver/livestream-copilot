"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ============================================================
// Types
// ============================================================

export type OverlayPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface LogoSettings {
  enabled: boolean;
  position: OverlayPosition;
  widthPercent: number;
  opacity: number;
  margin: number;
}

export interface LowerThirdSettings {
  enabled: boolean;
  text: string;
  subtitle: string;
  position: "left" | "center" | "right";
  textColor: string;
  backgroundColor: string;
  fontSize: number;
}

export interface IntroOutroSettings {
  introEnabled: boolean;
  introDuration: number;
  outroEnabled: boolean;
  outroDuration: number;
}

export interface BrandingSettingsData {
  logo: LogoSettings;
  lowerThird: LowerThirdSettings;
  introOutro: IntroOutroSettings;
  primaryColor: string;
  secondaryColor: string;
}

export interface BrandingSettingsProps {
  settings: BrandingSettingsData;
  onChange: (settings: BrandingSettingsData) => void;
  onPreview?: () => void;
  className?: string;
}

// ============================================================
// Icons
// ============================================================

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

// ============================================================
// Position Grid Component
// ============================================================

function PositionGrid({
  value,
  onChange,
}: {
  value: OverlayPosition;
  onChange: (position: OverlayPosition) => void;
}) {
  const positions: OverlayPosition[][] = [
    ["top-left", "top-center", "top-right"],
    ["center-left", "center", "center-right"],
    ["bottom-left", "bottom-center", "bottom-right"],
  ];

  return (
    <div className="grid grid-cols-3 gap-1 w-24">
      {positions.map((row, rowIdx) =>
        row.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => onChange(pos)}
            className={cn(
              "h-6 w-6 rounded border transition-all",
              value === pos
                ? "border-teal bg-teal/30"
                : "border-stroke bg-surface hover:bg-surface-hover"
            )}
            title={pos}
          />
        ))
      )}
    </div>
  );
}

// ============================================================
// Color Picker Component
// ============================================================

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-muted">{label}</label>
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-stroke bg-transparent"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 rounded border border-stroke bg-surface px-2 py-1 text-xs text-text"
      />
    </div>
  );
}

// ============================================================
// Section Components
// ============================================================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}

function Section({ title, icon, enabled, onToggle, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-stroke bg-surface">
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            enabled ? "bg-teal/20 text-teal" : "bg-surface-elevated text-text-muted"
          )}>
            {icon}
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-text">{title}</h4>
            <p className="text-xs text-text-muted">
              {enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            enabled ? "bg-teal" : "bg-surface-elevated"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </div>
      </button>
      {enabled && (
        <div className="border-t border-stroke p-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================
// BrandingSettings Component
// ============================================================

export function BrandingSettings({
  settings,
  onChange,
  onPreview,
  className,
}: BrandingSettingsProps) {
  const [activeTab, setActiveTab] = useState<"elements" | "colors">("elements");

  const updateLogo = useCallback(
    (updates: Partial<LogoSettings>) => {
      onChange({
        ...settings,
        logo: { ...settings.logo, ...updates },
      });
    },
    [settings, onChange]
  );

  const updateLowerThird = useCallback(
    (updates: Partial<LowerThirdSettings>) => {
      onChange({
        ...settings,
        lowerThird: { ...settings.lowerThird, ...updates },
      });
    },
    [settings, onChange]
  );

  const updateIntroOutro = useCallback(
    (updates: Partial<IntroOutroSettings>) => {
      onChange({
        ...settings,
        introOutro: { ...settings.introOutro, ...updates },
      });
    },
    [settings, onChange]
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Tabs */}
      <div className="flex gap-2 border-b border-stroke pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("elements")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "elements"
              ? "bg-teal/20 text-teal"
              : "text-text-muted hover:bg-surface-hover hover:text-text"
          )}
        >
          <ImageIcon className="h-4 w-4" />
          Elements
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("colors")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "colors"
              ? "bg-teal/20 text-teal"
              : "text-text-muted hover:bg-surface-hover hover:text-text"
          )}
        >
          <PaletteIcon className="h-4 w-4" />
          Colors
        </button>
      </div>

      {/* Elements Tab */}
      {activeTab === "elements" && (
        <div className="space-y-4">
          {/* Logo Overlay */}
          <Section
            title="Logo Overlay"
            icon={<ImageIcon className="h-5 w-5" />}
            enabled={settings.logo.enabled}
            onToggle={(enabled) => updateLogo({ enabled })}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <label className="text-sm font-medium text-text">Position</label>
                  <p className="text-xs text-text-muted">Where to place the logo</p>
                </div>
                <PositionGrid
                  value={settings.logo.position}
                  onChange={(position) => updateLogo({ position })}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Size: {settings.logo.widthPercent}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={settings.logo.widthPercent}
                  onChange={(e) => updateLogo({ widthPercent: Number(e.target.value) })}
                  className="w-full accent-teal"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Opacity: {Math.round(settings.logo.opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={settings.logo.opacity * 100}
                  onChange={(e) => updateLogo({ opacity: Number(e.target.value) / 100 })}
                  className="w-full accent-teal"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Margin: {settings.logo.margin}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={settings.logo.margin}
                  onChange={(e) => updateLogo({ margin: Number(e.target.value) })}
                  className="w-full accent-teal"
                />
              </div>
            </div>
          </Section>

          {/* Lower Third */}
          <Section
            title="Lower Third"
            icon={<TextIcon className="h-5 w-5" />}
            enabled={settings.lowerThird.enabled}
            onToggle={(enabled) => updateLowerThird({ enabled })}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-text">Title</label>
                <input
                  type="text"
                  value={settings.lowerThird.text}
                  onChange={(e) => updateLowerThird({ text: e.target.value })}
                  placeholder="Your Name"
                  className="w-full rounded-lg border border-stroke bg-surface-elevated px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">Subtitle</label>
                <input
                  type="text"
                  value={settings.lowerThird.subtitle}
                  onChange={(e) => updateLowerThird({ subtitle: e.target.value })}
                  placeholder="Your Title or Role"
                  className="w-full rounded-lg border border-stroke bg-surface-elevated px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">Position</label>
                <div className="flex gap-2">
                  {(["left", "center", "right"] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => updateLowerThird({ position: pos })}
                      className={cn(
                        "flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors",
                        settings.lowerThird.position === pos
                          ? "border-teal bg-teal/20 text-teal"
                          : "border-stroke bg-surface-elevated text-text-muted hover:bg-surface-hover"
                      )}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ColorPicker
                  label="Text"
                  value={settings.lowerThird.textColor}
                  onChange={(textColor) => updateLowerThird({ textColor })}
                />
                <ColorPicker
                  label="Background"
                  value={settings.lowerThird.backgroundColor}
                  onChange={(backgroundColor) => updateLowerThird({ backgroundColor })}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Font Size: {settings.lowerThird.fontSize}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="48"
                  value={settings.lowerThird.fontSize}
                  onChange={(e) => updateLowerThird({ fontSize: Number(e.target.value) })}
                  className="w-full accent-teal"
                />
              </div>
            </div>
          </Section>

          {/* Intro/Outro */}
          <Section
            title="Intro & Outro"
            icon={<FilmIcon className="h-5 w-5" />}
            enabled={settings.introOutro.introEnabled || settings.introOutro.outroEnabled}
            onToggle={(enabled) =>
              updateIntroOutro({
                introEnabled: enabled,
                outroEnabled: enabled,
              })
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-text">Intro Clip</label>
                  <p className="text-xs text-text-muted">Show before main video</p>
                </div>
                <div
                  onClick={() =>
                    updateIntroOutro({ introEnabled: !settings.introOutro.introEnabled })
                  }
                  className={cn(
                    "relative h-6 w-11 cursor-pointer rounded-full transition-colors",
                    settings.introOutro.introEnabled ? "bg-teal" : "bg-surface-elevated"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      settings.introOutro.introEnabled ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </div>
              </div>

              {settings.introOutro.introEnabled && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">
                    Intro Duration: {settings.introOutro.introDuration}s
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.introOutro.introDuration}
                    onChange={(e) =>
                      updateIntroOutro({ introDuration: Number(e.target.value) })
                    }
                    className="w-full accent-teal"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-text">Outro Clip</label>
                  <p className="text-xs text-text-muted">Show after main video</p>
                </div>
                <div
                  onClick={() =>
                    updateIntroOutro({ outroEnabled: !settings.introOutro.outroEnabled })
                  }
                  className={cn(
                    "relative h-6 w-11 cursor-pointer rounded-full transition-colors",
                    settings.introOutro.outroEnabled ? "bg-teal" : "bg-surface-elevated"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      settings.introOutro.outroEnabled ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </div>
              </div>

              {settings.introOutro.outroEnabled && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">
                    Outro Duration: {settings.introOutro.outroDuration}s
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.introOutro.outroDuration}
                    onChange={(e) =>
                      updateIntroOutro({ outroDuration: Number(e.target.value) })
                    }
                    className="w-full accent-teal"
                  />
                </div>
              )}

              <p className="text-xs text-text-muted">
                Upload your intro/outro files in Brand Settings to use them here.
              </p>
            </div>
          </Section>
        </div>
      )}

      {/* Colors Tab */}
      {activeTab === "colors" && (
        <div className="space-y-6">
          <div>
            <h4 className="mb-4 text-sm font-semibold text-text">Brand Colors</h4>
            <div className="space-y-4">
              <ColorPicker
                label="Primary Color"
                value={settings.primaryColor}
                onChange={(primaryColor) => onChange({ ...settings, primaryColor })}
              />
              <ColorPicker
                label="Secondary Color"
                value={settings.secondaryColor}
                onChange={(secondaryColor) => onChange({ ...settings, secondaryColor })}
              />
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-text">Presets</h4>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: "Teal & Purple", primary: "#00D4AA", secondary: "#7B61FF" },
                { name: "Blue & Orange", primary: "#3B82F6", secondary: "#F97316" },
                { name: "Red & Gold", primary: "#EF4444", secondary: "#F59E0B" },
                { name: "Green & Pink", primary: "#22C55E", secondary: "#EC4899" },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      primaryColor: preset.primary,
                      secondaryColor: preset.secondary,
                    })
                  }
                  className="flex flex-col items-center gap-2 rounded-lg border border-stroke bg-surface p-3 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex gap-1">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Button */}
      {onPreview && (
        <div className="pt-4 border-t border-stroke">
          <Button
            variant="outline"
            size="md"
            onClick={onPreview}
            className="w-full"
          >
            Generate Preview
          </Button>
        </div>
      )}
    </div>
  );
}

export default BrandingSettings;

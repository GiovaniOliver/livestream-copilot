/**
 * Settings Screen Constants
 *
 * Shared constants, types, and styles used across all settings sections.
 */

import { StyleSheet } from "react-native";
import type { CaptureMode } from "../../stores/captureStore";
import { colors } from "../../theme";

// =============================================================================
// TYPES
// =============================================================================

export interface SessionTimeoutOption {
  readonly label: string;
  readonly minutes: number;
}

export interface CaptureModeOption {
  readonly label: string;
  readonly value: CaptureMode;
}

export interface QualityPresetOption {
  readonly label: string;
  readonly resolution: "480p" | "720p" | "1080p";
  readonly fps: 24 | 30 | 60;
  readonly audioBitrate: 64 | 128 | 256;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const APP_VERSION = "0.1.0";

export const SESSION_TIMEOUT_OPTIONS: readonly SessionTimeoutOption[] = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hr", minutes: 120 },
] as const;

export const CAPTURE_MODE_OPTIONS: readonly CaptureModeOption[] = [
  { label: "Audio + Video", value: "av" },
  { label: "Video Only", value: "video" },
  { label: "Audio Only", value: "audio" },
] as const;

export const QUALITY_PRESET_OPTIONS: readonly QualityPresetOption[] = [
  { label: "Low (480p / 24fps)", resolution: "480p", fps: 24, audioBitrate: 64 },
  { label: "Medium (720p / 30fps)", resolution: "720p", fps: 30, audioBitrate: 128 },
  { label: "High (1080p / 30fps)", resolution: "1080p", fps: 30, audioBitrate: 256 },
  { label: "Ultra (1080p / 60fps)", resolution: "1080p", fps: 60, audioBitrate: 256 },
] as const;

export const SUPPORT_URL = "https://fluxboard.app/support";
export const PRIVACY_URL = "https://fluxboard.app/privacy";
export const TERMS_URL = "https://fluxboard.app/terms";

// =============================================================================
// SHARED STYLES
// =============================================================================

export const sharedStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionCard: {
    marginBottom: 4,
  },
  separator: {
    height: 1,
    backgroundColor: colors.stroke,
    marginVertical: 12,
  },
  settingBlock: {
    gap: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.muted,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingRowInfo: {
    flex: 1,
    marginRight: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  chipActive: {
    borderColor: colors.teal,
    backgroundColor: "rgba(0,212,199,0.12)",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.teal,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  actionRowText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  actionRowChevron: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

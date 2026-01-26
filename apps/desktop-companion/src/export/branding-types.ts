/**
 * Video Branding Types
 *
 * Type definitions for video branding features including
 * logo overlays, intro/outro clips, lower thirds, and brand presets.
 */

import type { ExportFormat } from './types.js';

/**
 * Position for overlay elements
 */
export type OverlayPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Logo overlay configuration
 */
export interface LogoOverlay {
  /** Path to logo image (PNG with transparency recommended) */
  path: string;
  /** Position on video */
  position: OverlayPosition;
  /** Width as percentage of video width (1-50) */
  widthPercent: number;
  /** Opacity (0-1) */
  opacity: number;
  /** Margin from edges in pixels */
  margin: number;
  /** Fade in duration in seconds (0 = no fade) */
  fadeIn?: number;
  /** Fade out duration in seconds (0 = no fade) */
  fadeOut?: number;
  /** Delay before showing in seconds */
  delay?: number;
  /** Duration to show (undefined = entire video) */
  duration?: number;
}

/**
 * Intro/outro clip configuration
 */
export interface BrandClip {
  /** Path to video or image file */
  path: string;
  /** Duration in seconds (for images) */
  duration: number;
  /** Fade transition duration in seconds */
  fadeTransition?: number;
  /** Audio: keep, mute, or fade */
  audioMode?: 'keep' | 'mute' | 'fade';
}

/**
 * Lower third text overlay
 */
export interface LowerThird {
  /** Text to display */
  text: string;
  /** Optional subtitle/secondary text */
  subtitle?: string;
  /** Start time in seconds from video start */
  startTime: number;
  /** Duration to show in seconds */
  duration: number;
  /** Position: left, center, or right */
  position: 'left' | 'center' | 'right';
  /** Text color (hex) */
  textColor: string;
  /** Background color (hex with optional alpha) */
  backgroundColor: string;
  /** Font size in pixels */
  fontSize: number;
  /** Font family */
  fontFamily?: string;
  /** Fade in/out duration */
  fadeDuration?: number;
}

/**
 * Animated text overlay
 */
export interface TextOverlay {
  /** Text content */
  text: string;
  /** Position on video */
  position: OverlayPosition;
  /** Start time in seconds */
  startTime: number;
  /** Duration in seconds */
  duration: number;
  /** Font size in pixels */
  fontSize: number;
  /** Text color (hex) */
  color: string;
  /** Optional background color */
  backgroundColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Animation type */
  animation?: 'none' | 'fade' | 'slide-in' | 'typewriter';
}

/**
 * Complete branding configuration
 */
export interface BrandingConfig {
  /** Unique identifier for the preset */
  id?: string;
  /** Preset name */
  name: string;
  /** Logo overlay settings */
  logo?: LogoOverlay;
  /** Intro clip settings */
  intro?: BrandClip;
  /** Outro clip settings */
  outro?: BrandClip;
  /** Lower third overlays */
  lowerThirds?: LowerThird[];
  /** Text overlays */
  textOverlays?: TextOverlay[];
  /** Primary brand color */
  primaryColor?: string;
  /** Secondary brand color */
  secondaryColor?: string;
  /** Default font family */
  fontFamily?: string;
  /** Enable audio ducking during overlays */
  audioDucking?: boolean;
  /** Audio ducking level (0-1) */
  audioDuckingLevel?: number;
}

/**
 * Branding preset stored in database
 */
export interface BrandingPreset {
  id: string;
  userId: string;
  organizationId?: string;
  name: string;
  config: BrandingConfig;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Video export with branding options
 */
export interface BrandedExportRequest {
  clipId: string;
  format: ExportFormat;
  quality?: 'low' | 'medium' | 'high' | 'original';
  targetAspectRatio?: string;
  /** Branding preset ID to apply */
  brandingPresetId?: string;
  /** Inline branding config (overrides preset) */
  branding?: BrandingConfig;
  /** Generate thumbnail from result */
  generateThumbnail?: boolean;
}

/**
 * Branding job status
 */
export type BrandingJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Branding job for async processing
 */
export interface BrandingJob {
  id: string;
  exportId: string;
  status: BrandingJobStatus;
  progress: number;
  message?: string;
  errorMessage?: string;
  inputPath: string;
  outputPath?: string;
  brandingConfig: BrandingConfig;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * FFmpeg filter graph building options
 */
export interface FilterGraphOptions {
  inputPath: string;
  outputPath: string;
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
  branding: BrandingConfig;
}

/**
 * Position coordinates calculated from overlay position
 */
export interface PositionCoordinates {
  x: string;
  y: string;
}

/**
 * Calculate position coordinates for FFmpeg overlay
 */
export function getPositionCoordinates(
  position: OverlayPosition,
  overlayWidth: number,
  overlayHeight: number,
  margin: number
): PositionCoordinates {
  const positions: Record<OverlayPosition, PositionCoordinates> = {
    'top-left': {
      x: `${margin}`,
      y: `${margin}`,
    },
    'top-center': {
      x: `(main_w-overlay_w)/2`,
      y: `${margin}`,
    },
    'top-right': {
      x: `main_w-overlay_w-${margin}`,
      y: `${margin}`,
    },
    'center-left': {
      x: `${margin}`,
      y: `(main_h-overlay_h)/2`,
    },
    'center': {
      x: `(main_w-overlay_w)/2`,
      y: `(main_h-overlay_h)/2`,
    },
    'center-right': {
      x: `main_w-overlay_w-${margin}`,
      y: `(main_h-overlay_h)/2`,
    },
    'bottom-left': {
      x: `${margin}`,
      y: `main_h-overlay_h-${margin}`,
    },
    'bottom-center': {
      x: `(main_w-overlay_w)/2`,
      y: `main_h-overlay_h-${margin}`,
    },
    'bottom-right': {
      x: `main_w-overlay_w-${margin}`,
      y: `main_h-overlay_h-${margin}`,
    },
  };

  return positions[position] || positions['bottom-right'];
}

/**
 * Default branding configuration
 */
export const DEFAULT_BRANDING_CONFIG: Partial<BrandingConfig> = {
  name: 'Default',
  primaryColor: '#00D4AA',
  secondaryColor: '#7B61FF',
  fontFamily: 'Arial',
  audioDucking: false,
  audioDuckingLevel: 0.3,
};

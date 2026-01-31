"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

// ============================================================
// Types
// ============================================================

export interface VideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onLoadedMetadata?: (duration: number) => void;
  poster?: string;
  controls?: boolean; // Show custom controls
}

interface VideoError {
  code: number;
  message: string;
}

// ============================================================
// Icons
// ============================================================

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
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
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function VolumeMutedIcon({ className }: { className?: string }) {
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
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function FullscreenIcon({ className }: { className?: string }) {
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
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================
// VideoPlayer Component
// ============================================================

export function VideoPlayer({
  src,
  className,
  autoPlay = false,
  loop = false,
  muted = false,
  onTimeUpdate,
  onEnded,
  onError,
  onLoadedMetadata,
  poster,
  controls = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<VideoError | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================================
  // Playback Controls
  // ============================================================

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => {
        logger.error("Play failed:", err);
      });
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      setVolume(0);
    } else {
      setVolume(videoRef.current.volume);
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  const seek = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const changeVolume = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    videoRef.current.volume = clampedVolume;
    setVolume(clampedVolume);
    setIsMuted(clampedVolume === 0);
    videoRef.current.muted = clampedVolume === 0;
  }, []);

  // ============================================================
  // Progress Bar Interaction
  // ============================================================

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || !videoRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * duration;
      seek(newTime);
    },
    [duration, seek]
  );

  const handleProgressMouseDown = useCallback(() => {
    setIsDraggingProgress(true);
  }, []);

  const handleProgressMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingProgress || !progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = pos * duration;
      seek(newTime);
    },
    [isDraggingProgress, duration, seek]
  );

  const handleProgressMouseUp = useCallback(() => {
    setIsDraggingProgress(false);
  }, []);

  // ============================================================
  // Volume Bar Interaction
  // ============================================================

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!volumeBarRef.current) return;
      const rect = volumeBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      changeVolume(pos);
    },
    [changeVolume]
  );

  const handleVolumeMouseDown = useCallback(() => {
    setIsDraggingVolume(true);
  }, []);

  const handleVolumeMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingVolume || !volumeBarRef.current) return;
      const rect = volumeBarRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      changeVolume(pos);
    },
    [isDraggingVolume, changeVolume]
  );

  const handleVolumeMouseUp = useCallback(() => {
    setIsDraggingVolume(false);
  }, []);

  // ============================================================
  // Video Event Handlers
  // ============================================================

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    const videoDuration = videoRef.current.duration;
    setDuration(videoDuration);
    setIsLoading(false);
    onLoadedMetadata?.(videoDuration);
  }, [onLoadedMetadata]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || isDraggingProgress) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time, duration);
  }, [onTimeUpdate, duration, isDraggingProgress]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleError = useCallback(() => {
    if (!videoRef.current) return;
    const videoError = videoRef.current.error;
    if (videoError) {
      const err: VideoError = {
        code: videoError.code,
        message: videoError.message || "Unknown video error",
      };
      setError(err);
      setIsLoading(false);
      onError?.(new Error(err.message));
    }
  }, [onError]);

  // ============================================================
  // Keyboard Shortcuts
  // ============================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(Math.max(0, currentTime - 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(Math.min(duration, currentTime + 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(Math.max(0, volume - 0.1));
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "0":
        case "Home":
          e.preventDefault();
          seek(0);
          break;
        case "End":
          e.preventDefault();
          seek(duration);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen, seek, changeVolume, currentTime, duration, volume]);

  // ============================================================
  // Mouse Movement for Controls
  // ============================================================

  const resetHideControlsTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================
  // Fullscreen Change Handler
  // ============================================================

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // ============================================================
  // Progress/Volume Dragging
  // ============================================================

  useEffect(() => {
    if (isDraggingProgress) {
      window.addEventListener("mousemove", handleProgressMouseMove);
      window.addEventListener("mouseup", handleProgressMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleProgressMouseMove);
        window.removeEventListener("mouseup", handleProgressMouseUp);
      };
    }
  }, [isDraggingProgress, handleProgressMouseMove, handleProgressMouseUp]);

  useEffect(() => {
    if (isDraggingVolume) {
      window.addEventListener("mousemove", handleVolumeMouseMove);
      window.addEventListener("mouseup", handleVolumeMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleVolumeMouseMove);
        window.removeEventListener("mouseup", handleVolumeMouseUp);
      };
    }
  }, [isDraggingVolume, handleVolumeMouseMove, handleVolumeMouseUp]);

  // ============================================================
  // Render
  // ============================================================

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative overflow-hidden rounded-lg bg-bg-0",
        className
      )}
      onMouseMove={resetHideControlsTimer}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        className="h-full w-full"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onClick={togglePlay}
      />

      {/* Loading Spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-0/50 backdrop-blur-sm">
          <LoadingSpinner className="h-12 w-12 text-teal" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-0/80 p-4 text-center backdrop-blur-sm">
          <div className="text-4xl text-error mb-4">⚠</div>
          <p className="text-error font-semibold">Failed to load video</p>
          <p className="text-text-muted text-sm mt-2">{error.message}</p>
        </div>
      )}

      {/* Custom Controls */}
      {controls && !error && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-0/90 via-bg-0/70 to-transparent p-4 transition-opacity duration-300",
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Progress Bar */}
          <div
            ref={progressBarRef}
            className="group/progress relative mb-3 h-1 cursor-pointer rounded-full bg-bg-2 transition-all hover:h-1.5"
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-teal transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-teal opacity-0 transition-all group-hover/progress:opacity-100"
              style={{ left: `${progress}%`, marginLeft: "-6px" }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-text hover:text-teal"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <PauseIcon className="h-5 w-5" />
              ) : (
                <PlayIcon className="h-5 w-5" />
              )}
            </Button>

            {/* Time Display */}
            <div className="text-xs text-text-muted font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Volume Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-text hover:text-teal"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeMutedIcon className="h-5 w-5" />
                ) : (
                  <VolumeIcon className="h-5 w-5" />
                )}
              </Button>
              <div
                ref={volumeBarRef}
                className="group/volume relative h-1 w-20 cursor-pointer rounded-full bg-bg-2 transition-all hover:h-1.5"
                onClick={handleVolumeClick}
                onMouseDown={handleVolumeMouseDown}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-teal transition-all"
                  style={{ width: `${volume * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-teal opacity-0 transition-all group-hover/volume:opacity-100"
                  style={{ left: `${volume * 100}%`, marginLeft: "-6px" }}
                />
              </div>
            </div>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-text hover:text-teal"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <FullscreenIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;

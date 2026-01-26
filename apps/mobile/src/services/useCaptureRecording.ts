/**
 * Capture Recording Hook
 *
 * Manages video/audio recording using expo-camera and expo-audio.
 * Supports video, audio-only, and A/V modes.
 */

import { useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import { useCaptureStore, type CaptureMode, type CaptureQuality } from "../stores/captureStore";

interface UseCaptureRecordingOptions {
  onRecordingComplete?: (uri: string) => void;
  onError?: (error: string) => void;
}

// Map quality settings to camera settings
const resolutionMap = {
  "480p": { width: 854, height: 480 },
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
};

export function useCaptureRecording(options: UseCaptureRecordingOptions = {}) {
  const { onRecordingComplete, onError } = options;

  const cameraRef = useRef<CameraView | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use the new expo-audio hook
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const {
    mode,
    status,
    quality,
    setStatus,
    updateDuration,
    setError,
    setRecordingUri,
    startRecording: storeStartRecording,
    stopRecording: storeStopRecording,
  } = useCaptureStore();

  // Check if we have required permissions
  const hasPermissions = useCallback(
    (captureMode: CaptureMode): boolean => {
      if (captureMode === "audio") {
        return micPermission?.granted ?? false;
      }
      if (captureMode === "video") {
        return cameraPermission?.granted ?? false;
      }
      // av mode requires both
      return (cameraPermission?.granted ?? false) && (micPermission?.granted ?? false);
    },
    [cameraPermission, micPermission]
  );

  // Request permissions based on mode
  const requestPermissions = useCallback(
    async (captureMode: CaptureMode): Promise<boolean> => {
      try {
        if (captureMode === "audio") {
          const result = await requestMicPermission();
          return result.granted;
        }
        if (captureMode === "video") {
          const result = await requestCameraPermission();
          return result.granted;
        }
        // av mode
        const [camResult, micResult] = await Promise.all([
          requestCameraPermission(),
          requestMicPermission(),
        ]);
        return camResult.granted && micResult.granted;
      } catch (err) {
        setError("Failed to request permissions");
        return false;
      }
    },
    [requestCameraPermission, requestMicPermission, setError]
  );

  // Start duration counter
  const startDurationCounter = useCallback(() => {
    let seconds = 0;
    durationIntervalRef.current = setInterval(() => {
      seconds += 1;
      updateDuration(seconds);
    }, 1000);
  }, [updateDuration]);

  // Stop duration counter
  const stopDurationCounter = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Start audio-only recording
  const startAudioRecording = useCallback(async () => {
    try {
      // Request audio recording permissions
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setError("Audio recording permission not granted");
        return;
      }

      // Start recording with the new expo-audio API
      audioRecorder.record();

      storeStartRecording();
      startDurationCounter();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start audio recording";
      setError(message);
      onError?.(message);
    }
  }, [audioRecorder, storeStartRecording, startDurationCounter, setError, onError]);

  // Stop audio recording
  const stopAudioRecording = useCallback(async () => {
    try {
      stopDurationCounter();
      storeStopRecording();

      // Stop recording and get the URI
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        setRecordingUri(uri);
        onRecordingComplete?.(uri);
      }

      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop audio recording";
      setError(message);
      onError?.(message);
    }
  }, [audioRecorder, stopDurationCounter, storeStopRecording, setRecordingUri, setStatus, setError, onRecordingComplete, onError]);

  // Start video recording
  const startVideoRecording = useCallback(async () => {
    if (!cameraRef.current) {
      setError("Camera not ready");
      return;
    }

    try {
      storeStartRecording();
      startDurationCounter();

      const videoPromise = cameraRef.current.recordAsync({
        maxDuration: 3600, // 1 hour max
      });

      // The promise resolves when recording stops
      const video = await videoPromise;

      if (video?.uri) {
        setRecordingUri(video.uri);
        onRecordingComplete?.(video.uri);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to record video";
      setError(message);
      onError?.(message);
    }
  }, [storeStartRecording, startDurationCounter, setRecordingUri, setError, onRecordingComplete, onError]);

  // Stop video recording
  const stopVideoRecording = useCallback(() => {
    stopDurationCounter();
    storeStopRecording();

    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }

    setStatus("idle");
  }, [stopDurationCounter, storeStopRecording, setStatus]);

  // Main start recording function
  const startRecording = useCallback(async () => {
    if (!hasPermissions(mode)) {
      const granted = await requestPermissions(mode);
      if (!granted) {
        setError("Permissions not granted");
        return;
      }
    }

    setStatus("preparing");

    if (mode === "audio") {
      await startAudioRecording();
    } else {
      await startVideoRecording();
    }
  }, [mode, hasPermissions, requestPermissions, setStatus, setError, startAudioRecording, startVideoRecording]);

  // Main stop recording function
  const stopRecording = useCallback(async () => {
    if (mode === "audio") {
      await stopAudioRecording();
    } else {
      stopVideoRecording();
    }
  }, [mode, stopAudioRecording, stopVideoRecording]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (status === "recording") {
      await stopRecording();
    } else if (status === "idle" || status === "error") {
      await startRecording();
    }
  }, [status, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDurationCounter();
      // The audioRecorder hook handles its own cleanup
    };
  }, [stopDurationCounter]);

  return {
    cameraRef,
    cameraPermission,
    micPermission,
    hasPermissions: hasPermissions(mode),
    requestPermissions: () => requestPermissions(mode),
    startRecording,
    stopRecording,
    toggleRecording,
    isRecording: status === "recording",
    isPreparing: status === "preparing",
    isStopping: status === "stopping",
  };
}

/**
 * Video Source Screen
 *
 * Allows mobile device to act as a video source for OBS.
 * Supports dual-mode: Camera feed and Screen share.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import * as Haptics from "expo-haptics";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useVideoSourceStore } from "../stores/videoSourceStore";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "VideoSource">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function VideoSourceScreen({ route, navigation }: Props) {
  const {
    connectionStatus,
    error,
    mode,
    cameraFacing,
    quality,
    flashEnabled,
    audioEnabled,
    stabilizationEnabled,
    isStreaming,
    streamDuration,
    currentFps,
    bytesTransferred,
    setCompanionHost,
    setMode,
    setCameraFacing,
    setQuality,
    toggleFlash,
    toggleAudio,
    toggleStabilization,
    startStreaming,
    stopStreaming,
    updateStats,
  } = useVideoSourceStore();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize with companion host
  useEffect(() => {
    if (route.params.baseUrl) {
      setCompanionHost(route.params.baseUrl);
    }
    return () => {
      stopStreaming();
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [route.params.baseUrl]);

  // Stream duration timer
  useEffect(() => {
    if (isStreaming) {
      streamIntervalRef.current = setInterval(() => {
        updateStats({ streamDuration: streamDuration + 1 });
      }, 1000);
    } else if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [isStreaming, streamDuration]);

  const handleStartStream = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await startStreaming();
    if (!success) {
      Alert.alert("Stream Failed", error || "Could not start streaming");
    }
  }, [startStreaming, error]);

  const handleStopStream = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await stopStreaming();
  }, [stopStreaming]);

  const handleFlipCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraFacing(cameraFacing === "front" ? "back" : "front");
  }, [cameraFacing, setCameraFacing]);

  const handleToggleFlash = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFlash();
  }, [toggleFlash]);

  const handleModeSwitch = useCallback((newMode: "camera" | "screen") => {
    if (isStreaming) {
      Alert.alert("Stop Stream First", "Please stop streaming before switching modes");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMode(newMode);
  }, [isStreaming, setMode]);

  const handleQualityChange = useCallback(() => {
    if (isStreaming) {
      Alert.alert("Stop Stream First", "Please stop streaming before changing quality");
      return;
    }
    const qualities: Array<"low" | "medium" | "high" | "max"> = ["low", "medium", "high", "max"];
    const currentIndex = qualities.indexOf(quality);
    const nextIndex = (currentIndex + 1) % qualities.length;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuality(qualities[nextIndex]);
  }, [isStreaming, quality, setQuality]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            To use your phone as a video source, we need access to your camera.
          </Text>
          <Pressable style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      {mode === "camera" && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
          flash={flashEnabled ? "on" : "off"}
          enableTorch={flashEnabled}
        >
          {/* Streaming Indicator */}
          {isStreaming && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>STREAMING</Text>
            </View>
          )}
        </CameraView>
      )}

      {/* Screen Share Mode Placeholder */}
      {mode === "screen" && (
        <View style={styles.screenSharePlaceholder}>
          <Text style={styles.screenShareIcon}>📺</Text>
          <Text style={styles.screenShareTitle}>Screen Share Mode</Text>
          <Text style={styles.screenShareText}>
            Share your screen to OBS via the desktop companion.
          </Text>
          {isStreaming && (
            <View style={styles.liveIndicatorCenter}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>SHARING</Text>
            </View>
          )}
        </View>
      )}

      {/* Top Controls */}
      <View style={styles.topControls}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>✕</Text>
        </Pressable>

        {/* Connection Status */}
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              connectionStatus === "streaming" && styles.statusDotLive,
              connectionStatus === "connecting" && styles.statusDotConnecting,
              connectionStatus === "error" && styles.statusDotError,
            ]}
          />
          <Text style={styles.statusText}>
            {connectionStatus === "streaming" ? "Live" : connectionStatus}
          </Text>
        </View>

        {/* Quality Badge */}
        <Pressable style={styles.qualityBadge} onPress={handleQualityChange}>
          <Text style={styles.qualityText}>{quality.toUpperCase()}</Text>
        </Pressable>
      </View>

      {/* Stats Bar (when streaming) */}
      {isStreaming && (
        <View style={styles.statsBar}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(streamDuration)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>FPS</Text>
            <Text style={styles.statValue}>{currentFps}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Data</Text>
            <Text style={styles.statValue}>{formatBytes(bytesTransferred)}</Text>
          </View>
        </View>
      )}

      {/* Mode Switcher */}
      <View style={styles.modeSwitcher}>
        <Pressable
          style={[styles.modeBtn, mode === "camera" && styles.modeBtnActive]}
          onPress={() => handleModeSwitch("camera")}
        >
          <Text style={[styles.modeBtnText, mode === "camera" && styles.modeBtnTextActive]}>
            📷 Camera
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === "screen" && styles.modeBtnActive]}
          onPress={() => handleModeSwitch("screen")}
        >
          <Text style={[styles.modeBtnText, mode === "screen" && styles.modeBtnTextActive]}>
            📺 Screen
          </Text>
        </Pressable>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Left Side Controls */}
        <View style={styles.sideControls}>
          {mode === "camera" && (
            <>
              <Pressable
                style={[styles.iconBtn, flashEnabled && styles.iconBtnActive]}
                onPress={handleToggleFlash}
              >
                <Text style={styles.iconBtnText}>{flashEnabled ? "⚡" : "💡"}</Text>
              </Pressable>
              <Pressable
                style={[styles.iconBtn, audioEnabled && styles.iconBtnActive]}
                onPress={toggleAudio}
              >
                <Text style={styles.iconBtnText}>{audioEnabled ? "🎤" : "🔇"}</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Main Control Button */}
        <Pressable
          style={[
            styles.mainBtn,
            isStreaming ? styles.mainBtnStop : styles.mainBtnStart,
            connectionStatus === "connecting" && styles.mainBtnDisabled,
          ]}
          onPress={isStreaming ? handleStopStream : handleStartStream}
          disabled={connectionStatus === "connecting"}
        >
          {connectionStatus === "connecting" ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <View style={[styles.mainBtnInner, isStreaming && styles.mainBtnInnerStop]} />
          )}
        </Pressable>

        {/* Right Side Controls */}
        <View style={styles.sideControls}>
          {mode === "camera" && (
            <Pressable style={styles.iconBtn} onPress={handleFlipCamera}>
              <Text style={styles.iconBtnText}>🔄</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.iconBtn, stabilizationEnabled && styles.iconBtnActive]}
            onPress={toggleStabilization}
          >
            <Text style={styles.iconBtnText}>📐</Text>
          </Pressable>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  screenSharePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg0,
  },
  screenShareIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  screenShareTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  screenShareText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  liveIndicatorCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    backgroundColor: "rgba(255,107,107,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topControls: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 18,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.muted,
  },
  statusDotLive: {
    backgroundColor: "#FF6B6B",
  },
  statusDotConnecting: {
    backgroundColor: "#FFAB00",
  },
  statusDotError: {
    backgroundColor: "#FF6B6B",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
  },
  qualityBadge: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.teal,
  },
  liveIndicator: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,107,107,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B6B",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: 1,
  },
  statsBar: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    paddingVertical: 10,
  },
  stat: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    fontFamily: "monospace",
  },
  modeSwitcher: {
    position: "absolute",
    bottom: 160,
    left: 40,
    right: 40,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 24,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: "rgba(0,212,199,0.2)",
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.muted,
  },
  modeBtnTextActive: {
    color: colors.teal,
  },
  bottomControls: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  sideControls: {
    width: 80,
    gap: 16,
    alignItems: "center",
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    backgroundColor: "rgba(0,212,199,0.3)",
  },
  iconBtnText: {
    fontSize: 20,
  },
  mainBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  mainBtnStart: {
    borderColor: colors.text,
    backgroundColor: "transparent",
  },
  mainBtnStop: {
    borderColor: "#FF6B6B",
    backgroundColor: "transparent",
  },
  mainBtnDisabled: {
    opacity: 0.5,
  },
  mainBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FF6B6B",
  },
  mainBtnInnerStop: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  errorBanner: {
    position: "absolute",
    bottom: 140,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255,107,107,0.9)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    backgroundColor: colors.bg0,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.bg0,
  },
});

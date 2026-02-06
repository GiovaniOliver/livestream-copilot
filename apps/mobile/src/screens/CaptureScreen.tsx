/**
 * Capture Screen
 *
 * Video/audio capture screen with camera preview and recording controls.
 * Supports video, audio-only, and A/V modes with quality settings.
 * Includes mobile recording upload to desktop companion with offline support.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, CameraType } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useCaptureStore, type CaptureMode } from "../stores/captureStore";
import { useCaptureRecording } from "../services/useCaptureRecording";
import {
  uploadRecording,
  saveRecordingLocally,
  queueForRetry,
  isNetworkAvailable,
  setupNetworkListener,
  type UploadProgress,
} from "../services/recordingUpload";
import Screen from "../components/Screen";
import Card from "../components/Card";
import { colors } from "../theme";
import { captureLogger } from "../services/logger";

type Props = NativeStackScreenProps<RootStackParamList, "Capture">;

export default function CaptureScreen({ route, navigation }: Props) {
  const { workflowId, baseUrl } = route.params;

  const [facing, setFacing] = useState<CameraType>("back");
  const [showSettings, setShowSettings] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const {
    mode,
    status,
    quality,
    duration,
    error,
    setMode,
    setQuality,
  } = useCaptureStore();

  const {
    cameraRef,
    hasPermissions,
    requestPermissions,
    startRecording,
    stopRecording,
    toggleRecording,
    isRecording,
    isPreparing,
  } = useCaptureRecording({
    onRecordingComplete: async (uri) => {
      captureLogger.info("Recording saved:", uri);
      await handleRecordingComplete(uri);
    },
    onError: (err) => {
      captureLogger.error("Recording error:", err);
      Alert.alert("Recording Error", err);
    },
  });

  // Set up network listener for automatic retry
  useEffect(() => {
    const unsubscribe = setupNetworkListener(
      baseUrl,
      undefined, // TODO: Add auth token when auth is implemented
      (result) => {
        if (result.succeeded > 0) {
          Alert.alert(
            "Upload Complete",
            `Successfully uploaded ${result.succeeded} recording(s). ${result.remaining} remaining in queue.`
          );
        }
      }
    );

    return unsubscribe;
  }, [baseUrl]);

  // Handle recording completion (upload or save locally)
  const handleRecordingComplete = async (videoUri: string) => {
    try {
      // Check network availability
      const networkAvailable = await isNetworkAvailable();

      if (networkAvailable && sessionId) {
        // Upload to companion
        setUploading(true);
        setUploadProgress(0);

        const result = await uploadRecording(
          videoUri,
          sessionId,
          baseUrl,
          undefined, // TODO: Add auth token when auth is implemented
          mode,
          (progress: UploadProgress) => {
            setUploadProgress(progress.percent);
          }
        );

        setUploading(false);

        if (result.success) {
          Alert.alert("Success", "Recording uploaded successfully");
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } else if (sessionId) {
        // No network - queue for retry
        await queueForRetry(videoUri, sessionId, mode);
        Alert.alert(
          "Offline",
          "Recording queued for upload when connection is restored"
        );
      } else {
        // No session ID - save locally
        await saveRecordingLocally(videoUri);
        Alert.alert("Saved", "Recording saved locally");
      }
    } catch (error) {
      captureLogger.error("Upload error:", error);
      setUploading(false);

      // Try to queue for retry
      try {
        if (sessionId) {
          await queueForRetry(videoUri, sessionId, mode);
          Alert.alert(
            "Upload Failed",
            "Recording queued for retry when connection is restored"
          );
        } else {
          await saveRecordingLocally(videoUri);
          Alert.alert(
            "Upload Failed",
            "Recording saved locally for manual upload"
          );
        }
      } catch (saveError) {
        Alert.alert("Error", "Failed to save recording");
      }
    }
  };

  // Request permissions on mount
  useEffect(() => {
    if (!hasPermissions) {
      requestPermissions();
    }
  }, [hasPermissions, requestPermissions]);

  // Pulsing animation when recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Toggle camera facing
  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle mode change
  const handleModeChange = (newMode: CaptureMode) => {
    if (!isRecording) {
      setMode(newMode);
    }
  };

  // Render permission request screen
  if (!hasPermissions) {
    return (
      <Screen>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionText}>
            {mode === "audio"
              ? "Microphone access is needed to record audio."
              : mode === "video"
              ? "Camera access is needed to record video."
              : "Camera and microphone access are needed to record."}
          </Text>
          <Pressable onPress={requestPermissions} style={styles.permissionBtn}>
            <Text style={styles.permissionBtnText}>Grant Access</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Preview (only for video/av modes) */}
      {mode !== "audio" ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode="video"
        >
          {/* Overlay UI */}
          <View style={styles.overlay}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>

              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <Animated.View
                    style={[
                      styles.recordingDot,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  />
                  <Text style={styles.recordingTime}>
                    {formatDuration(duration)}
                  </Text>
                </View>
              )}

              <Pressable onPress={toggleFacing} style={styles.flipBtn}>
                <Text style={styles.flipBtnText}>Flip</Text>
              </Pressable>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomBar}>
              {/* Mode Selector */}
              <View style={styles.modeSelector}>
                {(["audio", "video", "av"] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => handleModeChange(m)}
                    style={[
                      styles.modeBtn,
                      mode === m && styles.modeBtnActive,
                    ]}
                    disabled={!!isRecording}
                  >
                    <Text
                      style={[
                        styles.modeBtnText,
                        mode === m && styles.modeBtnTextActive,
                      ]}
                    >
                      {m.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Record Button */}
              <Pressable
                onPress={toggleRecording}
                style={styles.recordBtnContainer}
                disabled={!!isPreparing}
              >
                <View
                  style={[
                    styles.recordBtn,
                    isRecording && styles.recordBtnActive,
                  ]}
                >
                  {isRecording ? (
                    <View style={styles.stopIcon} />
                  ) : (
                    <View style={styles.recordIcon} />
                  )}
                </View>
              </Pressable>

              {/* Settings */}
              <Pressable
                onPress={() => setShowSettings(!showSettings)}
                style={styles.settingsBtn}
              >
                <Text style={styles.settingsBtnText}>Settings</Text>
              </Pressable>
            </View>
          </View>
        </CameraView>
      ) : (
        /* Audio-only mode UI */
        <View style={styles.audioMode}>
          <View style={styles.audioModeContent}>
            <Text style={styles.audioModeTitle}>Audio Recording</Text>

            {isRecording ? (
              <>
                <Animated.View
                  style={[
                    styles.audioWave,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <Text style={styles.audioDuration}>
                  {formatDuration(duration)}
                </Text>
              </>
            ) : (
              <Text style={styles.audioModeHint}>
                Tap the button below to start recording
              </Text>
            )}

            {/* Record Button */}
            <Pressable
              onPress={toggleRecording}
              style={styles.audioRecordBtnContainer}
              disabled={!!isPreparing}
            >
              <View
                style={[
                  styles.recordBtn,
                  isRecording && styles.recordBtnActive,
                ]}
              >
                {isRecording ? (
                  <View style={styles.stopIcon} />
                ) : (
                  <View style={styles.recordIcon} />
                )}
              </View>
            </Pressable>

            {/* Mode Selector */}
            <View style={[styles.modeSelector, { marginTop: 30 }]}>
              {(["audio", "video", "av"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => handleModeChange(m)}
                  style={[
                    styles.modeBtn,
                    mode === m && styles.modeBtnActive,
                  ]}
                  disabled={!!isRecording}
                >
                  <Text
                    style={[
                      styles.modeBtnText,
                      mode === m && styles.modeBtnTextActive,
                    ]}
                  >
                    {m.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Back button */}
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { position: "absolute", top: 60, left: 20 }]}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <Card>
            <Text style={styles.settingsTitle}>Quality Settings</Text>

            <Text style={styles.settingsLabel}>Resolution</Text>
            <View style={styles.settingsRow}>
              {(["480p", "720p", "1080p"] as const).map((res) => (
                <Pressable
                  key={res}
                  onPress={() => setQuality({ resolution: res })}
                  style={[
                    styles.settingsOption,
                    quality.resolution === res && styles.settingsOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.settingsOptionText,
                      quality.resolution === res && styles.settingsOptionTextActive,
                    ]}
                  >
                    {res}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.settingsLabel}>Frame Rate</Text>
            <View style={styles.settingsRow}>
              {([24, 30, 60] as const).map((fps) => (
                <Pressable
                  key={fps}
                  onPress={() => setQuality({ fps })}
                  style={[
                    styles.settingsOption,
                    quality.fps === fps && styles.settingsOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.settingsOptionText,
                      quality.fps === fps && styles.settingsOptionTextActive,
                    ]}
                  >
                    {fps}fps
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setShowSettings(false)}
              style={styles.closeSettingsBtn}
            >
              <Text style={styles.closeSettingsBtnText}>Close</Text>
            </Pressable>
          </Card>
        </View>
      )}

      {/* Upload Progress */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadContainer}>
            <Text style={styles.uploadText}>Uploading...</Text>
            <Text style={styles.uploadPercentText}>
              {Math.round(uploadProgress)}%
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${uploadProgress}%` },
                ]}
              />
            </View>
            <ActivityIndicator size="large" color={colors.teal} />
          </View>
        </View>
      )}

      {/* Error Display */}
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
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
  },
  backBtn: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backBtnText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4444",
  },
  recordingTime: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  flipBtn: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  flipBtnText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  bottomBar: {
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 50 : 30,
  },
  modeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  modeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  modeBtnActive: {
    backgroundColor: "rgba(0,212,199,0.2)",
    borderColor: colors.teal,
  },
  modeBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
    fontSize: 12,
  },
  modeBtnTextActive: {
    color: colors.teal,
  },
  recordBtnContainer: {
    marginBottom: 10,
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  recordBtnActive: {
    borderColor: "#FF4444",
  },
  recordIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF4444",
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: "#FF4444",
  },
  settingsBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingsBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    fontSize: 13,
  },
  audioMode: {
    flex: 1,
    backgroundColor: colors.bg0,
  },
  audioModeContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  audioModeTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 30,
  },
  audioModeHint: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 40,
  },
  audioWave: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,68,68,0.2)",
    borderWidth: 3,
    borderColor: "#FF4444",
    marginBottom: 20,
  },
  audioDuration: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 40,
  },
  audioRecordBtnContainer: {
    marginBottom: 20,
  },
  settingsPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    paddingTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 8,
    marginTop: 12,
  },
  settingsRow: {
    flexDirection: "row",
    gap: 8,
  },
  settingsOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  settingsOptionActive: {
    backgroundColor: "rgba(0,212,199,0.15)",
    borderColor: colors.teal,
  },
  settingsOptionText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  settingsOptionTextActive: {
    color: colors.teal,
  },
  closeSettingsBtn: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeSettingsBtnText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadContainer: {
    backgroundColor: colors.bg1,
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 250,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  uploadPercentText: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.teal,
    marginBottom: 16,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.teal,
    borderRadius: 4,
  },
  errorBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255,92,122,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  permissionBtn: {
    backgroundColor: "rgba(0,212,199,0.15)",
    borderWidth: 1,
    borderColor: colors.teal,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 14,
  },
  permissionBtnText: {
    color: colors.teal,
    fontWeight: "800",
    fontSize: 15,
  },
});

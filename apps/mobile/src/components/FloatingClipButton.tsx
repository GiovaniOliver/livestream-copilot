/**
 * Floating Clip Button Component
 *
 * Floating action button for clip marking:
 * - Tap: Mark a moment
 * - Long-press: Start/end clip range
 * - Haptic feedback on interactions
 * - Pulsing indicator when recording a clip
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { clipStart, clipEnd, markMoment } from "../services/companionApi";
import { colors } from "../theme";

interface Props {
  baseUrl: string;
  onMomentMarked?: () => void;
  onClipStarted?: () => void;
  onClipEnded?: () => void;
}

export default function FloatingClipButton({
  baseUrl,
  onMomentMarked,
  onClipStarted,
  onClipEnded,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Pulsing animation when recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
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

  // Hide hint after first interaction
  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, [showHint]);

  // Press in animation
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();

    // Start long press timer
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      handleLongPress();
    }, 500);
  }, [scaleAnim]);

  // Press out animation and action
  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // If not a long press, mark moment
    if (!isLongPress.current) {
      handleTap();
    }
  }, [scaleAnim]);

  // Tap action - mark moment
  const handleTap = useCallback(async () => {
    // Haptic feedback
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setShowHint(false);

    try {
      await markMoment(baseUrl);
      onMomentMarked?.();
    } catch (err) {
      console.warn("Failed to mark moment:", err);
    }
  }, [baseUrl, onMomentMarked]);

  // Long press action - start/end clip
  const handleLongPress = useCallback(async () => {
    // Strong haptic feedback for clip action
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setShowHint(false);

    try {
      if (isRecording) {
        await clipEnd(baseUrl);
        setIsRecording(false);
        onClipEnded?.();
      } else {
        await clipStart(baseUrl);
        setIsRecording(true);
        onClipStarted?.();
      }
    } catch (err) {
      console.warn("Failed to toggle clip:", err);
    }
  }, [baseUrl, isRecording, onClipStarted, onClipEnded]);

  return (
    <View style={styles.container}>
      {/* Hint tooltip */}
      {showHint && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Tap: moment | Hold: clip</Text>
        </View>
      )}

      {/* Recording indicator ring */}
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.3],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
      )}

      {/* Main button */}
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.button,
            isRecording && styles.buttonRecording,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={[styles.innerCircle, isRecording && styles.innerCircleRecording]}>
            {isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <View style={styles.markIcon} />
            )}
          </View>
        </Animated.View>
      </Pressable>

      {/* Status label */}
      <Text style={[styles.statusLabel, isRecording && styles.statusLabelRecording]}>
        {isRecording ? "Recording clip..." : "Mark"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 30,
    right: 20,
    alignItems: "center",
  },
  hint: {
    position: "absolute",
    bottom: 90,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  hintText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  pulseRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF6B6B",
    bottom: 24,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,212,199,0.2)",
    borderWidth: 3,
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonRecording: {
    backgroundColor: "rgba(255,107,107,0.2)",
    borderColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
  },
  innerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,212,199,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircleRecording: {
    backgroundColor: "rgba(255,107,107,0.35)",
  },
  markIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.teal,
  },
  stopIcon: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#FF6B6B",
  },
  statusLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: colors.teal,
  },
  statusLabelRecording: {
    color: "#FF6B6B",
  },
});

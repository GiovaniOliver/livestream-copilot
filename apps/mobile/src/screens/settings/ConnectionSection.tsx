/**
 * Connection Section
 *
 * Companion URL management, connection testing, and auto-reconnect toggle.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import Card from "../../components/Card";
import { useConnectionStore } from "../../stores/connectionStore";
import { createLogger } from "../../services/logger";
import { colors } from "../../theme";
import { sharedStyles } from "./settingsConstants";
import { SectionHeader, Separator } from "./SettingsPrimitives";

const settingsLogger = createLogger("settings");

export default function ConnectionSection() {
  const { baseUrl, status: connectionStatus, setBaseUrl } = useConnectionStore();

  const [companionUrlDraft, setCompanionUrlDraft] = useState(baseUrl);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<
    "success" | "failure" | null
  >(null);
  const [autoReconnect, setAutoReconnect] = useState(true);

  useEffect(() => {
    setCompanionUrlDraft(baseUrl);
  }, [baseUrl]);

  const handleSaveUrl = useCallback(async () => {
    const trimmedUrl = companionUrlDraft.trim();
    if (!trimmedUrl) {
      Alert.alert("Invalid URL", "Please enter a companion URL.");
      return;
    }

    setIsSavingUrl(true);
    try {
      await setBaseUrl(trimmedUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConnectionTestResult(null);
    } catch (error) {
      settingsLogger.error("Failed to save URL:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Invalid URL",
        "Please enter a valid URL (e.g., http://192.168.1.10:3123)."
      );
    } finally {
      setIsSavingUrl(false);
    }
  }, [companionUrlDraft, setBaseUrl]);

  const handleTestConnection = useCallback(async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/api/v1/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setConnectionTestResult("success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setConnectionTestResult("failure");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      settingsLogger.error("Connection test failed:", error);
      setConnectionTestResult("failure");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsTestingConnection(false);
    }
  }, [baseUrl]);

  const connectionStatusColor =
    connectionStatus === "connected"
      ? "#2EE59D"
      : connectionStatus === "error"
        ? "#FF6B6B"
        : colors.muted;

  const isDraftUnchanged = companionUrlDraft.trim() === baseUrl;

  return (
    <>
      <SectionHeader title="Connection" />
      <Card style={sharedStyles.sectionCard}>
        {/* Companion URL */}
        <View style={sharedStyles.settingBlock}>
          <Text style={sharedStyles.settingLabel}>Companion URL</Text>
          <Text style={sharedStyles.settingDescription}>
            Desktop companion app address
          </Text>
          <View style={localStyles.urlInputRow}>
            <TextInput
              value={companionUrlDraft}
              onChangeText={setCompanionUrlDraft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://localhost:3123"
              placeholderTextColor="rgba(182,195,214,0.5)"
              style={localStyles.urlInput}
            />
            <Pressable
              onPress={handleSaveUrl}
              disabled={isSavingUrl || isDraftUnchanged}
              style={[
                localStyles.saveUrlBtn,
                (isSavingUrl || isDraftUnchanged) && sharedStyles.btnDisabled,
              ]}
            >
              {isSavingUrl ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={localStyles.saveUrlBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>

        <Separator />

        {/* Test Connection */}
        <View style={sharedStyles.settingBlock}>
          <View style={localStyles.connectionStatusRow}>
            <View
              style={[localStyles.statusDot, { backgroundColor: connectionStatusColor }]}
            />
            <Text style={localStyles.connectionStatusText}>
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "connecting" || connectionStatus === "reconnecting"
                  ? "Connecting..."
                  : connectionStatus === "error"
                    ? "Connection error"
                    : "Disconnected"}
            </Text>
          </View>
          <Pressable
            onPress={handleTestConnection}
            disabled={isTestingConnection}
            style={[
              localStyles.testConnectionBtn,
              isTestingConnection && sharedStyles.btnDisabled,
            ]}
          >
            {isTestingConnection ? (
              <ActivityIndicator color={colors.teal} size="small" />
            ) : (
              <Text style={localStyles.testConnectionBtnText}>Test Connection</Text>
            )}
          </Pressable>
          {connectionTestResult === "success" && (
            <Text style={localStyles.testSuccess}>Connection successful</Text>
          )}
          {connectionTestResult === "failure" && (
            <Text style={localStyles.testFailure}>
              Connection failed - check URL and ensure companion is running
            </Text>
          )}
        </View>

        <Separator />

        {/* Auto-Reconnect */}
        <View style={sharedStyles.settingRow}>
          <View style={sharedStyles.settingRowInfo}>
            <Text style={sharedStyles.settingLabel}>Auto-Reconnect</Text>
            <Text style={sharedStyles.settingDescription}>
              Automatically reconnect on disconnect
            </Text>
          </View>
          <Switch
            value={autoReconnect}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAutoReconnect(value);
            }}
            trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(0,212,199,0.3)" }}
            thumbColor={autoReconnect ? colors.teal : colors.muted}
          />
        </View>
      </Card>
    </>
  );
}

const localStyles = StyleSheet.create({
  urlInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  saveUrlBtn: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  saveUrlBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.bg0,
  },
  connectionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionStatusText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  testConnectionBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,212,199,0.4)",
    backgroundColor: "rgba(0,212,199,0.08)",
  },
  testConnectionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.teal,
  },
  testSuccess: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2EE59D",
  },
  testFailure: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF6B6B",
  },
});

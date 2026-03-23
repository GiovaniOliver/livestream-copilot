/**
 * Account Section
 *
 * User profile display, session timeout selector, and sign-out button.
 */

import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import Card from "../../components/Card";
import { useAuthStore, type User } from "../../stores/authStore";
import { useConnectionStore } from "../../stores/connectionStore";
import { createLogger } from "../../services/logger";
import { colors } from "../../theme";
import { SESSION_TIMEOUT_OPTIONS, sharedStyles } from "./settingsConstants";
import { SectionHeader, Separator } from "./SettingsPrimitives";

const settingsLogger = createLogger("settings");

export default function AccountSection() {
  const { user, sessionTimeoutMinutes, setSessionTimeout, logout } = useAuthStore();
  const { baseUrl } = useConnectionStore();

  const handleLogout = useCallback(() => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await logout(baseUrl);
            } catch (error) {
              settingsLogger.error("Logout failed:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]
    );
  }, [baseUrl, logout]);

  const handleSessionTimeoutChange = useCallback(
    (minutes: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSessionTimeout(minutes);
    },
    [setSessionTimeout]
  );

  const avatarInitial =
    user?.name?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    "?";

  return (
    <>
      <SectionHeader title="Account" />
      <Card style={sharedStyles.sectionCard}>
        {/* User Info */}
        <View style={localStyles.userInfoRow}>
          <View style={localStyles.avatarPlaceholder}>
            <Text style={localStyles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={localStyles.userDetails}>
            {user?.name ? (
              <Text style={localStyles.userName}>{user.name}</Text>
            ) : null}
            <Text style={localStyles.userEmail}>
              {user?.email ?? "No email"}
            </Text>
          </View>
        </View>

        <Separator />

        {/* Session Timeout */}
        <View style={sharedStyles.settingBlock}>
          <Text style={sharedStyles.settingLabel}>Session Timeout</Text>
          <Text style={sharedStyles.settingDescription}>
            Auto-logout after inactivity
          </Text>
          <View style={sharedStyles.chipRow}>
            {SESSION_TIMEOUT_OPTIONS.map((option) => (
              <Pressable
                key={option.minutes}
                onPress={() => handleSessionTimeoutChange(option.minutes)}
                style={[
                  sharedStyles.chip,
                  sessionTimeoutMinutes === option.minutes && sharedStyles.chipActive,
                ]}
              >
                <Text
                  style={[
                    sharedStyles.chipText,
                    sessionTimeoutMinutes === option.minutes && sharedStyles.chipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Separator />

        {/* Logout */}
        <Pressable onPress={handleLogout} style={localStyles.logoutBtn}>
          <Text style={localStyles.logoutBtnText}>Sign Out</Text>
        </Pressable>
      </Card>
    </>
  );
}

const localStyles = StyleSheet.create({
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,212,199,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,212,199,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.teal,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
});

/**
 * Danger Zone Section
 *
 * Destructive actions: clear local data and delete account,
 * each with multi-step confirmation dialogs.
 */

import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import Card from "../../components/Card";
import { useAuthStore } from "../../stores/authStore";
import { useConnectionStore } from "../../stores/connectionStore";
import * as SecureStore from "../../services/secureStorage";
import { createLogger } from "../../services/logger";
import { colors } from "../../theme";
import { sharedStyles } from "./settingsConstants";
import { SectionHeader, Separator } from "./SettingsPrimitives";

const settingsLogger = createLogger("settings");

export default function DangerZoneSection() {
  const { logout } = useAuthStore();
  const { baseUrl } = useConnectionStore();

  const [isClearingData, setIsClearingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleClearLocalData = useCallback(() => {
    Alert.alert(
      "Clear Local Data",
      "This will remove all cached data, saved preferences, and offline content. Your account and authentication will not be affected. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            setIsClearingData(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await SecureStore.clearSecureStorage();
              await logout(baseUrl);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              settingsLogger.error("Clear data failed:", error);
              Alert.alert("Error", "Failed to clear local data. Please try again.");
            } finally {
              setIsClearingData(false);
            }
          },
        },
      ]
    );
  }, [baseUrl, logout]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "All your data will be permanently removed. This cannot be reversed.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete My Account",
                  style: "destructive",
                  onPress: async () => {
                    setIsDeletingAccount(true);
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      const authHeaders = useAuthStore.getState().getAuthHeaders();
                      await fetch(`${baseUrl}/api/v1/auth/account`, {
                        method: "DELETE",
                        headers: {
                          "Content-Type": "application/json",
                          ...authHeaders,
                        },
                      });
                      await SecureStore.clearSecureStorage();
                      await logout(baseUrl);
                    } catch (error) {
                      settingsLogger.error("Account deletion failed:", error);
                      Alert.alert(
                        "Error",
                        "Failed to delete account. Please contact support."
                      );
                    } finally {
                      setIsDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [baseUrl, logout]);

  return (
    <>
      <SectionHeader title="Danger Zone" />
      <Card style={localStyles.dangerCard}>
        {/* Clear Local Data */}
        <Pressable
          onPress={handleClearLocalData}
          disabled={isClearingData}
          style={[localStyles.dangerBtn, isClearingData && sharedStyles.btnDisabled]}
        >
          {isClearingData ? (
            <ActivityIndicator color="#FF6B6B" size="small" />
          ) : (
            <>
              <Text style={localStyles.dangerBtnText}>Clear Local Data</Text>
              <Text style={localStyles.dangerBtnSubtext}>
                Remove cached data, preferences, and offline content
              </Text>
            </>
          )}
        </Pressable>

        <Separator />

        {/* Delete Account */}
        <Pressable
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
          style={[localStyles.dangerBtn, isDeletingAccount && sharedStyles.btnDisabled]}
        >
          {isDeletingAccount ? (
            <ActivityIndicator color="#FF6B6B" size="small" />
          ) : (
            <>
              <Text style={localStyles.dangerBtnTextDestructive}>
                Delete Account
              </Text>
              <Text style={localStyles.dangerBtnSubtext}>
                Permanently delete your account and all data
              </Text>
            </>
          )}
        </Pressable>
      </Card>
    </>
  );
}

const localStyles = StyleSheet.create({
  dangerCard: {
    marginBottom: 4,
    borderColor: "rgba(255,107,107,0.25)",
  },
  dangerBtn: {
    paddingVertical: 4,
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF6B6B",
  },
  dangerBtnTextDestructive: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF4444",
  },
  dangerBtnSubtext: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});

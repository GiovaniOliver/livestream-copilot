/**
 * Security Section
 *
 * Biometric authentication toggle and change password action.
 */

import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Switch, Alert, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import Card from "../../components/Card";
import { useAuthStore } from "../../stores/authStore";
import { useConnectionStore } from "../../stores/connectionStore";
import * as BiometricAuth from "../../services/biometricAuth";
import { createLogger } from "../../services/logger";
import { colors } from "../../theme";
import { sharedStyles } from "./settingsConstants";
import { SectionHeader, Separator } from "./SettingsPrimitives";

const settingsLogger = createLogger("settings");

export default function SecuritySection() {
  const {
    user,
    biometricEnabled,
    biometricAvailable,
    enableBiometric,
    disableBiometric,
  } = useAuthStore();
  const { baseUrl } = useConnectionStore();

  const [biometricLabel, setBiometricLabel] = useState("Biometric Authentication");
  const [isTogglingBiometric, setIsTogglingBiometric] = useState(false);

  useEffect(() => {
    async function loadLabel() {
      try {
        const capabilities = await BiometricAuth.checkBiometricCapabilities();
        const name = BiometricAuth.getBiometricTypeName(capabilities.supportedTypes);
        setBiometricLabel(name);
      } catch {
        setBiometricLabel("Biometric Authentication");
      }
    }
    loadLabel();
  }, []);

  const handleToggleBiometric = useCallback(
    async (enabled: boolean) => {
      setIsTogglingBiometric(true);
      try {
        if (enabled) {
          const success = await enableBiometric();
          if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Failed", "Could not enable biometric authentication. Please try again.");
          }
        } else {
          await disableBiometric();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        settingsLogger.error("Biometric toggle failed:", error);
        Alert.alert("Error", "Failed to update biometric settings.");
      } finally {
        setIsTogglingBiometric(false);
      }
    },
    [enableBiometric, disableBiometric]
  );

  const handleChangePassword = useCallback(() => {
    if (!user?.email) {
      Alert.alert("Error", "No account email found.");
      return;
    }

    Alert.alert(
      "Change Password",
      `A password reset link will be sent to ${user.email}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Link",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email }),
              });
              Alert.alert(
                "Check Your Email",
                "If an account exists with this email, you will receive a password reset link."
              );
            } catch (error) {
              settingsLogger.error("Change password request failed:", error);
              Alert.alert("Error", "Failed to send reset email. Please try again.");
            }
          },
        },
      ]
    );
  }, [user, baseUrl]);

  return (
    <>
      <SectionHeader title="Security" />
      <Card style={sharedStyles.sectionCard}>
        {/* Biometric Toggle */}
        <View style={sharedStyles.settingRow}>
          <View style={sharedStyles.settingRowInfo}>
            <Text style={sharedStyles.settingLabel}>{biometricLabel}</Text>
            <Text style={sharedStyles.settingDescription}>
              {biometricAvailable
                ? "Use biometrics for quick sign-in"
                : "Not available on this device"}
            </Text>
          </View>
          {isTogglingBiometric ? (
            <ActivityIndicator color={colors.teal} size="small" />
          ) : (
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              disabled={!biometricAvailable || isTogglingBiometric}
              trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(0,212,199,0.3)" }}
              thumbColor={biometricEnabled ? colors.teal : colors.muted}
            />
          )}
        </View>

        <Separator />

        {/* Change Password */}
        <Pressable onPress={handleChangePassword} style={sharedStyles.actionRow}>
          <Text style={sharedStyles.actionRowText}>Change Password</Text>
          <Text style={sharedStyles.actionRowChevron}>{">"}</Text>
        </Pressable>
      </Card>
    </>
  );
}

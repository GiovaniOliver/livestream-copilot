/**
 * About Section
 *
 * App version display, platform info, and external links for
 * privacy policy, terms of service, and support.
 */

import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Linking, Platform } from "react-native";
import Card from "../../components/Card";
import { createLogger } from "../../services/logger";
import { colors } from "../../theme";
import { APP_VERSION, PRIVACY_URL, TERMS_URL, SUPPORT_URL, sharedStyles } from "./settingsConstants";
import { SectionHeader, Separator } from "./SettingsPrimitives";

const settingsLogger = createLogger("settings");

export default function AboutSection() {
  const handleOpenLink = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Unable to open this link.");
      }
    } catch (error) {
      settingsLogger.error("Failed to open URL:", error);
      Alert.alert("Error", "Failed to open link.");
    }
  }, []);

  const platformLabel =
    Platform.OS === "ios"
      ? "iOS"
      : Platform.OS === "android"
        ? "Android"
        : Platform.OS;

  return (
    <>
      <SectionHeader title="About" />
      <Card style={sharedStyles.sectionCard}>
        <View style={localStyles.aboutRow}>
          <Text style={localStyles.aboutLabel}>App Version</Text>
          <Text style={localStyles.aboutValue}>{APP_VERSION}</Text>
        </View>

        <Separator />

        <View style={localStyles.aboutRow}>
          <Text style={localStyles.aboutLabel}>Platform</Text>
          <Text style={localStyles.aboutValue}>{platformLabel}</Text>
        </View>

        <Separator />

        <Pressable
          onPress={() => handleOpenLink(PRIVACY_URL)}
          style={sharedStyles.actionRow}
        >
          <Text style={sharedStyles.actionRowText}>Privacy Policy</Text>
          <Text style={sharedStyles.actionRowChevron}>{">"}</Text>
        </Pressable>

        <Separator />

        <Pressable
          onPress={() => handleOpenLink(TERMS_URL)}
          style={sharedStyles.actionRow}
        >
          <Text style={sharedStyles.actionRowText}>Terms of Service</Text>
          <Text style={sharedStyles.actionRowChevron}>{">"}</Text>
        </Pressable>

        <Separator />

        <Pressable
          onPress={() => handleOpenLink(SUPPORT_URL)}
          style={sharedStyles.actionRow}
        >
          <Text style={sharedStyles.actionRowText}>Support</Text>
          <Text style={sharedStyles.actionRowChevron}>{">"}</Text>
        </Pressable>
      </Card>
    </>
  );
}

const localStyles = StyleSheet.create({
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  aboutLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
});

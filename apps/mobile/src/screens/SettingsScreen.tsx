/**
 * Settings Screen
 *
 * Comprehensive preferences and configuration screen composed
 * from focused section components:
 * - Account: User info, logout, session timeout
 * - Security: Biometric toggle, change password
 * - Connection: Companion URL, test connection, auto-reconnect
 * - Capture Defaults: Default capture mode, quality preset
 * - About: App version, privacy/terms/support links
 * - Danger Zone: Clear local data, delete account
 */

import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../../App";
import Screen from "../components/Screen";
import AccountSection from "./settings/AccountSection";
import SecuritySection from "./settings/SecuritySection";
import ConnectionSection from "./settings/ConnectionSection";
import CaptureDefaultsSection from "./settings/CaptureDefaultsSection";
import AboutSection from "./settings/AboutSection";
import DangerZoneSection from "./settings/DangerZoneSection";

// =============================================================================
// TYPES
// =============================================================================

type Props = NativeStackScreenProps<MainStackParamList, "Settings">;

// =============================================================================
// COMPONENT
// =============================================================================

export default function SettingsScreen(_props: Props) {
  return (
    <Screen>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AccountSection />
        <SecuritySection />
        <ConnectionSection />
        <CaptureDefaultsSection />
        <AboutSection />
        <DangerZoneSection />
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  bottomSpacer: {
    height: 40,
  },
});

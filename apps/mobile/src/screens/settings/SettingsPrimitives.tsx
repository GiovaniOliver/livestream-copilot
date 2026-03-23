/**
 * Settings Primitives
 *
 * Shared small UI components used across all settings sections.
 */

import React from "react";
import { View, Text } from "react-native";
import { sharedStyles } from "./settingsConstants";

export function SectionHeader({ title }: { title: string }) {
  return <Text style={sharedStyles.sectionTitle}>{title}</Text>;
}

export function Separator() {
  return <View style={sharedStyles.separator} />;
}

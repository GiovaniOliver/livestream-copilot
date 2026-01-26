import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "../theme";

export default function Screen({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={[colors.bg0, colors.bg1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1, padding: spacing.page },
});

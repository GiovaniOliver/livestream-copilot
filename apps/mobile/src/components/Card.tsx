import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, spacing } from "../theme";

export default function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.card,
  },
});

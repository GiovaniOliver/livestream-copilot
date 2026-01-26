/**
 * Filter Chips Component
 *
 * Horizontal scrollable filter chips for platform/category filtering.
 */

import React from "react";
import { ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  options: FilterOption[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function FilterChips({ options, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.chip, selected === null && styles.chipActive]}
      >
        <Text style={[styles.label, selected === null && styles.labelActive]}>
          All
        </Text>
      </Pressable>

      {options.map((opt) => (
        <Pressable
          key={opt.id}
          onPress={() => onSelect(opt.id === selected ? null : opt.id)}
          style={[styles.chip, selected === opt.id && styles.chipActive]}
        >
          <Text style={[styles.label, selected === opt.id && styles.labelActive]}>
            {opt.label}
            {opt.count !== undefined && (
              <Text style={styles.count}> ({opt.count})</Text>
            )}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  chipActive: {
    borderColor: "rgba(0,212,199,0.5)",
    backgroundColor: "rgba(0,212,199,0.12)",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  labelActive: {
    color: colors.text,
  },
  count: {
    fontSize: 11,
    fontWeight: "600",
  },
});

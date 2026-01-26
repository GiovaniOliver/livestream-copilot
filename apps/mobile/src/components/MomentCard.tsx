/**
 * Moment Card Component
 *
 * Displays a moment marker in timeline format.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface MomentData {
  id: string;
  label: string;
  t: number;
  notes?: string;
  confidence?: number;
}

interface Props {
  moment: MomentData;
  isLast?: boolean;
}

export default function MomentCard({ moment, isLast = false }: Props) {
  return (
    <View style={styles.container}>
      {/* Timeline indicator */}
      <View style={styles.timeline}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.time}>{formatTime(moment.t)}</Text>
          {moment.confidence && (
            <Text style={styles.confidence}>
              {Math.round(moment.confidence * 100)}%
            </Text>
          )}
        </View>
        <Text style={styles.label}>{moment.label}</Text>
        {moment.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {moment.notes}
          </Text>
        )}
      </View>
    </View>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 0,
  },
  timeline: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.teal,
    borderWidth: 2,
    borderColor: "rgba(0,212,199,0.3)",
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(0,212,199,0.2)",
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal,
    backgroundColor: "rgba(0,212,199,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confidence: {
    marginLeft: 8,
    fontSize: 11,
    color: colors.muted,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
  notes: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
});

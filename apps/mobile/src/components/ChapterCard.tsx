/**
 * Chapter Card Component
 *
 * Displays a podcast chapter with timestamp and reorder handle.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Card from "./Card";
import { colors } from "../theme";

interface ChapterData {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  summary?: string;
  position: number;
}

interface Props {
  chapter: ChapterData;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function ChapterCard({
  chapter,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {/* Reorder controls */}
        <View style={styles.reorderControls}>
          <Pressable
            onPress={onMoveUp}
            disabled={isFirst === true}
            style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
          >
            <Text style={[styles.reorderIcon, isFirst && styles.reorderIconDisabled]}>
              ▲
            </Text>
          </Pressable>
          <Text style={styles.position}>{chapter.position}</Text>
          <Pressable
            onPress={onMoveDown}
            disabled={isLast === true}
            style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
          >
            <Text style={[styles.reorderIcon, isLast && styles.reorderIconDisabled]}>
              ▼
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.timestamp}>{formatTime(chapter.startTime)}</Text>
            {chapter.endTime && (
              <>
                <Text style={styles.timestampSeparator}>→</Text>
                <Text style={styles.timestamp}>{formatTime(chapter.endTime)}</Text>
              </>
            )}
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {chapter.title}
          </Text>
          {chapter.summary && (
            <Text style={styles.summary} numberOfLines={2}>
              {chapter.summary}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
  },
  reorderControls: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reorderBtn: {
    padding: 6,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  reorderIcon: {
    fontSize: 12,
    color: colors.teal,
  },
  reorderIconDisabled: {
    color: colors.muted,
  },
  position: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.purple,
    marginVertical: 4,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal,
    backgroundColor: "rgba(0,212,199,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  timestampSeparator: {
    marginHorizontal: 6,
    color: colors.muted,
    fontSize: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 20,
  },
  summary: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
});

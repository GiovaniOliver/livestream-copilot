/**
 * Clip Card Component
 *
 * Displays a clip artifact with thumbnail placeholder and export actions.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet, Share } from "react-native";
import Card from "./Card";
import { colors } from "../theme";

interface ClipData {
  id: string;
  t0: number;
  t1: number;
  path?: string;
  thumbnail?: string;
}

interface Props {
  clip: ClipData;
  onExport?: (clip: ClipData) => void;
}

export default function ClipCard({ clip, onExport }: Props) {
  const duration = clip.t1 - clip.t0;

  const handleShare = async () => {
    if (clip.path) {
      try {
        await Share.share({
          message: `Clip from ${formatTime(clip.t0)} to ${formatTime(clip.t1)}`,
          url: clip.path,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const handleExport = () => {
    onExport?.(clip);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {/* Thumbnail placeholder */}
        <View style={styles.thumbnail}>
          <Text style={styles.thumbIcon}>CLIP</Text>
          <Text style={styles.thumbDuration}>{formatDuration(duration)}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.timeRange}>
            {formatTime(clip.t0)} - {formatTime(clip.t1)}
          </Text>
          <Text style={styles.duration}>{formatDuration(duration)} duration</Text>
          {clip.path && (
            <Text style={styles.path} numberOfLines={1}>
              {clip.path.split("/").pop()}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={handleExport} style={[styles.btn, styles.btnPrimary]}>
          <Text style={styles.btnText}>Save</Text>
        </Pressable>
        <Pressable onPress={handleShare} style={[styles.btn, styles.btnSecondary]}>
          <Text style={styles.btnText}>Share</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
  },
  thumbnail: {
    width: 80,
    height: 60,
    backgroundColor: "rgba(109,40,217,0.2)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(109,40,217,0.3)",
  },
  thumbIcon: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.purple,
  },
  thumbDuration: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  timeRange: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  duration: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  path: {
    marginTop: 4,
    fontSize: 11,
    color: "rgba(182,195,214,0.7)",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnPrimary: {
    backgroundColor: "rgba(46,229,157,0.12)",
    borderColor: "rgba(46,229,157,0.4)",
  },
  btnSecondary: {
    backgroundColor: "rgba(109,40,217,0.12)",
    borderColor: "rgba(109,40,217,0.4)",
  },
  btnText: {
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
    color: colors.text,
  },
});

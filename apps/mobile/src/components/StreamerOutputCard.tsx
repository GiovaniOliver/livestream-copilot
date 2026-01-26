/**
 * Streamer Output Card
 *
 * Enhanced output card for Live Streamer workflow with platform icons and share.
 */

import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import Card from "./Card";
import PlatformBadge, { detectPlatform, type Platform } from "./PlatformBadge";
import { colors } from "../theme";

interface OutputData {
  id: string;
  category: string;
  title?: string;
  text: string;
  meta?: Record<string, unknown>;
}

interface Props {
  output: OutputData;
  onCopy?: (id: string) => void;
}

export default function StreamerOutputCard({ output, onCopy }: Props) {
  const [copied, setCopied] = useState(false);
  const platform = detectPlatform(output.category, output.meta);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(output.text);
    setCopied(true);
    onCopy?.(output.id);
    setTimeout(() => setCopied(false), 2000);
  }, [output.text, output.id, onCopy]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: output.text,
        title: output.title || output.category,
      });
    } catch {
      // User cancelled or error
    }
  }, [output.text, output.title, output.category]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <PlatformBadge platform={platform} />
        <View style={styles.headerText}>
          <Text style={styles.category}>{formatCategory(output.category)}</Text>
          {output.title && <Text style={styles.title} numberOfLines={1}>{output.title}</Text>}
        </View>
        {typeof output.meta?.confidence === "number" && (
          <View style={styles.confidence}>
            <Text style={styles.confidenceText}>
              {Math.round(output.meta.confidence * 100)}%
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.body} numberOfLines={6}>{output.text}</Text>

      <View style={styles.charCount}>
        <Text style={styles.charCountText}>{output.text.length} chars</Text>
        {platform === "twitter" && output.text.length > 280 && (
          <Text style={styles.charWarning}>(exceeds X limit)</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={handleCopy} style={[styles.btn, styles.btnPrimary]}>
          <Text style={styles.btnText}>{copied ? "Copied!" : "Copy"}</Text>
        </Pressable>
        <Pressable onPress={handleShare} style={[styles.btn, styles.btnSecondary]}>
          <Text style={styles.btnText}>Share</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function formatCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  category: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.teal,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  confidence: {
    backgroundColor: "rgba(46,229,157,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mint,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  charCount: {
    flexDirection: "row",
    marginTop: 8,
    gap: 6,
  },
  charCountText: {
    fontSize: 11,
    color: colors.muted,
  },
  charWarning: {
    fontSize: 11,
    color: "#FF6B6B",
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
    backgroundColor: "rgba(0,212,199,0.12)",
    borderColor: "rgba(0,212,199,0.4)",
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

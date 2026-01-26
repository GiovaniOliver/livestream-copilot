/**
 * Promo Card Component
 *
 * Displays a social promo post variant with platform targeting.
 */

import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import Card from "./Card";
import PlatformBadge, { detectPlatform, type Platform } from "./PlatformBadge";
import { colors } from "../theme";

interface PromoData {
  id: string;
  text: string;
  category: string;
  platform?: string;
  hashtags?: string[];
  title?: string;
}

interface Props {
  promo: PromoData;
  onCopy?: (id: string) => void;
}

export default function PromoCard({ promo, onCopy }: Props) {
  const [copied, setCopied] = useState(false);
  const platform = detectPlatform(promo.category, { platform: promo.platform });

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(promo.text);
    setCopied(true);
    onCopy?.(promo.id);
    setTimeout(() => setCopied(false), 2000);
  }, [promo, onCopy]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: promo.text,
        title: promo.title || "Podcast Promo",
      });
    } catch {
      // User cancelled
    }
  }, [promo]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <PlatformBadge platform={platform} />
        <View style={styles.headerText}>
          <Text style={styles.category}>{formatCategory(promo.category)}</Text>
          {promo.title && (
            <Text style={styles.title} numberOfLines={1}>
              {promo.title}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.promoText}>{promo.text}</Text>

      {promo.hashtags && promo.hashtags.length > 0 && (
        <View style={styles.hashtags}>
          {promo.hashtags.map((tag) => (
            <Text key={tag} style={styles.hashtag}>
              #{tag}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.charCount}>
        <Text style={styles.charCountText}>{promo.text.length} chars</Text>
        {platform === "twitter" && promo.text.length > 280 && (
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
    color: colors.mint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  promoText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  hashtags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  hashtag: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.teal,
    backgroundColor: "rgba(0,212,199,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
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

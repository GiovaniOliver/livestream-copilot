/**
 * Platform Badge Component
 *
 * Displays a platform-specific badge with icon representation.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

export type Platform = "twitter" | "youtube" | "tiktok" | "instagram" | "linkedin" | "facebook" | "general";

interface PlatformConfig {
  label: string;
  color: string;
  icon: string;
}

const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  twitter: { label: "X/Twitter", color: "#1DA1F2", icon: "X" },
  youtube: { label: "YouTube", color: "#FF0000", icon: "YT" },
  tiktok: { label: "TikTok", color: "#00F2EA", icon: "TT" },
  instagram: { label: "Instagram", color: "#E4405F", icon: "IG" },
  linkedin: { label: "LinkedIn", color: "#0A66C2", icon: "in" },
  facebook: { label: "Facebook", color: "#1877F2", icon: "fb" },
  general: { label: "General", color: colors.muted, icon: "*" },
};

interface Props {
  platform: Platform;
  size?: "small" | "medium";
}

export default function PlatformBadge({ platform, size = "medium" }: Props) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.general;
  const isSmall = size === "small";

  return (
    <View style={[styles.badge, { backgroundColor: config.color + "20" }, isSmall && styles.badgeSmall]}>
      <Text style={[styles.icon, { color: config.color }, isSmall && styles.iconSmall]}>
        {config.icon}
      </Text>
    </View>
  );
}

/**
 * Detect platform from output category or metadata.
 */
export function detectPlatform(category: string, meta?: Record<string, unknown>): Platform {
  const cat = category.toLowerCase();
  const metaPlatform = (meta?.platform as string)?.toLowerCase();

  if (metaPlatform) {
    if (metaPlatform.includes("twitter") || metaPlatform === "x") return "twitter";
    if (metaPlatform.includes("youtube")) return "youtube";
    if (metaPlatform.includes("tiktok")) return "tiktok";
    if (metaPlatform.includes("instagram")) return "instagram";
    if (metaPlatform.includes("linkedin")) return "linkedin";
    if (metaPlatform.includes("facebook")) return "facebook";
  }

  if (cat.includes("twitter") || cat.includes("tweet") || cat === "x_post") return "twitter";
  if (cat.includes("youtube") || cat.includes("yt")) return "youtube";
  if (cat.includes("tiktok") || cat.includes("tt")) return "tiktok";
  if (cat.includes("instagram") || cat.includes("ig") || cat.includes("reel")) return "instagram";
  if (cat.includes("linkedin") || cat.includes("li")) return "linkedin";
  if (cat.includes("facebook") || cat.includes("fb")) return "facebook";

  return "general";
}

const styles = StyleSheet.create({
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSmall: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  icon: {
    fontSize: 14,
    fontWeight: "900",
  },
  iconSmall: {
    fontSize: 11,
  },
});

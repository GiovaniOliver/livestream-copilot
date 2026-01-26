/**
 * Streamer Dashboard Screen
 *
 * Live Streamer workflow mobile dashboard with Posts, Clips, and Moments tabs.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { getWorkflow } from "../workflows/workflows";
import { useEventStream } from "../services/useEventStream";
import Screen from "../components/Screen";
import StreamerOutputCard from "../components/StreamerOutputCard";
import ClipCard from "../components/ClipCard";
import MomentCard from "../components/MomentCard";
import FilterChips from "../components/FilterChips";
import FloatingClipButton from "../components/FloatingClipButton";
import { detectPlatform, type Platform } from "../components/PlatformBadge";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "StreamerDashboard">;

type Tab = "posts" | "clips" | "moments";

const PLATFORM_FILTERS = [
  { id: "twitter", label: "X/Twitter" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
];

export default function StreamerDashboard({ route, navigation }: Props) {
  const wf = useMemo(() => getWorkflow(route.params.workflowId), [route.params.workflowId]);
  const { events, outputs, clips, moments } = useEventStream(route.params.wsUrl);

  const [tab, setTab] = useState<Tab>("posts");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Transform outputs to card format
  const outputCards = useMemo(() => {
    return outputs
      .filter((ev) => ev.type === "OUTPUT_CREATED")
      .map((ev) => ({
        id: ev.id,
        category: (ev as any).payload?.category || "unknown",
        title: (ev as any).payload?.title,
        text: (ev as any).payload?.text || "",
        meta: (ev as any).payload?.meta,
      }));
  }, [outputs]);

  // Filter outputs by platform
  const filteredOutputs = useMemo(() => {
    if (!platformFilter) return outputCards;
    return outputCards.filter((output) => {
      const platform = detectPlatform(output.category, output.meta);
      return platform === platformFilter;
    });
  }, [outputCards, platformFilter]);

  // Get platform counts for filter chips
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    outputCards.forEach((output) => {
      const platform = detectPlatform(output.category, output.meta);
      counts[platform] = (counts[platform] || 0) + 1;
    });
    return counts;
  }, [outputCards]);

  const filterOptions = PLATFORM_FILTERS.map((f) => ({
    ...f,
    count: platformCounts[f.id] || 0,
  })).filter((f) => f.count > 0);

  // Transform clips to card format
  const clipCards = useMemo(() => {
    return clips
      .filter((ev) => ev.type === "ARTIFACT_CLIP_CREATED")
      .map((ev) => ({
        id: ev.id,
        t0: (ev as any).payload?.t0 || 0,
        t1: (ev as any).payload?.t1 || 0,
        path: (ev as any).payload?.path,
      }));
  }, [clips]);

  // Transform moments to card format
  const momentCards = useMemo(() => {
    return moments
      .filter((ev) => ev.type === "MOMENT_MARKER")
      .map((ev) => ({
        id: ev.id,
        label: (ev as any).payload?.label || "Moment",
        t: (ev as any).payload?.t || 0,
        notes: (ev as any).payload?.notes,
        confidence: (ev as any).payload?.confidence,
      }))
      .sort((a, b) => a.t - b.t);
  }, [moments]);

  // Pull-to-refresh (triggers re-render)
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{wf.title}</Text>
            <Text style={styles.subtitle}>Session: {route.params.sessionId}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Capture", { workflowId: route.params.workflowId, baseUrl: route.params.baseUrl })}
            style={styles.cameraBtn}
          >
            <Text style={styles.cameraBtnText}>Record</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["posts", "clips", "moments"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.toUpperCase()}
            </Text>
            <Text style={[styles.tabCount, tab === t && styles.tabCountActive]}>
              {t === "posts" ? filteredOutputs.length : t === "clips" ? clipCards.length : momentCards.length}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Platform Filters (Posts tab only) */}
      {tab === "posts" && filterOptions.length > 0 && (
        <FilterChips
          options={filterOptions}
          selected={platformFilter}
          onSelect={setPlatformFilter}
        />
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.teal}
          />
        }
      >
        {/* Posts Tab */}
        {tab === "posts" && (
          <>
            {filteredOutputs.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {platformFilter ? "No posts for this platform yet" : "No posts generated yet"}
                </Text>
                <Text style={styles.emptySubtext}>
                  AI-generated social posts will appear here as the stream progresses
                </Text>
              </View>
            ) : (
              filteredOutputs.map((output) => (
                <StreamerOutputCard key={output.id} output={output} />
              ))
            )}
          </>
        )}

        {/* Clips Tab */}
        {tab === "clips" && (
          <>
            {clipCards.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No clips captured yet</Text>
                <Text style={styles.emptySubtext}>
                  Use the Clip Start/End buttons to capture moments
                </Text>
              </View>
            ) : (
              clipCards.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))
            )}
          </>
        )}

        {/* Moments Tab */}
        {tab === "moments" && (
          <>
            {momentCards.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No moments detected yet</Text>
                <Text style={styles.emptySubtext}>
                  Key moments will be automatically detected during the stream
                </Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {momentCards.map((moment, idx) => (
                  <MomentCard
                    key={moment.id}
                    moment={moment}
                    isLast={idx === momentCards.length - 1}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* Stats footer */}
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            {events.length} events | {outputs.length} outputs | {clips.length} clips
          </Text>
        </View>
      </ScrollView>

      {/* Floating Clip Button */}
      <FloatingClipButton baseUrl={route.params.baseUrl} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cameraBtn: {
    backgroundColor: "rgba(109,40,217,0.15)",
    borderWidth: 1,
    borderColor: "rgba(109,40,217,0.4)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cameraBtnText: {
    color: colors.purple,
    fontWeight: "800",
    fontSize: 13,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tabActive: {
    borderColor: "rgba(0,212,199,0.5)",
    backgroundColor: "rgba(0,212,199,0.1)",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.text,
  },
  tabCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabCountActive: {
    backgroundColor: "rgba(0,212,199,0.2)",
    color: colors.teal,
  },
  content: {
    flex: 1,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  timeline: {
    paddingLeft: 4,
  },
  stats: {
    paddingVertical: 20,
    alignItems: "center",
  },
  statsText: {
    fontSize: 12,
    color: "rgba(182,195,214,0.6)",
  },
});

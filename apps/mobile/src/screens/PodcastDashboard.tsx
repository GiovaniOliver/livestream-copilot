/**
 * Podcast Dashboard Screen
 *
 * Podcast workflow mobile dashboard with Chapters, Quotes, and Promo tabs.
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
import ChapterCard from "../components/ChapterCard";
import QuoteCard from "../components/QuoteCard";
import PromoCard from "../components/PromoCard";
import FloatingClipButton from "../components/FloatingClipButton";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "PodcastDashboard">;

type Tab = "chapters" | "quotes" | "promo";

export default function PodcastDashboard({ route, navigation }: Props) {
  const wf = useMemo(() => getWorkflow(route.params.workflowId), [route.params.workflowId]);
  const { events, outputs, clips, moments } = useEventStream(route.params.wsUrl);

  const [tab, setTab] = useState<Tab>("chapters");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chapterOrder, setChapterOrder] = useState<string[]>([]);

  // Extract chapters from outputs
  const chapters = useMemo(() => {
    const chapterOutputs = outputs
      .filter((ev) => ev.type === "OUTPUT_CREATED")
      .filter((ev) => {
        const cat = ((ev as any).payload?.category || "").toLowerCase();
        return cat.includes("chapter") || cat.includes("segment");
      })
      .map((ev, idx) => ({
        id: ev.id,
        title: (ev as any).payload?.title || (ev as any).payload?.text?.slice(0, 60) || "Chapter",
        startTime: (ev as any).payload?.meta?.startTime || (ev as any).payload?.meta?.t || idx * 300,
        endTime: (ev as any).payload?.meta?.endTime,
        summary: (ev as any).payload?.text,
        position: idx + 1,
      }));

    // Apply custom ordering if set
    if (chapterOrder.length > 0) {
      return chapterOrder
        .map((id) => chapterOutputs.find((c) => c.id === id))
        .filter(Boolean)
        .map((c, idx) => ({ ...c!, position: idx + 1 }));
    }

    return chapterOutputs;
  }, [outputs, chapterOrder]);

  // Extract quotes from outputs
  const quotes = useMemo(() => {
    return outputs
      .filter((ev) => ev.type === "OUTPUT_CREATED")
      .filter((ev) => {
        const cat = ((ev as any).payload?.category || "").toLowerCase();
        return cat.includes("quote") || cat.includes("highlight");
      })
      .map((ev) => ({
        id: ev.id,
        text: (ev as any).payload?.text || "",
        speaker: (ev as any).payload?.meta?.speaker,
        timestamp: (ev as any).payload?.meta?.timestamp || (ev as any).payload?.meta?.t || 0,
        significance: (ev as any).payload?.meta?.significance,
      }));
  }, [outputs]);

  // Extract promo posts from outputs
  const promos = useMemo(() => {
    return outputs
      .filter((ev) => ev.type === "OUTPUT_CREATED")
      .filter((ev) => {
        const cat = ((ev as any).payload?.category || "").toLowerCase();
        return cat.includes("promo") || cat.includes("social") || cat.includes("post") || cat.includes("tweet");
      })
      .map((ev) => ({
        id: ev.id,
        text: (ev as any).payload?.text || "",
        category: (ev as any).payload?.category || "promo",
        platform: (ev as any).payload?.meta?.platform,
        hashtags: (ev as any).payload?.meta?.hashtags,
        title: (ev as any).payload?.title,
      }));
  }, [outputs]);

  // Chapter reordering
  const moveChapter = useCallback((id: string, direction: "up" | "down") => {
    setChapterOrder((current) => {
      const order = current.length > 0 ? [...current] : chapters.map((c) => c.id);
      const idx = order.indexOf(id);
      if (idx === -1) return current;

      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= order.length) return current;

      [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
      return order;
    });
  }, [chapters]);

  // Pull-to-refresh
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
        {(["chapters", "quotes", "promo"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.toUpperCase()}
            </Text>
            <Text style={[styles.tabCount, tab === t && styles.tabCountActive]}>
              {t === "chapters" ? chapters.length : t === "quotes" ? quotes.length : promos.length}
            </Text>
          </Pressable>
        ))}
      </View>

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
        {/* Chapters Tab */}
        {tab === "chapters" && (
          <>
            {chapters.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No chapters detected yet</Text>
                <Text style={styles.emptySubtext}>
                  Chapters will be automatically generated as the episode progresses
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.reorderHint}>
                  Use arrows to reorder chapters
                </Text>
                {chapters.map((chapter, idx) => (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    isFirst={idx === 0}
                    isLast={idx === chapters.length - 1}
                    onMoveUp={() => moveChapter(chapter.id, "up")}
                    onMoveDown={() => moveChapter(chapter.id, "down")}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* Quotes Tab */}
        {tab === "quotes" && (
          <>
            {quotes.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No quotes captured yet</Text>
                <Text style={styles.emptySubtext}>
                  Notable quotes will appear here as they're detected
                </Text>
              </View>
            ) : (
              quotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))
            )}
          </>
        )}

        {/* Promo Tab */}
        {tab === "promo" && (
          <>
            {promos.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No promo posts generated yet</Text>
                <Text style={styles.emptySubtext}>
                  Social media posts will be generated based on your episode
                </Text>
              </View>
            ) : (
              promos.map((promo) => (
                <PromoCard key={promo.id} promo={promo} />
              ))
            )}
          </>
        )}

        {/* Stats footer */}
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            {events.length} events | {chapters.length} chapters | {quotes.length} quotes | {promos.length} promos
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
    marginBottom: 12,
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
    borderColor: "rgba(109,40,217,0.5)",
    backgroundColor: "rgba(109,40,217,0.12)",
  },
  tabText: {
    fontSize: 11,
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
    backgroundColor: "rgba(109,40,217,0.25)",
    color: colors.purple,
  },
  content: {
    flex: 1,
  },
  reorderHint: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 10,
    textAlign: "center",
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
  stats: {
    paddingVertical: 20,
    alignItems: "center",
  },
  statsText: {
    fontSize: 12,
    color: "rgba(182,195,214,0.6)",
  },
});

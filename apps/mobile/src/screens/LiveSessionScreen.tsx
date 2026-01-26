import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { getWorkflow } from "../workflows/workflows";
import { clipStart, clipEnd } from "../services/companionApi";
import { useEventStream } from "../services/useEventStream";
import OutputCard from "../components/OutputCard";
import Screen from "../components/Screen";
import Card from "../components/Card";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "LiveSession">;

export default function LiveSessionScreen({ route }: Props) {
  const wf = useMemo(() => getWorkflow(route.params.workflowId), [route.params.workflowId]);
  const { events, outputs, clips, moments } = useEventStream(route.params.wsUrl);
  const [tab, setTab] = useState<"outputs" | "clips" | "moments" | "trace">("outputs");

  const lastTrace = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const t = (events[i] as any)?.observability?.traceId;
      if (t) return String(t);
    }
    return undefined;
  }, [events]);

  async function onClipStart() {
    await clipStart(route.params.baseUrl);
  }

  async function onClipEnd() {
    await clipEnd(route.params.baseUrl);
  }

  return (
    <Screen>
      <View style={{ marginBottom: 10 }}>
        <Text style={styles.h1}>{wf.title}</Text>
        <Text style={styles.subtitle}>Session: {route.params.sessionId}</Text>
        <Text style={styles.trace}>Opik trace: {lastTrace || "(disabled / not configured)"}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
        <Pressable onPress={onClipStart} style={[styles.btn, styles.btnGhost]}>
          <Text style={styles.btnText}>Clip start</Text>
        </Pressable>
        <Pressable onPress={onClipEnd} style={[styles.btn, styles.btnGhost]}>
          <Text style={styles.btnText}>Clip end</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {(["outputs", "clips", "moments", "trace"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.pill, tab === t ? styles.pillActive : null]}
          >
            <Text style={[styles.pillText, tab === t ? { color: colors.text } : { color: colors.muted }]}>
              {t.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }}>
        {tab === "outputs" && outputs.map((ev) => <OutputCard key={ev.id} ev={ev} />)}

        {tab === "clips" &&
          clips.map((ev) => (
            <Card key={ev.id} style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: "900", color: colors.text }}>CLIP</Text>
              <Text style={{ marginTop: 6, color: colors.muted }}>t0: {ev.payload.t0.toFixed(2)}s</Text>
              <Text style={{ color: colors.muted }}>t1: {ev.payload.t1.toFixed(2)}s</Text>
              <Text style={{ marginTop: 6, color: "rgba(182,195,214,0.85)" }}>path: {ev.payload.path}</Text>
              {ev.observability?.traceId ? (
                <Text style={{ marginTop: 8, color: "rgba(182,195,214,0.8)", fontSize: 12 }}>
                  Opik trace: {ev.observability.traceId}
                </Text>
              ) : null}
            </Card>
          ))}

        {tab === "moments" &&
          moments.map((ev) => (
            <Card key={ev.id} style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: "900", color: colors.text }}>{ev.payload.label}</Text>
              <Text style={{ marginTop: 6, color: colors.muted }}>t: {ev.payload.t.toFixed(2)}s</Text>
              {ev.payload.notes ? <Text style={{ marginTop: 6, color: colors.text }}>{ev.payload.notes}</Text> : null}
              {ev.observability?.traceId ? (
                <Text style={{ marginTop: 8, color: "rgba(182,195,214,0.8)", fontSize: 12 }}>
                  Opik trace: {ev.observability.traceId}
                </Text>
              ) : null}
            </Card>
          ))}

        {tab === "trace" && (
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "900", color: colors.text }}>Observability</Text>
            <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 18 }}>
              This session will surface Opik trace IDs when the desktop companion is configured with Opik environment variables.
              Use the trace IDs to find the corresponding spans for clip capture and artifact creation.
            </Text>
            <Text style={{ marginTop: 10, color: "rgba(182,195,214,0.85)" }}>Last trace: {lastTrace || "(none)"}</Text>
            <Text style={{ marginTop: 10, color: "rgba(182,195,214,0.85)" }}>Buffered events: {events.length}</Text>
          </Card>
        )}

        {tab !== "trace" ? (
          <Text style={{ marginTop: 16, color: "rgba(182,195,214,0.75)" }}>Raw events buffered: {events.length}</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 18, fontWeight: "900", color: colors.text },
  subtitle: { marginTop: 4, color: colors.muted },
  trace: { marginTop: 4, color: "rgba(182,195,214,0.85)", fontSize: 12.5 },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  btnGhost: {
    borderColor: "rgba(0,212,199,0.35)",
    backgroundColor: "rgba(109,40,217,0.12)",
  },
  btnText: { textAlign: "center", fontWeight: "900", color: colors.text },
  pill: {
    borderWidth: 1,
    borderColor: colors.stroke,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pillActive: {
    borderColor: "rgba(0,212,199,0.55)",
    backgroundColor: "rgba(0,212,199,0.10)",
  },
  pillText: { fontWeight: "800", fontSize: 12 },
});

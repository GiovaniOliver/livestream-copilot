import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { getWorkflow } from "../workflows/workflows";
import { startSession, type CaptureMode } from "../services/companionApi";
import Screen from "../components/Screen";
import Card from "../components/Card";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "SessionSetup">;

export default function SessionSetupScreen({ route, navigation }: Props) {
  const wf = useMemo(() => getWorkflow(route.params.workflowId), [route.params.workflowId]);
  const [baseUrl, setBaseUrl] = useState("http://localhost:3123");
  const [captureMode, setCaptureMode] = useState<CaptureMode>(wf.defaultCaptureMode);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    setError(null);
    const res = await startSession(baseUrl, {
      workflow: wf.id,
      captureMode,
      title: title || undefined,
      participants: [],
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Route to workflow-specific dashboard
    const params = { sessionId: res.sessionId, workflowId: wf.id, baseUrl, wsUrl: res.ws };
    switch (wf.id) {
      case "streamer":
        navigation.replace("StreamerDashboard", params);
        break;
      case "podcast":
        navigation.replace("PodcastDashboard", params);
        break;
      default:
        navigation.replace("LiveSession", params);
    }
  }

  return (
    <Screen>
      <Text style={styles.h1}>{wf.title}</Text>
      <Text style={styles.subtitle}>{wf.description}</Text>

      <Card style={{ marginTop: 14 }}>
        <Text style={styles.label}>Companion URL</Text>
        <TextInput
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
          style={styles.input}
          placeholder="http://localhost:3123"
          placeholderTextColor="rgba(182,195,214,0.6)"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Capture mode</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {(["audio", "video", "av"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setCaptureMode(m)}
              style={[styles.pill, captureMode === m ? styles.pillActive : null]}
            >
              <Text style={[styles.pillText, captureMode === m ? { color: colors.text } : { color: colors.muted }]}>
                {m.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Session title (optional)</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder="e.g., Episode 12 live run"
          placeholderTextColor="rgba(182,195,214,0.6)"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={onStart} style={[styles.btn, styles.btnPrimary]}>
          <Text style={styles.btnText}>Start session</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("OBSControl", { baseUrl })}
          style={[styles.btn, styles.btnOBS]}
        >
          <Text style={styles.btnOBSText}>OBS Remote Control</Text>
        </Pressable>

        <Text style={styles.tip}>
          Tip: Use OBS Remote Control for quick launch, scene switching, and streaming controls.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "800", color: colors.text },
  subtitle: { marginTop: 6, color: colors.muted, lineHeight: 20 },
  label: { fontWeight: "700", color: colors.text, marginTop: 2 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.stroke,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pillActive: {
    borderColor: "rgba(0,212,199,0.55)",
    backgroundColor: "rgba(109,40,217,0.18)",
  },
  pillText: { fontWeight: "800", fontSize: 12 },
  btn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  btnPrimary: {
    borderColor: "rgba(0,212,199,0.55)",
    backgroundColor: "rgba(0,212,199,0.10)",
  },
  btnOBS: {
    marginTop: 10,
    borderColor: "rgba(109,40,217,0.55)",
    backgroundColor: "rgba(109,40,217,0.10)",
  },
  btnText: { textAlign: "center", fontWeight: "900", color: colors.text },
  btnOBSText: { textAlign: "center", fontWeight: "900", color: colors.purple },
  error: { color: "#ff5c7a", marginTop: 10, fontWeight: "700" },
  tip: { marginTop: 12, color: "rgba(182,195,214,0.85)", lineHeight: 18, fontSize: 12.5 },
});

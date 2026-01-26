import React from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { EventEnvelope } from "@livestream-copilot/shared";
import Card from "./Card";
import { colors } from "../theme";

export default function OutputCard({ ev }: { ev: EventEnvelope }) {
  if (ev.type !== "OUTPUT_CREATED") return null;
  const { category, text, title } = ev.payload;

  async function onCopy() {
    await Clipboard.setStringAsync(text);
  }

  return (
    <Card style={{ marginBottom: 12 }}>
      <Text style={styles.kicker}>{category}</Text>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.body}>{text}</Text>

      {ev.observability?.traceId ? (
        <Text style={styles.trace}>Opik trace: {ev.observability.traceId}</Text>
      ) : null}

      <Pressable onPress={onCopy} style={styles.btn}>
        <Text style={styles.btnText}>Copy</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  kicker: { fontWeight: "900", color: colors.text },
  title: { marginTop: 4, fontWeight: "800", color: colors.text },
  body: { marginTop: 8, color: colors.text, lineHeight: 20 },
  trace: { marginTop: 10, color: "rgba(182,195,214,0.85)", fontSize: 12 },
  btn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(0,212,199,0.45)",
    borderRadius: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(0,212,199,0.10)",
  },
  btnText: { textAlign: "center", fontWeight: "900", color: colors.text },
});

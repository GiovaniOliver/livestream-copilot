/**
 * Quote Card Component
 *
 * Displays a podcast quote with speaker and timestamp.
 */

import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import Card from "./Card";
import { colors } from "../theme";

interface QuoteData {
  id: string;
  text: string;
  speaker?: string;
  timestamp: number;
  significance?: string;
}

interface Props {
  quote: QuoteData;
  onCopy?: (id: string) => void;
}

export default function QuoteCard({ quote, onCopy }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const formatted = quote.speaker
      ? `"${quote.text}" — ${quote.speaker}`
      : `"${quote.text}"`;
    await Clipboard.setStringAsync(formatted);
    setCopied(true);
    onCopy?.(quote.id);
    setTimeout(() => setCopied(false), 2000);
  }, [quote, onCopy]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.timestamp}>{formatTime(quote.timestamp)}</Text>
        {quote.speaker && (
          <Text style={styles.speaker}>{quote.speaker}</Text>
        )}
      </View>

      <Text style={styles.quoteText}>"{quote.text}"</Text>

      {quote.significance && (
        <Text style={styles.significance}>{quote.significance}</Text>
      )}

      <Pressable onPress={handleCopy} style={styles.copyBtn}>
        <Text style={styles.copyBtnText}>
          {copied ? "Copied!" : "Copy Quote"}
        </Text>
      </Pressable>
    </Card>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
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
  speaker: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.purple,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: "500",
    fontStyle: "italic",
    color: colors.text,
    lineHeight: 22,
    borderLeftWidth: 3,
    borderLeftColor: colors.purple,
    paddingLeft: 12,
    marginLeft: 4,
  },
  significance: {
    marginTop: 10,
    fontSize: 12,
    color: colors.muted,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 8,
    borderRadius: 8,
  },
  copyBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(109,40,217,0.4)",
    backgroundColor: "rgba(109,40,217,0.12)",
  },
  copyBtnText: {
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
    color: colors.text,
  },
});

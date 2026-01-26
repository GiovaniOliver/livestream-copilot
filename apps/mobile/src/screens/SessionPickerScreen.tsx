import React, { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { WORKFLOWS } from "../workflows/workflows";
import Screen from "../components/Screen";
import Card from "../components/Card";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "SessionPicker">;

export default function SessionPickerScreen({ navigation }: Props) {
  const [companionUrl, setCompanionUrl] = useState("http://localhost:3123");

  return (
    <Screen>
      {/* Quick Actions Header */}
      <View style={styles.quickActions}>
        <Text style={styles.quickTitle}>Quick Actions</Text>
        <View style={styles.urlRow}>
          <TextInput
            value={companionUrl}
            onChangeText={setCompanionUrl}
            autoCapitalize="none"
            style={styles.urlInput}
            placeholder="http://localhost:3123"
            placeholderTextColor="rgba(182,195,214,0.6)"
          />
        </View>
        <View style={styles.quickBtnsRow}>
          <Pressable
            onPress={() => navigation.navigate("OBSControl", { baseUrl: companionUrl })}
            style={[styles.quickBtn, styles.obsBtnColor]}
          >
            <Text style={styles.quickBtnText}>🎬 OBS REMOTE</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("VideoSource", { baseUrl: companionUrl })}
            style={[styles.quickBtn, styles.videoBtnColor]}
          >
            <Text style={styles.quickBtnText}>📷 VIDEO SOURCE</Text>
          </Pressable>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or choose a workflow</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Workflow List */}
      <FlatList
        data={WORKFLOWS}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("SessionSetup", { workflowId: item.id })} style={{ marginBottom: 12 }}>
            <Card>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>{item.title}</Text>
              <Text style={{ marginTop: 4, color: colors.muted }}>{item.description}</Text>
              <Text style={{ marginTop: 4, color: colors.muted, opacity: 0.85 }}>
                Default: {item.defaultCaptureMode.toUpperCase()}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    marginBottom: 16,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  urlRow: {
    marginBottom: 10,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
  },
  quickBtnsRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  obsBtnColor: {
    backgroundColor: colors.purple,
  },
  videoBtnColor: {
    backgroundColor: colors.teal,
  },
  quickBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.stroke,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: colors.muted,
  },
});

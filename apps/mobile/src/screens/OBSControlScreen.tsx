/**
 * OBS Control Screen
 *
 * Remote control for OBS from mobile device.
 * Features: Scene switching, source toggling, stream/record controls, quick launch.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
  TextInput,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import Screen from "../components/Screen";
import { useOBSStore } from "../stores/obsStore";
import { useSessionStore } from "../stores/sessionStore";
import { createCompanionClient, type WorkflowType } from "../services/companionApi";
import { colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "OBSControl">;

type ControlTab = "scenes" | "sources" | "controls";

const WORKFLOWS: { id: WorkflowType; label: string }[] = [
  { id: "streamer", label: "Streamer" },
  { id: "podcast", label: "Podcast" },
  { id: "writers_room", label: "Writers Room" },
  { id: "brainstorm", label: "Brainstorm" },
  { id: "debate", label: "Debate" },
];

export default function OBSControlScreen({ route, navigation }: Props) {
  const {
    connectionStatus,
    error,
    streaming,
    streamTimecode,
    recording,
    recordTimecode,
    currentScene,
    scenes,
    sources,
    loadingSources,
    isRefreshing,
    isTogglingStream,
    isTogglingRecord,
    isSwitchingScene,
    setCompanionHost,
    refresh,
    switchScene,
    toggleSource,
    toggleStream,
    startStream,
    stopStream,
    toggleRecord,
    startRecord,
    stopRecord,
    saveReplay,
  } = useOBSStore();

  const { sessionId, workflow: activeWorkflow, status: sessionStatus } = useSessionStore();

  const [tab, setTab] = useState<ControlTab>("controls");
  const [quickLaunchTitle, setQuickLaunchTitle] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>("streamer");
  const [isQuickLaunching, setIsQuickLaunching] = useState(false);
  const [isQuickStopping, setIsQuickStopping] = useState(false);

  // Initialize with companion host from route
  useEffect(() => {
    if (route.params.baseUrl) {
      setCompanionHost(route.params.baseUrl);
      refresh();
    }
  }, [route.params.baseUrl]);

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Quick Launch handler
  const handleQuickLaunch = useCallback(async () => {
    if (!route.params.baseUrl) return;

    setIsQuickLaunching(true);
    try {
      const client = createCompanionClient(route.params.baseUrl);
      const res = await client.quickLaunch({
        workflow: selectedWorkflow,
        captureMode: "av",
        title: quickLaunchTitle || undefined,
        startStream: true,
        startRecord: false,
        startReplayBuffer: true,
      });

      if (res.ok && res.sessionId) {
        // Navigate to appropriate dashboard based on workflow
        const wsUrl = res.ws || `ws://${route.params.baseUrl.replace("http://", "").replace(":3123", "")}:3124`;

        if (selectedWorkflow === "streamer") {
          navigation.replace("StreamerDashboard", {
            sessionId: res.sessionId,
            workflowId: selectedWorkflow,
            baseUrl: route.params.baseUrl,
            wsUrl,
          });
        } else if (selectedWorkflow === "podcast") {
          navigation.replace("PodcastDashboard", {
            sessionId: res.sessionId,
            workflowId: selectedWorkflow,
            baseUrl: route.params.baseUrl,
            wsUrl,
          });
        } else {
          navigation.replace("LiveSession", {
            sessionId: res.sessionId,
            workflowId: selectedWorkflow,
            baseUrl: route.params.baseUrl,
            wsUrl,
          });
        }
      } else {
        Alert.alert("Launch Failed", res.error || "Failed to start quick launch");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to quick launch");
    } finally {
      setIsQuickLaunching(false);
      refresh();
    }
  }, [route.params.baseUrl, selectedWorkflow, quickLaunchTitle, navigation, refresh]);

  // Quick Stop handler
  const handleQuickStop = useCallback(async () => {
    if (!route.params.baseUrl) return;

    Alert.alert(
      "Stop Everything?",
      "This will stop streaming, recording, and end the current session.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop All",
          style: "destructive",
          onPress: async () => {
            setIsQuickStopping(true);
            try {
              const client = createCompanionClient(route.params.baseUrl);
              await client.quickStop();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to stop");
            } finally {
              setIsQuickStopping(false);
              refresh();
            }
          },
        },
      ]
    );
  }, [route.params.baseUrl, refresh]);

  // Save replay handler
  const handleSaveReplay = useCallback(async () => {
    const path = await saveReplay();
    if (path) {
      Alert.alert("Replay Saved", `Saved to: ${path}`);
    } else {
      Alert.alert("Error", "Failed to save replay buffer");
    }
  }, [saveReplay]);

  const isConnected = connectionStatus === "connected";
  const isSessionActive = sessionStatus === "active";

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>OBS Control</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isConnected ? styles.statusDotConnected : styles.statusDotDisconnected]} />
          <Text style={styles.statusText}>
            {connectionStatus === "connecting" ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
          </Text>
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Stream/Record Status Bar */}
      {isConnected && (
        <View style={styles.statusBar}>
          <View style={[styles.statusItem, streaming && styles.statusItemLive]}>
            <View style={[styles.statusIndicator, streaming && styles.statusIndicatorLive]} />
            <Text style={[styles.statusLabel, streaming && styles.statusLabelLive]}>
              {streaming ? "LIVE" : "Offline"}
            </Text>
            {streamTimecode && <Text style={styles.timecode}>{streamTimecode}</Text>}
          </View>
          <View style={[styles.statusItem, recording && styles.statusItemRec]}>
            <View style={[styles.statusIndicator, recording && styles.statusIndicatorRec]} />
            <Text style={[styles.statusLabel, recording && styles.statusLabelRec]}>
              {recording ? "REC" : "Not Recording"}
            </Text>
            {recordTimecode && <Text style={styles.timecode}>{recordTimecode}</Text>}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["controls", "scenes", "sources"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.toUpperCase()}
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
        {/* Controls Tab */}
        {tab === "controls" && (
          <View style={styles.controlsContainer}>
            {/* Quick Launch Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Launch</Text>
              <TextInput
                style={styles.input}
                placeholder="Session title (optional)"
                placeholderTextColor={colors.muted}
                value={quickLaunchTitle}
                onChangeText={setQuickLaunchTitle}
              />
              <View style={styles.workflowPicker}>
                {WORKFLOWS.map((wf) => (
                  <Pressable
                    key={wf.id}
                    onPress={() => setSelectedWorkflow(wf.id)}
                    style={[
                      styles.workflowChip,
                      selectedWorkflow === wf.id && styles.workflowChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.workflowChipText,
                        selectedWorkflow === wf.id && styles.workflowChipTextActive,
                      ]}
                    >
                      {wf.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={handleQuickLaunch}
                disabled={isQuickLaunching || !isConnected}
                style={[
                  styles.launchBtn,
                  (!isConnected || isQuickLaunching) && styles.btnDisabled,
                ]}
              >
                {isQuickLaunching ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Text style={styles.launchBtnText}>LAUNCH SESSION + STREAM</Text>
                )}
              </Pressable>
            </View>

            {/* Stream Controls */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stream Control</Text>
              <View style={styles.controlRow}>
                <Pressable
                  onPress={streaming ? stopStream : startStream}
                  disabled={isTogglingStream || !isConnected}
                  style={[
                    styles.controlBtn,
                    streaming ? styles.controlBtnStop : styles.controlBtnStart,
                    (isTogglingStream || !isConnected) && styles.btnDisabled,
                  ]}
                >
                  {isTogglingStream ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <Text style={styles.controlBtnText}>
                      {streaming ? "STOP STREAM" : "START STREAM"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Record Controls */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recording</Text>
              <View style={styles.controlRow}>
                <Pressable
                  onPress={recording ? stopRecord : startRecord}
                  disabled={isTogglingRecord || !isConnected}
                  style={[
                    styles.controlBtn,
                    recording ? styles.controlBtnStop : styles.controlBtnRec,
                    (isTogglingRecord || !isConnected) && styles.btnDisabled,
                  ]}
                >
                  {isTogglingRecord ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <Text style={styles.controlBtnText}>
                      {recording ? "STOP RECORDING" : "START RECORDING"}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleSaveReplay}
                  disabled={!isConnected}
                  style={[styles.replayBtn, !isConnected && styles.btnDisabled]}
                >
                  <Text style={styles.replayBtnText}>SAVE REPLAY</Text>
                </Pressable>
              </View>
            </View>

            {/* Quick Stop */}
            {(streaming || recording || isSessionActive) && (
              <View style={styles.section}>
                <Pressable
                  onPress={handleQuickStop}
                  disabled={isQuickStopping}
                  style={[styles.stopAllBtn, isQuickStopping && styles.btnDisabled]}
                >
                  {isQuickStopping ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <Text style={styles.stopAllBtnText}>STOP EVERYTHING</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Scenes Tab */}
        {tab === "scenes" && (
          <View style={styles.scenesContainer}>
            {scenes.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No scenes available</Text>
                <Text style={styles.emptySubtext}>
                  {isConnected ? "No scenes found in OBS" : "Connect to OBS to see scenes"}
                </Text>
              </View>
            ) : (
              scenes.map((scene) => (
                <Pressable
                  key={scene.name}
                  onPress={() => switchScene(scene.name)}
                  disabled={isSwitchingScene || currentScene === scene.name}
                  style={[
                    styles.sceneCard,
                    currentScene === scene.name && styles.sceneCardActive,
                    isSwitchingScene && styles.sceneCardDisabled,
                  ]}
                >
                  <View style={styles.sceneInfo}>
                    <Text style={[styles.sceneName, currentScene === scene.name && styles.sceneNameActive]}>
                      {scene.name}
                    </Text>
                    {currentScene === scene.name && (
                      <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  {isSwitchingScene && currentScene !== scene.name && (
                    <ActivityIndicator color={colors.muted} size="small" />
                  )}
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* Sources Tab */}
        {tab === "sources" && (
          <View style={styles.sourcesContainer}>
            {currentScene && (
              <Text style={styles.sourceSceneLabel}>Scene: {currentScene}</Text>
            )}
            {loadingSources ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.teal} size="large" />
              </View>
            ) : sources.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No sources in this scene</Text>
                <Text style={styles.emptySubtext}>
                  {isConnected ? "Add sources in OBS to control them here" : "Connect to OBS first"}
                </Text>
              </View>
            ) : (
              sources.map((source) => (
                <View key={source.id} style={styles.sourceCard}>
                  <View style={styles.sourceInfo}>
                    <Text style={styles.sourceName}>{source.name}</Text>
                    <Text style={styles.sourceType}>{source.type}</Text>
                  </View>
                  <Switch
                    value={source.enabled}
                    onValueChange={(val) => toggleSource(source.id, val)}
                    disabled={source.locked}
                    trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(0,212,199,0.3)" }}
                    thumbColor={source.enabled ? colors.teal : colors.muted}
                  />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusDotConnected: {
    backgroundColor: colors.mint,
  },
  statusDotDisconnected: {
    backgroundColor: "#FF6B6B",
  },
  statusText: {
    fontSize: 13,
    color: colors.muted,
  },
  errorBanner: {
    backgroundColor: "rgba(255,107,107,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.4)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 13,
  },
  statusBar: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statusItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.card,
  },
  statusItemLive: {
    borderColor: "rgba(255,107,107,0.5)",
    backgroundColor: "rgba(255,107,107,0.1)",
  },
  statusItemRec: {
    borderColor: "rgba(255,171,0,0.5)",
    backgroundColor: "rgba(255,171,0,0.1)",
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.muted,
  },
  statusIndicatorLive: {
    backgroundColor: "#FF6B6B",
  },
  statusIndicatorRec: {
    backgroundColor: "#FFAB00",
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  statusLabelLive: {
    color: "#FF6B6B",
  },
  statusLabelRec: {
    color: "#FFAB00",
  },
  timecode: {
    fontSize: 11,
    fontFamily: "monospace",
    color: colors.muted,
    marginLeft: "auto",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  content: {
    flex: 1,
  },
  controlsContainer: {
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  workflowPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  workflowChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.card,
  },
  workflowChipActive: {
    borderColor: colors.purple,
    backgroundColor: "rgba(109,40,217,0.15)",
  },
  workflowChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  workflowChipTextActive: {
    color: colors.purple,
  },
  launchBtn: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  launchBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  controlRow: {
    flexDirection: "row",
    gap: 12,
  },
  controlBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  controlBtnStart: {
    backgroundColor: colors.teal,
  },
  controlBtnStop: {
    backgroundColor: "#FF6B6B",
  },
  controlBtnRec: {
    backgroundColor: "#FFAB00",
  },
  controlBtnText: {
    color: colors.bg0,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  replayBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: "rgba(0,212,199,0.1)",
  },
  replayBtnText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  stopAllBtn: {
    backgroundColor: "rgba(255,107,107,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.5)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  stopAllBtnText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  scenesContainer: {
    gap: 10,
  },
  sceneCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.card,
  },
  sceneCardActive: {
    borderColor: "rgba(0,212,199,0.5)",
    backgroundColor: "rgba(0,212,199,0.1)",
  },
  sceneCardDisabled: {
    opacity: 0.7,
  },
  sceneInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sceneName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  sceneNameActive: {
    color: colors.teal,
  },
  liveBadge: {
    backgroundColor: "rgba(0,212,199,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.teal,
  },
  sourcesContainer: {
    gap: 10,
  },
  sourceSceneLabel: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
  },
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.card,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  sourceType: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  loading: {
    padding: 40,
    alignItems: "center",
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
});

/**
 * Capture Defaults Section
 *
 * Default capture mode picker and quality preset selector.
 */

import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import Card from "../../components/Card";
import { useCaptureStore, type CaptureMode } from "../../stores/captureStore";
import { colors } from "../../theme";
import {
  CAPTURE_MODE_OPTIONS,
  QUALITY_PRESET_OPTIONS,
  type QualityPresetOption,
  sharedStyles,
} from "./settingsConstants";
import { SectionHeader, Separator } from "./SettingsPrimitives";

export default function CaptureDefaultsSection() {
  const {
    mode: captureMode,
    quality: captureQuality,
    setMode: setCaptureMode,
    setQuality: setCaptureQuality,
  } = useCaptureStore();

  const handleCaptureModeChange = useCallback(
    (mode: CaptureMode) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCaptureMode(mode);
    },
    [setCaptureMode]
  );

  const handleQualityPresetChange = useCallback(
    (preset: QualityPresetOption) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCaptureQuality({
        resolution: preset.resolution,
        fps: preset.fps,
        audioBitrate: preset.audioBitrate,
      });
    },
    [setCaptureQuality]
  );

  const selectedQualityIndex = QUALITY_PRESET_OPTIONS.findIndex(
    (preset) =>
      preset.resolution === captureQuality.resolution &&
      preset.fps === captureQuality.fps &&
      preset.audioBitrate === captureQuality.audioBitrate
  );

  return (
    <>
      <SectionHeader title="Capture Defaults" />
      <Card style={sharedStyles.sectionCard}>
        {/* Default Capture Mode */}
        <View style={sharedStyles.settingBlock}>
          <Text style={sharedStyles.settingLabel}>Default Capture Mode</Text>
          <View style={sharedStyles.chipRow}>
            {CAPTURE_MODE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleCaptureModeChange(option.value)}
                style={[
                  sharedStyles.chip,
                  captureMode === option.value && sharedStyles.chipActive,
                ]}
              >
                <Text
                  style={[
                    sharedStyles.chipText,
                    captureMode === option.value && sharedStyles.chipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Separator />

        {/* Quality Preset */}
        <View style={sharedStyles.settingBlock}>
          <Text style={sharedStyles.settingLabel}>Quality Preset</Text>
          <View style={localStyles.qualityList}>
            {QUALITY_PRESET_OPTIONS.map((preset, index) => {
              const isSelected = selectedQualityIndex === index;
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => handleQualityPresetChange(preset)}
                  style={[
                    localStyles.qualityRow,
                    isSelected && localStyles.qualityRowActive,
                  ]}
                >
                  <View
                    style={[
                      localStyles.radioOuter,
                      isSelected && localStyles.radioOuterActive,
                    ]}
                  >
                    {isSelected && <View style={localStyles.radioInner} />}
                  </View>
                  <Text
                    style={[
                      localStyles.qualityRowText,
                      isSelected && localStyles.qualityRowTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>
    </>
  );
}

const localStyles = StyleSheet.create({
  qualityList: {
    gap: 6,
    marginTop: 4,
  },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  qualityRowActive: {
    borderColor: "rgba(0,212,199,0.3)",
    backgroundColor: "rgba(0,212,199,0.06)",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.stroke,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterActive: {
    borderColor: colors.teal,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal,
  },
  qualityRowText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  qualityRowTextActive: {
    color: colors.text,
  },
});

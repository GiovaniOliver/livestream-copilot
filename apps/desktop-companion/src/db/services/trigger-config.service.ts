/**
 * Trigger Config Service
 *
 * CRUD operations for TriggerConfig entities.
 * Manages audio/visual trigger configurations per workflow.
 */

import { prisma, Prisma } from "../index.js";

export interface AudioTrigger {
  id: string;
  phrase: string;
  enabled: boolean;
  caseSensitive: boolean;
}

export interface VisualTrigger {
  id: string;
  label: string;
  imageId: string;
  threshold: number;
  enabled: boolean;
}

export interface TriggerConfig {
  id: string;
  workflow: string;
  audioTriggers: AudioTrigger[];
  audioEnabled: boolean;
  visualTriggers: VisualTrigger[];
  visualEnabled: boolean;
  frameSampleRate: number;
  autoClipEnabled: boolean;
  autoClipDuration: number;
  triggerCooldown: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTriggerConfigInput {
  workflow: string;
  audioTriggers?: AudioTrigger[];
  audioEnabled?: boolean;
  visualTriggers?: VisualTrigger[];
  visualEnabled?: boolean;
  frameSampleRate?: number;
  autoClipEnabled?: boolean;
  autoClipDuration?: number;
  triggerCooldown?: number;
}

export interface UpdateTriggerConfigInput {
  audioTriggers?: AudioTrigger[];
  audioEnabled?: boolean;
  visualTriggers?: VisualTrigger[];
  visualEnabled?: boolean;
  frameSampleRate?: number;
  autoClipEnabled?: boolean;
  autoClipDuration?: number;
  triggerCooldown?: number;
}

/**
 * Parse raw Prisma record to typed TriggerConfig
 */
function parseTriggerConfig(raw: {
  id: string;
  workflow: string;
  audioTriggers: Prisma.JsonValue;
  audioEnabled: boolean;
  visualTriggers: Prisma.JsonValue;
  visualEnabled: boolean;
  frameSampleRate: number;
  autoClipEnabled: boolean;
  autoClipDuration: number;
  triggerCooldown: number;
  createdAt: Date;
  updatedAt: Date;
}): TriggerConfig {
  return {
    ...raw,
    audioTriggers: (raw.audioTriggers as AudioTrigger[]) ?? [],
    visualTriggers: (raw.visualTriggers as VisualTrigger[]) ?? [],
  };
}

/**
 * Get trigger config for a workflow, creating default if not exists.
 */
export async function getOrCreateTriggerConfig(workflow: string): Promise<TriggerConfig> {
  const existing = await prisma.triggerConfig.findUnique({
    where: { workflow },
  });

  if (existing) {
    return parseTriggerConfig(existing);
  }

  const created = await prisma.triggerConfig.create({
    data: { workflow },
  });

  return parseTriggerConfig(created);
}

/**
 * Get trigger config by workflow.
 */
export async function getTriggerConfig(workflow: string): Promise<TriggerConfig | null> {
  const config = await prisma.triggerConfig.findUnique({
    where: { workflow },
  });

  return config ? parseTriggerConfig(config) : null;
}

/**
 * Create a new trigger config.
 */
export async function createTriggerConfig(input: CreateTriggerConfigInput): Promise<TriggerConfig> {
  const config = await prisma.triggerConfig.create({
    data: {
      workflow: input.workflow,
      audioTriggers: (input.audioTriggers ?? []) as unknown as Prisma.JsonArray,
      audioEnabled: input.audioEnabled ?? false,
      visualTriggers: (input.visualTriggers ?? []) as unknown as Prisma.JsonArray,
      visualEnabled: input.visualEnabled ?? false,
      frameSampleRate: input.frameSampleRate ?? 5,
      autoClipEnabled: input.autoClipEnabled ?? false,
      autoClipDuration: input.autoClipDuration ?? 60,
      triggerCooldown: input.triggerCooldown ?? 30,
    },
  });

  return parseTriggerConfig(config);
}

/**
 * Update trigger config for a workflow.
 */
export async function updateTriggerConfig(
  workflow: string,
  input: UpdateTriggerConfigInput
): Promise<TriggerConfig> {
  const data: Prisma.TriggerConfigUpdateInput = {};

  if (input.audioTriggers !== undefined) {
    data.audioTriggers = input.audioTriggers as unknown as Prisma.JsonArray;
  }
  if (input.audioEnabled !== undefined) {
    data.audioEnabled = input.audioEnabled;
  }
  if (input.visualTriggers !== undefined) {
    data.visualTriggers = input.visualTriggers as unknown as Prisma.JsonArray;
  }
  if (input.visualEnabled !== undefined) {
    data.visualEnabled = input.visualEnabled;
  }
  if (input.frameSampleRate !== undefined) {
    data.frameSampleRate = input.frameSampleRate;
  }
  if (input.autoClipEnabled !== undefined) {
    data.autoClipEnabled = input.autoClipEnabled;
  }
  if (input.autoClipDuration !== undefined) {
    data.autoClipDuration = input.autoClipDuration;
  }
  if (input.triggerCooldown !== undefined) {
    data.triggerCooldown = input.triggerCooldown;
  }

  const config = await prisma.triggerConfig.update({
    where: { workflow },
    data,
  });

  return parseTriggerConfig(config);
}

/**
 * Add an audio trigger phrase.
 */
export async function addAudioTrigger(
  workflow: string,
  phrase: string,
  caseSensitive: boolean = false
): Promise<TriggerConfig> {
  const config = await getOrCreateTriggerConfig(workflow);

  const newTrigger: AudioTrigger = {
    id: crypto.randomUUID(),
    phrase,
    enabled: true,
    caseSensitive,
  };

  const updatedTriggers = [...config.audioTriggers, newTrigger];

  return updateTriggerConfig(workflow, { audioTriggers: updatedTriggers });
}

/**
 * Remove an audio trigger by ID.
 */
export async function removeAudioTrigger(workflow: string, triggerId: string): Promise<TriggerConfig> {
  const config = await getOrCreateTriggerConfig(workflow);

  const updatedTriggers = config.audioTriggers.filter((t) => t.id !== triggerId);

  return updateTriggerConfig(workflow, { audioTriggers: updatedTriggers });
}

/**
 * Toggle audio trigger enabled state.
 */
export async function toggleAudioTrigger(
  workflow: string,
  triggerId: string,
  enabled: boolean
): Promise<TriggerConfig> {
  const config = await getOrCreateTriggerConfig(workflow);

  const updatedTriggers = config.audioTriggers.map((t) =>
    t.id === triggerId ? { ...t, enabled } : t
  );

  return updateTriggerConfig(workflow, { audioTriggers: updatedTriggers });
}

/**
 * Add a visual trigger reference.
 */
export async function addVisualTrigger(
  workflow: string,
  label: string,
  imageId: string,
  threshold: number = 0.8
): Promise<TriggerConfig> {
  const config = await getOrCreateTriggerConfig(workflow);

  const newTrigger: VisualTrigger = {
    id: crypto.randomUUID(),
    label,
    imageId,
    threshold,
    enabled: true,
  };

  const updatedTriggers = [...config.visualTriggers, newTrigger];

  return updateTriggerConfig(workflow, { visualTriggers: updatedTriggers });
}

/**
 * Remove a visual trigger by ID.
 */
export async function removeVisualTrigger(workflow: string, triggerId: string): Promise<TriggerConfig> {
  const config = await getOrCreateTriggerConfig(workflow);

  const updatedTriggers = config.visualTriggers.filter((t) => t.id !== triggerId);

  return updateTriggerConfig(workflow, { visualTriggers: updatedTriggers });
}

/**
 * Delete trigger config for a workflow.
 */
export async function deleteTriggerConfig(workflow: string): Promise<void> {
  await prisma.triggerConfig.delete({
    where: { workflow },
  });
}

/**
 * List all trigger configs.
 */
export async function listTriggerConfigs(): Promise<TriggerConfig[]> {
  const configs = await prisma.triggerConfig.findMany({
    orderBy: { workflow: "asc" },
  });

  return configs.map(parseTriggerConfig);
}

/**
 * Get enabled audio triggers for a workflow.
 */
export async function getEnabledAudioTriggers(workflow: string): Promise<AudioTrigger[]> {
  const config = await getTriggerConfig(workflow);

  if (!config?.audioEnabled) return [];

  return config.audioTriggers.filter((t) => t.enabled);
}

/**
 * Get enabled visual triggers for a workflow.
 */
export async function getEnabledVisualTriggers(workflow: string): Promise<VisualTrigger[]> {
  const config = await getTriggerConfig(workflow);

  if (!config?.visualEnabled) return [];

  return config.visualTriggers.filter((t) => t.imageId);
}

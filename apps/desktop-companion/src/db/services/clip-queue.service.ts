/**
 * Clip Queue Service
 *
 * CRUD operations for ClipQueueItem entities.
 * Manages the queue of clips being processed (recording, processing, completed, failed).
 */

import { prisma, Prisma } from "../index.js";

export type ClipQueueStatus = "PENDING" | "RECORDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type TriggerType = "AUDIO" | "VISUAL" | "MANUAL";

export interface ClipQueueItem {
  id: string;
  sessionId: string;
  clipId: string | null;
  status: ClipQueueStatus;
  triggerType: TriggerType;
  triggerSource: string | null;
  triggerConfidence: number | null;
  t0: number;
  t1: number | null;
  thumbnailPath: string | null;
  title: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClipQueueItemWithDuration extends ClipQueueItem {
  duration: number | null;
}

export interface CreateClipQueueItemInput {
  sessionId: string;
  triggerType: TriggerType;
  triggerSource?: string;
  triggerConfidence?: number;
  t0: number;
  t1?: number;
  title?: string;
}

export interface UpdateClipQueueItemInput {
  status?: ClipQueueStatus;
  clipId?: string;
  t1?: number;
  thumbnailPath?: string;
  title?: string;
  errorMessage?: string;
}

export interface ClipQueueFilters {
  sessionId?: string;
  status?: ClipQueueStatus | ClipQueueStatus[];
  triggerType?: TriggerType;
  limit?: number;
  offset?: number;
  orderBy?: "createdAt" | "t0";
  orderDir?: "asc" | "desc";
}

/**
 * Create a new clip queue item.
 */
export async function createClipQueueItem(input: CreateClipQueueItemInput): Promise<ClipQueueItem> {
  return prisma.clipQueueItem.create({
    data: {
      sessionId: input.sessionId,
      triggerType: input.triggerType,
      triggerSource: input.triggerSource,
      triggerConfidence: input.triggerConfidence,
      t0: input.t0,
      t1: input.t1,
      title: input.title,
      status: "RECORDING",
    },
  }) as unknown as Promise<ClipQueueItem>;
}

/**
 * Get a clip queue item by ID.
 */
export async function getClipQueueItemById(id: string): Promise<ClipQueueItem | null> {
  return prisma.clipQueueItem.findUnique({
    where: { id },
  }) as unknown as Promise<ClipQueueItem | null>;
}

/**
 * Update a clip queue item.
 */
export async function updateClipQueueItem(
  id: string,
  input: UpdateClipQueueItemInput
): Promise<ClipQueueItem> {
  return prisma.clipQueueItem.update({
    where: { id },
    data: input as Prisma.ClipQueueItemUpdateInput,
  }) as unknown as Promise<ClipQueueItem>;
}

/**
 * Delete a clip queue item.
 */
export async function deleteClipQueueItem(id: string): Promise<ClipQueueItem> {
  return prisma.clipQueueItem.delete({
    where: { id },
  }) as unknown as Promise<ClipQueueItem>;
}

/**
 * List clip queue items with filtering.
 */
export async function listClipQueueItems(
  filters?: ClipQueueFilters
): Promise<ClipQueueItemWithDuration[]> {
  const {
    sessionId,
    status,
    triggerType,
    limit = 50,
    offset = 0,
    orderBy = "createdAt",
    orderDir = "desc",
  } = filters ?? {};

  const where: Prisma.ClipQueueItemWhereInput = {};

  if (sessionId) where.sessionId = sessionId;
  if (triggerType) where.triggerType = triggerType;

  if (status) {
    if (Array.isArray(status)) {
      where.status = { in: status };
    } else {
      where.status = status;
    }
  }

  const items = await prisma.clipQueueItem.findMany({
    where,
    orderBy: { [orderBy]: orderDir },
    take: limit,
    skip: offset,
  });

  return (items as unknown as ClipQueueItem[]).map((item) => ({
    ...item,
    duration: item.t1 !== null ? item.t1 - item.t0 : null,
  }));
}

/**
 * Get all clip queue items for a session.
 */
export async function getSessionClipQueue(sessionId: string): Promise<ClipQueueItemWithDuration[]> {
  const items = await prisma.clipQueueItem.findMany({
    where: { sessionId },
    orderBy: { t0: "asc" },
  });

  return (items as unknown as ClipQueueItem[]).map((item) => ({
    ...item,
    duration: item.t1 !== null ? item.t1 - item.t0 : null,
  }));
}

/**
 * Count clip queue items.
 */
export async function countClipQueueItems(filters?: {
  sessionId?: string;
  status?: ClipQueueStatus | ClipQueueStatus[];
}): Promise<number> {
  const where: Prisma.ClipQueueItemWhereInput = {};

  if (filters?.sessionId) where.sessionId = filters.sessionId;
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else {
      where.status = filters.status;
    }
  }

  return prisma.clipQueueItem.count({ where });
}

/**
 * Get pending clip queue items (not yet processed).
 */
export async function getPendingClipQueueItems(sessionId?: string): Promise<ClipQueueItem[]> {
  const where: Prisma.ClipQueueItemWhereInput = {
    status: { in: ["PENDING", "RECORDING"] },
  };

  if (sessionId) where.sessionId = sessionId;

  return prisma.clipQueueItem.findMany({
    where,
    orderBy: { createdAt: "asc" },
  }) as unknown as Promise<ClipQueueItem[]>;
}

/**
 * Get the currently recording clip queue item for a session.
 */
export async function getRecordingClipQueueItem(sessionId: string): Promise<ClipQueueItem | null> {
  return prisma.clipQueueItem.findFirst({
    where: {
      sessionId,
      status: "RECORDING",
    },
    orderBy: { createdAt: "desc" },
  }) as unknown as Promise<ClipQueueItem | null>;
}

/**
 * Mark a clip queue item as recording started.
 */
export async function startRecording(id: string): Promise<ClipQueueItem> {
  return updateClipQueueItem(id, { status: "RECORDING" });
}

/**
 * Mark a clip queue item as recording ended and ready for processing.
 */
export async function endRecording(id: string, t1: number): Promise<ClipQueueItem> {
  return updateClipQueueItem(id, {
    status: "PENDING",
    t1,
  });
}

/**
 * Mark a clip queue item as processing started.
 */
export async function startProcessing(id: string): Promise<ClipQueueItem> {
  return updateClipQueueItem(id, { status: "PROCESSING" });
}

/**
 * Mark a clip queue item as completed.
 */
export async function completeProcessing(
  id: string,
  clipId: string,
  thumbnailPath?: string
): Promise<ClipQueueItem> {
  return updateClipQueueItem(id, {
    status: "COMPLETED",
    clipId,
    thumbnailPath,
  });
}

/**
 * Mark a clip queue item as failed.
 */
export async function failProcessing(id: string, errorMessage: string): Promise<ClipQueueItem> {
  return updateClipQueueItem(id, {
    status: "FAILED",
    errorMessage,
  });
}

/**
 * Retry a failed clip queue item.
 */
export async function retryClipQueueItem(id: string): Promise<ClipQueueItem> {
  return updateClipQueueItem(id, {
    status: "PENDING",
    errorMessage: null,
  });
}

/**
 * Get clip queue stats for a session.
 */
export async function getClipQueueStats(sessionId: string): Promise<{
  total: number;
  pending: number;
  recording: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const [total, pending, recording, processing, completed, failed] = await Promise.all([
    prisma.clipQueueItem.count({ where: { sessionId } }),
    prisma.clipQueueItem.count({ where: { sessionId, status: "PENDING" } }),
    prisma.clipQueueItem.count({ where: { sessionId, status: "RECORDING" } }),
    prisma.clipQueueItem.count({ where: { sessionId, status: "PROCESSING" } }),
    prisma.clipQueueItem.count({ where: { sessionId, status: "COMPLETED" } }),
    prisma.clipQueueItem.count({ where: { sessionId, status: "FAILED" } }),
  ]);

  return { total, pending, recording, processing, completed, failed };
}

/**
 * Delete all clip queue items for a session.
 */
export async function deleteSessionClipQueue(sessionId: string): Promise<number> {
  const result = await prisma.clipQueueItem.deleteMany({
    where: { sessionId },
  });
  return result.count;
}

/**
 * Get next pending item for processing.
 */
export async function getNextPendingItem(): Promise<ClipQueueItem | null> {
  return prisma.clipQueueItem.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  }) as unknown as Promise<ClipQueueItem | null>;
}

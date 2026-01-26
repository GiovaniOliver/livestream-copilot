/**
 * Export Service
 *
 * CRUD operations and business logic for Export entities.
 * Handles export history tracking and management.
 */

import { prisma } from "../prisma.js";
import type {
  Export,
  Prisma,
} from "../../generated/prisma/client.js";
import type {
  ExportType,
  ExportStatus,
  SocialPlatform,
  ExportFormat,
} from "../../generated/prisma/enums.js";

/**
 * Create export input
 */
export interface CreateExportInput {
  userId: string;
  organizationId?: string;
  sessionId?: string;
  clipId?: string;
  type: ExportType;
  platform?: SocialPlatform;
  format?: ExportFormat;
  content?: string;
  filePath?: string;
  fileSize?: bigint;
  thumbnailPath?: string;
  metadata?: Record<string, any>;
}

/**
 * Update export input
 */
export interface UpdateExportInput {
  status?: ExportStatus;
  content?: string;
  filePath?: string;
  fileSize?: bigint;
  thumbnailPath?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Export filters
 */
export interface ExportFilters {
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  clipId?: string;
  type?: ExportType;
  status?: ExportStatus;
  platform?: SocialPlatform;
  format?: ExportFormat;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'completedAt' | 'fileSize';
  orderDir?: 'asc' | 'desc';
}

/**
 * Export with relations
 */
export interface ExportWithRelations extends Export {
  session?: {
    id: string;
    title: string | null;
    workflow: string;
  } | null;
  clip?: {
    id: string;
    artifactId: string;
    t0: number;
    t1: number;
  } | null;
}

/**
 * Export statistics
 */
export interface ExportStats {
  total: number;
  byType: Record<ExportType, number>;
  byPlatform: Record<SocialPlatform, number>;
  byStatus: Record<ExportStatus, number>;
  totalFileSize: bigint;
  averageFileSize: number;
}

/**
 * Create a new export record
 */
export async function createExport(input: CreateExportInput): Promise<Export> {
  return prisma.export.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      clipId: input.clipId,
      type: input.type,
      platform: input.platform,
      format: input.format,
      content: input.content,
      filePath: input.filePath,
      fileSize: input.fileSize,
      thumbnailPath: input.thumbnailPath,
      metadata: input.metadata || {},
      status: 'PENDING',
    },
  });
}

/**
 * Get export by ID
 */
export async function getExportById(id: string): Promise<Export | null> {
  return prisma.export.findUnique({
    where: { id },
  });
}

/**
 * Get export by ID with relations
 */
export async function getExportWithRelations(
  id: string
): Promise<ExportWithRelations | null> {
  return prisma.export.findUnique({
    where: { id },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          workflow: true,
        },
      },
      clip: {
        select: {
          id: true,
          artifactId: true,
          t0: true,
          t1: true,
        },
      },
    },
  });
}

/**
 * Update an export
 */
export async function updateExport(
  id: string,
  input: UpdateExportInput
): Promise<Export> {
  return prisma.export.update({
    where: { id },
    data: input,
  });
}

/**
 * Mark export as started
 */
export async function markExportStarted(id: string): Promise<Export> {
  return prisma.export.update({
    where: { id },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
    },
  });
}

/**
 * Mark export as completed
 */
export async function markExportCompleted(
  id: string,
  data: {
    filePath?: string;
    fileSize?: bigint;
    thumbnailPath?: string;
    metadata?: Record<string, any>;
  }
): Promise<Export> {
  return prisma.export.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      ...data,
    },
  });
}

/**
 * Mark export as failed
 */
export async function markExportFailed(
  id: string,
  errorMessage: string
): Promise<Export> {
  return prisma.export.update({
    where: { id },
    data: {
      status: 'FAILED',
      errorMessage,
      completedAt: new Date(),
    },
  });
}

/**
 * Delete an export
 */
export async function deleteExport(id: string): Promise<Export> {
  return prisma.export.delete({
    where: { id },
  });
}

/**
 * List exports with filters
 */
export async function listExports(
  filters?: ExportFilters
): Promise<ExportWithRelations[]> {
  const {
    userId,
    organizationId,
    sessionId,
    clipId,
    type,
    status,
    platform,
    format,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
    orderBy = 'createdAt',
    orderDir = 'desc',
  } = filters ?? {};

  const where: Prisma.ExportWhereInput = {};

  if (userId) where.userId = userId;
  if (organizationId) where.organizationId = organizationId;
  if (sessionId) where.sessionId = sessionId;
  if (clipId) where.clipId = clipId;
  if (type) where.type = type;
  if (status) where.status = status;
  if (platform) where.platform = platform;
  if (format) where.format = format;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  return prisma.export.findMany({
    where,
    include: {
      session: {
        select: {
          id: true,
          title: true,
          workflow: true,
        },
      },
      clip: {
        select: {
          id: true,
          artifactId: true,
          t0: true,
          t1: true,
        },
      },
    },
    orderBy: { [orderBy]: orderDir },
    take: limit,
    skip: offset,
  });
}

/**
 * Get export history for a user
 */
export async function getUserExportHistory(
  userId: string,
  limit = 50,
  offset = 0
): Promise<ExportWithRelations[]> {
  return listExports({
    userId,
    limit,
    offset,
    orderBy: 'createdAt',
    orderDir: 'desc',
  });
}

/**
 * Get export history for a session
 */
export async function getSessionExports(
  sessionId: string
): Promise<ExportWithRelations[]> {
  return listExports({
    sessionId,
    orderBy: 'createdAt',
    orderDir: 'asc',
  });
}

/**
 * Get export history for a clip
 */
export async function getClipExports(
  clipId: string
): Promise<ExportWithRelations[]> {
  return listExports({
    clipId,
    orderBy: 'createdAt',
    orderDir: 'asc',
  });
}

/**
 * Count exports matching criteria
 */
export async function countExports(filters?: ExportFilters): Promise<number> {
  const {
    userId,
    organizationId,
    sessionId,
    clipId,
    type,
    status,
    platform,
    format,
    startDate,
    endDate,
  } = filters ?? {};

  const where: Prisma.ExportWhereInput = {};

  if (userId) where.userId = userId;
  if (organizationId) where.organizationId = organizationId;
  if (sessionId) where.sessionId = sessionId;
  if (clipId) where.clipId = clipId;
  if (type) where.type = type;
  if (status) where.status = status;
  if (platform) where.platform = platform;
  if (format) where.format = format;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  return prisma.export.count({ where });
}

/**
 * Get export statistics for a user
 */
export async function getUserExportStats(userId: string): Promise<ExportStats> {
  const exports = await prisma.export.findMany({
    where: { userId },
    select: {
      type: true,
      status: true,
      platform: true,
      fileSize: true,
    },
  });

  const stats: ExportStats = {
    total: exports.length,
    byType: {
      POST: 0,
      CLIP: 0,
      BATCH: 0,
    },
    byPlatform: {
      TWITTER: 0,
      LINKEDIN: 0,
      INSTAGRAM: 0,
      TIKTOK: 0,
      YOUTUBE: 0,
      FACEBOOK: 0,
      THREADS: 0,
      BLUESKY: 0,
    },
    byStatus: {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
    },
    totalFileSize: BigInt(0),
    averageFileSize: 0,
  };

  let fileSizeCount = 0;

  for (const exp of exports) {
    stats.byType[exp.type]++;
    stats.byStatus[exp.status]++;

    if (exp.platform) {
      stats.byPlatform[exp.platform]++;
    }

    if (exp.fileSize) {
      stats.totalFileSize += exp.fileSize;
      fileSizeCount++;
    }
  }

  if (fileSizeCount > 0) {
    stats.averageFileSize = Number(stats.totalFileSize / BigInt(fileSizeCount));
  }

  return stats;
}

/**
 * Delete old exports (cleanup)
 */
export async function deleteOldExports(
  olderThanDays: number,
  userId?: string
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const where: Prisma.ExportWhereInput = {
    createdAt: {
      lt: cutoffDate,
    },
  };

  if (userId) {
    where.userId = userId;
  }

  const result = await prisma.export.deleteMany({
    where,
  });

  return result.count;
}

/**
 * Get recent exports for a platform
 */
export async function getRecentPlatformExports(
  platform: SocialPlatform,
  userId: string,
  limit = 10
): Promise<ExportWithRelations[]> {
  return listExports({
    userId,
    platform,
    status: 'COMPLETED',
    limit,
    orderBy: 'completedAt',
    orderDir: 'desc',
  });
}

/**
 * Check if export exists
 */
export async function exportExists(id: string): Promise<boolean> {
  const exp = await prisma.export.findUnique({
    where: { id },
    select: { id: true },
  });
  return exp !== null;
}

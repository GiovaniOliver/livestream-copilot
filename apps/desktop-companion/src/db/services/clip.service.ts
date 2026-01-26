/**
 * Clip Service
 *
 * CRUD operations and business logic for Clip entities.
 * Clips represent video segments captured during a session.
 */

import { prisma, type Clip, Prisma } from "../index.js";

export interface CreateClipInput {
  sessionId: string;
  artifactId: string;
  path: string;
  t0: number;
  t1: number;
  thumbnailId?: string;
}

export interface UpdateClipInput {
  path?: string;
  thumbnailId?: string;
}

export interface ClipFilters {
  sessionId?: string;
  minDuration?: number;
  maxDuration?: number;
  limit?: number;
  offset?: number;
  orderBy?: "t0" | "createdAt";
  orderDir?: "asc" | "desc";
}

export interface ClipWithDuration extends Clip {
  duration: number;
}

/**
 * Create a new clip.
 */
export async function createClip(input: CreateClipInput): Promise<Clip> {
  return prisma.clip.create({
    data: {
      sessionId: input.sessionId,
      artifactId: input.artifactId,
      path: input.path,
      t0: input.t0,
      t1: input.t1,
      thumbnailId: input.thumbnailId,
    },
  });
}

/**
 * Get a clip by ID.
 */
export async function getClipById(id: string): Promise<Clip | null> {
  return prisma.clip.findUnique({
    where: { id },
  });
}

/**
 * Get a clip by artifact ID.
 */
export async function getClipByArtifactId(artifactId: string): Promise<Clip | null> {
  return prisma.clip.findUnique({
    where: { artifactId },
  });
}

/**
 * Get a clip by ID with session data.
 */
export async function getClipWithSession(
  id: string
): Promise<(Clip & { session: { id: string; workflow: string; title: string | null } }) | null> {
  return prisma.clip.findUnique({
    where: { id },
    include: {
      session: {
        select: {
          id: true,
          workflow: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Update a clip by ID.
 */
export async function updateClip(id: string, input: UpdateClipInput): Promise<Clip> {
  return prisma.clip.update({
    where: { id },
    data: input,
  });
}

/**
 * Update a clip's thumbnail.
 */
export async function updateClipThumbnail(id: string, thumbnailId: string): Promise<Clip> {
  return prisma.clip.update({
    where: { id },
    data: { thumbnailId },
  });
}

/**
 * Delete a clip by ID.
 */
export async function deleteClip(id: string): Promise<Clip> {
  return prisma.clip.delete({
    where: { id },
  });
}

/**
 * Delete a clip by artifact ID.
 */
export async function deleteClipByArtifactId(artifactId: string): Promise<Clip> {
  return prisma.clip.delete({
    where: { artifactId },
  });
}

/**
 * List clips with filtering options.
 */
export async function listClips(filters?: ClipFilters): Promise<ClipWithDuration[]> {
  const {
    sessionId,
    minDuration,
    maxDuration,
    limit = 50,
    offset = 0,
    orderBy = "t0",
    orderDir = "asc",
  } = filters ?? {};

  const where: Prisma.ClipWhereInput = {};

  if (sessionId) where.sessionId = sessionId;

  const clips = await prisma.clip.findMany({
    where,
    orderBy: { [orderBy]: orderDir },
    take: limit,
    skip: offset,
  });

  // Add computed duration and filter by duration if needed
  let clipsWithDuration = clips.map((clip) => ({
    ...clip,
    duration: clip.t1 - clip.t0,
  }));

  if (minDuration !== undefined) {
    clipsWithDuration = clipsWithDuration.filter((c) => c.duration >= minDuration);
  }

  if (maxDuration !== undefined) {
    clipsWithDuration = clipsWithDuration.filter((c) => c.duration <= maxDuration);
  }

  return clipsWithDuration;
}

/**
 * Get all clips for a session.
 */
export async function getSessionClips(sessionId: string): Promise<ClipWithDuration[]> {
  const clips = await prisma.clip.findMany({
    where: { sessionId },
    orderBy: { t0: "asc" },
  });

  return clips.map((clip) => ({
    ...clip,
    duration: clip.t1 - clip.t0,
  }));
}

/**
 * Count clips matching criteria.
 */
export async function countClips(filters?: { sessionId?: string }): Promise<number> {
  const { sessionId } = filters ?? {};

  const where: Prisma.ClipWhereInput = {};
  if (sessionId) where.sessionId = sessionId;

  return prisma.clip.count({ where });
}

/**
 * Get total clip duration for a session.
 */
export async function getSessionClipsDuration(sessionId: string): Promise<number> {
  const clips = await prisma.clip.findMany({
    where: { sessionId },
    select: { t0: true, t1: true },
  });

  return clips.reduce((total, clip) => total + (clip.t1 - clip.t0), 0);
}

/**
 * Get clips that overlap with a time range.
 */
export async function getClipsInTimeRange(
  sessionId: string,
  startTime: number,
  endTime: number
): Promise<ClipWithDuration[]> {
  const clips = await prisma.clip.findMany({
    where: {
      sessionId,
      OR: [
        // Clip starts within range
        { t0: { gte: startTime, lte: endTime } },
        // Clip ends within range
        { t1: { gte: startTime, lte: endTime } },
        // Clip spans the entire range
        { AND: [{ t0: { lte: startTime } }, { t1: { gte: endTime } }] },
      ],
    },
    orderBy: { t0: "asc" },
  });

  return clips.map((clip) => ({
    ...clip,
    duration: clip.t1 - clip.t0,
  }));
}

/**
 * Check if a clip with the given artifact ID already exists.
 */
export async function clipExists(artifactId: string): Promise<boolean> {
  const clip = await prisma.clip.findUnique({
    where: { artifactId },
    select: { id: true },
  });
  return clip !== null;
}

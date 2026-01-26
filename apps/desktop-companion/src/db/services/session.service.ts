/**
 * Session Service
 *
 * CRUD operations and business logic for Session entities.
 * Sessions represent individual livestream capture sessions.
 */

import { prisma, type Session, Prisma } from "../index.js";

export interface CreateSessionInput {
  workflow: string;
  captureMode: string;
  title?: string;
  participants?: string[];
  startedAt: Date;
}

export interface UpdateSessionInput {
  title?: string;
  participants?: string[];
  endedAt?: Date;
  status?: string;
}

export interface SessionWithCounts extends Session {
  _count?: {
    events: number;
    outputs: number;
    clips: number;
  };
}

/**
 * Create a new session.
 */
export async function createSession(input: CreateSessionInput): Promise<Session> {
  return prisma.session.create({
    data: {
      workflow: input.workflow,
      captureMode: input.captureMode,
      title: input.title,
      participants: input.participants ?? [],
      startedAt: input.startedAt,
    },
  });
}

/**
 * Get a session by ID.
 */
export async function getSessionById(id: string): Promise<Session | null> {
  return prisma.session.findUnique({
    where: { id },
  });
}

/**
 * Get a session by ID with related counts.
 */
export async function getSessionWithCounts(id: string): Promise<SessionWithCounts | null> {
  return prisma.session.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          events: true,
          outputs: true,
          clips: true,
        },
      },
    },
  });
}

/**
 * Get a session by ID with all related data.
 */
export async function getSessionWithRelations(id: string): Promise<
  | (Session & {
      events: { id: string; type: string; ts: bigint; createdAt: Date }[];
      outputs: { id: string; category: string; title: string | null; status: string }[];
      clips: { id: string; artifactId: string; t0: number; t1: number }[];
    })
  | null
> {
  return prisma.session.findUnique({
    where: { id },
    include: {
      events: {
        select: {
          id: true,
          type: true,
          ts: true,
          createdAt: true,
        },
        orderBy: { ts: "asc" },
      },
      outputs: {
        select: {
          id: true,
          category: true,
          title: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      },
      clips: {
        select: {
          id: true,
          artifactId: true,
          t0: true,
          t1: true,
        },
        orderBy: { t0: "asc" },
      },
    },
  });
}

/**
 * Update a session by ID.
 */
export async function updateSession(id: string, input: UpdateSessionInput): Promise<Session> {
  return prisma.session.update({
    where: { id },
    data: input,
  });
}

/**
 * End a session (set endedAt timestamp).
 */
export async function endSession(id: string): Promise<Session> {
  return prisma.session.update({
    where: { id },
    data: { endedAt: new Date() },
  });
}

/**
 * Delete a session by ID (cascades to related events, outputs, clips).
 */
export async function deleteSession(id: string): Promise<Session> {
  return prisma.session.delete({
    where: { id },
  });
}

/**
 * List all sessions with optional filtering.
 */
export async function listSessions(options?: {
  workflow?: string;
  captureMode?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: "startedAt" | "createdAt" | "updatedAt";
  orderDir?: "asc" | "desc";
}): Promise<SessionWithCounts[]> {
  const {
    workflow,
    captureMode,
    active,
    limit = 50,
    offset = 0,
    orderBy = "startedAt",
    orderDir = "desc",
  } = options ?? {};

  const where: Prisma.SessionWhereInput = {};

  if (workflow) where.workflow = workflow;
  if (captureMode) where.captureMode = captureMode;
  if (active === true) where.endedAt = null;
  if (active === false) where.endedAt = { not: null };

  return prisma.session.findMany({
    where,
    include: {
      _count: {
        select: {
          events: true,
          outputs: true,
          clips: true,
        },
      },
    },
    orderBy: { [orderBy]: orderDir },
    take: limit,
    skip: offset,
  });
}

/**
 * Get the most recent active session.
 */
export async function getActiveSession(): Promise<Session | null> {
  return prisma.session.findFirst({
    where: { endedAt: null },
    orderBy: { startedAt: "desc" },
  });
}

/**
 * Count sessions matching criteria.
 */
export async function countSessions(options?: {
  workflow?: string;
  active?: boolean;
}): Promise<number> {
  const { workflow, active } = options ?? {};

  const where: Prisma.SessionWhereInput = {};

  if (workflow) where.workflow = workflow;
  if (active === true) where.endedAt = null;
  if (active === false) where.endedAt = { not: null };

  return prisma.session.count({ where });
}

/**
 * Event Service
 *
 * CRUD operations and business logic for Event entities.
 * Events represent timestamped occurrences during a session.
 */

import { prisma, type Event, Prisma } from "../index.js";

export interface CreateEventInput {
  sessionId: string;
  type: string;
  payload: Record<string, unknown>;
  ts: bigint;
  traceId?: string;
  spanId?: string;
}

export interface EventFilters {
  sessionId?: string;
  type?: string;
  types?: string[];
  afterTs?: bigint;
  beforeTs?: bigint;
  limit?: number;
  offset?: number;
  orderDir?: "asc" | "desc";
}

/**
 * Create a new event.
 */
export async function createEvent(input: CreateEventInput): Promise<Event> {
  return prisma.event.create({
    data: {
      sessionId: input.sessionId,
      type: input.type,
      payload: input.payload as Prisma.JsonObject,
      ts: input.ts,
      traceId: input.traceId,
      spanId: input.spanId,
    },
  });
}

/**
 * Create multiple events in a batch (more efficient for bulk operations).
 */
export async function createEvents(inputs: CreateEventInput[]): Promise<number> {
  const result = await prisma.event.createMany({
    data: inputs.map((input) => ({
      sessionId: input.sessionId,
      type: input.type,
      payload: input.payload as Prisma.JsonObject,
      ts: input.ts,
      traceId: input.traceId,
      spanId: input.spanId,
    })),
  });
  return result.count;
}

/**
 * Get an event by ID.
 */
export async function getEventById(id: string): Promise<Event | null> {
  return prisma.event.findUnique({
    where: { id },
  });
}

/**
 * Get an event by ID with session data.
 */
export async function getEventWithSession(
  id: string
): Promise<(Event & { session: { id: string; workflow: string; title: string | null } }) | null> {
  return prisma.event.findUnique({
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
 * List events with filtering options.
 */
export async function listEvents(filters?: EventFilters): Promise<Event[]> {
  const {
    sessionId,
    type,
    types,
    afterTs,
    beforeTs,
    limit = 100,
    offset = 0,
    orderDir = "asc",
  } = filters ?? {};

  const where: Prisma.EventWhereInput = {};

  if (sessionId) where.sessionId = sessionId;
  if (type) where.type = type;
  if (types && types.length > 0) where.type = { in: types };
  if (afterTs !== undefined || beforeTs !== undefined) {
    where.ts = {};
    if (afterTs !== undefined) where.ts.gte = afterTs;
    if (beforeTs !== undefined) where.ts.lte = beforeTs;
  }

  return prisma.event.findMany({
    where,
    orderBy: { ts: orderDir },
    take: limit,
    skip: offset,
  });
}

/**
 * Get events for a session by type.
 */
export async function getSessionEventsByType(sessionId: string, type: string): Promise<Event[]> {
  return prisma.event.findMany({
    where: { sessionId, type },
    orderBy: { ts: "asc" },
  });
}

/**
 * Get transcript events for a session.
 */
export async function getTranscriptEvents(sessionId: string): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      sessionId,
      type: "TRANSCRIPT_SEGMENT",
    },
    orderBy: { ts: "asc" },
  });
}

/**
 * Get clip intent events for a session.
 */
export async function getClipIntentEvents(sessionId: string): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      sessionId,
      type: { in: ["CLIP_INTENT_START", "CLIP_INTENT_END"] },
    },
    orderBy: { ts: "asc" },
  });
}

/**
 * Delete an event by ID.
 */
export async function deleteEvent(id: string): Promise<Event> {
  return prisma.event.delete({
    where: { id },
  });
}

/**
 * Delete all events for a session.
 */
export async function deleteSessionEvents(sessionId: string): Promise<number> {
  const result = await prisma.event.deleteMany({
    where: { sessionId },
  });
  return result.count;
}

/**
 * Count events matching criteria.
 */
export async function countEvents(filters?: {
  sessionId?: string;
  type?: string;
}): Promise<number> {
  const { sessionId, type } = filters ?? {};

  const where: Prisma.EventWhereInput = {};
  if (sessionId) where.sessionId = sessionId;
  if (type) where.type = type;

  return prisma.event.count({ where });
}

/**
 * Get the latest event of a specific type for a session.
 */
export async function getLatestEventByType(sessionId: string, type: string): Promise<Event | null> {
  return prisma.event.findFirst({
    where: { sessionId, type },
    orderBy: { ts: "desc" },
  });
}

/**
 * Get events within a time range for a session.
 */
export async function getEventsInTimeRange(
  sessionId: string,
  startTs: bigint,
  endTs: bigint
): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      sessionId,
      ts: {
        gte: startTs,
        lte: endTs,
      },
    },
    orderBy: { ts: "asc" },
  });
}

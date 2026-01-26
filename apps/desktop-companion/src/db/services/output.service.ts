/**
 * Output Service
 *
 * CRUD operations and business logic for Output entities.
 * Outputs represent generated content (social drafts, clip titles, chapters, etc.).
 */

import { prisma, type Output, Prisma } from "../index.js";

export type OutputStatus = "draft" | "approved" | "published" | "archived";

export interface CreateOutputInput {
  sessionId: string;
  category: string;
  title?: string;
  text: string;
  refs?: string[];
  meta?: Record<string, unknown>;
  status?: OutputStatus;
}

export interface UpdateOutputInput {
  title?: string;
  text?: string;
  refs?: string[];
  meta?: Record<string, unknown>;
  status?: OutputStatus;
}

export interface OutputFilters {
  sessionId?: string;
  category?: string;
  categories?: string[];
  status?: OutputStatus;
  limit?: number;
  offset?: number;
  orderBy?: "createdAt" | "updatedAt";
  orderDir?: "asc" | "desc";
}

/**
 * Create a new output.
 */
export async function createOutput(input: CreateOutputInput): Promise<Output> {
  return prisma.output.create({
    data: {
      sessionId: input.sessionId,
      category: input.category,
      title: input.title,
      text: input.text,
      refs: input.refs ?? [],
      meta: (input.meta ?? {}) as Prisma.JsonObject,
      status: input.status ?? "draft",
    },
  });
}

/**
 * Create multiple outputs in a batch.
 */
export async function createOutputs(inputs: CreateOutputInput[]): Promise<number> {
  const result = await prisma.output.createMany({
    data: inputs.map((input) => ({
      sessionId: input.sessionId,
      category: input.category,
      title: input.title,
      text: input.text,
      refs: input.refs ?? [],
      meta: (input.meta ?? {}) as Prisma.JsonObject,
      status: input.status ?? "draft",
    })),
  });
  return result.count;
}

/**
 * Get an output by ID.
 */
export async function getOutputById(id: string): Promise<Output | null> {
  return prisma.output.findUnique({
    where: { id },
  });
}

/**
 * Get an output by ID with session data.
 */
export async function getOutputWithSession(
  id: string
): Promise<(Output & { session: { id: string; workflow: string; title: string | null } }) | null> {
  return prisma.output.findUnique({
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
 * Update an output by ID.
 */
export async function updateOutput(id: string, input: UpdateOutputInput): Promise<Output> {
  const data: Prisma.OutputUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.text !== undefined) data.text = input.text;
  if (input.refs !== undefined) data.refs = input.refs;
  if (input.meta !== undefined) data.meta = input.meta as Prisma.JsonObject;
  if (input.status !== undefined) data.status = input.status;

  return prisma.output.update({
    where: { id },
    data,
  });
}

/**
 * Update output status.
 */
export async function updateOutputStatus(id: string, status: OutputStatus): Promise<Output> {
  return prisma.output.update({
    where: { id },
    data: { status },
  });
}

/**
 * Delete an output by ID.
 */
export async function deleteOutput(id: string): Promise<Output> {
  return prisma.output.delete({
    where: { id },
  });
}

/**
 * List outputs with filtering options.
 */
export async function listOutputs(filters?: OutputFilters): Promise<Output[]> {
  const {
    sessionId,
    category,
    categories,
    status,
    limit = 50,
    offset = 0,
    orderBy = "createdAt",
    orderDir = "desc",
  } = filters ?? {};

  const where: Prisma.OutputWhereInput = {};

  if (sessionId) where.sessionId = sessionId;
  if (category) where.category = category;
  if (categories && categories.length > 0) where.category = { in: categories };
  if (status) where.status = status;

  return prisma.output.findMany({
    where,
    orderBy: { [orderBy]: orderDir },
    take: limit,
    skip: offset,
  });
}

/**
 * Get outputs for a session by category.
 */
export async function getSessionOutputsByCategory(
  sessionId: string,
  category: string
): Promise<Output[]> {
  return prisma.output.findMany({
    where: { sessionId, category },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get all draft outputs for a session.
 */
export async function getDraftOutputs(sessionId: string): Promise<Output[]> {
  return prisma.output.findMany({
    where: { sessionId, status: "draft" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Count outputs matching criteria.
 */
export async function countOutputs(filters?: {
  sessionId?: string;
  category?: string;
  status?: OutputStatus;
}): Promise<number> {
  const { sessionId, category, status } = filters ?? {};

  const where: Prisma.OutputWhereInput = {};
  if (sessionId) where.sessionId = sessionId;
  if (category) where.category = category;
  if (status) where.status = status;

  return prisma.output.count({ where });
}

/**
 * Get distinct categories used in outputs.
 */
export async function getOutputCategories(sessionId?: string): Promise<string[]> {
  const where: Prisma.OutputWhereInput = sessionId ? { sessionId } : {};

  const results = await prisma.output.findMany({
    where,
    select: { category: true },
    distinct: ["category"],
  });

  return results.map((r) => r.category);
}

/**
 * Approve all draft outputs for a session.
 */
export async function approveAllDrafts(sessionId: string): Promise<number> {
  const result = await prisma.output.updateMany({
    where: { sessionId, status: "draft" },
    data: { status: "approved" },
  });
  return result.count;
}

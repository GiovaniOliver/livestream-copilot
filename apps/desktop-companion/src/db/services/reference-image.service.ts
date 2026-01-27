/**
 * Reference Image Service
 *
 * CRUD operations for ReferenceImage entities.
 * Manages uploaded reference images for visual trigger detection.
 */

import { prisma } from "../index.js";

export interface ReferenceImage {
  id: string;
  workflow: string;
  label: string;
  imagePath: string;
  threshold: number;
  enabled: boolean;
  createdAt: Date;
}

export interface CreateReferenceImageInput {
  workflow: string;
  label: string;
  imagePath: string;
  threshold?: number;
  enabled?: boolean;
}

export interface UpdateReferenceImageInput {
  label?: string;
  threshold?: number;
  enabled?: boolean;
}

export interface ReferenceImageFilters {
  workflow?: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Create a new reference image.
 */
export async function createReferenceImage(input: CreateReferenceImageInput): Promise<ReferenceImage> {
  return prisma.referenceImage.create({
    data: {
      workflow: input.workflow,
      label: input.label,
      imagePath: input.imagePath,
      threshold: input.threshold ?? 0.8,
      enabled: input.enabled ?? true,
    },
  });
}

/**
 * Get a reference image by ID.
 */
export async function getReferenceImageById(id: string): Promise<ReferenceImage | null> {
  return prisma.referenceImage.findUnique({
    where: { id },
  });
}

/**
 * Update a reference image.
 */
export async function updateReferenceImage(
  id: string,
  input: UpdateReferenceImageInput
): Promise<ReferenceImage> {
  return prisma.referenceImage.update({
    where: { id },
    data: input,
  });
}

/**
 * Delete a reference image.
 */
export async function deleteReferenceImage(id: string): Promise<ReferenceImage> {
  return prisma.referenceImage.delete({
    where: { id },
  });
}

/**
 * List reference images with filtering.
 */
export async function listReferenceImages(filters?: ReferenceImageFilters): Promise<ReferenceImage[]> {
  const { workflow, enabled, limit = 100, offset = 0 } = filters ?? {};

  const where: { workflow?: string; enabled?: boolean } = {};
  if (workflow) where.workflow = workflow;
  if (enabled !== undefined) where.enabled = enabled;

  return prisma.referenceImage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get all enabled reference images for a workflow.
 */
export async function getEnabledReferenceImages(workflow: string): Promise<ReferenceImage[]> {
  return prisma.referenceImage.findMany({
    where: {
      workflow,
      enabled: true,
    },
    orderBy: { label: "asc" },
  });
}

/**
 * Count reference images for a workflow.
 */
export async function countReferenceImages(workflow?: string): Promise<number> {
  return prisma.referenceImage.count({
    where: workflow ? { workflow } : undefined,
  });
}

/**
 * Delete all reference images for a workflow.
 */
export async function deleteWorkflowReferenceImages(workflow: string): Promise<number> {
  const result = await prisma.referenceImage.deleteMany({
    where: { workflow },
  });
  return result.count;
}

/**
 * Toggle reference image enabled state.
 */
export async function toggleReferenceImage(id: string, enabled: boolean): Promise<ReferenceImage> {
  return prisma.referenceImage.update({
    where: { id },
    data: { enabled },
  });
}

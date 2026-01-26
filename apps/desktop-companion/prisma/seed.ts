/**
 * Prisma Database Seed Script
 *
 * This script populates the database with initial/sample data for development.
 *
 * Usage:
 *   pnpm db:seed
 *   npx tsx prisma/seed.ts
 */

import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] Starting database seed...");

  // Create a sample session with events, outputs, and clips
  const session = await prisma.session.upsert({
    where: { id: "seed-session-001" },
    update: {},
    create: {
      id: "seed-session-001",
      workflow: "podcast",
      captureMode: "video",
      title: "Sample Podcast Recording",
      participants: ["Host", "Guest 1", "Guest 2"],
      startedAt: new Date("2024-12-28T10:00:00Z"),
      endedAt: new Date("2024-12-28T11:30:00Z"),
      events: {
        create: [
          {
            id: "seed-event-001",
            type: "CLIP_INTENT_START",
            payload: { t: 300, source: "manual" },
            ts: BigInt(1735380000000),
          },
          {
            id: "seed-event-002",
            type: "CLIP_INTENT_END",
            payload: { t: 330, source: "manual" },
            ts: BigInt(1735380030000),
          },
          {
            id: "seed-event-003",
            type: "ARTIFACT_CLIP_CREATED",
            payload: { artifactId: "seed-artifact-001", path: "/clips/sample.mp4", t0: 300, t1: 330 },
            ts: BigInt(1735380031000),
          },
        ],
      },
      outputs: {
        create: [
          {
            id: "seed-output-001",
            category: "highlight",
            title: "Great Discussion Point",
            text: "This was a really insightful moment in the podcast where we discussed the future of AI.",
            refs: ["seed-event-002"],
            meta: { confidence: 0.95 },
            status: "published",
          },
          {
            id: "seed-output-002",
            category: "summary",
            title: "Episode Summary",
            text: "In this episode, we explored various topics related to technology and innovation.",
            refs: [],
            meta: {},
            status: "draft",
          },
        ],
      },
      clips: {
        create: [
          {
            id: "seed-clip-001",
            artifactId: "seed-artifact-001",
            path: "/clips/sample.mp4",
            t0: 300.0,
            t1: 330.0,
            thumbnailId: null,
          },
        ],
      },
    },
  });

  console.log(`[seed] Created session: ${session.id}`);
  console.log("[seed] Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("[seed] Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Prisma Client Singleton
 *
 * This module provides a singleton instance of the Prisma Client for database access.
 * It ensures only one database connection is maintained throughout the application lifecycle.
 *
 * Usage:
 *   import { prisma } from './db/prisma';
 *   const sessions = await prisma.session.findMany();
 */
import { PrismaClient } from "../generated/prisma/client.js";
/**
 * Creates or returns the existing Prisma Client instance.
 * In development, the client is cached globally to prevent connection exhaustion.
 * In production, a new client is created once.
 */
function createPrismaClient() {
    const client = new PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? ["query", "info", "warn", "error"]
            : ["warn", "error"],
    });
    return client;
}
// Use global instance in development to survive hot-reloads
export const prisma = globalThis.__prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = prisma;
}
/**
 * Gracefully disconnect the Prisma client.
 * Should be called during application shutdown.
 */
export async function disconnectPrisma() {
    await prisma.$disconnect();
}
/**
 * Health check for database connectivity.
 * Returns true if the database is reachable, false otherwise.
 */
export async function checkDatabaseHealth() {
    try {
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error("[db] Health check failed:", error);
        return false;
    }
}

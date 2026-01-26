/**
 * Vitest Test Setup for Desktop Companion (Backend)
 *
 * This file runs before all tests and sets up:
 * - Environment variables for testing
 * - Database mocking utilities
 * - Global test utilities
 */

import { vi, beforeAll, afterAll, afterEach } from "vitest";

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-key-for-testing";
process.env.DATABASE_URL = "file:./test.db";
process.env.PORT = "3123";
process.env.WS_PORT = "3124";

// Mock Prisma client
vi.mock("../db/prisma.js", () => {
  return {
    prisma: {
      session: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      output: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      clip: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      aPIKey: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      event: {
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $transaction: vi.fn((fn) => fn({
        session: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        output: { deleteMany: vi.fn() },
        clip: { deleteMany: vi.fn() },
        event: { deleteMany: vi.fn() },
      })),
    },
  };
});

// Global test utilities
beforeAll(() => {
  // Setup before all tests
});

afterAll(() => {
  // Cleanup after all tests
});

afterEach(() => {
  // Reset mocks after each test
  vi.clearAllMocks();
});

// Export test utilities
export function createMockSession(overrides = {}) {
  return {
    id: "test-session-id",
    workflow: "streamer",
    captureMode: "av",
    title: "Test Session",
    participants: ["Host"],
    startedAt: new Date(),
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockOutput(overrides = {}) {
  return {
    id: "test-output-id",
    sessionId: "test-session-id",
    category: "social_post",
    title: "Test Output",
    text: "Test content",
    refs: [],
    meta: {},
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockClip(overrides = {}) {
  return {
    id: "test-clip-id",
    sessionId: "test-session-id",
    artifactId: "test-artifact-id",
    path: "/clips/test.mp4",
    t0: 0,
    t1: 30,
    thumbnailId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockUser(overrides = {}) {
  return {
    id: "test-user-id",
    email: "test@example.com",
    passwordHash: "$2b$10$test-hash",
    name: "Test User",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

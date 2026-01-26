/**
 * Vitest Test Setup for Web App (Frontend)
 *
 * This file runs before all tests and sets up:
 * - DOM testing environment (jsdom)
 * - React Testing Library matchers
 * - MSW for API mocking
 * - Global test utilities
 */

import { vi, beforeAll, afterAll, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3123";
process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:3124";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event("open"));
    }, 10);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close"));
  });
}

// @ts-ignore
global.WebSocket = MockWebSocket;

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });

// Global setup/teardown
beforeAll(() => {
  // Setup before all tests
});

afterAll(() => {
  // Cleanup after all tests
});

afterEach(() => {
  // Reset mocks after each test
  vi.clearAllMocks();
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  sessionStorageMock.getItem.mockReset();
  sessionStorageMock.setItem.mockReset();
});

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock API response
 */
export function createMockResponse<T>(data: T, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides = {}) {
  return {
    id: "test-session-id",
    name: "Test Session",
    workflow: "content_creator",
    captureMode: "audio_video",
    status: "ended" as const,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    duration: "00:30:00",
    clipCount: 5,
    outputCount: 10,
    ...overrides,
  };
}

/**
 * Create a mock API session response
 */
export function createMockApiSession(overrides = {}) {
  return {
    id: "test-session-id",
    workflow: "streamer",
    captureMode: "av",
    title: "Test Session",
    participants: ["Host"],
    startedAt: new Date().toISOString(),
    endedAt: null,
    isActive: true,
    counts: {
      events: 100,
      outputs: 10,
      clips: 5,
    },
    ...overrides,
  };
}

/**
 * Mock the fetch function for a specific endpoint
 */
export function mockFetch(response: unknown, ok = true, status = 200) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    createMockResponse(response, ok, status)
  );
}

/**
 * Mock fetch to reject with an error
 */
export function mockFetchError(error: Error | string) {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
    typeof error === "string" ? new Error(error) : error
  );
}

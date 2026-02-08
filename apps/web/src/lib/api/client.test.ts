/**
 * Tests for API client timeout handling (SOC-409)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiError, ValidationError } from "./client";
import { z } from "zod";

// Test schema for validation
const testSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type TestData = z.infer<typeof testSchema>;

/**
 * Creates a mock fetch that respects the AbortController signal.
 * When the signal fires abort, the promise rejects with an AbortError
 * (matching real fetch behavior).
 */
function createAbortAwareFetchMock() {
  return vi.fn((_url: string | URL | Request, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal;
      if (signal) {
        const onAbort = () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener("abort", onAbort);
      }
      // Otherwise never resolves (simulates slow server)
    })
  );
}

/**
 * Helper to safely capture a rejected promise's error value
 * while preventing unhandled rejection warnings.
 */
function captureRejection<T>(promise: Promise<T>): Promise<unknown> {
  return promise.then(
    () => { throw new Error("Expected promise to reject"); },
    (e) => e
  );
}

describe("API Client - Timeout Handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Default timeout behavior", () => {
    it("should use default timeout of 30 seconds", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      global.fetch = createAbortAwareFetchMock();

      const errorPromise = captureRejection(apiClient.get<TestData>("/test"));

      // Fast-forward time to just before timeout
      await vi.advanceTimersByTimeAsync(29999);
      expect(abortSpy).not.toHaveBeenCalled();

      // Fast-forward to trigger timeout
      await vi.advanceTimersByTimeAsync(1);
      expect(abortSpy).toHaveBeenCalled();

      // Wait for promise to reject
      const error = await errorPromise;
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 0,
        statusText: "Request Timeout",
        body: { message: "Request timed out after 30000ms" },
      });
    });

    it("should clear timeout on successful request", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ id: "1", name: "Test" }),
      });

      await apiClient.get<TestData>("/test", testSchema);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("should clear timeout on request error", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(apiClient.get<TestData>("/test")).rejects.toThrow();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("Custom timeout configuration", () => {
    it("should respect custom timeout value for GET requests", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      global.fetch = createAbortAwareFetchMock();

      const errorPromise = captureRejection(
        apiClient.get<TestData>("/test", { timeout: 5000, params: {} })
      );

      // Fast-forward to custom timeout
      await vi.advanceTimersByTimeAsync(5000);
      expect(abortSpy).toHaveBeenCalled();

      const error = await errorPromise;
      expect(error).toMatchObject({
        body: { message: "Request timed out after 5000ms" },
      });
    });

    it("should respect custom timeout value for POST requests", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      global.fetch = createAbortAwareFetchMock();

      const errorPromise = captureRejection(
        apiClient.post<TestData>("/test", { data: "test" }, { timeout: 1000 })
      );

      await vi.advanceTimersByTimeAsync(1000);
      expect(abortSpy).toHaveBeenCalled();

      const error = await errorPromise;
      expect(error).toMatchObject({
        body: { message: "Request timed out after 1000ms" },
      });
    });

    it("should respect custom timeout value for PUT requests", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      global.fetch = createAbortAwareFetchMock();

      const errorPromise = captureRejection(
        apiClient.put<TestData>("/test", { data: "test" }, { timeout: 2000 })
      );

      await vi.advanceTimersByTimeAsync(2000);
      expect(abortSpy).toHaveBeenCalled();

      const error = await errorPromise;
      expect(error).toBeInstanceOf(ApiError);
    });

    it("should respect custom timeout value for PATCH requests", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      global.fetch = createAbortAwareFetchMock();

      const errorPromise = captureRejection(
        apiClient.patch<TestData>("/test", { data: "test" }, { timeout: 3000 })
      );

      await vi.advanceTimersByTimeAsync(3000);
      expect(abortSpy).toHaveBeenCalled();

      const error = await errorPromise;
      expect(error).toBeInstanceOf(ApiError);
    });

    it("should respect custom timeout value for DELETE requests", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      global.fetch = createAbortAwareFetchMock();

      const errorPromise = captureRejection(
        apiClient.delete<TestData>("/test", { timeout: 4000 })
      );

      await vi.advanceTimersByTimeAsync(4000);
      expect(abortSpy).toHaveBeenCalled();

      const error = await errorPromise;
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("Timeout with schema validation", () => {
    it("should timeout even when using schema validation", async () => {
      global.fetch = createAbortAwareFetchMock();

      const errorPromise = captureRejection(
        apiClient.get<TestData>("/test", testSchema, { timeout: 1000 })
      );

      await vi.advanceTimersByTimeAsync(1000);

      const error = await errorPromise;
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        statusText: "Request Timeout",
      });
    });

    it("should clear timeout after successful validation", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ id: "1", name: "Test" }),
      });

      await apiClient.get<TestData>("/test", testSchema, { timeout: 5000 });

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("should clear timeout after validation error", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ invalid: "data" }), // Doesn't match schema
      });

      await expect(
        apiClient.get<TestData>("/test", testSchema, { timeout: 5000 })
      ).rejects.toThrow(ValidationError);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("AbortController integration", () => {
    it("should pass AbortController signal to fetch", async () => {
      let capturedSignal: AbortSignal | undefined;

      global.fetch = vi.fn((url, options) => {
        capturedSignal = options?.signal as AbortSignal;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ id: "1", name: "Test" }),
        });
      });

      await apiClient.get<TestData>("/test", { timeout: 5000, params: {} });

      expect(capturedSignal).toBeDefined();
      expect(capturedSignal).toBeInstanceOf(AbortSignal);
    });

    it("should abort signal when timeout is reached", async () => {
      let capturedSignal: AbortSignal | undefined;

      global.fetch = vi.fn((_url, init) => {
        capturedSignal = init?.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          if (capturedSignal) {
            capturedSignal.addEventListener("abort", () => {
              const error = new Error("The operation was aborted");
              error.name = "AbortError";
              reject(error);
            });
          }
        });
      });

      const errorPromise = captureRejection(
        apiClient.get<TestData>("/test", { timeout: 1000, params: {} })
      );

      await vi.advanceTimersByTimeAsync(1000);

      expect(capturedSignal?.aborted).toBe(true);
      const error = await errorPromise;
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("Timeout error handling", () => {
    it("should throw ApiError with status 0 for timeout", async () => {
      global.fetch = createAbortAwareFetchMock();

      const errorPromise = captureRejection(
        apiClient.get<TestData>("/test", { timeout: 1000, params: {} })
      );

      await vi.advanceTimersByTimeAsync(1000);

      const error = await errorPromise;
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 0,
        statusText: "Request Timeout",
      });
    });

    it("should include timeout duration in error message", async () => {
      global.fetch = createAbortAwareFetchMock();

      const customTimeout = 12345;
      const errorPromise = captureRejection(
        apiClient.get<TestData>("/test", { timeout: customTimeout, params: {} })
      );

      await vi.advanceTimersByTimeAsync(customTimeout);

      const error = await errorPromise;
      expect(error).toMatchObject({
        body: { message: `Request timed out after ${customTimeout}ms` },
      });
    });

    it("should not confuse AbortError with other errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Regular network error"));

      await expect(apiClient.get<TestData>("/test")).rejects.toMatchObject({
        statusText: "Network Error",
        body: { message: "Regular network error" },
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle timeout of 0 (immediate timeout)", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      global.fetch = createAbortAwareFetchMock();

      const errorPromise = captureRejection(
        apiClient.get<TestData>("/test", { timeout: 0, params: {} })
      );

      await vi.advanceTimersByTimeAsync(0);
      expect(abortSpy).toHaveBeenCalled();

      const error = await errorPromise;
      expect(error).toBeInstanceOf(ApiError);
    });

    it("should handle very long timeout values", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ id: "1", name: "Test" }),
      });

      const result = await apiClient.get<TestData>("/test", {
        timeout: 999999999,
        params: {},
      });

      expect(result).toEqual({ id: "1", name: "Test" });
    });

    it("should handle requests that complete just before timeout", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      global.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => ({ id: "1", name: "Test" }),
              });
            }, 4999);
          })
      );

      const requestPromise = apiClient.get<TestData>("/test", { timeout: 5000, params: {} });

      await vi.advanceTimersByTimeAsync(4999);
      expect(abortSpy).not.toHaveBeenCalled();

      const result = await requestPromise;
      expect(result).toEqual({ id: "1", name: "Test" });
    });
  });

  describe("Integration with other RequestOptions", () => {
    it("should work with custom headers and timeout", async () => {
      let capturedHeaders: Headers | undefined;

      global.fetch = vi.fn((url, options) => {
        capturedHeaders = new Headers(options?.headers);
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ id: "1", name: "Test" }),
        });
      });

      await apiClient.get<TestData>("/test", {
        headers: { "X-Custom": "value" },
        timeout: 5000,
      });

      expect(capturedHeaders?.get("X-Custom")).toBe("value");
    });

    it("should work with params and timeout", async () => {
      let capturedUrl: string | undefined;

      global.fetch = vi.fn((url) => {
        capturedUrl = url as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ id: "1", name: "Test" }),
        });
      });

      await apiClient.get<TestData>("/test", {
        params: { page: 1, limit: 10 },
        timeout: 5000,
      });

      expect(capturedUrl).toContain("page=1");
      expect(capturedUrl).toContain("limit=10");
    });

    it("should work with skipValidation and timeout", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ invalid: "data" }),
      });

      // Should not throw validation error when skipValidation is true
      const result = await apiClient.get<TestData>("/test", testSchema, {
        skipValidation: true,
        timeout: 5000,
      });

      expect(result).toEqual({ invalid: "data" });
    });
  });
});

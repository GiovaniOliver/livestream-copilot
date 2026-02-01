/**
 * Base API client for FluxBoard desktop companion service communication
 * Enhanced with comprehensive Zod schema validation for runtime type safety
 * and configurable request timeout handling (SOC-409)
 *
 * @module api/client
 *
 * Features:
 * - Type-safe HTTP methods (GET, POST, PUT, PATCH, DELETE)
 * - Automatic Zod schema validation
 * - Request timeout with AbortController (default: 30s)
 * - Comprehensive error handling
 * - Development mode logging
 *
 * @example Basic usage
 * ```ts
 * import { apiClient } from '@/lib/api/client';
 * import { z } from 'zod';
 *
 * const userSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 * });
 *
 * // GET request with schema validation
 * const user = await apiClient.get('/users/123', userSchema);
 *
 * // POST request with timeout
 * const newUser = await apiClient.post(
 *   '/users',
 *   userSchema,
 *   { name: 'John' },
 *   { timeout: 5000 }
 * );
 * ```
 *
 * @example Timeout configuration
 * ```ts
 * // Use default timeout (30 seconds)
 * await apiClient.get('/data');
 *
 * // Custom timeout for long-running operations
 * await apiClient.post('/process', { data }, { timeout: 60000 });
 *
 * // Quick timeout for health checks
 * await apiClient.get('/health', { timeout: 5000 });
 * ```
 *
 * @example Error handling
 * ```ts
 * try {
 *   const data = await apiClient.get('/data', schema);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     if (error.statusText === 'Request Timeout') {
 *       console.error('Request timed out after', error.body.message);
 *     } else {
 *       console.error('API error:', error.status, error.statusText);
 *     }
 *   } else if (error instanceof ValidationError) {
 *     console.error('Validation failed:', error.getFormattedErrors());
 *   }
 * }
 * ```
 */

import { z } from "zod";
import { logger } from "@/lib/logger";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3123";
const isDev = process.env.NODE_ENV === "development";

/**
 * Default request timeout in milliseconds
 * Can be overridden per-request via RequestOptions.timeout
 */
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * API error with status code and response body
 *
 * @example
 * ```ts
 * throw new ApiError(404, 'Not Found', { message: 'User not found' });
 * ```
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

/**
 * Validation error when API response doesn't match expected schema
 *
 * @example
 * ```ts
 * try {
 *   await apiClient.get('/user', userSchema);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error(error.getFormattedErrors());
 *   }
 * }
 * ```
 */
export class ValidationError extends Error {
  constructor(
    public readonly zodError: z.ZodError,
    public readonly responseData: unknown
  ) {
    super("API response validation failed");
    this.name = "ValidationError";
  }

  /**
   * Get formatted validation error messages
   */
  getFormattedErrors(): string[] {
    return this.zodError.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`
    );
  }
}

/**
 * Request configuration options
 *
 * @property {unknown} body - Request body (will be JSON.stringified)
 * @property {Record<string, string | number | boolean | undefined>} params - URL query parameters
 * @property {boolean} skipValidation - Skip Zod schema validation (use with caution)
 * @property {number} timeout - Request timeout in milliseconds (default: 30000)
 *
 * @example
 * ```ts
 * const options: RequestOptions = {
 *   headers: { 'X-Custom-Header': 'value' },
 *   timeout: 60000, // 60 seconds
 *   params: { page: 1, limit: 10 },
 * };
 * ```
 */
export interface RequestOptions extends Omit<RequestInit, "body" | "signal"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  skipValidation?: boolean;
  timeout?: number;
}

/**
 * Log request in development mode
 */
function logRequest(method: string, url: string, options?: RequestOptions): void {
  if (!isDev) return;
  logger.debug(`[API] ${method} ${url}`, options?.body ? { body: options.body } : "");
}

/**
 * Log response in development mode
 */
function logResponse(method: string, url: string, status: number, data?: unknown): void {
  if (!isDev) return;
  logger.debug(`[API] ${method} ${url} -> ${status}`, data ?? "");
}

/**
 * Log error in development mode
 */
function logError(method: string, url: string, error: unknown): void {
  if (!isDev) return;
  logger.error(`[API] ${method} ${url} -> ERROR`, error);
}

/**
 * Log validation error in development mode
 */
function logValidationError(
  method: string,
  url: string,
  error: ValidationError
): void {
  if (!isDev) return;
  logger.error(`[API] ${method} ${url} -> VALIDATION ERROR`);
  logger.error("Validation errors:", error.getFormattedErrors());
  logger.error("Response data:", error.responseData);
}

/**
 * Build URL with query parameters
 */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Make an HTTP request to the API with optional schema validation
 */
async function request<T>(
  method: string,
  path: string,
  options?: RequestOptions
): Promise<T>;

async function request<T>(
  method: string,
  path: string,
  schema: z.ZodSchema<T>,
  options?: RequestOptions
): Promise<T>;

async function request<T>(
  method: string,
  path: string,
  schemaOrOptions?: z.ZodSchema<T> | RequestOptions,
  maybeOptions?: RequestOptions
): Promise<T> {
  // Determine if schema validation is being used
  const hasSchema = schemaOrOptions && "parse" in schemaOrOptions;
  const schema = hasSchema ? (schemaOrOptions as z.ZodSchema<T>) : undefined;
  const options: RequestOptions = hasSchema
    ? (maybeOptions ?? {})
    : (schemaOrOptions as RequestOptions) ?? {};

  const {
    body,
    params,
    headers: customHeaders,
    skipValidation,
    timeout = DEFAULT_TIMEOUT,
    ...fetchOptions
  } = options;

  const url = buildUrl(path, params);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...customHeaders,
  };

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  logRequest(method, url, options);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      ...fetchOptions,
    });

    clearTimeout(timeoutId);

    let data: unknown;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    logResponse(method, url, response.status, data);

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, data);
    }

    // Validate response with Zod schema if provided
    if (schema && !skipValidation) {
      try {
        const validated = schema.parse(data);
        return validated;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationError = new ValidationError(error, data);
          logValidationError(method, url, validationError);
          throw validationError;
        }
        throw error;
      }
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    logError(method, url, error);

    if (error instanceof ApiError || error instanceof ValidationError) {
      throw error;
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(0, "Request Timeout", {
        message: `Request timed out after ${timeout}ms`,
      });
    }

    // Network or other fetch errors
    throw new ApiError(0, "Network Error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * API client with typed HTTP methods supporting Zod validation
 */
export const apiClient = {
  /**
   * Make a GET request
   */
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined> | RequestOptions): Promise<T>;
  get<T>(path: string, schema: z.ZodSchema<T>, options?: RequestOptions): Promise<T>;
  get<T>(
    path: string,
    schemaOrParams?: z.ZodSchema<T> | Record<string, string | number | boolean | undefined> | RequestOptions,
    maybeOptions?: RequestOptions
  ): Promise<T> {
    // Handle schema overload
    if (schemaOrParams && "parse" in schemaOrParams) {
      return request<T>("GET", path, schemaOrParams as z.ZodSchema<T>, maybeOptions);
    }

    // Support both params object and full options object
    const options: RequestOptions =
      typeof schemaOrParams === "object" && ("headers" in schemaOrParams || "params" in schemaOrParams)
        ? (schemaOrParams as RequestOptions)
        : { params: schemaOrParams as Record<string, string | number | boolean | undefined> };
    return request<T>("GET", path, options);
  },

  /**
   * Make a POST request
   */
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  post<T>(path: string, schema: z.ZodSchema<T>, body?: unknown, options?: RequestOptions): Promise<T>;
  post<T>(
    path: string,
    schemaOrBody?: z.ZodSchema<T> | unknown,
    bodyOrOptions?: unknown | RequestOptions,
    maybeOptions?: RequestOptions
  ): Promise<T> {
    // Handle schema overload
    if (schemaOrBody && typeof schemaOrBody === "object" && "parse" in schemaOrBody) {
      return request<T>("POST", path, schemaOrBody as z.ZodSchema<T>, {
        ...maybeOptions,
        body: bodyOrOptions,
      });
    }

    return request<T>("POST", path, {
      ...(bodyOrOptions as RequestOptions),
      body: schemaOrBody,
    });
  },

  /**
   * Make a PUT request
   */
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, schema: z.ZodSchema<T>, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(
    path: string,
    schemaOrBody?: z.ZodSchema<T> | unknown,
    bodyOrOptions?: unknown | RequestOptions,
    maybeOptions?: RequestOptions
  ): Promise<T> {
    // Handle schema overload
    if (schemaOrBody && typeof schemaOrBody === "object" && "parse" in schemaOrBody) {
      return request<T>("PUT", path, schemaOrBody as z.ZodSchema<T>, {
        ...maybeOptions,
        body: bodyOrOptions,
      });
    }

    return request<T>("PUT", path, {
      ...(bodyOrOptions as RequestOptions),
      body: schemaOrBody,
    });
  },

  /**
   * Make a PATCH request
   */
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, schema: z.ZodSchema<T>, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(
    path: string,
    schemaOrBody?: z.ZodSchema<T> | unknown,
    bodyOrOptions?: unknown | RequestOptions,
    maybeOptions?: RequestOptions
  ): Promise<T> {
    // Handle schema overload
    if (schemaOrBody && typeof schemaOrBody === "object" && "parse" in schemaOrBody) {
      return request<T>("PATCH", path, schemaOrBody as z.ZodSchema<T>, {
        ...maybeOptions,
        body: bodyOrOptions,
      });
    }

    return request<T>("PATCH", path, {
      ...(bodyOrOptions as RequestOptions),
      body: schemaOrBody,
    });
  },

  /**
   * Make a DELETE request
   */
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, schema: z.ZodSchema<T>, options?: RequestOptions): Promise<T>;
  delete<T>(
    path: string,
    schemaOrOptions?: z.ZodSchema<T> | RequestOptions,
    maybeOptions?: RequestOptions
  ): Promise<T> {
    // Handle schema overload
    if (schemaOrOptions && typeof schemaOrOptions === "object" && "parse" in schemaOrOptions) {
      return request<T>("DELETE", path, schemaOrOptions as z.ZodSchema<T>, maybeOptions);
    }

    return request<T>("DELETE", path, schemaOrOptions as RequestOptions);
  },
};

/**
 * Get the configured base URL
 */
export function getBaseUrl(): string {
  return BASE_URL;
}

/**
 * Base API client for FluxBoard desktop companion service communication
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3123";
const isDev = process.env.NODE_ENV === "development";

/**
 * API error with status code and response body
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
 * Request configuration options
 */
export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Log request in development mode
 */
function logRequest(method: string, url: string, options?: RequestOptions): void {
  if (!isDev) return;
  console.log(`[API] ${method} ${url}`, options?.body ? { body: options.body } : "");
}

/**
 * Log response in development mode
 */
function logResponse(method: string, url: string, status: number, data?: unknown): void {
  if (!isDev) return;
  console.log(`[API] ${method} ${url} -> ${status}`, data ?? "");
}

/**
 * Log error in development mode
 */
function logError(method: string, url: string, error: unknown): void {
  if (!isDev) return;
  console.error(`[API] ${method} ${url} -> ERROR`, error);
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
 * Make an HTTP request to the API
 */
async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, headers: customHeaders, ...fetchOptions } = options;
  const url = buildUrl(path, params);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...customHeaders,
  };

  logRequest(method, url, options);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...fetchOptions,
    });

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

    return data as T;
  } catch (error) {
    logError(method, url, error);

    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other fetch errors
    throw new ApiError(0, "Network Error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * API client with typed HTTP methods
 */
export const apiClient = {
  /**
   * Make a GET request
   */
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined> | RequestOptions): Promise<T> {
    // Support both params object and full options object
    const options: RequestOptions = typeof params === 'object' && ('headers' in params || 'params' in params)
      ? params as RequestOptions
      : { params: params as Record<string, string | number | boolean | undefined> };
    return request<T>("GET", path, options);
  },

  /**
   * Make a POST request
   */
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, { ...options, body });
  },

  /**
   * Make a PUT request
   */
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PUT", path, { ...options, body });
  },

  /**
   * Make a PATCH request
   */
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, { ...options, body });
  },

  /**
   * Make a DELETE request
   */
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, options);
  },
};

/**
 * Get the configured base URL
 */
export function getBaseUrl(): string {
  return BASE_URL;
}

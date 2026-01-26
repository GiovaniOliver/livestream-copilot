/**
 * Logging Module
 *
 * Provides structured logging with Pino, including:
 * - Module-scoped loggers (main, obs, stt, ffmpeg, api)
 * - Request context tracking via AsyncLocalStorage
 * - Express middleware for request/response logging
 * - Opik trace ID integration
 *
 * Note: This module reads directly from process.env to avoid circular
 * dependencies with the config module. The dotenv package is loaded
 * by the config module before any logging occurs.
 */
import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import { AsyncLocalStorage } from "async_hooks";
export const requestContext = new AsyncLocalStorage();
/**
 * Get logger configuration from environment.
 * Uses process.env directly to avoid circular dependencies with config module.
 */
function getLogConfig() {
    // Note: dotenv.config() is called by config/index.ts before the app starts,
    // so these values will be available from the .env file
    const logLevel = process.env.LOG_LEVEL || "info";
    const logFormat = process.env.LOG_FORMAT || (process.env.NODE_ENV === "production" ? "json" : "pretty");
    const isProduction = process.env.NODE_ENV === "production";
    return { logLevel, logFormat, isProduction };
}
// Base logger options
function getLoggerOptions(moduleName) {
    const { logLevel, logFormat, isProduction } = getLogConfig();
    const baseOptions = {
        level: logLevel,
        base: {
            module: moduleName,
            pid: process.pid,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
            level: (label) => ({ level: label }),
        },
        mixin: () => {
            const ctx = requestContext.getStore();
            return {
                ...(ctx?.requestId && { requestId: ctx.requestId }),
                ...(ctx?.traceId && { opikTraceId: ctx.traceId }),
            };
        },
    };
    // Use pino-pretty for development, JSON for production
    if (logFormat === "pretty" && !isProduction) {
        return {
            ...baseOptions,
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "SYS:standard",
                    ignore: "pid,hostname",
                    messageFormat: "[{module}] {msg}",
                },
            },
        };
    }
    return baseOptions;
}
// Logger factory function
export function createLogger(moduleName) {
    return pino(getLoggerOptions(moduleName));
}
// Pre-configured module loggers
export const logger = createLogger("main");
export const obsLogger = createLogger("obs");
export const sttLogger = createLogger("stt");
export const ffmpegLogger = createLogger("ffmpeg");
export const apiLogger = createLogger("api");
// Express middleware for request logging
export function requestLoggingMiddleware() {
    return (req, res, next) => {
        const requestId = req.headers["x-request-id"] || uuidv4();
        const startTime = process.hrtime.bigint();
        // Extract Opik trace ID from header if present
        const traceId = req.headers["x-opik-trace-id"];
        // Set request ID header on response
        res.setHeader("x-request-id", requestId);
        // Create request context
        const ctx = {
            requestId,
            traceId,
        };
        // Log request
        const requestInfo = {
            method: req.method,
            url: req.originalUrl,
            path: req.path,
            query: req.query,
            userAgent: req.headers["user-agent"],
            contentLength: req.headers["content-length"],
            ip: req.ip || req.socket.remoteAddress,
        };
        apiLogger.info({ request: requestInfo }, `Incoming ${req.method} ${req.path}`);
        // Capture response on finish
        res.on("finish", () => {
            const endTime = process.hrtime.bigint();
            const responseTimeMs = Number(endTime - startTime) / 1e6;
            const responseInfo = {
                statusCode: res.statusCode,
                responseTime: Math.round(responseTimeMs * 100) / 100,
                contentLength: res.getHeader("content-length"),
            };
            const logLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
            apiLogger[logLevel]({ request: requestInfo, response: responseInfo, requestId, ...(traceId && { opikTraceId: traceId }) }, `${req.method} ${req.path} ${res.statusCode} - ${responseInfo.responseTime}ms`);
        });
        // Run the rest of the middleware chain with request context
        requestContext.run(ctx, () => {
            next();
        });
    };
}
// Helper to set Opik trace ID in current context (for use within request handlers)
export function setOpikTraceId(traceId) {
    const ctx = requestContext.getStore();
    if (ctx) {
        ctx.traceId = traceId;
    }
}
// Helper to get current request ID
export function getRequestId() {
    return requestContext.getStore()?.requestId;
}
// Helper to get current Opik trace ID
export function getOpikTraceId() {
    return requestContext.getStore()?.traceId;
}

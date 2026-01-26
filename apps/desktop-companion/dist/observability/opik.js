/**
 * Opik Observability Integration
 *
 * Provides tracing and observability for LLM applications using Opik.
 * Gracefully degrades when Opik is not configured.
 */
import { Opik } from "opik";
import { config } from "../config/index.js";
let client = null;
let enabled = false;
export function isOpikEnabled() {
    return enabled;
}
export function getOpikClient() {
    if (client)
        return client;
    // Opik can be configured entirely via environment variables.
    // If API key/workspace are missing, we keep instrumentation disabled.
    const hasWorkspace = !!config.OPIK_WORKSPACE_NAME;
    const hasProject = !!config.OPIK_PROJECT_NAME;
    enabled = hasWorkspace && hasProject; // allow self-hosted without API key
    if (!enabled)
        return null;
    client = new Opik();
    return client;
}
export async function withOpikTrace(args, fn) {
    const c = getOpikClient();
    if (!c) {
        const r = await fn({
            traceId: undefined,
            startSpan: () => ({ spanId: undefined, end: () => void 0 }),
        });
        return { result: r.result };
    }
    const trace = c.trace({
        name: args.name,
        input: args.input,
        metadata: args.metadata,
    });
    const traceId = trace?.id;
    const startSpan = (spanArgs) => {
        const s = trace.span?.({
            name: spanArgs.name,
            type: spanArgs.type || "custom",
            input: spanArgs.input,
            output: spanArgs.output,
        });
        const spanId = s?.id;
        return {
            spanId,
            end: (output) => {
                try {
                    if (output !== undefined && s?.output !== undefined) {
                        s.output = output;
                    }
                }
                catch {
                    // best-effort
                }
                s?.end();
            },
        };
    };
    try {
        const r = await fn({ traceId, startSpan });
        trace.end();
        // Flush so traces show up quickly in demos.
        await c.flush?.();
        return { result: r.result, traceId };
    }
    catch (err) {
        try {
            trace.end();
            await c.flush?.();
        }
        catch {
            // ignore
        }
        throw err;
    }
}

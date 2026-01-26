/**
 * Opik Observability Integration
 *
 * Provides tracing and observability for LLM applications using Opik.
 * Gracefully degrades when Opik is not configured.
 */

import { Opik } from "opik";
import { config } from "../config/index.js";

export type OpikTraceLike = {
  id?: string;
  span?: (args: any) => { id?: string; end: () => void };
  end: () => void;
};

let client: Opik | null = null;
let enabled = false;

export function isOpikEnabled() {
  return enabled;
}

export function getOpikClient(): Opik | null {
  if (client) return client;

  // Opik can be configured entirely via environment variables.
  // If API key/workspace are missing, we keep instrumentation disabled.
  const hasWorkspace = !!config.OPIK_WORKSPACE_NAME;
  const hasProject = !!config.OPIK_PROJECT_NAME;

  enabled = hasWorkspace && hasProject; // allow self-hosted without API key
  if (!enabled) return null;

  client = new Opik();
  return client;
}

export async function withOpikTrace<T>(
  args: {
    name: string;
    input?: any;
    metadata?: Record<string, any>;
  },
  fn: (ctx: { traceId?: string; startSpan: (span: { name: string; type?: string; input?: any; output?: any }) => { spanId?: string; end: (output?: any) => void } }) => Promise<{ output?: any; result: T }>
): Promise<{ result: T; traceId?: string }> {
  const c = getOpikClient();
  if (!c) {
    const r = await fn({
      traceId: undefined,
      startSpan: () => ({ spanId: undefined, end: () => void 0 }),
    });
    return { result: r.result };
  }

  const trace: OpikTraceLike = c.trace({
    name: args.name,
    input: args.input,
    metadata: args.metadata,
  }) as any;

  const traceId = (trace as any)?.id;

  const startSpan = (spanArgs: { name: string; type?: string; input?: any; output?: any }) => {
    const s = trace.span?.({
      name: spanArgs.name,
      type: spanArgs.type || "custom",
      input: spanArgs.input,
      output: spanArgs.output,
    }) as any;

    const spanId = (s as any)?.id;

    return {
      spanId,
      end: (output?: any) => {
        try {
          if (output !== undefined && (s as any)?.output !== undefined) {
            (s as any).output = output;
          }
        } catch {
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
    await (c as any).flush?.();
    return { result: r.result, traceId };
  } catch (err) {
    try {
      trace.end();
      await (c as any).flush?.();
    } catch {
      // ignore
    }
    throw err;
  }
}

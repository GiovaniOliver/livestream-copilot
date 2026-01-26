/**
 * AI Client
 *
 * Abstraction layer for AI providers (Anthropic Claude, OpenAI).
 * Provides a unified interface for chat completions.
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger/index.js";
import { config } from "../config/index.js";
import { getOpikClient } from "../observability/opik.js";
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
} from "./types.js";

const aiLogger = logger.child({ module: "ai-client" });

/**
 * AI client instance (singleton).
 */
let anthropicClient: Anthropic | null = null;

/**
 * Get or create the Anthropic client.
 */
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!config.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for AI agent operations");
    }
    anthropicClient = new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    });
    aiLogger.info("Anthropic client initialized");
  }
  return anthropicClient;
}

/**
 * Complete a chat using Anthropic Claude.
 */
async function completeWithAnthropic(
  request: CompletionRequest
): Promise<CompletionResponse> {
  const client = getAnthropicClient();

  // Convert messages - separate system from user/assistant
  const systemMessage = request.systemPrompt || request.messages.find(m => m.role === "system")?.content;
  const chatMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await client.messages.create({
    model: request.model,
    max_tokens: request.maxTokens,
    temperature: request.temperature ?? 0.7,
    system: systemMessage,
    messages: chatMessages,
  });

  // Extract text content
  const textContent = response.content.find((c: { type: string }) => c.type === "text");
  const content = textContent?.type === "text" ? (textContent as { type: "text"; text: string }).text : "";

  return {
    content,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    finishReason: response.stop_reason || "end_turn",
  };
}

/**
 * Complete a chat using the configured AI provider.
 * Currently supports Anthropic Claude.
 * Includes Opik tracing when configured.
 */
export async function complete(
  request: CompletionRequest
): Promise<CompletionResponse> {
  const provider = config.AI_PROVIDER as AIProvider;

  aiLogger.debug(
    {
      provider,
      model: request.model,
      messageCount: request.messages.length,
      maxTokens: request.maxTokens,
    },
    "Starting AI completion"
  );

  const startTime = Date.now();

  // Create Opik trace if configured
  const opikClient = getOpikClient();
  const trace = opikClient?.trace({
    name: "ai.completion",
    input: {
      provider,
      model: request.model,
      messageCount: request.messages.length,
      maxTokens: request.maxTokens,
    },
    metadata: {
      provider,
      model: request.model,
    },
  });

  try {
    let response: CompletionResponse;

    switch (provider) {
      case "anthropic":
        response = await completeWithAnthropic(request);
        break;
      case "openai":
        // OpenAI support can be added later
        throw new Error("OpenAI provider not yet implemented");
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }

    const durationMs = Date.now() - startTime;

    aiLogger.info(
      {
        provider,
        model: request.model,
        durationMs,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        finishReason: response.finishReason,
      },
      "AI completion finished"
    );

    // End trace with output
    if (trace && (trace as any).update) {
      (trace as any).update({
        output: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          finishReason: response.finishReason,
          durationMs,
        },
      });
    }
    trace?.end();

    // Flush traces for immediate visibility
    await (opikClient as any)?.flush?.();

    return response;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    aiLogger.error(
      {
        err: error,
        provider,
        model: request.model,
        durationMs,
      },
      "AI completion failed"
    );

    // End trace with error
    if (trace && (trace as any).update) {
      (trace as any).update({
        output: {
          error: error instanceof Error ? error.message : String(error),
          durationMs,
        },
      });
    }
    trace?.end();
    await (opikClient as any)?.flush?.();

    throw error;
  }
}

/**
 * Check if the AI client is configured and ready.
 */
export function isAIConfigured(): boolean {
  const provider = config.AI_PROVIDER as AIProvider;

  switch (provider) {
    case "anthropic":
      return !!config.ANTHROPIC_API_KEY;
    case "openai":
      return !!config.OPENAI_API_KEY;
    default:
      return false;
  }
}

/**
 * Get the default model for the configured provider.
 */
export function getDefaultModel(): string {
  return config.AI_MODEL;
}

/**
 * Get the default max tokens.
 */
export function getDefaultMaxTokens(): number {
  return config.AI_MAX_TOKENS;
}

/**
 * AI Client
 *
 * Abstraction layer for AI providers (Anthropic Claude, OpenAI).
 * Provides a unified interface for chat completions.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { logger } from "../logger/index.js";
import { config } from "../config/index.js";
import { getOpikClient } from "../observability/opik.js";
import type {
  AIProvider,
  CompletionRequest,
  CompletionResponse,
} from "./types.js";

const aiLogger = logger.child({ module: "ai-client" });
const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o-mini",
};

/**
 * AI client instance (singleton).
 */
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

type ResolvedProvider = {
  provider: AIProvider | null;
  fallbackFrom?: AIProvider;
};

function looksLikeAnthropicModel(model: string): boolean {
  return /^claude/i.test(model);
}

function looksLikeOpenAIModel(model: string): boolean {
  return /^(gpt|o\d|chatgpt)/i.test(model);
}

function resolveProvider(): ResolvedProvider {
  const preferred = config.AI_PROVIDER as AIProvider;

  if (preferred === "anthropic") {
    if (config.ANTHROPIC_API_KEY) {
      return { provider: "anthropic" };
    }
    if (config.OPENAI_API_KEY) {
      return { provider: "openai", fallbackFrom: "anthropic" };
    }
    return { provider: null };
  }

  if (preferred === "openai") {
    if (config.OPENAI_API_KEY) {
      return { provider: "openai" };
    }
    if (config.ANTHROPIC_API_KEY) {
      return { provider: "anthropic", fallbackFrom: "openai" };
    }
    return { provider: null };
  }

  return { provider: null };
}

function resolveModel(
  requestedModel: string | undefined,
  provider: AIProvider
): string {
  const configuredModel = (requestedModel || config.AI_MODEL || "").trim();

  if (!configuredModel) {
    return DEFAULT_MODELS[provider];
  }

  if (provider === "anthropic" && looksLikeOpenAIModel(configuredModel)) {
    return DEFAULT_MODELS.anthropic;
  }

  if (provider === "openai" && looksLikeAnthropicModel(configuredModel)) {
    return DEFAULT_MODELS.openai;
  }

  return configuredModel;
}

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
 * Get or create the OpenAI client.
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!config.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for AI agent operations");
    }
    openaiClient = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
    aiLogger.info("OpenAI client initialized");
  }
  return openaiClient;
}

/**
 * Complete a chat using Anthropic Claude.
 */
async function completeWithAnthropic(
  request: CompletionRequest
): Promise<CompletionResponse> {
  const client = getAnthropicClient();
  const model = resolveModel(request.model, "anthropic");

  // Convert messages - separate system from user/assistant
  const systemMessage = request.systemPrompt || request.messages.find(m => m.role === "system")?.content;
  const chatMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await client.messages.create({
    model,
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
 * Complete a chat using OpenAI chat completions.
 */
async function completeWithOpenAI(
  request: CompletionRequest
): Promise<CompletionResponse> {
  const client = getOpenAIClient();
  const model = resolveModel(request.model, "openai");
  const systemMessage =
    request.systemPrompt || request.messages.find((m) => m.role === "system")?.content;
  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = systemMessage
    ? [{ role: "system", content: systemMessage }, ...chatMessages]
    : chatMessages;

  const response = await client.chat.completions.create({
    model,
    max_tokens: request.maxTokens,
    temperature: request.temperature ?? 0.7,
    messages,
  });

  return {
    content: response.choices[0]?.message?.content ?? "",
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
    finishReason: response.choices[0]?.finish_reason || "stop",
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
  const resolved = resolveProvider();
  const provider = resolved.provider;
  const model = provider ? resolveModel(request.model, provider) : request.model;

  if (!provider) {
    throw new Error(
      "No supported AI provider is configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
    );
  }

  if (resolved.fallbackFrom) {
    aiLogger.warn(
      {
        preferredProvider: resolved.fallbackFrom,
        fallbackProvider: provider,
      },
      "Preferred AI provider is unavailable, using configured fallback"
    );
  }

  aiLogger.debug(
    {
      provider,
      model,
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
      model,
      messageCount: request.messages.length,
      maxTokens: request.maxTokens,
    },
    metadata: {
      provider,
      model,
    },
  });

  try {
    let response: CompletionResponse;

    switch (provider) {
      case "anthropic":
        response = await completeWithAnthropic({ ...request, model });
        break;
      case "openai":
        response = await completeWithOpenAI({ ...request, model });
        break;
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }

    const durationMs = Date.now() - startTime;

    aiLogger.info(
      {
        provider,
        model,
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
        model,
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
  return resolveProvider().provider !== null;
}

/**
 * Get the default model for the configured provider.
 */
export function getDefaultModel(): string {
  const provider = resolveProvider().provider ?? (config.AI_PROVIDER as AIProvider);
  return resolveModel(config.AI_MODEL, provider);
}

/**
 * Get the default max tokens.
 */
export function getDefaultMaxTokens(): number {
  return config.AI_MAX_TOKENS;
}

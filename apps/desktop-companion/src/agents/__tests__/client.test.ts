import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockConfig: {
    AI_PROVIDER: "anthropic",
    ANTHROPIC_API_KEY: "anthropic-key",
    OPENAI_API_KEY: undefined,
    AI_MODEL: "claude-sonnet-4-20250514",
    AI_MAX_TOKENS: 4096,
  } as {
    AI_PROVIDER: string;
    ANTHROPIC_API_KEY: string | undefined;
    OPENAI_API_KEY: string | undefined;
    AI_MODEL: string;
    AI_MAX_TOKENS: number;
  },
  anthropicCtor: vi.fn(),
  anthropicCreate: vi.fn(),
  openaiCtor: vi.fn(),
  openaiCreate: vi.fn(),
}));

vi.mock("../../logger/index.js", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("../../config/index.js", () => ({
  config: mocks.mockConfig,
}));

vi.mock("../../observability/opik.js", () => ({
  getOpikClient: vi.fn(() => null),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation((options: unknown) => {
    mocks.anthropicCtor(options);
    return {
      messages: {
        create: mocks.anthropicCreate,
      },
    };
  }),
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation((options: unknown) => {
    mocks.openaiCtor(options);
    return {
      chat: {
        completions: {
          create: mocks.openaiCreate,
        },
      },
    };
  }),
}));

async function loadClientModule() {
  vi.resetModules();
  return import("../client.js");
}

describe("AI client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockConfig.AI_PROVIDER = "anthropic";
    mocks.mockConfig.ANTHROPIC_API_KEY = "anthropic-key";
    mocks.mockConfig.OPENAI_API_KEY = undefined;
    mocks.mockConfig.AI_MODEL = "claude-sonnet-4-20250514";
    mocks.mockConfig.AI_MAX_TOKENS = 4096;
  });

  it("reports configured when the preferred provider key is present", async () => {
    const { isAIConfigured } = await loadClientModule();

    expect(isAIConfigured()).toBe(true);
  });

  it("falls back to the alternate provider when the preferred key is missing", async () => {
    mocks.mockConfig.ANTHROPIC_API_KEY = undefined;
    mocks.mockConfig.OPENAI_API_KEY = "openai-key";

    const { isAIConfigured } = await loadClientModule();

    expect(isAIConfigured()).toBe(true);
  });

  it("switches to an OpenAI-safe default model when falling back from Anthropic", async () => {
    mocks.mockConfig.ANTHROPIC_API_KEY = undefined;
    mocks.mockConfig.OPENAI_API_KEY = "openai-key";
    mocks.mockConfig.AI_MODEL = "claude-sonnet-4-20250514";

    const { getDefaultModel } = await loadClientModule();

    expect(getDefaultModel()).toBe("gpt-4o-mini");
  });

  it("uses OpenAI chat completions when OpenAI is the only configured provider", async () => {
    mocks.mockConfig.ANTHROPIC_API_KEY = undefined;
    mocks.mockConfig.OPENAI_API_KEY = "openai-key";
    mocks.mockConfig.AI_MODEL = "claude-sonnet-4-20250514";
    mocks.openaiCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Draft social post",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 7,
      },
    });

    const { complete } = await loadClientModule();
    const response = await complete({
      messages: [{ role: "user", content: "Write a short post" }],
      model: "claude-sonnet-4-20250514",
      maxTokens: 150,
      temperature: 0.2,
      systemPrompt: "You write short posts.",
    });

    expect(mocks.openaiCtor).toHaveBeenCalledWith({ apiKey: "openai-key" });
    expect(mocks.openaiCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        max_tokens: 150,
        temperature: 0.2,
        messages: [
          { role: "system", content: "You write short posts." },
          { role: "user", content: "Write a short post" },
        ],
      })
    );
    expect(response).toEqual({
      content: "Draft social post",
      usage: {
        inputTokens: 12,
        outputTokens: 7,
      },
      finishReason: "stop",
    });
  });
});

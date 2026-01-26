/**
 * Speech-to-Text Module
 *
 * Factory functions and exports for STT providers.
 * Currently supports Deepgram as the primary provider.
 */

import type { WebSocketServer } from "ws";
import { config } from "../config/index.js";
import { DeepgramSTTProvider, createDeepgramProvider } from "./deepgram.js";
import type { STTProvider, STTProviderFactory, DeepgramConfig } from "./types.js";

// Re-export types
export * from "./types.js";
export { DeepgramSTTProvider, createDeepgramProvider } from "./deepgram.js";

/**
 * Supported STT providers
 */
export type STTProviderName = "deepgram" | "assemblyai" | "whisper";

/**
 * STT Provider configuration map
 */
export interface STTProviderConfigs {
  deepgram?: Partial<DeepgramConfig>;
}

/**
 * Get the configured STT provider name from config
 */
export function getConfiguredProvider(): STTProviderName {
  const provider = config.STT_PROVIDER;

  switch (provider) {
    case "deepgram":
      return "deepgram";
    case "assemblyai":
      return "assemblyai";
    case "whisper":
      return "whisper";
    default:
      // Default to Deepgram if not specified or invalid
      console.warn(`[stt] Unknown provider "${provider}", defaulting to deepgram`);
      return "deepgram";
  }
}

/**
 * Create an STT provider based on the configured provider name
 *
 * @param wss - WebSocket server for emitting events
 * @param providerName - Optional provider name (defaults to env configuration)
 * @param configs - Optional provider-specific configurations
 * @returns STT provider instance
 */
export function createSTTProvider(
  wss: WebSocketServer,
  providerName?: STTProviderName,
  configs?: STTProviderConfigs
): STTProvider {
  const provider = providerName || getConfiguredProvider();

  switch (provider) {
    case "deepgram":
      return createDeepgramProvider(wss, configs?.deepgram);
    case "assemblyai":
    case "whisper":
      throw new Error(`STT provider "${provider}" is not yet implemented`);
    default:
      throw new Error(`Unknown STT provider: ${provider}`);
  }
}

/**
 * Factory function registry for dynamic provider creation
 */
const providerFactories: Record<string, STTProviderFactory> = {
  deepgram: (wss) => createDeepgramProvider(wss),
};

/**
 * Register a custom STT provider factory
 *
 * @param name - Provider name
 * @param factory - Factory function to create the provider
 */
export function registerSTTProviderFactory(
  name: string,
  factory: STTProviderFactory
): void {
  providerFactories[name] = factory;
}

/**
 * Get a provider factory by name
 *
 * @param name - Provider name
 * @returns Factory function or undefined
 */
export function getSTTProviderFactory(name: STTProviderName): STTProviderFactory | undefined {
  return providerFactories[name];
}

/**
 * List available STT providers
 *
 * @returns Array of provider names
 */
export function listSTTProviders(): STTProviderName[] {
  return Object.keys(providerFactories) as STTProviderName[];
}

/**
 * Check if a provider is available (has API key configured)
 *
 * @param name - Provider name
 * @returns Whether the provider is configured and available
 */
export function isSTTProviderAvailable(name: STTProviderName): boolean {
  switch (name) {
    case "deepgram":
      return !!config.DEEPGRAM_API_KEY;
    case "assemblyai":
      return !!config.ASSEMBLYAI_API_KEY;
    case "whisper":
      return !!config.WHISPER_MODEL_PATH;
    default:
      return false;
  }
}

/**
 * STT Manager - Singleton for managing the active STT provider
 *
 * Provides a centralized way to manage STT state across the application.
 */
export class STTManager {
  private static instance: STTManager | null = null;
  private provider: STTProvider | null = null;
  private wss: WebSocketServer | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): STTManager {
    if (!STTManager.instance) {
      STTManager.instance = new STTManager();
    }
    return STTManager.instance;
  }

  /**
   * Initialize the manager with a WebSocket server
   */
  initialize(wss: WebSocketServer): void {
    this.wss = wss;
  }

  /**
   * Get the current provider
   */
  getProvider(): STTProvider | null {
    return this.provider;
  }

  /**
   * Create and set the active provider
   */
  createProvider(providerName?: STTProviderName, configs?: STTProviderConfigs): STTProvider {
    if (!this.wss) {
      throw new Error("STTManager not initialized. Call initialize() first.");
    }

    // Stop existing provider if any
    if (this.provider) {
      this.provider.stop().catch(console.error);
    }

    this.provider = createSTTProvider(this.wss, providerName, configs);
    return this.provider;
  }

  /**
   * Stop and clear the active provider
   */
  async stopProvider(): Promise<void> {
    if (this.provider) {
      await this.provider.stop();
      this.provider = null;
    }
  }

  /**
   * Get provider status
   */
  getStatus(): { active: boolean; provider: string | null; status: string | null } {
    if (!this.provider) {
      return { active: false, provider: null, status: null };
    }
    return {
      active: true,
      provider: this.provider.name,
      status: this.provider.status,
    };
  }
}

// Export singleton instance getter
export const getSTTManager = STTManager.getInstance;

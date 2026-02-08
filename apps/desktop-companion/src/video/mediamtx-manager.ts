/**
 * MediaMTX Manager
 *
 * Manages the MediaMTX media server process lifecycle for live video streaming.
 * MediaMTX provides RTMP ingest (for OBS) and WebRTC/HLS playback.
 *
 * @example
 * ```typescript
 * const manager = MediaMTXManager.getInstance();
 * await manager.start();
 * const status = await manager.getStatus();
 * logger.info('Stream active:', status.streamActive);
 * await manager.stop();
 * ```
 */

import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { createLogger } from "../logger/index.js";
import { logger } from '../logger/index.js';
import type {
  MediaMTXConfig,
  VideoStreamStatus,
  MediaMTXPathsResponse,
  MediaMTXYamlConfig,
} from "./types.js";

const videoLogger = createLogger("video");

/**
 * Default MediaMTX configuration
 */
const DEFAULT_CONFIG: MediaMTXConfig = {
  rtmpPort: 1935,
  webrtcPort: 8889,
  hlsPort: 8888,
  apiPort: 9997,
  enabled: true,
};

/**
 * MediaMTX process manager singleton
 */
export class MediaMTXManager {
  private static instance: MediaMTXManager | null = null;
  private process: ChildProcess | null = null;
  private config: MediaMTXConfig;
  private binaryPath: string | null = null;
  private configPath: string | null = null;
  private baseDir: string;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    // Determine base directory (relative to this file's location in dist or src)
    // Decode URL-encoded characters (e.g., %20 for spaces) on Windows
    const urlPath = new URL(import.meta.url).pathname;
    const decodedPath = decodeURIComponent(urlPath).replace(/^\/([A-Z]:)/, "$1");
    this.baseDir = path.resolve(path.dirname(decodedPath), "..", "..");
    this.detectBinary();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MediaMTXManager {
    if (!MediaMTXManager.instance) {
      MediaMTXManager.instance = new MediaMTXManager();
    }
    return MediaMTXManager.instance;
  }

  /**
   * Detect the MediaMTX binary path
   */
  private detectBinary(): void {
    const isWindows = process.platform === "win32";
    const binaryName = isWindows ? "mediamtx.exe" : "mediamtx";

    // Check multiple possible locations
    const possiblePaths = [
      path.join(this.baseDir, "bin", binaryName),
      path.join(process.cwd(), "bin", binaryName),
      path.join(process.cwd(), "apps", "desktop-companion", "bin", binaryName),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        this.binaryPath = p;
        this.config.enabled = true;
        videoLogger.info({ binaryPath: p }, "MediaMTX binary found");
        return;
      }
    }

    this.config.enabled = false;
    videoLogger.warn(
      { searchedPaths: possiblePaths },
      "MediaMTX binary not found - video streaming disabled"
    );
  }

  /**
   * Check if MediaMTX binary exists
   */
  isBinaryAvailable(): boolean {
    return this.binaryPath !== null && fs.existsSync(this.binaryPath);
  }

  /**
   * Get current configuration
   */
  getConfig(): MediaMTXConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (must be called before start)
   */
  updateConfig(config: Partial<MediaMTXConfig>): void {
    if (this.isRunning()) {
      throw new Error("Cannot update configuration while server is running");
    }
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate MediaMTX YAML configuration file
   */
  private generateConfigFile(): string {
    const configDir = path.join(this.baseDir, "data");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, "mediamtx.yml");

    const yamlConfig: MediaMTXYamlConfig = {
      logLevel: "info",
      logDestinations: ["stdout"],
      rtmp: true,
      rtmpAddress: `:${this.config.rtmpPort}`,
      webrtc: true,
      webrtcAddress: `:${this.config.webrtcPort}`,
      webrtcLocalUDPAddress: `:${this.config.webrtcPort}`,
      webrtcLocalTCPAddress: `:${this.config.webrtcPort}`,
      hls: true,
      hlsAddress: `:${this.config.hlsPort}`,
      api: true,
      apiAddress: `:${this.config.apiPort}`,
      paths: {
        all: {},
      },
    };

    // Convert to YAML format (simple serialization)
    const yamlContent = this.serializeToYaml(yamlConfig);
    fs.writeFileSync(configPath, yamlContent, "utf8");

    videoLogger.debug({ configPath, config: yamlConfig }, "MediaMTX config file generated");
    return configPath;
  }

  /**
   * Simple YAML serializer for MediaMTX config
   */
  private serializeToYaml(config: MediaMTXYamlConfig): string {
    const lines: string[] = [
      "###############################################",
      "# MediaMTX Configuration (auto-generated)",
      "###############################################",
      "",
      `logLevel: ${config.logLevel}`,
      `logDestinations: [${config.logDestinations.join(", ")}]`,
      "",
      "###############################################",
      "# RTMP server (for OBS ingest)",
      "###############################################",
      `rtmp: ${config.rtmp}`,
      `rtmpAddress: "${config.rtmpAddress}"`,
      "",
      "###############################################",
      "# WebRTC server (for browser playback)",
      "###############################################",
      `webrtc: ${config.webrtc}`,
      `webrtcAddress: "${config.webrtcAddress}"`,
      `webrtcLocalUDPAddress: "${config.webrtcLocalUDPAddress}"`,
      `webrtcLocalTCPAddress: "${config.webrtcLocalTCPAddress}"`,
      "",
      "###############################################",
      "# HLS server (for fallback playback)",
      "###############################################",
      `hls: ${config.hls}`,
      `hlsAddress: "${config.hlsAddress}"`,
      "",
      "###############################################",
      "# API server",
      "###############################################",
      `api: ${config.api}`,
      `apiAddress: "${config.apiAddress}"`,
      "",
      "###############################################",
      "# Path configuration",
      "###############################################",
      "paths:",
      "  all:",
      "    # Allow any stream name",
    ];

    return lines.join("\n");
  }

  /**
   * Start the MediaMTX server
   */
  async start(): Promise<void> {
    if (!this.isBinaryAvailable()) {
      throw new Error("MediaMTX binary not found. Video streaming is not available.");
    }

    if (this.isRunning()) {
      videoLogger.warn("MediaMTX server is already running");
      return;
    }

    // Use the bundled config file (with API enabled) instead of generating a custom one
    // The bundled config is in the same directory as the binary
    this.configPath = path.join(path.dirname(this.binaryPath!), "mediamtx.yml");

    videoLogger.info(
      {
        binaryPath: this.binaryPath,
        configPath: this.configPath,
        config: this.config,
      },
      "Starting MediaMTX server"
    );

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.binaryPath!, [this.configPath!], {
          stdio: ["ignore", "pipe", "pipe"],
          detached: false,
        });

        // Handle stdout
        this.process.stdout?.on("data", (data: Buffer) => {
          const message = data.toString().trim();
          if (message) {
            videoLogger.debug({ mediamtx: message }, "MediaMTX stdout");
          }
        });

        // Handle stderr
        this.process.stderr?.on("data", (data: Buffer) => {
          const message = data.toString().trim();
          if (message) {
            // MediaMTX logs to stderr by default
            if (message.includes("ERR") || message.includes("error")) {
              videoLogger.error({ mediamtx: message }, "MediaMTX error");
            } else {
              videoLogger.debug({ mediamtx: message }, "MediaMTX stderr");
            }
          }
        });

        // Handle process exit
        this.process.on("exit", (code, signal) => {
          videoLogger.info({ code, signal }, "MediaMTX process exited");
          this.process = null;
        });

        // Handle errors
        this.process.on("error", (err) => {
          videoLogger.error({ err }, "MediaMTX process error");
          this.process = null;
          reject(err);
        });

        // Wait a bit for the server to start
        setTimeout(() => {
          if (this.isRunning()) {
            videoLogger.info(
              {
                rtmpPort: this.config.rtmpPort,
                webrtcPort: this.config.webrtcPort,
                hlsPort: this.config.hlsPort,
                apiPort: this.config.apiPort,
              },
              "MediaMTX server started successfully"
            );
            resolve();
          } else {
            reject(new Error("MediaMTX process failed to start"));
          }
        }, 1000);
      } catch (err) {
        videoLogger.error({ err }, "Failed to spawn MediaMTX process");
        reject(err);
      }
    });
  }

  /**
   * Stop the MediaMTX server
   */
  async stop(): Promise<void> {
    if (!this.isRunning()) {
      videoLogger.debug("MediaMTX server is not running");
      return;
    }

    videoLogger.info("Stopping MediaMTX server");

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        // Force kill if graceful shutdown fails
        if (this.process) {
          videoLogger.warn("Force killing MediaMTX process");
          this.process.kill("SIGKILL");
        }
        resolve();
      }, 5000);

      this.process.on("exit", () => {
        clearTimeout(timeout);
        this.process = null;
        videoLogger.info("MediaMTX server stopped");
        resolve();
      });

      // Send graceful shutdown signal
      if (process.platform === "win32") {
        // Windows doesn't support SIGTERM well
        this.process.kill();
      } else {
        this.process.kill("SIGTERM");
      }
    });
  }

  /**
   * Check if the MediaMTX server process is running
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Check if there's an active stream via MediaMTX API
   */
  async isStreamActive(): Promise<boolean> {
    if (!this.isRunning()) {
      return false;
    }

    try {
      const response = await fetch(
        `http://localhost:${this.config.apiPort}/v3/paths/list`
      );

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as MediaMTXPathsResponse;

      // Check if any path has an active source (stream being published)
      return data.items?.some((item) => item.ready && item.source !== null) ?? false;
    } catch (err) {
      videoLogger.debug({ err }, "Failed to check stream status via API");
      return false;
    }
  }

  /**
   * Get the current video streaming status
   */
  async getStatus(): Promise<VideoStreamStatus> {
    const enabled = this.isBinaryAvailable();
    const serverRunning = this.isRunning();
    const streamActive = serverRunning ? await this.isStreamActive() : false;

    return {
      enabled,
      serverRunning,
      streamActive,
      rtmpIngestUrl: `rtmp://localhost:${this.config.rtmpPort}/live/stream`,
      webrtcPlaybackUrl: `http://localhost:${this.config.webrtcPort}/live/stream`,
      hlsPlaybackUrl: `http://localhost:${this.config.hlsPort}/live/stream/index.m3u8`,
    };
  }

  /**
   * Get active paths from MediaMTX API
   */
  async getActivePaths(): Promise<MediaMTXPathsResponse | null> {
    if (!this.isRunning()) {
      return null;
    }

    try {
      const response = await fetch(
        `http://localhost:${this.config.apiPort}/v3/paths/list`
      );

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as MediaMTXPathsResponse;
    } catch (err) {
      videoLogger.debug({ err }, "Failed to get active paths from API");
      return null;
    }
  }

  /**
   * Cleanup resources (call on application shutdown)
   */
  async cleanup(): Promise<void> {
    await this.stop();

    // Remove config file if it exists
    if (this.configPath && fs.existsSync(this.configPath)) {
      try {
        fs.unlinkSync(this.configPath);
        videoLogger.debug({ configPath: this.configPath }, "Removed MediaMTX config file");
      } catch (err) {
        videoLogger.warn({ err, configPath: this.configPath }, "Failed to remove config file");
      }
    }
  }
}

/**
 * Get the singleton MediaMTX manager instance
 */
export function getMediaMTXManager(): MediaMTXManager {
  return MediaMTXManager.getInstance();
}

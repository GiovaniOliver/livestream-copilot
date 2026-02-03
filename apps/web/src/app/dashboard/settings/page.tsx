"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from "@/components/ui";
import { useLiveStream } from "@/hooks/useLiveStream";
import { logger } from "@/lib/logger";

// Storage keys
const OBS_SETTINGS_KEY = "fluxboard_obs_settings";
const GENERAL_SETTINGS_KEY = "fluxboard_general_settings";

// Types
interface OBSSettings {
  websocketUrl: string;
  password: string;
}

interface GeneralSettings {
  theme: "dark" | "light" | "system";
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

// Default values
const DEFAULT_OBS_SETTINGS: OBSSettings = {
  websocketUrl: "ws://localhost:4455",
  password: "",
};

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  theme: "dark",
  notificationsEnabled: true,
  soundEnabled: true,
};

// Icons
const SettingsIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const VideoIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ExclamationCircleIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    />
  </svg>
);

const InfoIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
    />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
    />
  </svg>
);

const StreamingIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.125c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

const PlayIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
    />
  </svg>
);

const StopIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
    />
  </svg>
);

const CopyIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
    />
  </svg>
);

export default function SettingsPage() {
  // OBS Settings State
  const [obsSettings, setOBSSettings] =
    useState<OBSSettings>(DEFAULT_OBS_SETTINGS);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [connectionMessage, setConnectionMessage] = useState<string>("");

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(
    DEFAULT_GENERAL_SETTINGS
  );

  // Live Stream Status
  const {
    status: videoStatus,
    isLoading: isVideoLoading,
    error: videoError,
    startServer,
    stopServer,
    isActionPending,
  } = useLiveStream();

  // Copy to clipboard helper
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    const storedOBS = localStorage.getItem(OBS_SETTINGS_KEY);
    const storedGeneral = localStorage.getItem(GENERAL_SETTINGS_KEY);

    if (storedOBS) {
      try {
        setOBSSettings(JSON.parse(storedOBS));
      } catch {
        logger.error("Failed to parse OBS settings from localStorage");
      }
    }

    if (storedGeneral) {
      try {
        setGeneralSettings(JSON.parse(storedGeneral));
      } catch {
        logger.error("Failed to parse general settings from localStorage");
      }
    }
  }, []);

  // Save OBS settings to localStorage
  const saveOBSSettings = useCallback((settings: OBSSettings) => {
    setOBSSettings(settings);
    localStorage.setItem(OBS_SETTINGS_KEY, JSON.stringify(settings));
  }, []);

  // Save general settings to localStorage
  const saveGeneralSettings = useCallback((settings: GeneralSettings) => {
    setGeneralSettings(settings);
    localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(settings));
  }, []);

  // Test OBS WebSocket connection
  const testOBSConnection = useCallback(async () => {
    setConnectionStatus("connecting");
    setConnectionMessage("Attempting to connect...");

    try {
      const ws = new WebSocket(obsSettings.websocketUrl);

      const connectionTimeout = setTimeout(() => {
        ws.close();
        setConnectionStatus("error");
        setConnectionMessage(
          "Connection timeout. Please check if OBS is running and WebSocket server is enabled."
        );
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        // Send identification message if password is set
        if (obsSettings.password) {
          // For OBS WebSocket 5.x, we need to handle the Hello message first
          // This is a simplified test - real implementation would use obs-websocket-js
          setConnectionStatus("connected");
          setConnectionMessage(
            "Successfully connected to OBS WebSocket server!"
          );
        } else {
          setConnectionStatus("connected");
          setConnectionMessage(
            "Successfully connected to OBS WebSocket server!"
          );
        }
        // Close the connection after successful test
        setTimeout(() => ws.close(), 1000);
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        setConnectionStatus("error");
        setConnectionMessage(
          "Failed to connect. Please verify the URL and ensure OBS WebSocket server is running."
        );
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        if (connectionStatus !== "connected" && connectionStatus !== "error") {
          if (event.code === 1006) {
            setConnectionStatus("error");
            setConnectionMessage(
              "Connection closed unexpectedly. OBS may not be running or WebSocket is not enabled."
            );
          }
        }
      };
    } catch {
      setConnectionStatus("error");
      setConnectionMessage("Invalid WebSocket URL format.");
    }
  }, [obsSettings.websocketUrl, obsSettings.password, connectionStatus]);

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case "connecting":
        return <Badge variant="warning">Connecting...</Badge>;
      case "connected":
        return (
          <Badge variant="success" className="gap-1.5">
            <CheckCircleIcon />
            Connected
          </Badge>
        );
      case "error":
        return (
          <Badge variant="error" className="gap-1.5">
            <ExclamationCircleIcon />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="default">Not Tested</Badge>;
    }
  };

  return (
    <>
      <DashboardHeader title="Settings" />

      <div className="p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* OBS Configuration Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple/20 text-purple">
                  <VideoIcon />
                </div>
                <div>
                  <CardTitle>OBS Configuration</CardTitle>
                  <CardDescription>
                    Connect to OBS Studio for stream control and scene
                    management
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Form */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="obs-url"
                    className="mb-2 block text-sm font-medium text-text"
                  >
                    WebSocket URL
                  </label>
                  <input
                    id="obs-url"
                    type="text"
                    value={obsSettings.websocketUrl}
                    onChange={(e) =>
                      saveOBSSettings({
                        ...obsSettings,
                        websocketUrl: e.target.value,
                      })
                    }
                    placeholder="ws://localhost:4455"
                    className="w-full rounded-xl border border-stroke bg-bg-0 px-4 py-2.5 text-sm text-text placeholder-text-dim transition-colors focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    Default OBS WebSocket port is 4455 (OBS 28+)
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="obs-password"
                    className="mb-2 block text-sm font-medium text-text"
                  >
                    WebSocket Password
                  </label>
                  <input
                    id="obs-password"
                    type="password"
                    value={obsSettings.password}
                    onChange={(e) =>
                      saveOBSSettings({
                        ...obsSettings,
                        password: e.target.value,
                      })
                    }
                    placeholder="Enter your OBS WebSocket password"
                    className="w-full rounded-xl border border-stroke bg-bg-0 px-4 py-2.5 text-sm text-text placeholder-text-dim transition-colors focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    Leave empty if authentication is disabled
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    variant="primary"
                    onClick={testOBSConnection}
                    isLoading={connectionStatus === "connecting"}
                  >
                    Test Connection
                  </Button>
                  {getConnectionStatusBadge()}
                </div>

                {connectionMessage && (
                  <div
                    className={`rounded-xl border p-3 text-sm ${
                      connectionStatus === "connected"
                        ? "border-success/30 bg-success/10 text-success"
                        : connectionStatus === "error"
                          ? "border-error/30 bg-error/10 text-error"
                          : "border-warning/30 bg-warning/10 text-warning"
                    }`}
                  >
                    {connectionMessage}
                  </div>
                )}
              </div>

              {/* Setup Instructions */}
              <div className="rounded-xl border border-stroke bg-bg-1 p-4">
                <div className="mb-3 flex items-center gap-2 text-teal">
                  <InfoIcon />
                  <span className="font-medium">Setup Instructions</span>
                </div>
                <ol className="space-y-2 text-sm text-text-muted">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      1
                    </span>
                    <span>
                      Download and install{" "}
                      <a
                        href="https://obsproject.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal hover:underline"
                      >
                        OBS Studio
                        <ExternalLinkIcon />
                      </a>{" "}
                      (version 28 or later includes WebSocket built-in)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      2
                    </span>
                    <span>
                      In OBS, go to{" "}
                      <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
                        Tools &gt; WebSocket Server Settings
                      </code>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      3
                    </span>
                    <span>
                      Check{" "}
                      <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
                        Enable WebSocket Server
                      </code>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      4
                    </span>
                    <span>
                      Set a password (recommended) and note the Server Port
                      (default: 4455)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      5
                    </span>
                    <span>
                      Copy the connection details here and click &quot;Test
                      Connection&quot;
                    </span>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Live Video Preview Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/20 text-teal">
                  <StreamingIcon />
                </div>
                <div className="flex-1">
                  <CardTitle>Live Video Preview</CardTitle>
                  <CardDescription>
                    Configure RTMP streaming for live preview in the dashboard
                  </CardDescription>
                </div>
                {/* Status Badge */}
                {isVideoLoading ? (
                  <Badge variant="default">Loading...</Badge>
                ) : videoStatus?.isStreaming ? (
                  <Badge variant="success" className="gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                    </span>
                    Streaming
                  </Badge>
                ) : videoStatus?.isRunning ? (
                  <Badge variant="teal">Server Running</Badge>
                ) : (
                  <Badge variant="default">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Message */}
              {videoError && (
                <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">
                  {videoError}
                </div>
              )}

              {/* Server Control */}
              <div className="flex items-center gap-4">
                <Button
                  variant={videoStatus?.isRunning ? "outline" : "primary"}
                  onClick={() =>
                    videoStatus?.isRunning ? stopServer() : startServer()
                  }
                  isLoading={isActionPending}
                  disabled={isActionPending}
                >
                  {videoStatus?.isRunning ? (
                    <>
                      <StopIcon />
                      Stop Server
                    </>
                  ) : (
                    <>
                      <PlayIcon />
                      Start Server
                    </>
                  )}
                </Button>
                <p className="text-xs text-text-muted">
                  {videoStatus?.isRunning
                    ? "Server is running and ready to receive streams"
                    : "Start the video server to enable RTMP streaming"}
                </p>
              </div>

              {/* RTMP Configuration */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-text">
                  OBS RTMP Settings
                </h4>
                <div className="space-y-3">
                  {/* Server URL */}
                  <div className="flex items-center gap-3 rounded-xl border border-stroke bg-bg-1 p-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-text-muted">
                        Server URL
                      </label>
                      <code className="block font-mono text-sm text-text">
                        {videoStatus?.rtmpUrl ?? "rtmp://localhost:1935/live"}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          videoStatus?.rtmpUrl ?? "rtmp://localhost:1935/live",
                          "rtmp"
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-teal"
                      title="Copy to clipboard"
                    >
                      {copiedField === "rtmp" ? (
                        <CheckCircleIcon />
                      ) : (
                        <CopyIcon />
                      )}
                    </button>
                  </div>

                  {/* Stream Key */}
                  <div className="flex items-center gap-3 rounded-xl border border-stroke bg-bg-1 p-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-text-muted">
                        Stream Key
                      </label>
                      <code className="block font-mono text-sm text-text">
                        {videoStatus?.streamKey ?? "stream"}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          videoStatus?.streamKey ?? "stream",
                          "key"
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-teal"
                      title="Copy to clipboard"
                    >
                      {copiedField === "key" ? (
                        <CheckCircleIcon />
                      ) : (
                        <CopyIcon />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stream Statistics */}
              {videoStatus?.isStreaming && videoStatus.stats && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-text">
                    Stream Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-stroke bg-bg-1 p-3">
                      <p className="text-xs text-text-muted">Resolution</p>
                      <p className="font-mono text-sm text-text">
                        {videoStatus.stats.resolution}
                      </p>
                    </div>
                    <div className="rounded-xl border border-stroke bg-bg-1 p-3">
                      <p className="text-xs text-text-muted">Bitrate</p>
                      <p className="font-mono text-sm text-text">
                        {videoStatus.stats.bitrate} kbps
                      </p>
                    </div>
                    <div className="rounded-xl border border-stroke bg-bg-1 p-3">
                      <p className="text-xs text-text-muted">FPS</p>
                      <p className="font-mono text-sm text-text">
                        {videoStatus.stats.fps}
                      </p>
                    </div>
                    <div className="rounded-xl border border-stroke bg-bg-1 p-3">
                      <p className="text-xs text-text-muted">Uptime</p>
                      <p className="font-mono text-sm text-text">
                        {Math.floor(videoStatus.stats.uptime / 60)}m{" "}
                        {videoStatus.stats.uptime % 60}s
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Setup Instructions */}
              <div className="rounded-xl border border-stroke bg-bg-1 p-4">
                <div className="mb-3 flex items-center gap-2 text-teal">
                  <InfoIcon />
                  <span className="font-medium">
                    OBS Streaming Setup Instructions
                  </span>
                </div>
                <ol className="space-y-2 text-sm text-text-muted">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      1
                    </span>
                    <span>
                      Click &quot;Start Server&quot; above to start the RTMP
                      ingest server
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      2
                    </span>
                    <span>
                      In OBS, go to{" "}
                      <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
                        Settings &gt; Stream
                      </code>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      3
                    </span>
                    <span>
                      Set Service to{" "}
                      <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
                        Custom...
                      </code>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      4
                    </span>
                    <span>
                      Paste the Server URL and Stream Key from above
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-xs font-medium text-teal">
                      5
                    </span>
                    <span>
                      Click &quot;Start Streaming&quot; in OBS - the preview
                      will appear in your dashboard
                    </span>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* General Settings Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/20 text-teal">
                  <SettingsIcon />
                </div>
                <div>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Customize your application preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Toggle */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  Theme
                </label>
                <div className="flex gap-2">
                  {(["dark", "light", "system"] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() =>
                        saveGeneralSettings({ ...generalSettings, theme })
                      }
                      className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition-all ${
                        generalSettings.theme === theme
                          ? "border-teal bg-teal/20 text-teal"
                          : "border-stroke bg-surface text-text-muted hover:border-teal/50 hover:text-text"
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-text-muted">
                  Theme switching is coming soon. Currently using dark theme.
                </p>
              </div>

              {/* Notifications */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-text">
                  Notifications
                </label>

                <div className="flex items-center justify-between rounded-xl border border-stroke bg-bg-1 p-3">
                  <div>
                    <p className="text-sm font-medium text-text">
                      Desktop Notifications
                    </p>
                    <p className="text-xs text-text-muted">
                      Receive alerts for important events
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      saveGeneralSettings({
                        ...generalSettings,
                        notificationsEnabled:
                          !generalSettings.notificationsEnabled,
                      })
                    }
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      generalSettings.notificationsEnabled
                        ? "bg-teal"
                        : "bg-stroke"
                    }`}
                    role="switch"
                    aria-checked={generalSettings.notificationsEnabled}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        generalSettings.notificationsEnabled
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-stroke bg-bg-1 p-3">
                  <div>
                    <p className="text-sm font-medium text-text">
                      Sound Effects
                    </p>
                    <p className="text-xs text-text-muted">
                      Play sounds for notifications and alerts
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      saveGeneralSettings({
                        ...generalSettings,
                        soundEnabled: !generalSettings.soundEnabled,
                      })
                    }
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      generalSettings.soundEnabled ? "bg-teal" : "bg-stroke"
                    }`}
                    role="switch"
                    aria-checked={generalSettings.soundEnabled}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        generalSettings.soundEnabled
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
                  <span className="text-sm font-bold text-text">F</span>
                </div>
                <div>
                  <CardTitle>About FluxBoard</CardTitle>
                  <CardDescription>
                    Your AI-powered livestream copilot
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-stroke bg-bg-1 p-3">
                <span className="text-sm text-text-muted">Version</span>
                <Badge variant="teal">1.0.0-beta</Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-text">Documentation</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="#"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stroke bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:border-teal hover:text-teal"
                  >
                    Getting Started
                    <ExternalLinkIcon />
                  </a>
                  <a
                    href="#"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stroke bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:border-teal hover:text-teal"
                  >
                    API Reference
                    <ExternalLinkIcon />
                  </a>
                  <a
                    href="#"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stroke bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:border-teal hover:text-teal"
                  >
                    Release Notes
                    <ExternalLinkIcon />
                  </a>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stroke bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:border-teal hover:text-teal"
                  >
                    GitHub Repository
                    <ExternalLinkIcon />
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-stroke-subtle bg-surface p-3 text-center text-xs text-text-dim">
                Made with care for content creators everywhere
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

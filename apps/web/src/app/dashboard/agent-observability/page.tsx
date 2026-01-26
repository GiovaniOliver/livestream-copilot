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

// Storage key for API configuration
const API_CONFIG_KEY = "fluxboard_api_config";

// Types
interface APIConfig {
  apiKey: string;
  endpointUrl: string;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
}

interface AgentActivity {
  id: string;
  timestamp: Date;
  agentType: string;
  actionType: string;
  status: "success" | "error" | "pending";
  duration: number;
  tokenCount: number;
}

// Default values
const DEFAULT_API_CONFIG: APIConfig = {
  apiKey: "",
  endpointUrl: "https://api.openai.com/v1",
  rateLimitPerMinute: 60,
  rateLimitPerDay: 10000,
};

// Placeholder metrics
const PLACEHOLDER_METRICS = {
  totalApiCalls: 1247,
  avgResponseTime: 342,
  tokenUsage: 45892,
  errorRate: 0.8,
};

// Placeholder activity log
const PLACEHOLDER_ACTIVITIES: AgentActivity[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    agentType: "Content Creator",
    actionType: "Clip Detection",
    status: "success",
    duration: 234,
    tokenCount: 512,
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    agentType: "Podcast",
    actionType: "Summary Generation",
    status: "success",
    duration: 1520,
    tokenCount: 2048,
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    agentType: "Script Studio",
    actionType: "Content Analysis",
    status: "pending",
    duration: 0,
    tokenCount: 0,
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    agentType: "Mind Map",
    actionType: "Idea Extraction",
    status: "error",
    duration: 45,
    tokenCount: 128,
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 18 * 60 * 1000),
    agentType: "Debate Room",
    actionType: "Argument Generation",
    status: "success",
    duration: 890,
    tokenCount: 1536,
  },
  {
    id: "6",
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    agentType: "Writers Corner",
    actionType: "Script Enhancement",
    status: "success",
    duration: 678,
    tokenCount: 1024,
  },
];

// Icons
const ChartBarIcon = () => (
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
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const ClockIcon = () => (
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
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CpuChipIcon = () => (
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
      d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z"
    />
  </svg>
);

const ExclamationTriangleIcon = () => (
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
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

const SignalIcon = () => (
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
      d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

const KeyIcon = () => (
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
      d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
    />
  </svg>
);

const EyeIcon = () => (
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
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const EyeSlashIcon = () => (
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
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

// Helper to format timestamp
const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

// Helper to format duration
const formatDuration = (ms: number): string => {
  if (ms === 0) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// Helper to mask API key
const maskApiKey = (key: string): string => {
  if (!key) return "";
  if (key.length <= 8) return "*".repeat(key.length);
  return `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}`;
};

export default function AgentObservabilityPage() {
  // API Configuration State
  const [apiConfig, setApiConfig] = useState<APIConfig>(DEFAULT_API_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  // Load API configuration from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(API_CONFIG_KEY);
    if (stored) {
      try {
        setApiConfig(JSON.parse(stored));
      } catch {
        console.error("Failed to parse API config from localStorage");
      }
    }
  }, []);

  // Save API configuration
  const saveApiConfig = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      localStorage.setItem(API_CONFIG_KEY, JSON.stringify(apiConfig));
      setSaveMessage("Configuration saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  }, [apiConfig]);

  const getStatusBadge = (status: AgentActivity["status"]) => {
    switch (status) {
      case "success":
        return <Badge variant="success">Success</Badge>;
      case "error":
        return <Badge variant="error">Error</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  return (
    <main className="ml-64 min-h-screen bg-bg-0">
      <DashboardHeader
        title="Agent Observability"
        subtitle="Monitor agent activity, API usage, and system health"
      />

      <div className="p-6">
        {/* Page Introduction */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text">Agent Monitoring</h1>
          <p className="mt-2 text-text-muted">
            Track API usage, monitor agent performance, and configure your
            integration settings.
          </p>
        </div>

        {/* Overview Metrics Section */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-text">
            Overview (Last 24 Hours)
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total API Calls */}
            <Card variant="elevated">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/20 text-teal">
                  <ChartBarIcon />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Total API Calls</p>
                  <p className="text-2xl font-bold text-text">
                    {PLACEHOLDER_METRICS.totalApiCalls.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Average Response Time */}
            <Card variant="elevated">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/20 text-purple">
                  <ClockIcon />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Avg Response Time</p>
                  <p className="text-2xl font-bold text-text">
                    {PLACEHOLDER_METRICS.avgResponseTime}ms
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Token Usage */}
            <Card variant="elevated">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/20 text-teal">
                  <CpuChipIcon />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Token Usage</p>
                  <p className="text-2xl font-bold text-text">
                    {PLACEHOLDER_METRICS.tokenUsage.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Error Rate */}
            <Card variant="elevated">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-error/20 text-error">
                  <ExclamationTriangleIcon />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Error Rate</p>
                  <p className="text-2xl font-bold text-text">
                    {PLACEHOLDER_METRICS.errorRate}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Agent Activity Log - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple/20 text-purple">
                      <ChartBarIcon />
                    </div>
                    <div>
                      <CardTitle>Agent Activity Log</CardTitle>
                      <CardDescription>
                        Recent agent actions and their status
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="teal">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stroke text-left text-sm text-text-muted">
                        <th className="pb-3 font-medium">Timestamp</th>
                        <th className="pb-3 font-medium">Agent Type</th>
                        <th className="pb-3 font-medium">Action</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Duration</th>
                        <th className="pb-3 font-medium">Tokens</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {PLACEHOLDER_ACTIVITIES.map((activity) => (
                        <tr
                          key={activity.id}
                          className="border-b border-stroke-subtle transition-colors hover:bg-surface"
                        >
                          <td className="py-3 text-text-muted">
                            {formatTimestamp(activity.timestamp)}
                          </td>
                          <td className="py-3 font-medium text-text">
                            {activity.agentType}
                          </td>
                          <td className="py-3 text-text-muted">
                            {activity.actionType}
                          </td>
                          <td className="py-3">
                            {getStatusBadge(activity.status)}
                          </td>
                          <td className="py-3 font-mono text-text-muted">
                            {formatDuration(activity.duration)}
                          </td>
                          <td className="py-3 font-mono text-text-muted">
                            {activity.tokenCount > 0
                              ? activity.tokenCount.toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Monitoring Section - Takes 1 column */}
          <div>
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/20 text-teal">
                    <SignalIcon />
                  </div>
                  <div>
                    <CardTitle>Real-time Monitoring</CardTitle>
                    <CardDescription>System status overview</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center justify-between rounded-xl border border-stroke bg-bg-1 p-3">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
                    </span>
                    <span className="text-sm font-medium text-text">
                      Connection Status
                    </span>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>

                {/* Active Agents */}
                <div className="flex items-center justify-between rounded-xl border border-stroke bg-bg-1 p-3">
                  <span className="text-sm font-medium text-text">
                    Active Agents
                  </span>
                  <span className="text-lg font-bold text-teal">3</span>
                </div>

                {/* Queue Depth */}
                <div className="flex items-center justify-between rounded-xl border border-stroke bg-bg-1 p-3">
                  <span className="text-sm font-medium text-text">
                    Queue Depth
                  </span>
                  <span className="text-lg font-bold text-text">12</span>
                </div>

                {/* Placeholder message */}
                <div className="rounded-xl border border-stroke-subtle bg-surface p-3 text-center text-xs text-text-dim">
                  Real-time updates coming in a future release
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* API Configuration Section */}
        <div className="mt-8">
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple/20 text-purple">
                  <KeyIcon />
                </div>
                <div>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>
                    Configure your AI provider API settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* API Key */}
                <div>
                  <label
                    htmlFor="api-key"
                    className="mb-2 block text-sm font-medium text-text"
                  >
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      id="api-key"
                      type={showApiKey ? "text" : "password"}
                      value={showApiKey ? apiConfig.apiKey : maskApiKey(apiConfig.apiKey)}
                      onChange={(e) =>
                        setApiConfig({ ...apiConfig, apiKey: e.target.value })
                      }
                      placeholder="sk-..."
                      className="w-full rounded-xl border border-stroke bg-bg-0 px-4 py-2.5 pr-12 text-sm text-text placeholder-text-dim transition-colors focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text"
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-text-muted">
                    Your API key is stored securely in local storage
                  </p>
                </div>

                {/* API Endpoint URL */}
                <div>
                  <label
                    htmlFor="api-endpoint"
                    className="mb-2 block text-sm font-medium text-text"
                  >
                    API Endpoint URL
                  </label>
                  <input
                    id="api-endpoint"
                    type="url"
                    value={apiConfig.endpointUrl}
                    onChange={(e) =>
                      setApiConfig({ ...apiConfig, endpointUrl: e.target.value })
                    }
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded-xl border border-stroke bg-bg-0 px-4 py-2.5 text-sm text-text placeholder-text-dim transition-colors focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    The base URL for your AI provider API
                  </p>
                </div>

                {/* Rate Limit Per Minute */}
                <div>
                  <label
                    htmlFor="rate-limit-minute"
                    className="mb-2 block text-sm font-medium text-text"
                  >
                    Rate Limit (per minute)
                  </label>
                  <input
                    id="rate-limit-minute"
                    type="number"
                    min="1"
                    max="10000"
                    value={apiConfig.rateLimitPerMinute}
                    onChange={(e) =>
                      setApiConfig({
                        ...apiConfig,
                        rateLimitPerMinute: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-full rounded-xl border border-stroke bg-bg-0 px-4 py-2.5 text-sm text-text placeholder-text-dim transition-colors focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    Maximum API calls per minute
                  </p>
                </div>

                {/* Rate Limit Per Day */}
                <div>
                  <label
                    htmlFor="rate-limit-day"
                    className="mb-2 block text-sm font-medium text-text"
                  >
                    Rate Limit (per day)
                  </label>
                  <input
                    id="rate-limit-day"
                    type="number"
                    min="1"
                    max="1000000"
                    value={apiConfig.rateLimitPerDay}
                    onChange={(e) =>
                      setApiConfig({
                        ...apiConfig,
                        rateLimitPerDay: parseInt(e.target.value) || 10000,
                      })
                    }
                    className="w-full rounded-xl border border-stroke bg-bg-0 px-4 py-2.5 text-sm text-text placeholder-text-dim transition-colors focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    Maximum API calls per day
                  </p>
                </div>
              </div>

              {/* Save Button and Message */}
              <div className="flex items-center gap-4">
                <Button
                  variant="primary"
                  onClick={saveApiConfig}
                  isLoading={isSaving}
                >
                  Save Configuration
                </Button>
                {saveMessage && (
                  <span
                    className={`text-sm ${
                      saveMessage.includes("success")
                        ? "text-success"
                        : "text-error"
                    }`}
                  >
                    {saveMessage}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

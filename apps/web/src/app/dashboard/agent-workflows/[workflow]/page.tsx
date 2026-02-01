"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from "@/components/ui";
import {
  WORKFLOW_TYPES,
  WORKFLOW_META,
  type WorkflowType,
} from "@/lib/constants";
import {
  AI_MODELS,
  OUTPUT_CATEGORIES,
  EXPORT_FORMATS,
  WORKFLOW_OUTPUT_CATEGORIES,
  COMMON_ACTIONS,
  WORKFLOW_ACTIONS,
  type WorkflowConfig,
  type ActionConfig,
  type ModelSettings,
  type OutputSettings,
  type IntegrationSettings,
  type OutputCategoryId,
  type ValidationError,
  getDefaultWorkflowConfig,
  loadWorkflowConfig,
  saveWorkflowConfig,
  clearWorkflowConfig,
  validateWorkflowConfig,
} from "@/lib/workflow-config";

interface WorkflowPageProps {
  params: Promise<{ workflow: string }>;
}

// Tab types
type TabId = "prompt" | "model" | "actions" | "outputs" | "integrations" | "triggers";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: "prompt",
    label: "System Prompt",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "model",
    label: "Model Settings",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "actions",
    label: "Actions",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "outputs",
    label: "Outputs",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: "triggers",
    label: "Triggers",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
      </svg>
    ),
  },
];

// Default system prompts for each workflow type
const DEFAULT_PROMPTS: Record<string, string> = {
  "content-creator": `You are a Content Creator AI assistant. Your role is to help streamers and content creators:
- Identify key moments for clips
- Draft engaging social media posts for different platforms
- Track memorable moments during streams
- Suggest content repurposing strategies

Always maintain the creator's voice and style while optimizing for engagement.`,

  podcast: `You are a Podcast Production AI assistant. Your role is to help podcast teams:
- Create chapter markers with timestamps
- Extract quotable moments for promotion
- Draft show notes and episode summaries
- Identify potential soundbites for clips

Focus on capturing the essence of discussions while maintaining context.`,

  "script-studio": `You are a Script Studio AI assistant for screenwriters and playwrights (film, TV, and theater). Your role is to help:
- Format scripts properly (sluglines, action lines, dialogue, transitions)
- Analyze scene structure, pacing, and act breaks
- Track character arcs and plot points (inciting incident, midpoint, climax)
- Polish dialogue for character voice and subtext
- Suggest montage sequences and stage directions (theater)
- Estimate page timing (1 page = 1 minute for film/TV)

Respect the writer's creative vision while ensuring industry-standard formatting.`,

  "writers-corner": `You are a Writers Corner AI assistant. Your role is to help authors and writers:
- Organize ideas and plot points
- Track chapter outlines and structure
- Maintain character and world-building notes
- Suggest narrative improvements

Support the creative process without overwriting the author's unique voice.`,

  "mind-map": `You are a Mind Map AI assistant. Your role is to help with brainstorming and ideation:
- Cluster related ideas and concepts
- Identify connections between thoughts
- Convert brainstorm items into actionable tasks
- Prioritize and organize scattered ideas

Help bring structure to creative chaos while preserving spontaneity.`,

  "court-session": `You are a Court Session AI assistant. Your role is to help with legal analysis and debate:
- Track evidence and arguments chronologically
- Organize witness statements and testimonies
- Highlight contradictions and key points
- Summarize legal positions

Maintain objectivity and accuracy in all analysis.`,

  "debate-room": `You are a Debate Room AI assistant. Your role is to help structure debates and discussions:
- Track claims and counter-claims
- Organize argument threads
- Queue rebuttals and responses
- Identify logical fallacies or weak points

Remain neutral while helping both sides articulate their positions clearly.`,
};

// Find workflow by path
const findWorkflowByPath = (
  path: string
): { key: string; type: WorkflowType } | null => {
  const entries = Object.entries(WORKFLOW_META);
  for (const [type, meta] of entries) {
    if (meta.path === path) {
      const key = Object.entries(WORKFLOW_TYPES).find(
        ([, value]) => value === type
      )?.[0];
      if (key) {
        return { key, type: type as WorkflowType };
      }
    }
  }
  return null;
};

// Toggle component for consistent styling
function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:ring-offset-bg-0
        ${checked ? "bg-teal" : "bg-stroke"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
}

// Slider component
function Slider({
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      className="w-full h-2 bg-stroke rounded-lg appearance-none cursor-pointer accent-teal disabled:opacity-50"
    />
  );
}

// Select component
function Select({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-xl border border-stroke bg-surface px-4 py-2.5 text-sm text-text focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:opacity-50"
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Input component
function Input({
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
}: {
  type?: "text" | "number" | "password" | "url";
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-xl border border-stroke bg-surface px-4 py-2.5 text-sm text-text placeholder-text-dim focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:opacity-50 ${className}`}
    />
  );
}

export default function WorkflowEditPage({ params }: WorkflowPageProps) {
  const resolvedParams = use(params);
  const workflowPath = resolvedParams.workflow;

  // State
  const [activeTab, setActiveTab] = useState<TabId>("prompt");
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [isLoaded, setIsLoaded] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Find the workflow metadata
  const workflowInfo = findWorkflowByPath(workflowPath);
  const meta = workflowInfo ? WORKFLOW_META[workflowInfo.type] : null;

  // Get default config
  const defaultConfig = useMemo(() => {
    if (!workflowPath) return null;
    return getDefaultWorkflowConfig(workflowPath, DEFAULT_PROMPTS[workflowPath] || "");
  }, [workflowPath]);

  // Load saved config on mount
  useEffect(() => {
    if (!meta || !defaultConfig) return;

    const savedConfig = loadWorkflowConfig(workflowPath);
    if (savedConfig) {
      // Merge with defaults to ensure new fields are present
      setConfig({
        ...defaultConfig,
        ...savedConfig,
        model: { ...defaultConfig.model, ...savedConfig.model },
        outputs: {
          ...defaultConfig.outputs,
          ...savedConfig.outputs,
          formatting: { ...defaultConfig.outputs.formatting, ...savedConfig.outputs?.formatting },
          autoSave: { ...defaultConfig.outputs.autoSave, ...savedConfig.outputs?.autoSave },
        },
        integrations: { ...defaultConfig.integrations, ...savedConfig.integrations },
        actions: savedConfig.actions?.length ? savedConfig.actions : defaultConfig.actions,
      });
    } else {
      setConfig(defaultConfig);
    }
    setIsLoaded(true);
  }, [workflowPath, meta, defaultConfig]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!config) return;

    // Validate
    const errors = validateWorkflowConfig(config);
    setValidationErrors(errors);

    if (errors.length > 0) {
      setSaveStatus("error");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      saveWorkflowConfig(workflowPath, config);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [workflowPath, config]);

  // Handle reset all to defaults
  const handleResetAll = useCallback(() => {
    if (!defaultConfig) return;
    clearWorkflowConfig(workflowPath);
    setConfig(defaultConfig);
    setValidationErrors([]);
    setSaveStatus("idle");
    setShowResetConfirm(false);
  }, [workflowPath, defaultConfig]);

  // Update config helpers
  const updateSystemPrompt = (prompt: string) => {
    if (!config) return;
    setConfig({ ...config, systemPrompt: prompt });
    setSaveStatus("idle");
  };

  const updateModel = (updates: Partial<ModelSettings>) => {
    if (!config) return;
    setConfig({ ...config, model: { ...config.model, ...updates } });
    setSaveStatus("idle");
  };

  const updateAction = (actionId: string, updates: Partial<ActionConfig>) => {
    if (!config) return;
    setConfig({
      ...config,
      actions: config.actions.map((a) =>
        a.actionId === actionId ? { ...a, ...updates } : a
      ),
    });
    setSaveStatus("idle");
  };

  const moveAction = (actionId: string, direction: "up" | "down") => {
    if (!config) return;
    const actions = [...config.actions].sort((a, b) => a.priority - b.priority);
    const index = actions.findIndex((a) => a.actionId === actionId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;

    // Swap priorities
    const tempPriority = actions[index].priority;
    actions[index].priority = actions[newIndex].priority;
    actions[newIndex].priority = tempPriority;

    setConfig({ ...config, actions });
    setSaveStatus("idle");
  };

  const updateOutputs = (updates: Partial<OutputSettings>) => {
    if (!config) return;
    setConfig({ ...config, outputs: { ...config.outputs, ...updates } });
    setSaveStatus("idle");
  };

  const toggleOutputCategory = (categoryId: OutputCategoryId) => {
    if (!config) return;
    const categories = config.outputs.enabledCategories;
    const newCategories = categories.includes(categoryId)
      ? categories.filter((c) => c !== categoryId)
      : [...categories, categoryId];
    updateOutputs({ enabledCategories: newCategories });
  };

  const updateIntegrations = (updates: Partial<IntegrationSettings>) => {
    if (!config) return;
    setConfig({ ...config, integrations: { ...config.integrations, ...updates } });
    setSaveStatus("idle");
  };

  // Check if config has customizations
  const hasCustomizations = Boolean(loadWorkflowConfig(workflowPath));

  // If workflow not found, show error
  if (!meta || !workflowInfo) {
    return (
      <main className="ml-64 min-h-screen bg-bg-0">
        <DashboardHeader title="Workflow Not Found" />
        <div className="flex flex-col items-center justify-center p-12">
          <Card variant="elevated" className="max-w-md text-center">
            <CardHeader>
              <CardTitle>Workflow Not Found</CardTitle>
              <CardDescription>
                The workflow &quot;{workflowPath}&quot; does not exist.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link href="/dashboard/agent-workflows">
                <Button variant="primary">Back to Workflows</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    if (!config || !isLoaded) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="text-text-muted">Loading configuration...</div>
        </div>
      );
    }

    switch (activeTab) {
      case "prompt":
        return <SystemPromptTab config={config} onChange={updateSystemPrompt} />;
      case "model":
        return <ModelSettingsTab config={config} onChange={updateModel} />;
      case "actions":
        return (
          <ActionsTab
            config={config}
            onUpdate={updateAction}
            onMove={moveAction}
          />
        );
      case "outputs":
        return (
          <OutputsTab
            config={config}
            workflowPath={workflowPath}
            onUpdate={updateOutputs}
            onToggleCategory={toggleOutputCategory}
          />
        );
      case "integrations":
        return <IntegrationsTab config={config} onChange={updateIntegrations} />;
      case "triggers":
        return <TriggersTab workflowPath={workflowPath} />;
      default:
        return null;
    }
  };

  return (
    <main className="ml-64 min-h-screen bg-bg-0">
      <DashboardHeader
        title={meta.label}
        subtitle="Edit workflow configuration"
        actions={
          <Link href="/dashboard/agent-workflows">
            <Button variant="ghost" size="sm">
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
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              Back to Workflows
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        {/* Workflow Info Card */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  {meta.label}
                  <Badge variant={hasCustomizations ? "teal" : "default"}>
                    {hasCustomizations ? "Customized" : "Default"}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {meta.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-surface p-4">
                <p className="text-xs font-medium text-text-dim">
                  Workflow Path
                </p>
                <p className="mt-1 font-mono text-sm text-text">
                  /{meta.path}
                </p>
              </div>
              <div className="rounded-lg bg-surface p-4">
                <p className="text-xs font-medium text-text-dim">
                  Configuration Status
                </p>
                <p className="mt-1 text-sm text-text">
                  {hasCustomizations
                    ? "Using custom configuration"
                    : "Using default configuration"}
                </p>
              </div>
              <div className="rounded-lg bg-surface p-4">
                <p className="text-xs font-medium text-text-dim">
                  Last Updated
                </p>
                <p className="mt-1 text-sm text-text">
                  {config?.updatedAt
                    ? new Date(config.updatedAt).toLocaleDateString()
                    : "Never"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Configuration Interface */}
        <Card variant="elevated">
          {/* Tab Navigation */}
          <div className="border-b border-stroke">
            <div className="flex overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap
                    border-b-2 -mb-[2px]
                    ${
                      activeTab === tab.id
                        ? "border-teal text-teal"
                        : "border-transparent text-text-muted hover:text-text hover:border-stroke"
                    }
                  `}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <CardContent className="p-6">
            {renderTabContent()}
          </CardContent>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mx-6 mb-4 rounded-lg border border-error/30 bg-error/10 p-4">
              <p className="text-sm font-medium text-error mb-2">
                Please fix the following errors:
              </p>
              <ul className="list-disc list-inside text-sm text-error/80 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Actions */}
          <CardFooter className="flex-wrap gap-4 border-t border-stroke pt-4">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                disabled={isSaving}
              >
                Reset All to Defaults
              </Button>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-sm text-success">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Saved successfully
                </span>
              )}
              {saveStatus === "error" && validationErrors.length === 0 && (
                <span className="flex items-center gap-1.5 text-sm text-error">
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Failed to save
                </span>
              )}
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isSaving}
              >
                Save All Changes
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card variant="elevated" className="max-w-md mx-4">
              <CardHeader>
                <CardTitle>Reset All Settings?</CardTitle>
                <CardDescription>
                  This will reset all configuration settings for this workflow to their default values. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleResetAll}>
                  Reset All
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Tips Section */}
        <Card variant="default" className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Configuration Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                <strong>System Prompt:</strong> Be specific about the AI&apos;s role and define clear boundaries
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                <strong>Model Settings:</strong> Lower temperature (0.0-0.3) for factual outputs, higher (0.7-1.0) for creative tasks
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                <strong>Actions:</strong> Disable actions you don&apos;t need to improve performance and reduce costs
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                <strong>Cooldowns:</strong> Increase cooldowns for heavy actions to prevent rate limiting
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                <strong>Webhooks:</strong> Use webhooks to integrate with external services like Zapier or Make
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

function SystemPromptTab({
  config,
  onChange,
}: {
  config: WorkflowConfig;
  onChange: (prompt: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          System Prompt
        </label>
        <p className="text-xs text-text-dim mb-3">
          Customize the AI agent&apos;s system prompt to tailor its behavior for this workflow. This prompt defines how the AI understands and responds to your content.
        </p>
        <div className="relative">
          <textarea
            value={config.systemPrompt}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your custom system prompt..."
            rows={16}
            className="w-full resize-y rounded-xl border border-stroke bg-surface p-4 font-mono text-sm text-text placeholder-text-dim focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
            spellCheck={false}
          />
          <div className="absolute bottom-3 right-3 text-xs text-text-dim">
            {config.systemPrompt.length} characters
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelSettingsTab({
  config,
  onChange,
}: {
  config: WorkflowConfig;
  onChange: (updates: Partial<ModelSettings>) => void;
}) {
  const modelOptions = Object.values(AI_MODELS).map((m) => ({
    id: m.id,
    label: `${m.label} (${m.provider})`,
  }));

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          AI Model
        </label>
        <p className="text-xs text-text-dim mb-3">
          Select the AI model to use for this workflow. Different models have different capabilities and costs.
        </p>
        <Select
          value={config.model.modelId}
          options={modelOptions}
          onChange={(value) => onChange({ modelId: value as ModelSettings["modelId"] })}
        />
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Temperature: {config.model.temperature.toFixed(2)}
        </label>
        <p className="text-xs text-text-dim mb-3">
          Controls randomness. Lower values (0.0) make output more focused and deterministic. Higher values (1.0) make it more creative and varied.
        </p>
        <div className="flex items-center gap-4">
          <span className="text-xs text-text-dim">0.0</span>
          <Slider
            value={config.model.temperature}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => onChange({ temperature: value })}
          />
          <span className="text-xs text-text-dim">1.0</span>
        </div>
        <div className="flex justify-between mt-1 text-xs text-text-dim">
          <span>Focused</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Max Tokens
        </label>
        <p className="text-xs text-text-dim mb-3">
          Maximum number of tokens in the model&apos;s response. Higher values allow longer responses but may increase costs.
        </p>
        <Input
          type="number"
          value={config.model.maxTokens}
          onChange={(value) => onChange({ maxTokens: parseInt(value) || 2048 })}
          placeholder="2048"
        />
        <div className="flex justify-between mt-1 text-xs text-text-dim">
          <span>Recommended: 1024 - 4096</span>
          <span>Max: 128000</span>
        </div>
      </div>

      {/* Response Format */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Response Format
        </label>
        <p className="text-xs text-text-dim mb-3">
          Choose the output format. JSON mode ensures structured responses, while text mode allows free-form output.
        </p>
        <Select
          value={config.model.responseFormat}
          options={[
            { id: "text", label: "Text (Free-form)" },
            { id: "json", label: "JSON (Structured)" },
          ]}
          onChange={(value) => onChange({ responseFormat: value as "text" | "json" })}
        />
      </div>
    </div>
  );
}

function ActionsTab({
  config,
  onUpdate,
  onMove,
}: {
  config: WorkflowConfig;
  onUpdate: (actionId: string, updates: Partial<ActionConfig>) => void;
  onMove: (actionId: string, direction: "up" | "down") => void;
}) {
  const sortedActions = [...config.actions].sort((a, b) => a.priority - b.priority);
  const workflowActions = sortedActions.filter((a) => !a.actionId.startsWith("common."));
  const commonActions = sortedActions.filter((a) => a.actionId.startsWith("common."));

  const renderActionRow = (action: ActionConfig, index: number, isFirst: boolean, isLast: boolean) => (
    <div
      key={action.actionId}
      className="flex items-center gap-4 p-4 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
    >
      {/* Priority Arrows */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onMove(action.actionId, "up")}
          disabled={isFirst}
          className="p-1 rounded hover:bg-stroke disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={() => onMove(action.actionId, "down")}
          disabled={isLast}
          className="p-1 rounded hover:bg-stroke disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Action Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{action.label}</span>
          <Badge variant="default" className="text-xs">
            #{action.priority}
          </Badge>
        </div>
        <p className="text-xs text-text-dim truncate">{action.description}</p>
      </div>

      {/* Cooldown Input */}
      <div className="w-32">
        <label className="block text-xs text-text-dim mb-1">Cooldown (ms)</label>
        <Input
          type="number"
          value={action.cooldownMs}
          onChange={(value) => onUpdate(action.actionId, { cooldownMs: parseInt(value) || 0 })}
          disabled={!action.enabled}
          className="text-xs"
        />
      </div>

      {/* Auto-trigger Toggle */}
      <div className="flex flex-col items-center gap-1 w-20">
        <span className="text-xs text-text-dim">Auto</span>
        <Toggle
          checked={action.autoTrigger}
          onChange={(checked) => onUpdate(action.actionId, { autoTrigger: checked })}
          disabled={!action.enabled}
        />
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex flex-col items-center gap-1 w-20">
        <span className="text-xs text-text-dim">Enabled</span>
        <Toggle
          checked={action.enabled}
          onChange={(checked) => onUpdate(action.actionId, { enabled: checked })}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Workflow-specific Actions */}
      <div>
        <h4 className="text-sm font-medium text-text mb-3">Workflow Actions</h4>
        <p className="text-xs text-text-dim mb-4">
          Configure actions specific to this workflow. Enable/disable actions, toggle auto-triggering, and set cooldown times.
        </p>
        <div className="space-y-2">
          {workflowActions.map((action, index) =>
            renderActionRow(action, index, index === 0, index === workflowActions.length - 1)
          )}
        </div>
      </div>

      {/* Common Actions */}
      <div>
        <h4 className="text-sm font-medium text-text mb-3">Common Actions</h4>
        <p className="text-xs text-text-dim mb-4">
          These actions are available across all workflows.
        </p>
        <div className="space-y-2">
          {commonActions.map((action, index) =>
            renderActionRow(
              action,
              index,
              index === 0,
              index === commonActions.length - 1
            )
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-4 border-t border-stroke">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            config.actions.forEach((a) => {
              if (!a.actionId.startsWith("common.")) {
                onUpdate(a.actionId, { enabled: true });
              }
            });
          }}
        >
          Enable All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            config.actions.forEach((a) => {
              if (!a.actionId.startsWith("common.")) {
                onUpdate(a.actionId, { enabled: false });
              }
            });
          }}
        >
          Disable All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            config.actions.forEach((a) => {
              onUpdate(a.actionId, { autoTrigger: false });
            });
          }}
        >
          Disable All Auto-triggers
        </Button>
      </div>
    </div>
  );
}

function OutputsTab({
  config,
  workflowPath,
  onUpdate,
  onToggleCategory,
}: {
  config: WorkflowConfig;
  workflowPath: string;
  onUpdate: (updates: Partial<OutputSettings>) => void;
  onToggleCategory: (categoryId: OutputCategoryId) => void;
}) {
  const recommendedCategories = WORKFLOW_OUTPUT_CATEGORIES[workflowPath] || [];

  return (
    <div className="space-y-6">
      {/* Output Categories */}
      <div>
        <h4 className="text-sm font-medium text-text mb-3">Enabled Output Categories</h4>
        <p className="text-xs text-text-dim mb-4">
          Select which types of outputs to generate. Recommended categories for this workflow are marked.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.values(OUTPUT_CATEGORIES).map((category) => {
            const isEnabled = config.outputs.enabledCategories.includes(category.id);
            const isRecommended = recommendedCategories.includes(category.id);

            return (
              <button
                key={category.id}
                onClick={() => onToggleCategory(category.id)}
                className={`
                  flex items-center justify-between p-3 rounded-lg border transition-colors
                  ${isEnabled
                    ? "border-teal bg-teal/10 text-teal"
                    : "border-stroke bg-surface text-text-muted hover:bg-surface-hover"
                  }
                `}
              >
                <span className="text-sm font-medium">{category.label}</span>
                <div className="flex items-center gap-2">
                  {isRecommended && (
                    <Badge variant="teal" className="text-xs px-1.5 py-0.5">
                      Rec
                    </Badge>
                  )}
                  {isEnabled && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formatting Options */}
      <div>
        <h4 className="text-sm font-medium text-text mb-3">Formatting Preferences</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
            <div>
              <p className="text-sm font-medium text-text">Include Timestamps</p>
              <p className="text-xs text-text-dim">Add timestamps to output items</p>
            </div>
            <Toggle
              checked={config.outputs.formatting.includeTimestamps}
              onChange={(checked) =>
                onUpdate({
                  formatting: { ...config.outputs.formatting, includeTimestamps: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
            <div>
              <p className="text-sm font-medium text-text">Include Confidence Scores</p>
              <p className="text-xs text-text-dim">Show AI confidence levels for outputs</p>
            </div>
            <Toggle
              checked={config.outputs.formatting.includeConfidenceScores}
              onChange={(checked) =>
                onUpdate({
                  formatting: { ...config.outputs.formatting, includeConfidenceScores: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
            <div>
              <p className="text-sm font-medium text-text">Auto-Number Items</p>
              <p className="text-xs text-text-dim">Automatically number list items</p>
            </div>
            <Toggle
              checked={config.outputs.formatting.autoNumberItems}
              onChange={(checked) =>
                onUpdate({
                  formatting: { ...config.outputs.formatting, autoNumberItems: checked },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Auto-Save Options */}
      <div>
        <h4 className="text-sm font-medium text-text mb-3">Auto-Save Settings</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
            <div>
              <p className="text-sm font-medium text-text">Enable Auto-Save</p>
              <p className="text-xs text-text-dim">Automatically save outputs at regular intervals</p>
            </div>
            <Toggle
              checked={config.outputs.autoSave.enabled}
              onChange={(checked) =>
                onUpdate({
                  autoSave: { ...config.outputs.autoSave, enabled: checked },
                })
              }
            />
          </div>

          {config.outputs.autoSave.enabled && (
            <div className="p-3 rounded-lg bg-surface">
              <label className="block text-sm font-medium text-text mb-2">
                Auto-Save Interval (minutes)
              </label>
              <Input
                type="number"
                value={config.outputs.autoSave.intervalMinutes}
                onChange={(value) =>
                  onUpdate({
                    autoSave: { ...config.outputs.autoSave, intervalMinutes: parseInt(value) || 5 },
                  })
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab({
  config,
  onChange,
}: {
  config: WorkflowConfig;
  onChange: (updates: Partial<IntegrationSettings>) => void;
}) {
  const [showApiKey, setShowApiKey] = useState(false);

  const exportOptions = Object.values(EXPORT_FORMATS).map((f) => ({
    id: f.id,
    label: `${f.label} (${f.extension})`,
  }));

  return (
    <div className="space-y-6">
      {/* Webhook URL */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Webhook URL
        </label>
        <p className="text-xs text-text-dim mb-3">
          Enter a webhook URL to receive real-time notifications when outputs are generated. Leave empty to disable.
        </p>
        <Input
          type="url"
          value={config.integrations.webhookUrl}
          onChange={(value) => onChange({ webhookUrl: value })}
          placeholder="https://your-webhook.com/endpoint"
        />
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Third-Party API Key
        </label>
        <p className="text-xs text-text-dim mb-3">
          Store an API key for third-party services (e.g., social media posting, external storage).
        </p>
        <div className="relative">
          <Input
            type={showApiKey ? "text" : "password"}
            value={config.integrations.apiKey}
            onChange={(value) => onChange({ apiKey: value })}
            placeholder="Enter your API key"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text"
          >
            {showApiKey ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-warning mt-2">
          Note: API keys are stored locally in your browser. Do not share your configuration files.
        </p>
      </div>

      {/* Export Format */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Default Export Format
        </label>
        <p className="text-xs text-text-dim mb-3">
          Choose the default format for exporting session outputs.
        </p>
        <Select
          value={config.integrations.exportFormat}
          options={exportOptions}
          onChange={(value) => onChange({ exportFormat: value as IntegrationSettings["exportFormat"] })}
        />
      </div>

      {/* Integration Tips */}
      <div className="p-4 rounded-lg border border-stroke bg-surface">
        <h5 className="text-sm font-medium text-text mb-2">Integration Tips</h5>
        <ul className="space-y-1 text-xs text-text-dim">
          <li>- Webhooks receive POST requests with JSON payload containing output data</li>
          <li>- Use services like Zapier, Make, or n8n to connect to other apps</li>
          <li>- JSON export preserves all metadata and is best for programmatic processing</li>
          <li>- Markdown export is ideal for documentation and note-taking apps</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// Triggers Tab - Auto-clip trigger configuration
// ============================================================================

interface TriggerConfig {
  id: string;
  workflow: string;
  audioEnabled: boolean;
  audioTriggers: AudioTrigger[];
  visualEnabled: boolean;
  visualTriggers: VisualTrigger[];
  visualProvider: string;
  frameSampleRate: number;
  autoClipEnabled: boolean;
  autoClipDuration: number;
  triggerCooldown: number;
}

interface AudioTrigger {
  id: string;
  phrase: string;
  enabled: boolean;
  caseSensitive: boolean;
}

interface VisualTrigger {
  id: string;
  label: string;
  imageId: string;
  threshold: number;
  enabled: boolean;
}

interface ReferenceImage {
  id: string;
  workflow: string;
  label: string;
  imagePath: string;
  threshold: number;
  enabled: boolean;
}

const SUGGESTED_PHRASES = [
  "clip that",
  "that's a clip",
  "highlight this",
  "save that",
  "mark it",
  "that was sick",
];

const AUTO_CLIP_DURATIONS = [
  { id: "15", label: "15 seconds" },
  { id: "20", label: "20 seconds" },
  { id: "30", label: "30 seconds" },
  { id: "60", label: "60 seconds" },
  { id: "90", label: "90 seconds" },
  { id: "120", label: "2 minutes" },
];

const FRAME_SAMPLE_RATES = [
  { id: "1", label: "1 second - ~$10.80/hr (most accurate)" },
  { id: "2", label: "2 seconds - ~$5.40/hr" },
  { id: "5", label: "5 seconds - ~$2.16/hr (recommended)" },
  { id: "10", label: "10 seconds - ~$1.08/hr (most affordable)" },
];

// Provider pricing (approximate, as of 2025)
// MediaPipe: FREE (runs locally in browser)
// Claude Vision: ~$0.003/image (1024px)
// Gemini Pro Vision: ~$0.0025/image (free tier available)
// GPT-4 Vision: ~$0.01/image (low detail) to $0.03/image (high detail)
const VISUAL_PROVIDERS = [
  { id: "mediapipe", label: "MediaPipe - FREE (runs in browser)", cost: 0 },
  { id: "claude", label: "Claude Vision - ~$0.003/frame", cost: 0.003 },
  { id: "gemini", label: "Gemini Pro Vision - ~$0.0025/frame", cost: 0.0025 },
  { id: "openai", label: "GPT-4 Vision - ~$0.01-0.03/frame", cost: 0.01 },
] as const;

function TriggersTab({ workflowPath }: { workflowPath: string }) {
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig | null>(null);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPhrase, setNewPhrase] = useState("");

  // Desktop companion API base URL
  const apiBase = process.env.NEXT_PUBLIC_DESKTOP_API_URL || "http://localhost:3123";

  // Load trigger config
  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBase}/api/workflows/${workflowPath}/triggers`);
        if (!response.ok) {
          throw new Error("Failed to load trigger configuration");
        }
        const data = await response.json();
        setTriggerConfig(data.config);
        setReferenceImages(data.referenceImages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load configuration");
        // Set defaults if API fails
        setTriggerConfig({
          id: "",
          workflow: workflowPath,
          audioEnabled: false,
          audioTriggers: [],
          visualEnabled: false,
          visualTriggers: [],
          visualProvider: "mediapipe",
          frameSampleRate: 5,
          autoClipEnabled: false,
          autoClipDuration: 60,
          triggerCooldown: 30,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadConfig();
  }, [workflowPath, apiBase]);

  // Save config
  const saveConfig = async (updates: Partial<TriggerConfig>) => {
    if (!triggerConfig) return;

    const newConfig = { ...triggerConfig, ...updates };
    setTriggerConfig(newConfig);
    setIsSaving(true);

    try {
      const response = await fetch(`${apiBase}/api/workflows/${workflowPath}/triggers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error("Failed to save configuration");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Add audio phrase
  const addAudioPhrase = async (phrase: string) => {
    if (!phrase.trim() || !triggerConfig) return;

    try {
      const response = await fetch(`${apiBase}/api/workflows/${workflowPath}/triggers/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: phrase.trim(), caseSensitive: false }),
      });

      if (!response.ok) throw new Error("Failed to add phrase");

      const data = await response.json();
      setTriggerConfig({
        ...triggerConfig,
        audioTriggers: [...triggerConfig.audioTriggers, data.trigger],
      });
      setNewPhrase("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add phrase");
    }
  };

  // Remove audio phrase
  const removeAudioPhrase = async (triggerId: string) => {
    if (!triggerConfig) return;

    try {
      const response = await fetch(
        `${apiBase}/api/workflows/${workflowPath}/triggers/audio/${triggerId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to remove phrase");

      setTriggerConfig({
        ...triggerConfig,
        audioTriggers: triggerConfig.audioTriggers.filter((t) => t.id !== triggerId),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove phrase");
    }
  };

  // Toggle audio phrase enabled
  const toggleAudioPhrase = (triggerId: string, enabled: boolean) => {
    if (!triggerConfig) return;

    const newTriggers = triggerConfig.audioTriggers.map((t) =>
      t.id === triggerId ? { ...t, enabled } : t
    );

    saveConfig({ audioTriggers: newTriggers });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-muted">Loading trigger configuration...</div>
      </div>
    );
  }

  if (!triggerConfig) {
    return (
      <div className="text-center py-8">
        <p className="text-error">Failed to load trigger configuration</p>
        {error && <p className="text-xs text-text-dim mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 p-4">
          <p className="text-sm text-error">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-error/70 hover:text-error mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Auto-Clip Settings */}
      <section>
        <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
          <svg className="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Auto-Clip Settings
        </h4>
        <p className="text-xs text-text-dim mb-4">
          Configure automatic clip creation when triggers are detected.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-surface">
            <div>
              <p className="text-sm font-medium text-text">Enable Auto-Clip</p>
              <p className="text-xs text-text-dim">Automatically create clips when triggers fire</p>
            </div>
            <Toggle
              checked={triggerConfig.autoClipEnabled}
              onChange={(checked) => saveConfig({ autoClipEnabled: checked })}
            />
          </div>

          {triggerConfig.autoClipEnabled && (
            <>
              <div className="p-4 rounded-lg bg-surface">
                <label className="block text-sm font-medium text-text mb-2">
                  Clip Duration
                </label>
                <p className="text-xs text-text-dim mb-3">
                  How long to record after a trigger is detected.
                </p>
                <Select
                  value={triggerConfig.autoClipDuration.toString()}
                  options={AUTO_CLIP_DURATIONS}
                  onChange={(value) => saveConfig({ autoClipDuration: parseInt(value) })}
                />
              </div>

              <div className="p-4 rounded-lg bg-surface">
                <label className="block text-sm font-medium text-text mb-2">
                  Trigger Cooldown: {triggerConfig.triggerCooldown} seconds
                </label>
                <p className="text-xs text-text-dim mb-3">
                  Minimum time between trigger activations to prevent spam.
                </p>
                <Slider
                  value={triggerConfig.triggerCooldown}
                  min={5}
                  max={120}
                  step={5}
                  onChange={(value) => saveConfig({ triggerCooldown: value })}
                />
                <div className="flex justify-between mt-1 text-xs text-text-dim">
                  <span>5s</span>
                  <span>120s</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Audio Triggers */}
      <section>
        <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
          <svg className="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Audio Triggers
        </h4>
        <p className="text-xs text-text-dim mb-4">
          Trigger clips when specific phrases are spoken during the stream.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-surface">
            <div>
              <p className="text-sm font-medium text-text">Enable Audio Triggers</p>
              <p className="text-xs text-text-dim">Listen for trigger phrases in speech</p>
            </div>
            <Toggle
              checked={triggerConfig.audioEnabled}
              onChange={(checked) => saveConfig({ audioEnabled: checked })}
            />
          </div>

          {triggerConfig.audioEnabled && (
            <>
              {/* Phrase List */}
              <div className="p-4 rounded-lg bg-surface">
                <label className="block text-sm font-medium text-text mb-3">
                  Trigger Phrases
                </label>

                {triggerConfig.audioTriggers.length === 0 ? (
                  <p className="text-xs text-text-dim mb-4">No phrases configured. Add some below.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {triggerConfig.audioTriggers.map((trigger) => (
                      <div
                        key={trigger.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-stroke hover:border-teal/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Toggle
                            checked={trigger.enabled}
                            onChange={(checked) => toggleAudioPhrase(trigger.id, checked)}
                          />
                          <span className={`text-sm ${trigger.enabled ? "text-text" : "text-text-dim"}`}>
                            &quot;{trigger.phrase}&quot;
                          </span>
                          {trigger.caseSensitive && (
                            <Badge variant="default" className="text-xs">Case-sensitive</Badge>
                          )}
                        </div>
                        <button
                          onClick={() => removeAudioPhrase(trigger.id)}
                          className="p-1 text-text-dim hover:text-error transition-colors"
                          title="Remove phrase"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Phrase */}
                <div className="flex gap-2">
                  <Input
                    value={newPhrase}
                    onChange={setNewPhrase}
                    placeholder="Enter a trigger phrase..."
                    className="flex-1"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => addAudioPhrase(newPhrase)}
                    disabled={!newPhrase.trim()}
                  >
                    Add
                  </Button>
                </div>

                {/* Suggested Phrases */}
                <div className="mt-4">
                  <p className="text-xs text-text-dim mb-2">Suggested phrases:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_PHRASES.filter(
                      (p) => !triggerConfig.audioTriggers.some((t) => t.phrase.toLowerCase() === p.toLowerCase())
                    ).map((phrase) => (
                      <button
                        key={phrase}
                        onClick={() => addAudioPhrase(phrase)}
                        className="px-3 py-1 text-xs rounded-full border border-stroke bg-surface hover:bg-surface-hover hover:border-teal/50 transition-colors"
                      >
                        + {phrase}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Visual Triggers */}
      <section>
        <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
          <svg className="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Visual Triggers
        </h4>
        <p className="text-xs text-text-dim mb-4">
          Trigger clips when gestures (thumbs up, peace sign, etc.) are detected on camera.
          <strong className="text-teal"> MediaPipe is FREE</strong> and runs entirely in your browser.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-surface">
            <div>
              <p className="text-sm font-medium text-text">Enable Visual Triggers</p>
              <p className="text-xs text-text-dim">Detect gestures and visual cues from video</p>
            </div>
            <Toggle
              checked={triggerConfig.visualEnabled}
              onChange={(checked) => saveConfig({ visualEnabled: checked })}
            />
          </div>

          {triggerConfig.visualEnabled && (
            <>
              {/* Detection Provider */}
              <div className="p-4 rounded-lg bg-surface">
                <label className="block text-sm font-medium text-text mb-2">
                  Detection Provider
                </label>
                <p className="text-xs text-text-dim mb-3">
                  Choose how visual cues are detected. <strong>MediaPipe (recommended)</strong> runs
                  locally in your browser with zero cost.
                </p>
                <Select
                  value={triggerConfig.visualProvider || "mediapipe"}
                  options={VISUAL_PROVIDERS.map(p => ({ id: p.id, label: p.label }))}
                  onChange={(value) => saveConfig({ visualProvider: value })}
                />

                {triggerConfig.visualProvider === "mediapipe" && (
                  <div className="mt-3 p-3 rounded-lg border border-success/30 bg-success/10 space-y-2">
                    <p className="text-xs font-medium text-success flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      FREE - Runs 100% in your browser
                    </p>
                    <p className="text-xs text-success/80">
                      No frames are sent anywhere. Detection happens in real-time locally using
                      Google&apos;s MediaPipe ML library. Perfect for gesture detection!
                    </p>
                  </div>
                )}

                {(triggerConfig.visualProvider === "claude" ||
                  triggerConfig.visualProvider === "gemini" ||
                  triggerConfig.visualProvider === "openai") && (
                  <div className="mt-3 space-y-3">
                    {/* Cost warning */}
                    <div className="p-3 rounded-lg border border-warning/30 bg-warning/10">
                      <p className="text-xs font-medium text-warning mb-1">💰 Cloud Provider Costs</p>
                      <p className="text-xs text-warning/80 mb-2">
                        With cloud providers, we extract frames from your video at the interval below
                        and send each frame to the AI for analysis.
                      </p>
                      <div className="text-xs text-warning font-mono">
                        {triggerConfig.visualProvider === "claude" && (
                          <>At {triggerConfig.frameSampleRate}s intervals: ~${((3600 / triggerConfig.frameSampleRate) * 0.003).toFixed(2)}/hour</>
                        )}
                        {triggerConfig.visualProvider === "gemini" && (
                          <>At {triggerConfig.frameSampleRate}s intervals: ~${((3600 / triggerConfig.frameSampleRate) * 0.0025).toFixed(2)}/hour</>
                        )}
                        {triggerConfig.visualProvider === "openai" && (
                          <>At {triggerConfig.frameSampleRate}s intervals: ~${((3600 / triggerConfig.frameSampleRate) * 0.01).toFixed(2)}-${((3600 / triggerConfig.frameSampleRate) * 0.03).toFixed(2)}/hour</>
                        )}
                      </div>
                    </div>

                    {/* When to use cloud */}
                    <div className="p-3 rounded-lg border border-stroke bg-surface-hover">
                      <p className="text-xs font-medium text-text mb-1">When to use cloud providers?</p>
                      <ul className="text-xs text-text-dim space-y-1 list-disc list-inside">
                        <li>Detecting custom objects (branded items, specific products)</li>
                        <li>Complex scene understanding (&quot;person holding phone&quot;)</li>
                        <li>Text/logo detection in frame</li>
                        <li>Custom visual cues MediaPipe can&apos;t detect</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Frame Sample Rate - only for cloud providers */}
              {triggerConfig.visualProvider !== "mediapipe" && (
                <div className="p-4 rounded-lg bg-surface">
                  <label className="block text-sm font-medium text-text mb-2">
                    Frame Sample Rate
                  </label>
                  <div className="text-xs text-text-dim mb-3 space-y-2">
                    <p>
                      <strong>How it works:</strong> We extract a single screenshot from your video stream
                      at this interval and send it to the AI for analysis.
                    </p>
                    <p>
                      <strong>Example:</strong> At 5 seconds, we capture 12 frames per minute (720/hour).
                      Each frame costs ~${(VISUAL_PROVIDERS.find(p => p.id === triggerConfig.visualProvider)?.cost || 0.003).toFixed(4)}.
                    </p>
                    <p className="text-teal">
                      💡 <strong>Note:</strong> There&apos;s natural delay (2-5s) in the video processing pipeline,
                      so 5-10 second intervals are usually sufficient for clip triggers.
                    </p>
                  </div>
                  <Select
                    value={triggerConfig.frameSampleRate.toString()}
                    options={FRAME_SAMPLE_RATES.map(r => ({ id: r.id, label: r.label }))}
                    onChange={(value) => saveConfig({ frameSampleRate: parseInt(value) })}
                  />
                  <div className="mt-3 p-2 rounded bg-surface-hover text-xs text-text-dim">
                    <span className="font-medium">Selected:</span> {triggerConfig.frameSampleRate} seconds =
                    {" "}{Math.round(3600 / triggerConfig.frameSampleRate)} frames/hour =
                    {" "}~${((3600 / triggerConfig.frameSampleRate) * (VISUAL_PROVIDERS.find(p => p.id === triggerConfig.visualProvider)?.cost || 0.003)).toFixed(2)}/hour
                  </div>
                </div>
              )}

              {/* Built-in Gestures for MediaPipe */}
              {triggerConfig.visualProvider === "mediapipe" && (
                <div className="p-4 rounded-lg bg-surface">
                  <label className="block text-sm font-medium text-text mb-2">
                    Built-in Gesture Detection
                  </label>
                  <div className="text-xs text-text-dim mb-4 space-y-2">
                    <p>
                      MediaPipe detects these gestures <strong>in real-time</strong> using your webcam
                      or video feed. No frames are sent to any server - everything runs locally!
                    </p>
                    <p className="text-teal">
                      ✨ <strong>Recommended:</strong> Use &quot;Thumbs Up&quot; or &quot;Open Palm&quot; as your trigger gesture.
                      Hold the gesture for 1-2 seconds to trigger.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {["Thumbs Up", "Thumbs Down", "Open Palm", "Peace Sign", "Fist", "Pointing Up"].map((gesture) => (
                      <div
                        key={gesture}
                        className="flex items-center gap-3 p-3 rounded-lg border border-stroke hover:border-teal/30 transition-colors"
                      >
                        <Toggle
                          checked={triggerConfig.visualTriggers.some(
                            (t) => t.label === gesture && t.enabled
                          )}
                          onChange={(checked) => {
                            const existing = triggerConfig.visualTriggers.find((t) => t.label === gesture);
                            if (existing) {
                              const newTriggers = triggerConfig.visualTriggers.map((t) =>
                                t.label === gesture ? { ...t, enabled: checked } : t
                              );
                              saveConfig({ visualTriggers: newTriggers });
                            } else if (checked) {
                              saveConfig({
                                visualTriggers: [
                                  ...triggerConfig.visualTriggers,
                                  { id: `mediapipe-${gesture.toLowerCase().replace(/\s/g, "-")}`, label: gesture, imageId: "", threshold: 0.8, enabled: true },
                                ],
                              });
                            }
                          }}
                        />
                        <span className="text-sm text-text">{gesture}</span>
                      </div>
                    ))}
                  </div>

                  {/* Alternative detection methods hint */}
                  <div className="mt-4 p-3 rounded-lg border border-stroke bg-surface-hover">
                    <p className="text-xs font-medium text-text mb-2">💡 Other Free Detection Ideas</p>
                    <ul className="text-xs text-text-dim space-y-1">
                      <li>• <strong>Colored cards:</strong> Hold up a bright colored card (red/green) - we can detect it!</li>
                      <li>• <strong>QR codes:</strong> Flash a QR code at camera - instant recognition</li>
                      <li>• <strong>Face detection:</strong> Cover/uncover face for triggers</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Reference Images - for cloud providers */}
              {triggerConfig.visualProvider !== "mediapipe" && (
                <div className="p-4 rounded-lg bg-surface">
                  <label className="block text-sm font-medium text-text mb-3">
                    Reference Images
                  </label>
                  <p className="text-xs text-text-dim mb-4">
                    Upload images of gestures or visual cues to detect.
                  </p>

                  {referenceImages.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-stroke rounded-lg">
                      <svg className="h-12 w-12 mx-auto text-text-dim mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-text-dim mb-3">No reference images uploaded</p>
                      <Button variant="ghost" size="sm">
                        Upload Image
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {referenceImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative rounded-lg border border-stroke overflow-hidden group"
                        >
                          <div className="aspect-square bg-surface-hover flex items-center justify-center">
                            <span className="text-xs text-text-dim">{img.label}</span>
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium text-text truncate">{img.label}</p>
                          </div>
                        </div>
                      ))}
                      <button className="aspect-square rounded-lg border-2 border-dashed border-stroke hover:border-teal/50 flex flex-col items-center justify-center gap-2 transition-colors">
                        <svg className="h-6 w-6 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs text-text-dim">Add Image</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg bg-surface border border-stroke shadow-lg">
          <span className="text-sm text-text-muted">Saving...</span>
        </div>
      )}
    </div>
  );
}

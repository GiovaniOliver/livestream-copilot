"use client";

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

// Workflow icons mapping
const WorkflowIcon = ({ icon }: { icon: string }) => {
  const iconMap: Record<string, React.ReactNode> = {
    video: (
      <svg
        className="h-6 w-6"
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
    ),
    microphone: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
        />
      </svg>
    ),
    film: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125"
        />
      </svg>
    ),
    pencil: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
      </svg>
    ),
    lightbulb: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
        />
      </svg>
    ),
    scales: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
        />
      </svg>
    ),
    chat: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
        />
      </svg>
    ),
  };

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
      {iconMap[icon] || iconMap.video}
    </div>
  );
};

// Helper to check if workflow has customizations in localStorage
const getWorkflowStatus = (workflowKey: string): "active" | "default" => {
  if (typeof window === "undefined") return "default";
  const stored = localStorage.getItem(`workflow-config-${workflowKey}`);
  return stored ? "active" : "default";
};

export default function AgentWorkflowsPage() {
  const workflowEntries = Object.entries(WORKFLOW_TYPES) as [
    string,
    WorkflowType
  ][];

  return (
    <main className="ml-64 min-h-screen bg-bg-0">
      <DashboardHeader
        title="Agent Workflows"
        subtitle="Manage and customize your AI agent workflows"
      />

      <div className="p-6">
        {/* Page Introduction */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text">Workflow Management</h1>
          <p className="mt-2 text-text-muted">
            Customize the AI agent behavior for each workflow type. Edit system
            prompts to tailor the agent responses to your specific needs.
          </p>
        </div>

        {/* Workflow Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflowEntries.map(([key, workflowType]) => {
            const meta = WORKFLOW_META[workflowType];
            const status = getWorkflowStatus(meta.path);

            return (
              <Card key={key} variant="elevated" className="flex flex-col">
                <CardHeader className="flex flex-row items-start gap-4">
                  <WorkflowIcon icon={meta.icon} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{meta.label}</CardTitle>
                      <Badge variant={status === "active" ? "teal" : "default"}>
                        {status === "active" ? "Customized" : "Default"}
                      </Badge>
                    </div>
                    <CardDescription>{meta.description}</CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="rounded-lg bg-surface p-3">
                    <p className="text-xs text-text-dim">Workflow Path</p>
                    <p className="mt-1 font-mono text-sm text-text-muted">
                      /{meta.path}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="justify-end gap-2">
                  <Link href={`/dashboard/agent-workflows/${meta.path}`}>
                    <Button variant="primary" size="sm">
                      Edit Workflow
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "@/components/ui";
import { type Session } from "@/lib/stores/sessions";
import { useSession } from "@/hooks/useSessions";
import { use } from "react";

interface MindMapPageProps {
  params: Promise<{ id: string }>;
}

// Types for mind map data
interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  connections: string[];
  createdAt: string;
}

interface Cluster {
  id: string;
  name: string;
  color: string;
  ideaIds: string[];
}

interface StickyNode {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
}

interface ActionItem {
  id: string;
  ideaId: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
}

interface TimelineEntry {
  id: string;
  ideaId: string;
  action: string;
  timestamp: string;
}

// Icons
const LightBulbIcon = () => (
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
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  </svg>
);

const PuzzleIcon = () => (
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
      d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z"
    />
  </svg>
);

const LinkIcon = () => (
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
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
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

const PlusIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const StickyNoteIcon = () => (
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
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

const FunnelIcon = () => (
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
      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
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

export default function MindMapPage({ params }: MindMapPageProps) {
  const { id } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Empty state arrays - no mock data
  const [ideas] = useState<Idea[]>([]);
  const [clusters] = useState<Cluster[]>([]);
  const [stickyNodes] = useState<StickyNode[]>([]);
  const [actionItems] = useState<ActionItem[]>([]);
  const [timeline] = useState<TimelineEntry[]>([]);

  // Calculated stats
  const totalIdeas = ideas.length;
  const totalClusters = clusters.length;
  const totalConnections = ideas.reduce(
    (sum, idea) => sum + idea.connections.length,
    0
  );
  const totalActions = actionItems.length;

  // Load session from API
  const { session: apiSession, isLoading: sessionLoading } = useSession(id);
  useEffect(() => {
    if (apiSession) {
      setSession(apiSession);
    }
    if (!sessionLoading) {
      setIsLoading(false);
    }
  }, [apiSession, sessionLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-text-muted">Loading session...</div>
      </div>
    );
  }

  const sessionInfo = session
    ? {
        id: session.id,
        name: session.name,
        status: session.status,
        duration: session.duration,
        workflow: "Mind Map Room",
      }
    : {
        id,
        name: "Mind Map Session",
        status: "live" as const,
        duration: "0:00:00",
        workflow: "Mind Map Room",
      };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={sessionInfo}
        title="Mind Map Room"
        subtitle="Collaborative brainstorming with idea clustering and connection mapping"
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <LightBulbIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Ideas</p>
                <p className="text-2xl font-bold text-text">{totalIdeas}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <PuzzleIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Clusters</p>
                <p className="text-2xl font-bold text-text">{totalClusters}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <LinkIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Connections</p>
                <p className="text-2xl font-bold text-text">{totalConnections}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckCircleIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Actions</p>
                <p className="text-2xl font-bold text-text">{totalActions}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content - Mind Map Visualization */}
          <div className="lg:col-span-2">
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mind Map</CardTitle>
                    <CardDescription>
                      Visual representation of ideas and connections
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm" className="gap-2">
                    <PlusIcon />
                    Add Idea
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Mind Map Visualization Placeholder */}
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-bg-2">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                      <LightBulbIcon />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-text">
                        No ideas yet
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        Add your first idea to start building the mind map
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2">
                      Add First Idea
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sticky Nodes List */}
            <Card variant="elevated" className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                      <StickyNoteIcon />
                    </div>
                    <div>
                      <CardTitle>Sticky Notes</CardTitle>
                      <CardDescription>
                        Quick notes and reminders
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <PlusIcon />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stickyNodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                      <StickyNoteIcon />
                    </div>
                    <p className="mt-3 text-sm text-text-muted">
                      No sticky notes yet
                    </p>
                    <p className="mt-1 text-xs text-text-dim">
                      Add notes to capture quick thoughts
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {stickyNodes.map((node) => (
                      <div
                        key={node.id}
                        className="rounded-lg border border-stroke bg-surface p-3"
                      >
                        <p className="text-sm text-text">{node.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Idea Timeline */}
            <Card variant="elevated" className="mt-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple/10">
                    <ClockIcon />
                  </div>
                  <div>
                    <CardTitle>Idea Timeline</CardTitle>
                    <CardDescription>
                      Activity history for this session
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                      <ClockIcon />
                    </div>
                    <p className="mt-3 text-sm text-text-muted">
                      No activity yet
                    </p>
                    <p className="mt-1 text-xs text-text-dim">
                      Timeline will populate as you add ideas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 rounded-lg bg-surface p-3"
                      >
                        <div className="h-2 w-2 rounded-full bg-teal" />
                        <div className="flex-1">
                          <p className="text-sm text-text">{entry.action}</p>
                          <p className="text-xs text-text-dim">
                            {entry.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Idea Clusters Panel */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Idea Clusters</CardTitle>
                    <CardDescription>Auto-grouped by theme</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <PlusIcon />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {clusters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                      <PuzzleIcon />
                    </div>
                    <p className="mt-3 text-sm text-text-muted">
                      No clusters yet
                    </p>
                    <p className="mt-1 text-xs text-text-dim">
                      Clusters form automatically as you add ideas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clusters.map((cluster) => (
                      <div
                        key={cluster.id}
                        className="flex items-center justify-between rounded-lg bg-surface p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: cluster.color }}
                          />
                          <span className="text-sm font-medium text-text">
                            {cluster.name}
                          </span>
                        </div>
                        <Badge variant="default">
                          {cluster.ideaIds.length} ideas
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Funnel */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                    <FunnelIcon />
                  </div>
                  <div>
                    <CardTitle>Action Funnel</CardTitle>
                    <CardDescription>
                      Convert ideas to tasks
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {actionItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                      <FunnelIcon />
                    </div>
                    <p className="mt-3 text-sm text-text-muted">
                      No actions yet
                    </p>
                    <p className="mt-1 text-xs text-text-dim">
                      Select ideas to convert them into actionable tasks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actionItems.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center justify-between rounded-lg border border-stroke bg-surface p-3"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={action.status === "completed"}
                            readOnly
                            className="h-4 w-4 rounded border-stroke"
                          />
                          <span
                            className={`text-sm ${
                              action.status === "completed"
                                ? "text-text-muted line-through"
                                : "text-text"
                            }`}
                          >
                            {action.title}
                          </span>
                        </div>
                        <Badge
                          variant={
                            action.priority === "high"
                              ? "error"
                              : action.priority === "medium"
                                ? "warning"
                                : "default"
                          }
                        >
                          {action.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Funnel stages visualization */}
                <div className="mt-6 space-y-2">
                  <div className="text-xs font-medium uppercase text-text-dim">
                    Funnel Stages
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-bg-2 px-3 py-2">
                      <span className="text-xs text-text-muted">Ideas</span>
                      <span className="text-xs font-medium text-text">
                        {totalIdeas}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-bg-2 px-3 py-2">
                      <span className="text-xs text-text-muted">
                        Under Review
                      </span>
                      <span className="text-xs font-medium text-text">
                        {actionItems.filter((a) => a.status === "pending").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-bg-2 px-3 py-2">
                      <span className="text-xs text-text-muted">In Progress</span>
                      <span className="text-xs font-medium text-text">
                        {
                          actionItems.filter((a) => a.status === "in_progress")
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-bg-2 px-3 py-2">
                      <span className="text-xs text-text-muted">Completed</span>
                      <span className="text-xs font-medium text-text">
                        {
                          actionItems.filter((a) => a.status === "completed")
                            .length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Add Idea */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Quick Add</CardTitle>
                <CardDescription>Capture ideas quickly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Type your idea..."
                    className="w-full rounded-lg border border-stroke bg-bg-2 px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <textarea
                    placeholder="Add description (optional)..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-stroke bg-bg-2 px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <Button variant="primary" className="w-full">
                    Add Idea
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

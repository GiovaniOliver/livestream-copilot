"use client";

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
import { useIdeas, type Idea } from "@/hooks/useIdeas";
import { useSession } from "@/hooks/useSessions";

interface BrainstormDashboardClientProps {
  sessionId: string;
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

const HandThumbUpIcon = () => (
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
      d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.006 4.158 9.75 5.09 9.75h.9c.445 0 .72.498.523.898a8.02 8.02 0 00-.27.602m0 8.1c-.305-.606-.538-1.255-.69-1.935m0 0a11.952 11.952 0 01-.244-2.415c0-1.045.134-2.06.384-3.03m0 0a10.13 10.13 0 01.55-1.52"
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

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    className={`h-4 w-4 ${filled ? "fill-warning text-warning" : "text-text-muted"}`}
    fill={filled ? "currentColor" : "none"}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  </svg>
);

const categoryColors: Record<string, "teal" | "purple" | "success" | "warning" | "default"> = {
  feature: "teal",
  technical: "purple",
  marketing: "warning",
  design: "success",
  highlighted: "warning",
  other: "default",
};

export function BrainstormDashboardClient({ sessionId }: BrainstormDashboardClientProps) {
  // Fetch real data from API
  const {
    ideas,
    actionItems,
    quotes,
    isLoading,
    error,
    totalIdeas,
    categories,
    starIdea,
  } = useIdeas(sessionId);

  // Fetch session info
  const { session, isLoading: sessionLoading } = useSession(sessionId);

  // Compute clusters from categories
  const clusters = categories.map((category) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    ideaCount: ideas.filter((i) => i.tags.includes(category)).length,
    color: categoryColors[category] || "default",
  }));

  // Session info for header
  const sessionInfo = {
    id: sessionId,
    name: session?.name || "Brainstorm Session",
    status: session?.status || ("ended" as const),
    duration: session?.duration || "0:00:00",
    workflow: "Mind Map Room",
  };

  // Show loading state
  if (isLoading || sessionLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader
          session={sessionInfo}
          title="Mind Map Room"
          subtitle="Loading brainstorm data..."
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal border-t-transparent" />
            <p className="text-text-muted">Loading ideas...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader
          session={sessionInfo}
          title="Mind Map Room"
          subtitle="Error loading data"
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
            <p className="text-error">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Count starred ideas
  const starredCount = ideas.filter((i) => i.isStarred).length;

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
                <p className="text-sm text-text-muted">Total Ideas</p>
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
                <p className="text-sm text-text-muted">Categories</p>
                <p className="text-2xl font-bold text-text">{categories.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <LinkIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Action Items</p>
                <p className="text-2xl font-bold text-text">{actionItems.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <HandThumbUpIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Starred</p>
                <p className="text-2xl font-bold text-text">{starredCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content - Ideas List */}
          <div className="lg:col-span-2">
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ideas</CardTitle>
                    <CardDescription>
                      {ideas.length > 0
                        ? `${ideas.length} idea${ideas.length !== 1 ? "s" : ""} captured`
                        : "No ideas captured yet. Start your brainstorm session to capture ideas."}
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm" className="gap-2">
                    <PlusIcon />
                    Add Idea
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ideas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
                      <LightBulbIcon />
                    </div>
                    <p className="text-text-muted">
                      Ideas will appear here as they are captured during the session.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {ideas.map((idea) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onStar={() => starIdea(idea.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quotes/Insights */}
            {quotes.length > 0 && (
              <Card variant="elevated" className="mt-6">
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                  <CardDescription>Eureka moments and notable quotes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="rounded-lg border border-purple/20 bg-purple/5 p-4"
                      >
                        <p className="text-sm italic text-text">&quot;{quote.text}&quot;</p>
                        {quote.speaker && (
                          <p className="mt-2 text-xs text-text-muted">— {quote.speaker}</p>
                        )}
                        {quote.significance && (
                          <p className="mt-1 text-xs text-purple">{quote.significance}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categories/Clusters */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Idea Categories</CardTitle>
                <CardDescription>Auto-grouped by theme</CardDescription>
              </CardHeader>
              <CardContent>
                {clusters.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    Categories will appear as ideas are captured.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {clusters.map((cluster) => (
                      <div
                        key={cluster.name}
                        className="flex items-center justify-between rounded-lg bg-surface p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full bg-${cluster.color}`}
                          />
                          <span className="text-sm font-medium text-text">
                            {cluster.name}
                          </span>
                        </div>
                        <Badge variant="default">{cluster.ideaCount} ideas</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>Tasks from brainstorming</CardDescription>
              </CardHeader>
              <CardContent>
                {actionItems.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    Action items will be generated from ideas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {actionItems.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 rounded-lg bg-surface p-3"
                      >
                        <input
                          type="checkbox"
                          checked={item.isComplete}
                          readOnly
                          className="mt-0.5 h-4 w-4 rounded border-stroke text-teal focus:ring-teal"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-text">{item.text}</p>
                          <Badge
                            variant={
                              item.priority === "high"
                                ? "error"
                                : item.priority === "medium"
                                ? "warning"
                                : "default"
                            }
                            className="mt-1"
                          >
                            {item.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {actionItems.length > 5 && (
                      <p className="text-center text-xs text-text-muted">
                        +{actionItems.length - 5} more items
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Add */}
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

/**
 * Individual idea card component
 */
function IdeaCard({ idea, onStar }: { idea: Idea; onStar: () => void }) {
  const category = idea.tags[0] || "other";
  const badgeVariant = categoryColors[category] || "default";

  return (
    <div className="rounded-xl border border-stroke bg-surface p-4 transition-colors hover:bg-surface-hover">
      <div className="mb-2 flex items-start justify-between">
        <h4 className="font-medium text-text">
          {idea.title || idea.text.slice(0, 50)}
        </h4>
        <Badge variant={badgeVariant}>{category}</Badge>
      </div>
      <p className="mb-3 text-sm text-text-muted line-clamp-2">{idea.text}</p>
      <div className="flex items-center justify-between text-xs text-text-dim">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStar}
            className="flex items-center gap-1 text-text-muted transition-colors hover:text-warning"
          >
            <StarIcon filled={idea.isStarred} />
            {idea.isStarred ? "Starred" : "Star"}
          </button>
          <span className="text-text-dim">by {idea.speaker}</span>
        </div>
        <span className="text-text-dim">
          {idea.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

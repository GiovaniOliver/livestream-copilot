import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Script Studio",
  description: "Writers room collaboration with script generation and story tools",
};

interface WritersPageProps {
  params: Promise<{ id: string }>;
}

// Mock data for script beats
const mockBeats = [
  {
    id: "beat-1",
    title: "Opening Hook",
    description: "Establish the central conflict and grab audience attention",
    status: "completed",
    notes: "Strong visual opening discussed - helicopter shot of the city",
  },
  {
    id: "beat-2",
    title: "Character Introduction",
    description: "Introduce protagonist and their world",
    status: "in_progress",
    notes: "Working on dialogue for first scene",
  },
  {
    id: "beat-3",
    title: "Inciting Incident",
    description: "The event that sets the story in motion",
    status: "pending",
    notes: "",
  },
  {
    id: "beat-4",
    title: "Rising Action",
    description: "Build tension and develop relationships",
    status: "pending",
    notes: "",
  },
];

// Mock dialogue suggestions
const mockDialogue = [
  {
    id: "dlg-1",
    character: "ALEX",
    line: "I never thought I'd see this place again.",
    context: "Returning home after 10 years",
  },
  {
    id: "dlg-2",
    character: "SARAH",
    line: "You can't keep running from your past.",
    context: "Confrontation scene",
  },
  {
    id: "dlg-3",
    character: "ALEX",
    line: "Maybe not. But I can try.",
    context: "Response to Sarah",
  },
];

const PencilIcon = () => (
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
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const DocumentTextIcon = () => (
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

const ChatBubbleIcon = () => (
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
      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
    />
  </svg>
);

const SparklesIcon = () => (
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
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const statusStyles: Record<string, { badge: string; border: string }> = {
  completed: {
    badge: "success",
    border: "border-l-success",
  },
  in_progress: {
    badge: "warning",
    border: "border-l-warning",
  },
  pending: {
    badge: "default",
    border: "border-l-stroke",
  },
};

export default async function WritersPage({ params }: WritersPageProps) {
  const { id } = await params;

  const session = {
    id,
    name: "Writers Room - Episode Outline",
    status: "live" as const,
    duration: "2:15:33",
    workflow: "Script Studio",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={session}
        title="Script Studio"
        subtitle="Collaborative script writing with AI-assisted dialogue and story structure"
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <PencilIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Story Beats</p>
                <p className="text-2xl font-bold text-text">{mockBeats.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <DocumentTextIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Pages Written</p>
                <p className="text-2xl font-bold text-text">12</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <ChatBubbleIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Dialogue Lines</p>
                <p className="text-2xl font-bold text-text">47</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <SparklesIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">AI Suggestions</p>
                <p className="text-2xl font-bold text-text">23</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content - Story Beats */}
          <div className="lg:col-span-2">
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Story Beats</CardTitle>
                    <CardDescription>
                      Structure your narrative with key story moments
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm">
                    Add Beat
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockBeats.map((beat, index) => {
                    const styles = statusStyles[beat.status];
                    return (
                      <div
                        key={beat.id}
                        className={`rounded-r-xl border-l-4 bg-surface p-4 ${styles.border}`}
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-2 text-sm font-medium text-text">
                              {index + 1}
                            </span>
                            <div>
                              <h4 className="font-medium text-text">
                                {beat.title}
                              </h4>
                              <p className="text-sm text-text-muted">
                                {beat.description}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              styles.badge as "success" | "warning" | "default"
                            }
                          >
                            {beat.status === "in_progress"
                              ? "In Progress"
                              : beat.status === "completed"
                                ? "Completed"
                                : "Pending"}
                          </Badge>
                        </div>
                        {beat.notes && (
                          <div className="mt-3 rounded-lg bg-bg-2 p-3">
                            <p className="text-sm text-text-muted">{beat.notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Script Editor Placeholder */}
            <Card variant="elevated" className="mt-6">
              <CardHeader>
                <CardTitle>Script Editor</CardTitle>
                <CardDescription>
                  Real-time collaborative script writing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] rounded-xl bg-bg-2 p-4">
                  <div className="font-mono text-sm">
                    <p className="mb-4 text-text-dim">FADE IN:</p>
                    <p className="mb-2 text-text-muted">
                      EXT. CITY SKYLINE - NIGHT
                    </p>
                    <p className="mb-4 text-text-muted">
                      Helicopter shot of the glittering city. Lights twinkle like
                      stars reflected in glass towers.
                    </p>
                    <p className="mb-2 text-teal">ALEX (V.O.)</p>
                    <p className="mb-4 text-text">
                      I never thought I'd see this place again.
                    </p>
                    <p className="animate-pulse text-text-dim">|</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Dialogue Suggestions */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Dialogue Suggestions</CardTitle>
                <CardDescription>AI-generated dialogue options</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockDialogue.map((dlg) => (
                    <div
                      key={dlg.id}
                      className="rounded-xl border border-stroke bg-bg-2 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-teal">
                          {dlg.character}
                        </span>
                        <button
                          type="button"
                          className="text-text-muted transition-colors hover:text-text"
                        >
                          <CheckIcon />
                        </button>
                      </div>
                      <p className="mb-2 text-sm text-text">{dlg.line}</p>
                      <p className="text-xs text-text-dim">{dlg.context}</p>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-4 w-full">
                  Generate More
                </Button>
              </CardContent>
            </Card>

            {/* Characters */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Characters</CardTitle>
                <CardDescription>Active characters in this scene</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["ALEX", "SARAH", "MARCUS"].map((character) => (
                    <div
                      key={character}
                      className="flex items-center justify-between rounded-lg bg-surface p-2"
                    >
                      <span className="text-sm font-medium text-text">
                        {character}
                      </span>
                      <Badge variant="teal" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Session Notes</CardTitle>
                <CardDescription>
                  Ideas captured during the session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-text-muted">
                  <p>- Consider flashback sequence for backstory</p>
                  <p>- Sarah's motivation needs more development</p>
                  <p>- Add more tension to the reunion scene</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

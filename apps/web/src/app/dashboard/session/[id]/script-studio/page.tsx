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

interface ScriptStudioPageProps {
  params: Promise<{ id: string }>;
}

// TypeScript interfaces for screenplay elements
interface Scene {
  id: string;
  sceneNumber: number;
  heading: string; // INT./EXT. LOCATION - TIME
  description: string;
  pageStart: number;
  pageEnd: number;
}

interface Character {
  id: string;
  name: string;
  dialogueCount: number;
  firstAppearance: number; // scene number
  description: string;
}

interface DialogueLine {
  id: string;
  characterName: string;
  parenthetical?: string;
  dialogue: string;
  sceneId: string;
}

interface StoryBeat {
  id: string;
  title: string;
  description: string;
  act: 1 | 2 | 3;
  type: "setup" | "catalyst" | "midpoint" | "climax" | "resolution";
  sceneIds: string[];
}

interface SceneBreakdown {
  id: string;
  sceneId: string;
  castMembers: string[];
  props: string[];
  locations: string[];
  notes: string;
}

// Icon components
const FilmIcon = () => (
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
      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-2.625 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
    />
  </svg>
);

const UsersIcon = () => (
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
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
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

const DocumentIcon = () => (
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

const BookOpenIcon = () => (
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
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const ViewColumnsIcon = () => (
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
      d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

// Beat type colors
const beatTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  setup: { bg: "bg-teal/10", text: "text-teal", border: "border-teal/30" },
  catalyst: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
  midpoint: { bg: "bg-purple/10", text: "text-purple", border: "border-purple/30" },
  climax: { bg: "bg-error/10", text: "text-error", border: "border-error/30" },
  resolution: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
};

// Act colors
const actColors: Record<number, string> = {
  1: "bg-teal",
  2: "bg-purple",
  3: "bg-warning",
};

export default function ScriptStudioPage({ params }: ScriptStudioPageProps) {
  const [sessionId, setSessionId] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);

  // Empty state arrays - no mock data
  const [scenes] = useState<Scene[]>([]);
  const [characters] = useState<Character[]>([]);
  const [dialogueLines] = useState<DialogueLine[]>([]);
  const [storyBeats] = useState<StoryBeat[]>([]);
  const [sceneBreakdowns] = useState<SceneBreakdown[]>([]);

  // Calculate stats
  const sceneCount = scenes.length;
  const characterCount = characters.length;
  const dialogueCount = dialogueLines.length;
  const pageCount = scenes.length > 0
    ? Math.max(...scenes.map(s => s.pageEnd))
    : 0;

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setSessionId(resolvedParams.id);
    }
    loadParams();
  }, [params]);

  // Load session from API
  const { session: apiSession } = useSession(sessionId);
  useEffect(() => {
    if (apiSession) {
      setSession(apiSession);
    }
  }, [apiSession]);

  const sessionInfo = session
    ? {
        id: session.id,
        name: session.name,
        status: session.status,
        duration: session.duration,
        workflow: "Script Studio",
      }
    : {
        id: sessionId,
        name: "Untitled Script",
        status: "live" as const,
        duration: "0:00:00",
        workflow: "Script Studio",
      };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={sessionInfo}
        title="Script Studio"
        subtitle="Professional screenplay writing with scene breakdown and character tracking"
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <FilmIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Scenes</p>
                <p className="text-2xl font-bold text-text">{sceneCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <UsersIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Characters</p>
                <p className="text-2xl font-bold text-text">{characterCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <ChatBubbleIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Dialogue Lines</p>
                <p className="text-2xl font-bold text-text">{dialogueCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <DocumentIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Page Count</p>
                <p className="text-2xl font-bold text-text">{pageCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content - Screenplay View */}
          <div className="lg:col-span-2 space-y-6">
            {/* Screenplay Script View */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Screenplay</CardTitle>
                    <CardDescription>
                      Industry-standard screenplay formatting
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm" className="gap-2">
                    <PlusIcon />
                    Add Scene
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {scenes.length === 0 ? (
                  <div className="min-h-[300px] rounded-xl bg-bg-2 p-8 flex flex-col items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface mb-4">
                      <BookOpenIcon />
                    </div>
                    <p className="text-text-muted text-center mb-2">
                      No scenes yet
                    </p>
                    <p className="text-text-dim text-sm text-center max-w-md">
                      Start writing your screenplay by adding your first scene.
                      Use proper formatting like INT./EXT. for scene headings.
                    </p>
                    <Button variant="outline" size="sm" className="mt-4 gap-2">
                      <PlusIcon />
                      Create First Scene
                    </Button>
                  </div>
                ) : (
                  <div className="min-h-[300px] rounded-xl bg-bg-2 p-6 font-mono text-sm space-y-6">
                    {scenes.map((scene) => (
                      <div key={scene.id} className="space-y-4">
                        {/* Scene Heading */}
                        <p className="text-text font-bold uppercase">
                          {scene.heading}
                        </p>
                        {/* Action/Description */}
                        <p className="text-text-muted">
                          {scene.description}
                        </p>
                        {/* Dialogue for this scene */}
                        {dialogueLines
                          .filter((d) => d.sceneId === scene.id)
                          .map((line) => (
                            <div key={line.id} className="pl-16 space-y-1">
                              <p className="text-teal font-semibold uppercase text-center">
                                {line.characterName}
                              </p>
                              {line.parenthetical && (
                                <p className="text-text-dim text-center text-xs">
                                  ({line.parenthetical})
                                </p>
                              )}
                              <p className="text-text text-center max-w-md mx-auto">
                                {line.dialogue}
                              </p>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Beat Board */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Beat Board</CardTitle>
                    <CardDescription>
                      Story beats and plot points visualization
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <PlusIcon />
                    Add Beat
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {storyBeats.length === 0 ? (
                  <div className="min-h-[200px] rounded-xl bg-bg-2 p-6 flex flex-col items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface mb-3">
                      <ViewColumnsIcon />
                    </div>
                    <p className="text-text-muted text-center mb-1">
                      No story beats defined
                    </p>
                    <p className="text-text-dim text-sm text-center max-w-md">
                      Add story beats to track your narrative structure across three acts.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {/* Act 1 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-2 w-2 rounded-full ${actColors[1]}`} />
                        <span className="text-sm font-medium text-text">Act 1</span>
                      </div>
                      {storyBeats
                        .filter((beat) => beat.act === 1)
                        .map((beat) => {
                          const colors = beatTypeColors[beat.type];
                          return (
                            <div
                              key={beat.id}
                              className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}
                            >
                              <p className={`text-sm font-medium ${colors.text}`}>
                                {beat.title}
                              </p>
                              <p className="text-xs text-text-muted mt-1">
                                {beat.description}
                              </p>
                              <Badge variant="default" className="mt-2 text-xs">
                                {beat.type}
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                    {/* Act 2 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-2 w-2 rounded-full ${actColors[2]}`} />
                        <span className="text-sm font-medium text-text">Act 2</span>
                      </div>
                      {storyBeats
                        .filter((beat) => beat.act === 2)
                        .map((beat) => {
                          const colors = beatTypeColors[beat.type];
                          return (
                            <div
                              key={beat.id}
                              className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}
                            >
                              <p className={`text-sm font-medium ${colors.text}`}>
                                {beat.title}
                              </p>
                              <p className="text-xs text-text-muted mt-1">
                                {beat.description}
                              </p>
                              <Badge variant="default" className="mt-2 text-xs">
                                {beat.type}
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                    {/* Act 3 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-2 w-2 rounded-full ${actColors[3]}`} />
                        <span className="text-sm font-medium text-text">Act 3</span>
                      </div>
                      {storyBeats
                        .filter((beat) => beat.act === 3)
                        .map((beat) => {
                          const colors = beatTypeColors[beat.type];
                          return (
                            <div
                              key={beat.id}
                              className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}
                            >
                              <p className={`text-sm font-medium ${colors.text}`}>
                                {beat.title}
                              </p>
                              <p className="text-xs text-text-muted mt-1">
                                {beat.description}
                              </p>
                              <Badge variant="default" className="mt-2 text-xs">
                                {beat.type}
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scene Breakdown Panel */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Scene Breakdown</CardTitle>
                    <CardDescription>
                      Production elements for each scene
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sceneBreakdowns.length === 0 ? (
                  <div className="min-h-[150px] rounded-xl bg-bg-2 p-6 flex flex-col items-center justify-center">
                    <p className="text-text-muted text-center mb-1">
                      No scene breakdowns yet
                    </p>
                    <p className="text-text-dim text-sm text-center max-w-md">
                      Scene breakdowns will appear here once you add scenes.
                      Track cast, props, and locations for production planning.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sceneBreakdowns.map((breakdown) => {
                      const scene = scenes.find((s) => s.id === breakdown.sceneId);
                      return (
                        <div
                          key={breakdown.id}
                          className="rounded-xl border border-stroke bg-surface p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm font-medium text-text">
                                Scene {scene?.sceneNumber}
                              </p>
                              <p className="text-xs text-text-muted">
                                {scene?.heading}
                              </p>
                            </div>
                            <Badge variant="teal">
                              Pg {scene?.pageStart}-{scene?.pageEnd}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <p className="text-text-dim mb-1">Cast</p>
                              <div className="space-y-1">
                                {breakdown.castMembers.length === 0 ? (
                                  <p className="text-text-muted">None</p>
                                ) : (
                                  breakdown.castMembers.map((member) => (
                                    <Badge
                                      key={member}
                                      variant="default"
                                      className="mr-1"
                                    >
                                      {member}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-text-dim mb-1">Props</p>
                              <div className="space-y-1">
                                {breakdown.props.length === 0 ? (
                                  <p className="text-text-muted">None</p>
                                ) : (
                                  breakdown.props.map((prop) => (
                                    <Badge
                                      key={prop}
                                      variant="default"
                                      className="mr-1"
                                    >
                                      {prop}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-text-dim mb-1">Locations</p>
                              <div className="space-y-1">
                                {breakdown.locations.length === 0 ? (
                                  <p className="text-text-muted">None</p>
                                ) : (
                                  breakdown.locations.map((loc) => (
                                    <Badge
                                      key={loc}
                                      variant="default"
                                      className="mr-1"
                                    >
                                      {loc}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                          {breakdown.notes && (
                            <div className="mt-3 pt-3 border-t border-stroke">
                              <p className="text-xs text-text-muted">
                                {breakdown.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Act Structure Visualization */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Act Structure</CardTitle>
                <CardDescription>Three-act story progression</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Act progress bars */}
                  {[1, 2, 3].map((act) => {
                    const actBeats = storyBeats.filter((b) => b.act === act);
                    const actScenes = scenes.filter((s) => {
                      const beatsInAct = storyBeats.filter((b) => b.act === act);
                      return beatsInAct.some((beat) =>
                        beat.sceneIds.includes(s.id)
                      );
                    });
                    const progress = actBeats.length > 0 ? 100 : 0;

                    return (
                      <div key={act}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text">
                            Act {act}
                          </span>
                          <span className="text-xs text-text-muted">
                            {actScenes.length} scenes
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-bg-2 overflow-hidden">
                          <div
                            className={`h-full ${actColors[act]} transition-all duration-300`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-text-dim mt-1">
                          {act === 1 && "Setup & Inciting Incident"}
                          {act === 2 && "Confrontation & Midpoint"}
                          {act === 3 && "Resolution & Climax"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Act breakdown empty state */}
                {storyBeats.length === 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-bg-2">
                    <p className="text-xs text-text-muted text-center">
                      Add story beats to visualize your act structure
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Character Tracker */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Character Tracker</CardTitle>
                    <CardDescription>Speaking lines per character</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <PlusIcon />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {characters.length === 0 ? (
                  <div className="min-h-[150px] rounded-xl bg-bg-2 p-4 flex flex-col items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface mb-2">
                      <UsersIcon />
                    </div>
                    <p className="text-text-muted text-sm text-center mb-1">
                      No characters yet
                    </p>
                    <p className="text-text-dim text-xs text-center">
                      Characters will be tracked as you add dialogue
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {characters
                      .sort((a, b) => b.dialogueCount - a.dialogueCount)
                      .map((character, index) => {
                        const maxDialogue = Math.max(
                          ...characters.map((c) => c.dialogueCount)
                        );
                        const percentage =
                          maxDialogue > 0
                            ? (character.dialogueCount / maxDialogue) * 100
                            : 0;

                        return (
                          <div key={character.id}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-xs font-medium text-text">
                                  {index + 1}
                                </span>
                                <span className="text-sm font-medium text-text uppercase">
                                  {character.name}
                                </span>
                              </div>
                              <span className="text-xs text-text-muted">
                                {character.dialogueCount} lines
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-bg-2 overflow-hidden">
                              <div
                                className="h-full bg-teal transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            {character.description && (
                              <p className="text-xs text-text-dim mt-1 truncate">
                                {character.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scene List */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Scenes</CardTitle>
                <CardDescription>Quick navigation</CardDescription>
              </CardHeader>
              <CardContent>
                {scenes.length === 0 ? (
                  <div className="rounded-xl bg-bg-2 p-4 text-center">
                    <p className="text-text-muted text-sm">No scenes yet</p>
                    <p className="text-text-dim text-xs mt-1">
                      Scenes will appear here as you write
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {scenes.map((scene) => (
                      <button
                        key={scene.id}
                        type="button"
                        className="w-full text-left rounded-lg bg-surface p-2 hover:bg-surface-hover transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-teal">
                            Scene {scene.sceneNumber}
                          </span>
                          <span className="text-xs text-text-dim">
                            Pg {scene.pageStart}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted truncate mt-1">
                          {scene.heading}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Writing Stats */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Writing Stats</CardTitle>
                <CardDescription>Session progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-surface p-2">
                    <span className="text-sm text-text-muted">INT. Scenes</span>
                    <span className="text-sm font-medium text-text">
                      {scenes.filter((s) => s.heading.startsWith("INT.")).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-surface p-2">
                    <span className="text-sm text-text-muted">EXT. Scenes</span>
                    <span className="text-sm font-medium text-text">
                      {scenes.filter((s) => s.heading.startsWith("EXT.")).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-surface p-2">
                    <span className="text-sm text-text-muted">DAY Scenes</span>
                    <span className="text-sm font-medium text-text">
                      {scenes.filter((s) => s.heading.includes("DAY")).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-surface p-2">
                    <span className="text-sm text-text-muted">NIGHT Scenes</span>
                    <span className="text-sm font-medium text-text">
                      {scenes.filter((s) => s.heading.includes("NIGHT")).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

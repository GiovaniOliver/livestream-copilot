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
} from "@/components/ui";
import { type Session } from "@/lib/stores/sessions";
import { useSession } from "@/hooks/useSessions";
import { useWritersCorner } from "@/hooks/useWritersCorner";
import { LivePreview, useLiveStream } from "@/components/video";
import { WritingPad } from "@/components/dashboards/writers-corner/WritingPad";
import { CharacterTracker } from "@/components/dashboards/writers-corner/CharacterTracker";
import { DialogueSuggestionsPanel } from "@/components/dashboards/writers-corner/DialogueSuggestions";
import { SceneNavigator } from "@/components/dashboards/writers-corner/SceneNavigator";
import { ActionItemsPanel } from "@/components/dashboards/writers-corner/ActionItemsPanel";
import { QuickExport } from "@/components/dashboards/writers-corner/QuickExport";

// ============================================================================
// Writers Corner Dashboard Page
// Full-featured writing workspace with real-time WebSocket data
// ============================================================================

interface WritersCornerPageProps {
  params: Promise<{ id: string }>;
}

// Icons
const PencilSquareIcon = () => (
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
      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
    />
  </svg>
);

const ClipboardDocumentListIcon = () => (
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
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
    />
  </svg>
);

const SignalIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

export default function WritersCornerPage({ params }: WritersCornerPageProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setSessionId(resolvedParams.id);
    }
    loadParams();
  }, [params]);

  // Load session from API
  const { session: apiSession } = useSession(sessionId ?? "");
  useEffect(() => {
    if (apiSession) {
      setSession(apiSession);
    }
  }, [apiSession]);

  // Live stream status
  const { status: videoStatus } = useLiveStream();

  // Writers Corner hook - processes WebSocket events
  const {
    transcriptLines,
    writerNotes,
    characters,
    suggestions,
    scenes,
    actionItems,
    stats,
    isConnected,
    addWriterNote,
    removeWriterNote,
    acceptSuggestion,
    rejectSuggestion,
    toggleActionItem,
    exportScript,
  } = useWritersCorner(sessionId ?? "");

  const sessionInfo = session
    ? {
        id: session.id,
        name: session.name,
        status: session.status,
        duration: session.duration,
        workflow: "Writers Corner",
      }
    : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        session={sessionInfo}
        title="Writers Corner"
        subtitle="Real-time writing workspace with transcript, character tracking, and AI dialogue suggestions"
        isStreaming={videoStatus?.isStreaming}
        actions={
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-success animate-pulse" : "bg-text-dim"
                }`}
              />
              <span className="text-xs text-text-muted">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            {/* Quick export */}
            <QuickExport
              onExport={exportScript}
              sessionName={session?.name}
            />
          </div>
        }
      />

      <div className="flex-1 p-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <PencilSquareIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Transcript Lines</p>
                <p className="text-2xl font-bold text-text">{stats.transcriptLineCount}</p>
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
                <p className="text-2xl font-bold text-text">{stats.characterCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <SparklesIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Suggestions</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-text">{stats.suggestionCount}</p>
                  {stats.pendingSuggestions > 0 && (
                    <span className="text-xs text-warning">
                      ({stats.pendingSuggestions} pending)
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <FilmIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Scene Beats</p>
                <p className="text-2xl font-bold text-text">{stats.sceneCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-error/10">
                <ClipboardDocumentListIcon />
              </div>
              <div>
                <p className="text-sm text-text-muted">Action Items</p>
                <p className="text-2xl font-bold text-text">{stats.actionItemCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Writing Pad (spans 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Writing Pad */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Writing Pad</CardTitle>
                    <CardDescription>
                      Live transcript with writer notes
                    </CardDescription>
                  </div>
                  {isConnected && (
                    <Badge variant="teal" className="gap-1.5">
                      <SignalIcon />
                      Live
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="min-h-[350px]">
                  <WritingPad
                    transcriptLines={transcriptLines}
                    writerNotes={writerNotes}
                    onAddNote={addWriterNote}
                    onRemoveNote={removeWriterNote}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scene Navigator */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Scene Navigator</CardTitle>
                    <CardDescription>
                      Timeline of detected scenes and story beats
                    </CardDescription>
                  </div>
                  {scenes.length > 0 && (
                    <Badge variant="success">
                      {scenes.length} {scenes.length === 1 ? "beat" : "beats"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <SceneNavigator scenes={scenes} />
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Action Items</CardTitle>
                    <CardDescription>
                      Tasks and follow-ups extracted from the session
                    </CardDescription>
                  </div>
                  {actionItems.length > 0 && (
                    <Badge
                      variant={
                        actionItems.some((i) => !i.isComplete) ? "warning" : "success"
                      }
                    >
                      {actionItems.filter((i) => !i.isComplete).length} open
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ActionItemsPanel
                  actionItems={actionItems}
                  onToggle={toggleActionItem}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Live Preview */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>Your stream feed</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <LivePreview
                  webrtcUrl={videoStatus?.webrtcUrl}
                  hlsUrl={videoStatus?.hlsUrl}
                  isStreamActive={videoStatus?.isStreaming}
                  size="sm"
                />
              </CardContent>
            </Card>

            {/* Character Tracker */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Character Tracker</CardTitle>
                    <CardDescription>
                      Speakers with dialogue counts and traits
                    </CardDescription>
                  </div>
                  {characters.length > 0 && (
                    <Badge variant="purple">{characters.length}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CharacterTracker characters={characters} />
              </CardContent>
            </Card>

            {/* Dialogue Suggestions */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Dialogue Suggestions</CardTitle>
                    <CardDescription>
                      AI-generated dialogue alternatives
                    </CardDescription>
                  </div>
                  {stats.pendingSuggestions > 0 && (
                    <Badge variant="warning">
                      {stats.pendingSuggestions} new
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <DialogueSuggestionsPanel
                  suggestions={suggestions}
                  onAccept={acceptSuggestion}
                  onReject={rejectSuggestion}
                />
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Session Info</CardTitle>
                <CardDescription>Current writing session details</CardDescription>
              </CardHeader>
              <CardContent>
                {session ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Session</span>
                      <span className="text-text truncate ml-2 max-w-[180px]">{session.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Status</span>
                      <Badge
                        variant={
                          session.status === "live"
                            ? "error"
                            : session.status === "paused"
                              ? "warning"
                              : "default"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Duration</span>
                      <span className="font-mono text-text">{session.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">WebSocket</span>
                      <span className={isConnected ? "text-success" : "text-text-dim"}>
                        {isConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Workflow</span>
                      <Badge variant="teal">Writers Corner</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-bg-2 py-6">
                    <p className="text-sm text-text-muted">Loading session...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

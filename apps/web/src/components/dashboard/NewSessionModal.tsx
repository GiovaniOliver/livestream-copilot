"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { WORKFLOW_TYPES, WORKFLOW_META, CAPTURE_MODES, type WorkflowType, type CaptureMode } from "@/lib/constants";
import { getCaptureModeLabel, getWorkflowPath } from "@/lib/stores/sessions";
import { useSessions } from "@/hooks/useSessions";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: () => void;
}

// Workflow icons
const WorkflowIcons: Record<WorkflowType, React.ReactNode> = {
  [WORKFLOW_TYPES.CONTENT_CREATOR]: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  ),
  [WORKFLOW_TYPES.PODCAST]: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  ),
  [WORKFLOW_TYPES.SCRIPT_STUDIO]: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5" />
    </svg>
  ),
  [WORKFLOW_TYPES.WRITERS_CORNER]: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
  [WORKFLOW_TYPES.MIND_MAP]: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  [WORKFLOW_TYPES.COURT_SESSION]: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  ),
  [WORKFLOW_TYPES.DEBATE_ROOM]: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  ),
};

// Capture mode icons
const CaptureModeIcons: Record<CaptureMode, React.ReactNode> = {
  [CAPTURE_MODES.AUDIO]: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  ),
  [CAPTURE_MODES.VIDEO]: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  [CAPTURE_MODES.AUDIO_VIDEO]: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125" />
    </svg>
  ),
};

/**
 * Map frontend workflow types to backend workflow types
 * Backend uses slightly different naming in some cases
 */
function mapFrontendWorkflowToBackend(workflow: WorkflowType): string {
  const workflowMap: Record<WorkflowType, string> = {
    [WORKFLOW_TYPES.CONTENT_CREATOR]: "streamer",
    [WORKFLOW_TYPES.PODCAST]: "podcast",
    [WORKFLOW_TYPES.SCRIPT_STUDIO]: "script_studio",
    [WORKFLOW_TYPES.WRITERS_CORNER]: "writers_room",
    [WORKFLOW_TYPES.MIND_MAP]: "brainstorm",
    [WORKFLOW_TYPES.COURT_SESSION]: "court_session",
    [WORKFLOW_TYPES.DEBATE_ROOM]: "debate",
  };
  return workflowMap[workflow] || workflow;
}

/**
 * Map frontend capture mode to backend capture mode
 */
function mapFrontendCaptureModeToBackend(captureMode: CaptureMode): string {
  const captureModeMap: Record<CaptureMode, string> = {
    [CAPTURE_MODES.AUDIO]: "audio",
    [CAPTURE_MODES.VIDEO]: "video",
    [CAPTURE_MODES.AUDIO_VIDEO]: "av",
  };
  return captureModeMap[captureMode] || captureMode;
}

export function NewSessionModal({ isOpen, onClose, onSessionCreated }: NewSessionModalProps) {
  const router = useRouter();
  const { createSession, forceStop } = useSessions(false); // Don't auto-connect WebSocket in modal
  const [step, setStep] = useState<"workflow" | "details">("workflow");
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | null>(null);
  const [selectedCaptureMode, setSelectedCaptureMode] = useState<CaptureMode>(CAPTURE_MODES.AUDIO_VIDEO);
  const [sessionName, setSessionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [conflictError, setConflictError] = useState<{ message: string; session?: any } | null>(null);
  const [isForceStopping, setIsForceStopping] = useState(false);

  const handleWorkflowSelect = useCallback((workflow: WorkflowType) => {
    setSelectedWorkflow(workflow);
    setStep("details");
  }, []);

  const handleBack = useCallback(() => {
    setStep("workflow");
  }, []);

  const handleCreate = useCallback(async () => {
    if (!selectedWorkflow || !sessionName.trim()) return;

    setIsCreating(true);
    setConflictError(null);
    try {
      logger.debug("[NewSessionModal] Creating session...", {
        workflow: selectedWorkflow,
        title: sessionName,
        captureMode: selectedCaptureMode
      });
      // Call the API to create a new session
      const response = await createSession({
        workflow: mapFrontendWorkflowToBackend(selectedWorkflow) as any,
        captureMode: mapFrontendCaptureModeToBackend(selectedCaptureMode) as any,
        title: sessionName.trim(),
      });

      logger.debug("[NewSessionModal] Session created successfully:", response);
      onSessionCreated?.();
      onClose();

      // Navigate to the session dashboard
      const workflowPath = getWorkflowPath(selectedWorkflow);
      router.push(`/dashboard/session/${response.sessionId}/${workflowPath}`);
    } catch (error: any) {
      logger.error("[NewSessionModal] Failed to create session:", error);

      // Check if it's a conflict error (409)
      const isConflict =
        error.message?.includes("already active") ||
        error.message?.includes("409") ||
        error.status === 409 ||
        (error as any).body?.error?.includes("already active") ||
        (error as any).response?.status === 409;

      if (isConflict) {
        setConflictError({
          message: error.message || "Session already active",
        });
      } else {
        // Generic error
        alert(`Failed to start session: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsCreating(false);
    }
  }, [selectedWorkflow, sessionName, selectedCaptureMode, router, onClose, onSessionCreated, createSession]);

  const handleForceStop = useCallback(async () => {
    logger.debug("[NewSessionModal] Force stopping active session...");
    setIsForceStopping(true);
    try {
      await forceStop();
      logger.debug("[NewSessionModal] Force stop successful, retrying create...");
      setConflictError(null);
      // Automatically retry creation
      handleCreate();
    } catch (err: any) {
      logger.error("[NewSessionModal] Failed to force stop session:", err);
      alert("Failed to clear session state. Please check the backend logs.");
    } finally {
      setIsForceStopping(false);
    }
  }, [forceStop, handleCreate]);

  const handleClose = useCallback(() => {
    setStep("workflow");
    setSelectedWorkflow(null);
    setSessionName("");
    setSelectedCaptureMode(CAPTURE_MODES.AUDIO_VIDEO);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const workflows = Object.values(WORKFLOW_TYPES);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-0/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl animate-in rounded-2xl border border-stroke bg-bg-1 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === "details" && (
              <button
                onClick={handleBack}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-semibold text-text">
              {step === "workflow" ? "Choose a Workflow" : "Session Details"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {step === "workflow" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => {
              const meta = WORKFLOW_META[workflow];
              return (
                <button
                  key={workflow}
                  onClick={() => handleWorkflowSelect(workflow)}
                  className={cn(
                    "flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    "border-stroke bg-bg-0 hover:border-teal/50 hover:bg-bg-2"
                  )}
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal/20 to-purple/20 text-teal">
                    {WorkflowIcons[workflow]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-text">{meta.label}</h3>
                    <p className="mt-1 text-xs text-text-muted line-clamp-2">{meta.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Workflow Badge */}
            {selectedWorkflow && (
              <div className="flex items-center gap-3 rounded-xl border border-stroke bg-bg-0 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal/20 to-purple/20 text-teal">
                  {WorkflowIcons[selectedWorkflow]}
                </div>
                <div>
                  <p className="text-sm text-text-muted">Workflow</p>
                  <p className="font-medium text-text">{WORKFLOW_META[selectedWorkflow].label}</p>
                </div>
              </div>
            )}

            {/* Session Name */}
            <div>
              <label htmlFor="session-name" className="mb-2 block text-sm font-medium text-text">
                Session Name
              </label>
              <input
                id="session-name"
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Weekly Podcast Ep. 42"
                className={cn(
                  "w-full rounded-xl border bg-bg-0 px-4 py-3 text-text",
                  "placeholder:text-text-dim",
                  "focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20",
                  "border-stroke"
                )}
                autoFocus
              />
            </div>

            {/* Capture Mode */}
            <div>
              <label className="mb-2 block text-sm font-medium text-text">
                Capture Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {Object.values(CAPTURE_MODES).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedCaptureMode(mode)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                      selectedCaptureMode === mode
                        ? "border-teal bg-teal/10 text-teal"
                        : "border-stroke bg-bg-0 text-text-muted hover:border-stroke hover:bg-bg-2"
                    )}
                  >
                    {CaptureModeIcons[mode]}
                    <span className="text-sm font-medium">{getCaptureModeLabel(mode)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conflict Error / Force Stop */}
            {conflictError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-500">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-500">Conflict: Session already active</p>
                    <p className="mt-1 text-xs text-text-muted">
                      There is already an active session in memory. This usually happens if a previous session wasn't stopped correctly.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleForceStop}
                        disabled={isForceStopping}
                        className="h-8 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        {isForceStopping ? "Stopping..." : "Clear Active Session & Retry"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConflictError(null)}
                        className="h-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-stroke pt-6">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!sessionName.trim() || isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    Start Session
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

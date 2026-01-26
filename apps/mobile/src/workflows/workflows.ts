export type WorkflowId = "streamer" | "writers_room" | "brainstorm" | "debate" | "podcast";

export type WorkflowMeta = {
  id: WorkflowId;
  title: string;
  description: string;
  defaultCaptureMode: "audio" | "video" | "av";
};

export const WORKFLOWS: WorkflowMeta[] = [
  { id: "streamer", title: "Live Streamer", description: "Posts + clips in real time", defaultCaptureMode: "av" },
  { id: "writers_room", title: "Writers Room", description: "Beats + script inserts + attribution", defaultCaptureMode: "audio" },
  { id: "brainstorm", title: "Brainstorm", description: "Idea clusters + action items", defaultCaptureMode: "audio" },
  { id: "debate", title: "Debate", description: "Claims map + evidence queue", defaultCaptureMode: "av" },
  { id: "podcast", title: "Podcast", description: "Chapters + quotes + promo pack", defaultCaptureMode: "av" }
];

export function getWorkflow(id: string): WorkflowMeta {
  const wf = WORKFLOWS.find((w) => w.id === id);
  if (!wf) throw new Error(`Unknown workflow: ${id}`);
  return wf;
}

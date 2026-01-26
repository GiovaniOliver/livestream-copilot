import type { SessionConfig } from "@livestream-copilot/shared";

export type CompanionConfig = {
  baseUrl: string; // e.g. http://localhost:3123
};

export async function startSession(
  cfg: CompanionConfig,
  session: Omit<SessionConfig, "startedAt">
): Promise<{ sessionId: string; ws: string }> {
  const res = await fetch(cfg.baseUrl + "/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error("Failed to start session: " + (await res.text()));
  return (await res.json()) as { sessionId: string; ws: string };
}

export async function clipStart(cfg: CompanionConfig, t?: number) {
  const res = await fetch(cfg.baseUrl + "/clip/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ t, source: "button" }),
  });
  return res.json();
}

export async function clipEnd(cfg: CompanionConfig, t?: number) {
  const res = await fetch(cfg.baseUrl + "/clip/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ t, source: "button" }),
  });
  return res.json();
}

export function alignSegmentToSessionTimeline(
  rawStartSeconds: number,
  rawEndSeconds: number,
  sessionStartedAtMs: number,
  transcriptionStartedAtMs: number
): { t0: number; t1: number } {
  const sessionOffsetSeconds = Math.max(
    0,
    (transcriptionStartedAtMs - sessionStartedAtMs) / 1000
  );

  return {
    t0: rawStartSeconds + sessionOffsetSeconds,
    t1: rawEndSeconds + sessionOffsetSeconds,
  };
}

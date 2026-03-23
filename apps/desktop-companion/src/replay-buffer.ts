import fs from "fs";
import path from "path";

const REPLAY_FILENAME_TIMESTAMP =
  /(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})[-_](?<hour>\d{2})(?<minute>\d{2})(?<second>\d{2})/;

function getReplayFreshnessTimestamp(filePath: string, filename: string): number {
  const stats = fs.statSync(filePath);
  const inferredTimestamp = parseReplayTimestampFromFilename(filename);

  return inferredTimestamp ? Math.max(stats.mtimeMs, inferredTimestamp) : stats.mtimeMs;
}

export function parseReplayTimestampFromFilename(filename: string): number | null {
  const match = REPLAY_FILENAME_TIMESTAMP.exec(filename);
  if (!match?.groups) {
    return null;
  }

  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const hour = Number(match.groups.hour);
  const minute = Number(match.groups.minute);
  const second = Number(match.groups.second);

  const timestamp = new Date(year, month - 1, day, hour, minute, second).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

export function findLatestReplayBuffer(
  directory: string,
  maxAgeMs: number = 30000,
  nowMs: number = Date.now()
): string | null {
  if (!directory || !fs.existsSync(directory)) {
    return null;
  }

  try {
    const candidates = fs
      .readdirSync(directory)
      .filter((filename) => /\.(mp4|mkv|flv|mov|ts)$/i.test(filename))
      .map((filename) => {
        const fullPath = path.join(directory, filename);
        return {
          path: fullPath,
          freshnessTs: getReplayFreshnessTimestamp(fullPath, filename),
        };
      })
      .filter((candidate) => nowMs - candidate.freshnessTs < maxAgeMs)
      .sort((a, b) => b.freshnessTs - a.freshnessTs);

    return candidates.length > 0 ? candidates[0].path : null;
  } catch {
    return null;
  }
}

import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { findLatestReplayBuffer, parseReplayTimestampFromFilename } from "../replay-buffer.js";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "replay-buffer-test-"));
  tempDirs.push(dir);
  return dir;
}

function writeReplayFile(directory: string, filename: string, mtimeMs: number): string {
  const filePath = path.join(directory, filename);
  fs.writeFileSync(filePath, "test");
  const mtime = new Date(mtimeMs);
  fs.utimesSync(filePath, mtime, mtime);
  return filePath;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("parseReplayTimestampFromFilename", () => {
  it("parses timestamped replay filenames", () => {
    const timestamp = parseReplayTimestampFromFilename("replay-20260319-134558.mp4");

    expect(timestamp).toBe(new Date(2026, 2, 19, 13, 45, 58).getTime());
  });

  it("returns null when the filename has no timestamp", () => {
    expect(parseReplayTimestampFromFilename("seed.mp4")).toBeNull();
  });
});

describe("findLatestReplayBuffer", () => {
  it("accepts a stale-mtime file when its filename timestamp is recent", () => {
    const dir = createTempDir();
    const now = new Date(2026, 2, 19, 13, 46, 0).getTime();
    const staleMtime = now - 15 * 60 * 1000;
    const replayPath = writeReplayFile(dir, "replay-20260319-134558.mp4", staleMtime);

    expect(findLatestReplayBuffer(dir, 30_000, now)).toBe(replayPath);
  });

  it("prefers the freshest replay candidate", () => {
    const dir = createTempDir();
    const now = new Date(2026, 2, 19, 13, 46, 0).getTime();
    const staleMtime = now - 15 * 60 * 1000;

    writeReplayFile(dir, "replay-20260319-134550.mp4", staleMtime);
    const freshest = writeReplayFile(dir, "replay-20260319-134558.mp4", staleMtime);

    expect(findLatestReplayBuffer(dir, 30_000, now)).toBe(freshest);
  });

  it("returns null when every replay file is stale", () => {
    const dir = createTempDir();
    const now = new Date(2026, 2, 19, 13, 46, 0).getTime();
    const staleMtime = now - 15 * 60 * 1000;

    writeReplayFile(dir, "replay-20260319-133000.mp4", staleMtime);

    expect(findLatestReplayBuffer(dir, 30_000, now)).toBeNull();
  });
});

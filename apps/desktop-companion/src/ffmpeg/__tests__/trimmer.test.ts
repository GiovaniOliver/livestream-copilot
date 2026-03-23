/**
 * FFmpeg Trimmer Unit Tests
 *
 * Tests for the clip trimming logic including:
 * - Buffer offset calculations
 * - Timestamp validation
 * - File existence checks
 * - Error handling
 *
 * Note: We test the pure calculation logic (calculateBufferOffsets)
 * extensively since it contains the core business logic. The actual
 * ffmpeg commands are integration-level concerns.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { FFmpegError } from "../types.js";

type MockedFfmpegModule = {
  setFfmpegPath: Mock;
  setFfprobePath: Mock;
  ffprobe: Mock;
  getAvailableFormats: Mock;
};

// Mock dependencies before importing module under test
vi.mock("fluent-ffmpeg", () => {
  const mockCommand = {
    setStartTime: vi.fn().mockReturnThis(),
    setDuration: vi.fn().mockReturnThis(),
    videoCodec: vi.fn().mockReturnThis(),
    audioCodec: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    run: vi.fn(),
    seekInput: vi.fn().mockReturnThis(),
    frames: vi.fn().mockReturnThis(),
  };

  const ffmpeg = vi.fn(() => mockCommand) as Mock & MockedFfmpegModule;
  ffmpeg.setFfmpegPath = vi.fn();
  ffmpeg.setFfprobePath = vi.fn();
  ffmpeg.ffprobe = vi.fn();
  ffmpeg.getAvailableFormats = vi.fn();

  return { default: ffmpeg };
});

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock("../probe.js", () => ({
  probeVideo: vi.fn().mockResolvedValue({
    duration: 300,
    width: 1920,
    height: 1080,
    codec: "h264",
    fps: "30/1",
    bitrate: 5000000,
    format: "mp4",
  }),
  getVideoDuration: vi.fn().mockResolvedValue(300),
}));

vi.mock("../thumbnail.js", () => ({
  generateThumbnailAtMidpoint: vi.fn().mockResolvedValue("/path/to/thumb.jpg"),
}));

vi.mock("../../logger/index.js", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
  ffmpegLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  calculateBufferOffsets,
  configureFfmpeg,
  isFFmpegAvailable,
} from "../trimmer.js";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

const mockedFfmpeg = ffmpeg as typeof ffmpeg & MockedFfmpegModule;

// =============================================================================
// Tests
// =============================================================================

describe("FFmpeg Trimmer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // configureFfmpeg
  // ---------------------------------------------------------------------------
  describe("configureFfmpeg", () => {
    it("should set ffmpeg path when provided", () => {
      configureFfmpeg("/usr/local/bin/ffmpeg");

      expect(mockedFfmpeg.setFfmpegPath).toHaveBeenCalledWith(
        "/usr/local/bin/ffmpeg"
      );
    });

    it("should not set ffmpeg path when not provided", () => {
      configureFfmpeg();

      expect(mockedFfmpeg.setFfmpegPath).not.toHaveBeenCalled();
    });

    it("should not set ffmpeg path when undefined", () => {
      configureFfmpeg(undefined);

      expect(mockedFfmpeg.setFfmpegPath).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // calculateBufferOffsets - Core Business Logic
  // ---------------------------------------------------------------------------
  describe("calculateBufferOffsets", () => {
    // The replay buffer scenario:
    // - Session starts at sessionStartedAt (Unix ms)
    // - Replay buffer captures last N seconds (replayBufferSeconds)
    // - Replay buffer is saved at replayBufferSavedAt (Unix ms)
    // - Clip is defined by t0, t1 (seconds from session start)

    it("should calculate correct offsets for a clip in the middle of the buffer", () => {
      const now = 1700000000000; // Unix ms
      const sessionStartedAt = now - 300000; // Session started 300s ago
      const replayBufferSavedAt = now; // Buffer saved now
      const replayBufferSeconds = 300;

      // Clip from 120s to 150s into the session
      const result = calculateBufferOffsets({
        t0: 120,
        t1: 150,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
      });

      // Buffer starts at: now - 300s = sessionStart
      // Clip starts at: sessionStart + 120s = bufferStart + 120s
      // So startOffset = 120s, endOffset = 150s
      expect(result.startOffset).toBe(120);
      expect(result.endOffset).toBe(150);
      expect(result.clipDuration).toBe(30);
    });

    it("should calculate correct offsets when clip is at the end of the buffer", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 300000; // Session started 300s ago
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;

      // Clip from 280s to 299s
      const result = calculateBufferOffsets({
        t0: 280,
        t1: 299,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
      });

      expect(result.startOffset).toBe(280);
      expect(result.endOffset).toBe(299);
      expect(result.clipDuration).toBe(19);
    });

    it("should calculate correct offsets when clip is at the start of the buffer", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 300000;
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;

      // Clip from 0s to 30s
      const result = calculateBufferOffsets({
        t0: 0,
        t1: 30,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
      });

      expect(result.startOffset).toBe(0);
      expect(result.endOffset).toBe(30);
      expect(result.clipDuration).toBe(30);
    });

    it("should clamp startOffset to 0 when clip starts before buffer", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 600000; // Session started 600s ago
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300; // Buffer only has last 300s

      // Clip from 100s to 350s into the session
      // Buffer starts at 300s into the session (600s - 300s)
      // So clip start (100s) is before buffer start (300s)
      const result = calculateBufferOffsets({
        t0: 100,
        t1: 350,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
      });

      expect(result.startOffset).toBe(0); // Clamped to 0
      expect(result.endOffset).toBe(50); // 350s - 300s (buffer start)
      expect(result.clipDuration).toBe(50);
    });

    it("should clamp endOffset to buffer duration", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 300000;
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;

      // Clip from 280s to 310s (exceeds buffer)
      const result = calculateBufferOffsets({
        t0: 280,
        t1: 310,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
      });

      expect(result.startOffset).toBe(280);
      expect(result.endOffset).toBe(300); // Clamped to buffer duration
      expect(result.clipDuration).toBe(20);
    });

    it("should use actualBufferDuration when provided", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 300000;
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;
      const actualBufferDuration = 295; // Actual buffer is slightly shorter

      const result = calculateBufferOffsets({
        t0: 10,
        t1: 50,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
        actualBufferDuration,
      });

      // With actualBufferDuration of 295, the buffer start shifts
      // Buffer starts at: now - 295s = sessionStart + 5s
      // Clip starts at: sessionStart + 10s = bufferStart + 5s
      expect(result.startOffset).toBe(5);
      expect(result.endOffset).toBe(45);
      expect(result.clipDuration).toBe(40);
    });

    it("should throw FFmpegError when clip start is beyond buffer", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 600000; // Session started 600s ago
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300; // Buffer covers last 300s

      // Clip at 50-80s, but buffer starts at 300s
      // Clip is entirely before the buffer
      expect(() =>
        calculateBufferOffsets({
          t0: 50,
          t1: 80,
          sessionStartedAt,
          replayBufferSavedAt,
          replayBufferSeconds,
        })
      ).toThrow(FFmpegError);
    });

    it("should throw FFmpegError with INVALID_TIMESTAMPS code when clip start >= buffer", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 600000;
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;

      try {
        calculateBufferOffsets({
          t0: 50,
          t1: 80,
          sessionStartedAt,
          replayBufferSavedAt,
          replayBufferSeconds,
        });
        // Should not reach here
        expect.unreachable("Should have thrown FFmpegError");
      } catch (error) {
        expect(error).toBeInstanceOf(FFmpegError);
        expect((error as FFmpegError).code).toBe("INVALID_TIMESTAMPS");
      }
    });

    it("should throw FFmpegError when clip end is before buffer start", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 1000000; // Session started 1000s ago
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;

      // Buffer covers 700-1000s. Clip at 50-80s
      // endOffset = (sessionStart + 80*1000 - bufferStart) / 1000
      // bufferStart = now - 300*1000
      // endOffset = (now - 1000000 + 80000 - (now - 300000)) / 1000 = (-1000000 + 80000 + 300000)/1000 = -620
      expect(() =>
        calculateBufferOffsets({
          t0: 50,
          t1: 80,
          sessionStartedAt,
          replayBufferSavedAt,
          replayBufferSeconds,
        })
      ).toThrow(FFmpegError);
    });

    it("should throw FFmpegError when startOffset >= endOffset", () => {
      // Create a scenario where due to clamping, start >= end
      // This is hard to trigger naturally, but we test the guard
      const now = 1700000000000;
      const sessionStartedAt = now - 300000;
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;

      // t0 > t1 would cause this but the endOffset check fires first
      // We'll construct a scenario where the math works out to start >= end
      // Actually, the buffer offset logic handles this:
      // If t0 = 290, t1 = 100 but that doesn't make sense physically
      // The function does allow t0 < t1 but that's a caller concern
      // Let's verify the error message
      expect(() =>
        calculateBufferOffsets({
          t0: 280,
          t1: 270, // Invalid: t0 > t1
          sessionStartedAt,
          replayBufferSavedAt,
          replayBufferSeconds,
        })
      ).toThrow(FFmpegError);
    });

    it("should handle very short clips (1 second)", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 300000;
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;

      const result = calculateBufferOffsets({
        t0: 100,
        t1: 101,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
      });

      expect(result.clipDuration).toBe(1);
    });

    it("should handle fractional seconds", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 300000;
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;

      const result = calculateBufferOffsets({
        t0: 100.5,
        t1: 130.75,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
      });

      expect(result.startOffset).toBeCloseTo(100.5, 1);
      expect(result.endOffset).toBeCloseTo(130.75, 1);
      expect(result.clipDuration).toBeCloseTo(30.25, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // FFmpegError
  // ---------------------------------------------------------------------------
  describe("FFmpegError", () => {
    it("should create error with message, code, and details", () => {
      const error = new FFmpegError(
        "File not found",
        "INPUT_FILE_NOT_FOUND",
        { path: "/test.mp4" }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FFmpegError);
      expect(error.message).toBe("File not found");
      expect(error.code).toBe("INPUT_FILE_NOT_FOUND");
      expect(error.details).toEqual({ path: "/test.mp4" });
      expect(error.name).toBe("FFmpegError");
    });

    it("should work without details parameter", () => {
      const error = new FFmpegError("Generic error", "TRIM_FAILED");

      expect(error.message).toBe("Generic error");
      expect(error.code).toBe("TRIM_FAILED");
      expect(error.details).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // isFFmpegAvailable
  // ---------------------------------------------------------------------------
  describe("isFFmpegAvailable", () => {
    it("should return true when ffmpeg is available (no error)", async () => {
      mockedFfmpeg.getAvailableFormats.mockImplementation((cb: any) => {
        cb(null, {});
      });

      const result = await isFFmpegAvailable();

      expect(result).toBe(true);
    });

    it("should return false when ffmpeg is not available (error)", async () => {
      mockedFfmpeg.getAvailableFormats.mockImplementation((cb: any) => {
        cb(new Error("ffmpeg not found"));
      });

      const result = await isFFmpegAvailable();

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------
  describe("edge cases", () => {
    it("should handle buffer saved exactly at session start", () => {
      const now = 1700000000000;
      const sessionStartedAt = now;
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;

      // Buffer starts 300s before save, which is before session
      // Clip at 0-30s session time
      // clipStartAbsolute = now + 0 = now
      // bufferStartAbsolute = now - 300000
      // startOffset = (now - (now - 300000)) / 1000 = 300
      // This means the clip start is AT the end of the buffer = throw
      expect(() =>
        calculateBufferOffsets({
          t0: 0,
          t1: 30,
          sessionStartedAt,
          replayBufferSavedAt,
          replayBufferSeconds,
        })
      ).toThrow(); // startOffset=300 >= bufferDuration=300
    });

    it("should handle large buffer sizes (1 hour)", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 3600000; // 1 hour ago
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 3600; // 1 hour buffer

      const result = calculateBufferOffsets({
        t0: 1800, // 30 min in
        t1: 1830, // 30 min 30s in
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
      });

      expect(result.startOffset).toBe(1800);
      expect(result.endOffset).toBe(1830);
      expect(result.clipDuration).toBe(30);
    });

    it("should handle when buffer is shorter than expected (actualBufferDuration)", () => {
      const now = 1700000000000;
      const sessionStartedAt = now - 300000;
      const replayBufferSavedAt = now;
      const replayBufferSeconds = 300;
      const actualBufferDuration = 250; // Buffer is only 250s, not 300s

      const result = calculateBufferOffsets({
        t0: 60,
        t1: 90,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
        actualBufferDuration,
      });

      // Buffer starts at now - 250s, session started at now - 300s
      // So buffer starts 50s into the session
      // Clip at 60s session = 10s into buffer
      expect(result.startOffset).toBe(10);
      expect(result.endOffset).toBe(40);
      expect(result.clipDuration).toBe(30);
    });
  });
});

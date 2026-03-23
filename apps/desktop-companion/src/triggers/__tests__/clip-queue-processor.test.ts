import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../logger/index.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../config/index.js", () => ({
  config: {
    SESSION_DIR: "C:/sessions",
    REPLAY_BUFFER_SECONDS: 90,
  },
}));

vi.mock("../../db/services/clip-queue.service.js", () => ({
  getClipQueueItemById: vi.fn(),
  getNextPendingItem: vi.fn(),
  startProcessing: vi.fn(),
  completeProcessing: vi.fn(),
  failProcessing: vi.fn(),
}));

vi.mock("../../db/services/clip.service.js", () => ({
  createClip: vi.fn(),
}));

vi.mock("../../db/services/session.service.js", () => ({
  getSessionById: vi.fn(),
}));

vi.mock("../../ffmpeg/index.js", () => ({
  trimClip: vi.fn(),
}));

import * as ClipQueueService from "../../db/services/clip-queue.service.js";
import * as ClipService from "../../db/services/clip.service.js";
import * as SessionService from "../../db/services/session.service.js";
import { trimClip } from "../../ffmpeg/index.js";
import { ClipQueueProcessor } from "../clip-queue-processor.js";

describe("ClipQueueProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the canonical event sink for queue and clip artifact events", async () => {
    const pendingItem = {
      id: "queue-1",
      sessionId: "session-1",
      clipId: null,
      status: "PENDING",
      triggerType: "MANUAL",
      triggerSource: "manual",
      triggerConfidence: null,
      t0: 10,
      t1: 40,
      thumbnailPath: null,
      title: "Manual clip",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const processingItem = {
      ...pendingItem,
      status: "PROCESSING",
    };

    const completedItem = {
      ...pendingItem,
      clipId: "clip-db-id",
      status: "COMPLETED",
      thumbnailPath: "C:/sessions/session-1/thumb.jpg",
    };

    vi.mocked(ClipQueueService.getClipQueueItemById)
      .mockResolvedValueOnce(pendingItem as any)
      .mockResolvedValueOnce(processingItem as any);
    vi.mocked(ClipQueueService.startProcessing).mockResolvedValue(processingItem as any);
    vi.mocked(ClipQueueService.completeProcessing).mockResolvedValue(completedItem as any);
    vi.mocked(SessionService.getSessionById).mockResolvedValue({
      id: "session-1",
      startedAt: new Date("2026-03-19T16:00:00.000Z"),
    } as any);
    vi.mocked(ClipService.createClip).mockResolvedValue({
      id: "clip-db-id",
    } as any);
    vi.mocked(trimClip).mockResolvedValue({
      clipPath: "C:/sessions/session-1/clip.mp4",
      thumbnailPath: "C:/sessions/session-1/thumb.jpg",
      thumbnailArtifactId: "thumb-1",
      duration: 30,
      trimmedStartTime: 10,
    } as any);

    const send = vi.fn();
    const wss = {
      clients: new Set([{ readyState: 1, send }]),
    } as any;

    const processor = new ClipQueueProcessor(wss);
    const eventSink = vi.fn();
    processor.setEventSink(eventSink);
    vi.spyOn(processor as any, "findReplayBuffer").mockResolvedValue("C:/replay/latest.mp4");

    await processor.processById("queue-1");

    expect(eventSink).toHaveBeenCalledTimes(3);
    expect(eventSink.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        sessionId: "session-1",
        type: "CLIP_QUEUE_UPDATED",
        payload: expect.objectContaining({
          queueItemId: "queue-1",
          status: "processing",
        }),
      })
    );
    expect(eventSink.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        sessionId: "session-1",
        type: "CLIP_QUEUE_UPDATED",
        payload: expect.objectContaining({
          queueItemId: "queue-1",
          status: "completed",
          clipId: "clip-db-id",
        }),
      })
    );
    expect(eventSink.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        sessionId: "session-1",
        type: "ARTIFACT_CLIP_CREATED",
        payload: expect.objectContaining({
          artifactId: expect.any(String),
          path: "C:/sessions/session-1/clip.mp4",
          thumbnailArtifactId: "thumb-1",
          t0: 10,
          t1: 40,
        }),
      })
    );
    expect(send).not.toHaveBeenCalled();
  });
});

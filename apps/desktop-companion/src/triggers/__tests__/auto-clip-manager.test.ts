import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../logger/index.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../db/services/clip-queue.service.js", () => ({
  createClipQueueItem: vi.fn(),
  endRecording: vi.fn(),
  deleteClipQueueItem: vi.fn(),
}));

vi.mock("../../db/services/trigger-config.service.js", () => ({
  getTriggerConfig: vi.fn().mockResolvedValue({
    autoClipEnabled: true,
    autoClipDuration: 60,
  }),
}));

import * as ClipQueueService from "../../db/services/clip-queue.service.js";
import { AutoClipManager } from "../auto-clip-manager.js";

describe("AutoClipManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("uses the canonical event sink for trigger events", async () => {
    vi.mocked(ClipQueueService.createClipQueueItem).mockResolvedValue({
      id: "queue-1",
      sessionId: "session-1",
      clipId: null,
      status: "RECORDING",
      triggerType: "MANUAL",
      triggerSource: "manual",
      triggerConfidence: null,
      t0: 12,
      t1: null,
      thumbnailPath: null,
      title: "Manual clip",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const send = vi.fn();
    const wss = {
      clients: new Set([{ readyState: 1, send }]),
    } as any;

    const manager = new AutoClipManager(wss);
    const eventSink = vi.fn();
    manager.setEventSink(eventSink);

    await manager.handleTrigger({
      type: "manual",
      event: {
        sessionId: "session-1",
        workflow: "streamer",
        t: 12,
      },
    });

    expect(eventSink).toHaveBeenCalledTimes(2);
    expect(eventSink.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        sessionId: "session-1",
        type: "CLIP_INTENT_START",
      })
    );
    expect(eventSink.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        sessionId: "session-1",
        type: "CLIP_QUEUE_UPDATED",
        payload: expect.objectContaining({
          queueItemId: "queue-1",
          status: "recording",
        }),
      })
    );
    expect(send).not.toHaveBeenCalled();
  });
});

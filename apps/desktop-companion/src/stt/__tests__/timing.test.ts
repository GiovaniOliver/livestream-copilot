import { describe, expect, it } from "vitest";
import { alignSegmentToSessionTimeline } from "../timing.js";

describe("alignSegmentToSessionTimeline", () => {
  it("preserves relative timings when transcription starts with the session", () => {
    expect(
      alignSegmentToSessionTimeline(2.5, 4, 1_000, 1_000)
    ).toEqual({
      t0: 2.5,
      t1: 4,
    });
  });

  it("offsets transcript timings when STT starts after the session", () => {
    expect(
      alignSegmentToSessionTimeline(1.5, 3, 10_000, 16_000)
    ).toEqual({
      t0: 7.5,
      t1: 9,
    });
  });

  it("never applies a negative offset", () => {
    expect(
      alignSegmentToSessionTimeline(0.25, 1.25, 20_000, 19_000)
    ).toEqual({
      t0: 0.25,
      t1: 1.25,
    });
  });
});

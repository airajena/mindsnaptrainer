import { describe, expect, it } from "vitest";
import { roundCountdown } from "./round-countdown";

describe("roundCountdown", () => {
  it("tap to start always uses the configured countdown", () => {
    expect(roundCountdown("standard", "tap", { index: 0, attempt: 0 })).toBe("standard");
    expect(roundCountdown("standard", "tap", { index: 5, attempt: 0 })).toBe("standard");
    expect(roundCountdown("quick", "tap", { index: 5, attempt: 0 })).toBe("quick");
  });

  it("automatic: the first round keeps the countdown, later rounds get the fixation dot only", () => {
    expect(roundCountdown("standard", "auto", { index: 0, attempt: 0 })).toBe("standard");
    expect(roundCountdown("standard", "auto", { index: 1, attempt: 0 })).toBe("off");
    expect(roundCountdown("quick", "auto", { index: 9, attempt: 0 })).toBe("off");
  });

  it("automatic: a replay after a void re-orients with the full countdown", () => {
    expect(roundCountdown("standard", "auto", { index: 3, attempt: 1 })).toBe("standard");
  });
});

import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_MODE_LABELS,
  ACHIEVEMENT_STATUS_LABELS,
  COMPLETION_STATUS_LABELS,
  betTypeForMode,
} from "@/lib/domain";

describe("betTypeForMode", () => {
  it("gives a personal challenge a yes/no bet", () => {
    expect(betTypeForMode("PERSONAL")).toBe("YES_NO");
  });

  it("gives an open competition a 'who finishes first' bet", () => {
    expect(betTypeForMode("OPEN")).toBe("WHO");
  });
});

describe("labels", () => {
  it("covers every achievement mode", () => {
    expect(Object.keys(ACHIEVEMENT_MODE_LABELS).sort()).toEqual([
      "OPEN",
      "PERSONAL",
    ]);
  });

  it("covers every achievement status", () => {
    expect(Object.keys(ACHIEVEMENT_STATUS_LABELS).sort()).toEqual([
      "ACTIVE",
      "CANCELLED",
      "ESTIMATING",
      "RESOLVED",
    ]);
  });

  it("covers every completion status", () => {
    expect(Object.keys(COMPLETION_STATUS_LABELS).sort()).toEqual([
      "PENDING",
      "REJECTED",
      "VALIDATED",
    ]);
  });
});

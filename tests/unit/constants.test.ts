import { describe, expect, it } from "vitest";
import {
  RANK_MULTIPLIERS,
  STARTING_TOKENS,
  pointsForRank,
} from "@/lib/constants";

describe("pointsForRank", () => {
  it("reproduces the worked example from docs/IDEAS.md (50 / 40 / 25)", () => {
    expect(pointsForRank(50, 1)).toBe(50);
    expect(pointsForRank(50, 2)).toBe(40);
    expect(pointsForRank(50, 3)).toBe(25);
  });

  it("awards the full value to whoever finishes first", () => {
    expect(pointsForRank(37, 1)).toBe(37);
  });

  it("never increases with rank", () => {
    const awards = [1, 2, 3, 4, 5, 10].map((rank) => pointsForRank(100, rank));
    for (let i = 1; i < awards.length; i++) {
      expect(awards[i]).toBeLessThanOrEqual(awards[i - 1]);
    }
  });

  it("keeps applying the last multiplier past the end of the curve", () => {
    const last = RANK_MULTIPLIERS.at(-1)!;
    expect(pointsForRank(100, RANK_MULTIPLIERS.length)).toBe(100 * last);
    expect(pointsForRank(100, 50)).toBe(100 * last);
  });

  it("rounds to a whole number of karma", () => {
    // 25 × 0.8 = 20 exactly; 5 × 0.5 = 2.5 must not leak a fraction.
    expect(pointsForRank(25, 2)).toBe(20);
    expect(Number.isInteger(pointsForRank(5, 3))).toBe(true);
  });

  it("stays at zero for a worthless achievement", () => {
    expect(pointsForRank(0, 1)).toBe(0);
    expect(pointsForRank(0, 4)).toBe(0);
  });

  it("gives every member the same starting stake", () => {
    expect(STARTING_TOKENS).toBeGreaterThan(0);
  });
});
